import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

BACKEND_DIR = Path(__file__).resolve().parents[1]
SERVICES_DIR = BACKEND_DIR / "services"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(SERVICES_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICES_DIR))

import data_generator  # noqa: E402
import main  # noqa: E402
from operations_repository import AlertTransition, OperationsRepository  # noqa: E402


class FakeDisconnectedClient:
    def __init__(self, *_args, **_kwargs):
        self.connect_calls = 0

    def connect(self):
        self.connect_calls += 1
        return self.connect_calls >= 2

    def read_holding_registers(self, *args, **kwargs):
        raise AssertionError("read_holding_registers should not be called before reconnect succeeds")


class ResilienceTests(unittest.TestCase):
    def test_payload_contains_batch_quality_context(self):
        payload = main.get_current_payload()

        self.assertEqual(payload.batch["stage"], "化成 / 老化")
        self.assertEqual(payload.equipment["id"], "FORM-08")
        self.assertIn(payload.quality_disposition["status"], {"review", "hold"})
        self.assertGreater(payload.batch["cell_count"], 0)

    def test_alert_lifecycle_and_audit_are_persisted(self):
        payload = {
            "voltage": 43.5,
            "current": 10.0,
            "temperature": 24.0,
            "pressure": 1.02,
            "soc": 55.0,
            "cell_diff": 12.0,
            "max_temp": 24.0,
            "connection_status": "fallback",
            "timestamp": "2026-07-18T20:00:00",
            "data_source": "simulator",
            "data_quality": "simulated",
            "measurement_scope": "aggregate",
            "channel_data_available": False,
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            repository = OperationsRepository(Path(temp_dir) / "operations.db")
            repository.initialize()
            repository.record_sample(payload)
            alerts = repository.sync_alerts(payload)

            self.assertEqual(1, len(alerts))
            self.assertEqual("detected", alerts[0]["lifecycle"])

            alert, operation = repository.transition_alert(
                alerts[0]["id"],
                AlertTransition("acknowledged", "shift_lead", "现场复核后确认"),
            )
            self.assertEqual("acknowledged", alert["lifecycle"])
            self.assertEqual("acknowledged", operation["to_lifecycle"])
            self.assertEqual(1, len(repository.list_history()))
            self.assertGreaterEqual(len(repository.list_operations()), 2)

            recovered_payload = {**payload, "pressure": 0.2, "timestamp": "2026-07-18T20:01:00"}
            recovered_alert = repository.sync_alerts(recovered_payload)[0]
            self.assertEqual("pending_review", recovered_alert["lifecycle"])

    def test_collector_retries_modbus_connection_after_disconnect(self):
        with mock.patch.object(data_generator, "ModbusTcpClient", FakeDisconnectedClient):
            collector = data_generator.DataCollector()

        self.assertFalse(collector.connected, "sanity check: first connection attempt should fail")

        collector.collect_all()

        self.assertGreaterEqual(
            collector.client.connect_calls,
            2,
            "collector should try to reconnect when PLC connection is lost",
        )
        self.assertTrue(collector.connected, "collector should recover to connected state after reconnect")

    def test_api_does_not_crash_when_sensor_payload_is_garbled(self):
        garbled_data = {
            "温度传感器-A1": {"current": {"value": "???"}},
            "湿度传感器-A1": {"current": {"value": "乱码"}},
            "压力传感器-B1": {"current": {"value": None}},
        }

        with (
            mock.patch.object(main.collector, "collect_all", return_value=garbled_data),
            mock.patch.object(main.collector, "connected", True),
        ):
            payload = main.get_current_payload()

        self.assertIsNotNone(payload, "garbled sensor input should not crash payload generation")
        self.assertIn(payload.connection_status, {"connected", "fallback"})


if __name__ == "__main__":
    unittest.main()
