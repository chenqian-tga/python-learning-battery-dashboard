from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from contextlib import contextmanager
from pathlib import Path
import sqlite3
import uuid
from typing import Any, Iterator


POLICIES = {
    "voltage": ("总电压", "V", 52.0, 55.0, "机架 A / 电池包 A", 0),
    "current": ("总电流", "A", 30.0, 40.0, "机架 A / 电池包 A", 0),
    "max_temp": ("最高温度", "C", 45.0, 60.0, "机架 A / 电池包 A", 0),
    "pressure": ("化成压力", "MPa", 0.5, 0.8, "化成区", 0),
    "soc": ("荷电状态", "%", 95.0, 98.0, "机架 A / 电池包 A", 0),
    "cell_diff": ("单体压差", "mV", 50.0, 80.0, "机架 A / 电池包 A", 0),
}

LIFECYCLE_TRANSITIONS = {
    "detected": {"acknowledged"},
    "acknowledged": {"assigned"},
    "assigned": {"in_progress"},
    "in_progress": {"pending_review"},
    "pending_review": {"closed"},
    "closed": {"detected"},
}

ROLE_PERMISSIONS = {
    "operator": {"acknowledged", "in_progress"},
    "shift_lead": {"acknowledged", "assigned", "in_progress", "pending_review", "closed"},
    "engineer": {"acknowledged", "in_progress", "pending_review"},
}


@dataclass(frozen=True)
class AlertTransition:
    lifecycle: str
    actor_role: str
    note: str = ""


class OperationsRepository:
    def __init__(self, database_path: Path):
        self.database_path = database_path

    def initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with self._session() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS signal_samples (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    voltage REAL NOT NULL,
                    current REAL NOT NULL,
                    temperature REAL NOT NULL,
                    pressure REAL NOT NULL,
                    soc REAL NOT NULL,
                    cell_diff REAL NOT NULL,
                    max_temp REAL NOT NULL,
                    connection_status TEXT NOT NULL,
                    data_source TEXT NOT NULL DEFAULT 'simulator',
                    data_quality TEXT NOT NULL DEFAULT 'simulated',
                    measurement_scope TEXT NOT NULL DEFAULT 'aggregate',
                    channel_data_available INTEGER NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_signal_samples_timestamp ON signal_samples(timestamp DESC);

                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    metric TEXT NOT NULL UNIQUE,
                    title TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    lifecycle TEXT NOT NULL,
                    value REAL NOT NULL,
                    unit TEXT NOT NULL,
                    attention_threshold REAL NOT NULL,
                    critical_threshold REAL NOT NULL,
                    scope TEXT NOT NULL,
                    related_channel INTEGER,
                    first_seen TEXT NOT NULL,
                    latest_seen TEXT NOT NULL,
                    source TEXT NOT NULL,
                    owner_role TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_alerts_lifecycle ON alerts(lifecycle);

                CREATE TABLE IF NOT EXISTS operation_log (
                    id TEXT PRIMARY KEY,
                    alert_id TEXT,
                    timestamp TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    actor_role TEXT,
                    action TEXT NOT NULL,
                    from_lifecycle TEXT,
                    to_lifecycle TEXT,
                    detail TEXT NOT NULL,
                    FOREIGN KEY(alert_id) REFERENCES alerts(id)
                );
                CREATE INDEX IF NOT EXISTS idx_operation_log_timestamp ON operation_log(timestamp DESC);
                """
            )
            self._ensure_columns(connection)

    def record_sample(self, payload: dict[str, Any]) -> None:
        with self._session() as connection:
            connection.execute(
                """
                INSERT INTO signal_samples (timestamp, voltage, current, temperature, pressure, soc, cell_diff, max_temp, connection_status, data_source, data_quality, measurement_scope, channel_data_available)
                VALUES (:timestamp, :voltage, :current, :temperature, :pressure, :soc, :cell_diff, :max_temp, :connection_status, :data_source, :data_quality, :measurement_scope, :channel_data_available)
                """,
                payload,
            )
            connection.execute(
                "DELETE FROM signal_samples WHERE id NOT IN (SELECT id FROM signal_samples ORDER BY id DESC LIMIT 20000)"
            )

    def sync_alerts(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        timestamp = payload["timestamp"]
        with self._session() as connection:
            existing = {row["metric"]: dict(row) for row in connection.execute("SELECT * FROM alerts")}
            for metric, policy in POLICIES.items():
                title, unit, attention, critical, scope, channel = policy
                value = abs(payload[metric]) if metric == "current" else payload[metric]
                severity = "critical" if value >= critical else "attention" if value >= attention else None
                row = existing.get(metric)
                if severity:
                    if row is None:
                        alert_id = f"alert-{uuid.uuid4().hex[:12]}"
                        connection.execute(
                            """
                            INSERT INTO alerts (id, metric, title, severity, lifecycle, value, unit, attention_threshold, critical_threshold, scope, related_channel, first_seen, latest_seen, source, evidence_type)
                            VALUES (?, ?, ?, ?, 'detected', ?, ?, ?, ?, ?, ?, ?, ?, 'backend_policy', ?)
                            """,
                            (alert_id, metric, title, severity, value, unit, attention, critical, scope, 0, timestamp, timestamp, payload.get("metric_provenance", {}).get(metric, payload.get("data_quality", "unknown"))),
                        )
                        self._log(connection, alert_id, "system", None, "detected", "策略检测到新的异常", f"{title} 超出阈值")
                    elif row["lifecycle"] == "closed":
                        connection.execute(
                            "UPDATE alerts SET severity=?, lifecycle='detected', value=?, latest_seen=?, first_seen=?, owner_role=NULL, evidence_type=? WHERE id=?",
                            (severity, value, timestamp, timestamp, payload.get("metric_provenance", {}).get(metric, payload.get("data_quality", "unknown")), row["id"]),
                        )
                        self._log(connection, row["id"], "system", "closed", "detected", "异常重新出现", f"{title} 再次超出阈值")
                    else:
                        connection.execute(
                            "UPDATE alerts SET severity=?, value=?, latest_seen=?, related_channel=?, evidence_type=? WHERE id=?",
                            (severity, value, timestamp, 0, payload.get("metric_provenance", {}).get(metric, payload.get("data_quality", "unknown")), row["id"]),
                        )
                elif row is not None and row["lifecycle"] not in {"closed", "pending_review"}:
                    next_lifecycle = "closed" if row["lifecycle"] == "detected" else "pending_review"
                    action = "信号恢复正常" if next_lifecycle == "closed" else "信号恢复，等待人工复核"
                    detail = f"{title} 已回到策略阈值内"
                    connection.execute("UPDATE alerts SET lifecycle=?, latest_seen=? WHERE id=?", (next_lifecycle, timestamp, row["id"]))
                    self._log(connection, row["id"], "system", row["lifecycle"], next_lifecycle, action, detail)
            return self.list_alerts(connection=connection)

    def list_alerts(self, active_only: bool = False, connection: sqlite3.Connection | None = None) -> list[dict[str, Any]]:
        owns_connection = connection is None
        connection = connection or self._connect()
        try:
            query = "SELECT * FROM alerts"
            if active_only:
                query += " WHERE lifecycle != 'closed'"
            query += " ORDER BY CASE severity WHEN 'critical' THEN 0 ELSE 1 END, first_seen ASC"
            return [self._serialize_alert(dict(row)) for row in connection.execute(query)]
        finally:
            if owns_connection:
                connection.close()

    def transition_alert(self, alert_id: str, transition: AlertTransition) -> tuple[dict[str, Any], dict[str, Any]]:
        with self._session() as connection:
            row = connection.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
            if row is None:
                raise KeyError("异常不存在")
            alert = dict(row)
            if transition.lifecycle not in LIFECYCLE_TRANSITIONS.get(alert["lifecycle"], set()):
                raise ValueError(f"不能从 {alert['lifecycle']} 迁移到 {transition.lifecycle}")
            if transition.lifecycle not in ROLE_PERMISSIONS.get(transition.actor_role, set()):
                raise PermissionError("当前工作角色没有执行该动作的权限")
            owner_role = transition.actor_role if transition.lifecycle == "assigned" else alert["owner_role"]
            connection.execute(
                "UPDATE alerts SET lifecycle=?, owner_role=? WHERE id=?",
                (transition.lifecycle, owner_role, alert_id),
            )
            operation = self._log(
                connection,
                alert_id,
                "operator",
                alert["lifecycle"],
                transition.lifecycle,
                "异常状态已迁移",
                transition.note or "未填写补充说明",
                transition.actor_role,
            )
            updated = dict(connection.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone())
            return self._serialize_alert(updated), operation

    def list_operations(self, limit: int = 50) -> list[dict[str, Any]]:
        with self._session() as connection:
            rows = connection.execute("SELECT * FROM operation_log ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
            return [dict(row) for row in rows]

    def list_history(self, limit: int = 360) -> list[dict[str, Any]]:
        with self._session() as connection:
            rows = connection.execute("SELECT * FROM signal_samples ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
            return [dict(row) for row in reversed(rows)]

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=5)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _ensure_columns(connection: sqlite3.Connection) -> None:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(signal_samples)")}
        migrations = {
            "data_source": "TEXT NOT NULL DEFAULT 'simulator'",
            "data_quality": "TEXT NOT NULL DEFAULT 'simulated'",
            "measurement_scope": "TEXT NOT NULL DEFAULT 'aggregate'",
            "channel_data_available": "INTEGER NOT NULL DEFAULT 0",
            "evidence_type": "TEXT NOT NULL DEFAULT 'unknown'",
        }
        for name, definition in migrations.items():
            if name not in columns:
                connection.execute(f"ALTER TABLE signal_samples ADD COLUMN {name} {definition}")
        alert_columns = {row[1] for row in connection.execute("PRAGMA table_info(alerts)")}
        if "evidence_type" not in alert_columns:
            connection.execute("ALTER TABLE alerts ADD COLUMN evidence_type TEXT NOT NULL DEFAULT 'unknown'")
        # 当前适配器没有提供单体通道寄存器；历史版本曾把聚合异常错误关联到 CH01/CH08。
        # 在真实通道契约接入前，所有后端策略异常都必须保持为聚合范围。
        connection.execute("UPDATE alerts SET related_channel=0 WHERE source='backend_policy'")

    @contextmanager
    def _session(self) -> Iterator[sqlite3.Connection]:
        connection = self._connect()
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _log(
        self,
        connection: sqlite3.Connection,
        alert_id: str,
        kind: str,
        from_lifecycle: str | None,
        to_lifecycle: str,
        action: str,
        detail: str,
        actor_role: str | None = None,
    ) -> dict[str, Any]:
        operation = {
            "id": f"op-{uuid.uuid4().hex[:12]}",
            "alert_id": alert_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "kind": kind,
            "actor_role": actor_role,
            "action": action,
            "from_lifecycle": from_lifecycle,
            "to_lifecycle": to_lifecycle,
            "detail": detail,
        }
        connection.execute(
            """
            INSERT INTO operation_log (id, alert_id, timestamp, kind, actor_role, action, from_lifecycle, to_lifecycle, detail)
            VALUES (:id, :alert_id, :timestamp, :kind, :actor_role, :action, :from_lifecycle, :to_lifecycle, :detail)
            """,
            operation,
        )
        return operation

    @staticmethod
    def _serialize_alert(alert: dict[str, Any]) -> dict[str, Any]:
        return {
            **{key: value for key, value in alert.items() if key not in {"attention_threshold", "critical_threshold"}},
            "threshold": [alert["attention_threshold"], alert["critical_threshold"]],
        }
