"""
Copied service config from the Streamlit prototype to preserve existing data behavior.
"""

SENSORS = {
    "温度传感器-A1": {
        "type": "temperature",
        "unit": "°C",
        "min_value": 20.0,
        "max_value": 30.0,
        "warning_threshold": 28.0,
        "danger_threshold": 30.0,
        "initial": 24.0,
        "fluctuation": 0.8,
    },
    "湿度传感器-A1": {
        "type": "humidity",
        "unit": "%RH",
        "min_value": 40.0,
        "max_value": 70.0,
        "warning_threshold": 65.0,
        "danger_threshold": 70.0,
        "initial": 55.0,
        "fluctuation": 1.2,
    },
    "压力传感器-B1": {
        "type": "pressure",
        "unit": "MPa",
        "min_value": 0.5,
        "max_value": 1.5,
        "warning_threshold": 1.3,
        "danger_threshold": 1.5,
        "initial": 1.0,
        "fluctuation": 0.05,
    },
}

REFRESH_INTERVAL = 1.0
MAX_HISTORY = 60
ALARM_COOLDOWN = 5
