import { beforeEach, describe, expect, test } from "vitest";

import { DEFAULT_THRESHOLDS, type BatteryPayload } from "@/lib/battery-dashboard";
import { useDashboardStore } from "@/lib/dashboard-store";


function resetStore() {
  localStorage.clear();
  useDashboardStore.setState({
    payload: null,
    transport: "rest",
    thresholds: DEFAULT_THRESHOLDS,
    alarmLog: [],
    activeAlarms: [],
    operationLog: [],
    trend24h: [],
    strip5m: [],
    messageCount: 0,
    selectedChannel: null,
  });
}

function makePayload(overrides: Partial<BatteryPayload> = {}): BatteryPayload {
  return {
    voltage: 56.1,
    current: 12,
    temperature: 32,
    pressure: 0.4,
    soc: 80,
    cell_diff: 20,
    max_temp: 35,
    connection_status: "connected",
    timestamp: "2026-06-21T12:00:00",
    ...overrides,
  };
}

describe("dashboard alarm resilience", () => {
  beforeEach(() => {
    resetStore();
  });

  test("repeated breach for the same metric only creates one active alarm and one log entry", () => {
    const firstPayload = makePayload({ timestamp: "2026-06-21T12:00:00" });
    const secondPayload = makePayload({ timestamp: "2026-06-21T12:00:05", voltage: 56.8 });

    useDashboardStore.getState().ingestPayload(firstPayload, "websocket");
    useDashboardStore.getState().ingestPayload(secondPayload, "websocket");

    const state = useDashboardStore.getState();
    const voltageActive = state.activeAlarms.filter((alarm) => alarm.metric === "voltage");
    const voltageLog = state.alarmLog.filter((alarm) => alarm.metric === "voltage");

    expect(voltageActive).toHaveLength(1);
    expect(voltageLog).toHaveLength(1);
    expect(voltageActive[0]?.status).toBe("active");
    expect(state.messageCount).toBe(2);
  });
});
