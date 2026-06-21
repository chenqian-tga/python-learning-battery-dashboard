import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
import sys

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent
SERVICES_DIR = BASE_DIR / "services"
if str(SERVICES_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICES_DIR))

from battery_adapter import build_battery_payload  # noqa: E402
from data_generator import DataCollector  # noqa: E402


class BatteryPayload(BaseModel):
    voltage: float
    current: float
    temperature: float
    pressure: float
    soc: float
    cell_diff: float
    max_temp: float
    connection_status: str
    timestamp: str


collector = DataCollector()


@asynccontextmanager
async def lifespan(_: FastAPI):
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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_payload() -> BatteryPayload:
    data = collector.collect_all()
    payload = build_battery_payload(data, collector.connected)
    return BatteryPayload(**payload)


@app.get("/api/current-data", response_model=BatteryPayload)
async def current_data():
    return get_current_payload()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = get_current_payload()
            await websocket.send_json(payload.model_dump())
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
