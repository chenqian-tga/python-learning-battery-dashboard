import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
SERVICES_DIR = BASE_DIR / "services"
if str(SERVICES_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICES_DIR))

from battery_adapter import build_battery_payload  # noqa: E402
from data_generator import DataCollector  # noqa: E402
from operations_repository import AlertTransition, OperationsRepository  # noqa: E402


class BatteryPayload(BaseModel):
    voltage: float
    current: float
    temperature: float
    pressure: float
    soc: float
    cell_diff: float
    max_temp: float
    connection_status: str
    data_source: str
    data_quality: str
    measurement_scope: str
    channel_data_available: bool
    metric_provenance: dict[str, str] = Field(default_factory=dict)
    measurement_note: str = ""
    batch: dict[str, object] = Field(default_factory=dict)
    equipment: dict[str, object] = Field(default_factory=dict)
    quality_disposition: dict[str, object] = Field(default_factory=dict)
    production_kpis: dict[str, int] = Field(default_factory=dict)
    timestamp: str


class AlertTransitionRequest(BaseModel):
    lifecycle: str
    actor_role: str
    note: str = ""


class BatchDispositionRequest(BaseModel):
    status: str
    actor_role: str
    note: str = ""
    affected_cells: int = 0


collector = DataCollector()
repository = OperationsRepository(BASE_DIR / "data" / "battery_operations.db")
repository.initialize()


@asynccontextmanager
async def lifespan(_: FastAPI):
    repository.initialize()
    yield
    client = getattr(collector, "client", None)
    if client:
        try:
            client.close()
        except Exception:
            pass


app = FastAPI(
    title="Battery Dashboard API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Local bridge used when Grafana runs only inside WSL.
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_state() -> tuple[BatteryPayload, list[dict]]:
    data = collector.collect_all()
    measured = collector.connected and all(sensor.last_read_success for sensor in collector.sensors.values())
    payload = build_battery_payload(data, collector.connected, measured)
    saved_disposition = repository.get_batch_disposition(payload["batch"]["id"])
    if saved_disposition:
        payload["quality_disposition"] = {**payload["quality_disposition"], **saved_disposition}
    repository.record_sample(payload)
    alerts = repository.sync_alerts(payload)
    if not saved_disposition and any(alert["severity"] == "critical" for alert in alerts if alert["lifecycle"] != "closed"):
        payload["quality_disposition"] = {
            **payload["quality_disposition"],
            "status": "hold",
            "label": "暂缓放行",
            "owner_role": "quality_engineer",
        }
    return BatteryPayload(**payload), alerts


def get_current_payload() -> BatteryPayload:
    payload, _ = get_current_state()
    return payload


@app.get("/api/current-data", response_model=BatteryPayload)
async def current_data():
    return get_current_payload()


@app.get("/api/operations/snapshot")
async def operations_snapshot():
    payload, alerts = get_current_state()
    return {
        "payload": payload.model_dump(),
        "alerts": alerts,
        "operations": repository.list_operations(30),
        "history": repository.list_history(180),
    }


@app.get("/api/alerts")
async def list_alerts(active_only: bool = True):
    return {"alerts": repository.list_alerts(active_only=active_only)}


@app.post("/api/alerts/{alert_id}/transition")
async def transition_alert(alert_id: str, request: AlertTransitionRequest):
    try:
        alert, operation = repository.transition_alert(
            alert_id,
            AlertTransition(request.lifecycle, request.actor_role, request.note),
        )
        return {"alert": alert, "operation": operation}
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.post("/api/batches/{batch_id}/disposition")
async def update_batch_disposition(batch_id: str, request: BatchDispositionRequest):
    try:
        return repository.update_batch_disposition(batch_id, request.status, request.actor_role, request.note, request.affected_cells)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.get("/api/operations")
async def list_operations(limit: int = Query(default=50, ge=1, le=500)):
    return {"operations": repository.list_operations(limit)}


@app.get("/api/history")
async def history(limit: int = Query(default=360, ge=1, le=2000)):
    return {"history": repository.list_history(limit)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload, alerts = get_current_state()
            await websocket.send_json({"type": "operations_snapshot", "payload": payload.model_dump(), "alerts": alerts})
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
