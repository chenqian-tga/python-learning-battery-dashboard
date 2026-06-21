from datetime import datetime


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def build_battery_payload(data: dict, connected: bool) -> dict:
    temp = float(data["温度传感器-A1"]["current"]["value"])
    humidity = float(data["湿度传感器-A1"]["current"]["value"])
    pressure = float(data["压力传感器-B1"]["current"]["value"])

    voltage = round(_clamp(48.2 + (pressure - 1.0) * 6.4 + (humidity - 55.0) * 0.05, 43.5, 57.8), 2)
    current = round(_clamp(10.0 + (temp - 24.0) * 1.1 + (humidity - 55.0) * 0.18, -18.0, 42.0), 2)
    cell_diff = round(_clamp(abs(pressure - 1.0) * 55 + abs(temp - 24.0) * 2.8, 6.0, 92.0), 1)
    max_temp = round(_clamp(temp + max(0.0, humidity - 55.0) * 0.04, 22.0, 68.0), 1)
    soc = round(_clamp(67.0 + (humidity - 55.0) * 1.2 - abs(current - 10.0) * 0.55, 8.0, 99.0), 1)

    return {
        "voltage": voltage,
        "current": current,
        "temperature": round(temp, 1),
        "pressure": round(pressure, 3),
        "soc": soc,
        "cell_diff": cell_diff,
        "max_temp": max_temp,
        "connection_status": "connected" if connected else "fallback",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    }
