"""
Copied from the Streamlit prototype service layer for Phase 1 backend reuse.
"""

import random
import time
from collections import deque

from pymodbus.client import ModbusTcpClient

from config import MAX_HISTORY, SENSORS


class SensorSimulator:
    def __init__(self, name, config, modbus_address, scale_factor):
        self.name = name
        self.config = config
        self.modbus_address = modbus_address
        self.scale_factor = scale_factor
        self.current_value = config["initial"]
        self.history = deque(maxlen=MAX_HISTORY)
        self.history.append({"timestamp": time.strftime("%H:%M:%S"), "value": self.current_value})

    def read(self, client):
        try:
            result = client.read_holding_registers(
                address=self.modbus_address,
                count=1,
                slave=1,
            )
            if not result.isError():
                raw_value = result.registers[0]
                self.current_value = raw_value / self.scale_factor
        except Exception:
            pass

        record = {"timestamp": time.strftime("%H:%M:%S"), "value": round(self.current_value, 2)}
        self.history.append(record)
        return record

    def get_status(self):
        val = self.current_value
        cfg = self.config
        if val >= cfg["danger_threshold"]:
            return "danger"
        if val >= cfg["warning_threshold"]:
            return "warning"
        return "normal"


class DataCollector:
    def __init__(self):
        self.client = ModbusTcpClient("localhost", port=5020)
        self.connected = self.client.connect()

        self.sensors = {
            "温度传感器-A1": SensorSimulator(
                "温度传感器-A1",
                SENSORS["温度传感器-A1"],
                modbus_address=0,
                scale_factor=10,
            ),
            "湿度传感器-A1": SensorSimulator(
                "湿度传感器-A1",
                SENSORS["湿度传感器-A1"],
                modbus_address=2,
                scale_factor=10,
            ),
            "压力传感器-B1": SensorSimulator(
                "压力传感器-B1",
                SENSORS["压力传感器-B1"],
                modbus_address=1,
                scale_factor=1000,
            ),
        }

    def collect_all(self):
        if not self.connected:
            return self._fallback_random()

        result = {}
        for name, sensor in self.sensors.items():
            result[name] = {
                "current": sensor.read(self.client),
                "status": sensor.get_status(),
                "history": list(sensor.history),
                "config": sensor.config,
            }
        return result

    def _fallback_random(self):
        result = {}
        for name, sensor in self.sensors.items():
            cfg = sensor.config
            drift = random.uniform(-cfg["fluctuation"], cfg["fluctuation"])
            sensor.current_value += drift
            sensor.current_value = max(
                cfg["min_value"] - 2,
                min(cfg["max_value"] + 2, sensor.current_value),
            )
            record = {"timestamp": time.strftime("%H:%M:%S"), "value": round(sensor.current_value, 2)}
            sensor.history.append(record)
            result[name] = {
                "current": record,
                "status": sensor.get_status(),
                "history": list(sensor.history),
                "config": cfg,
            }
        return result
