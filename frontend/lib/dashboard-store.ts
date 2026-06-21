"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  buildChannels,
  DashboardPoint,
  DEFAULT_THRESHOLDS,
  evaluateMetricLevel,
  formatTimestamp,
  getThresholdValue,
  type AlarmRecord,
  type BatteryPayload,
  type MetricKey,
  type OperationRecord,
  type ThresholdConfig,
} from "@/lib/battery-dashboard";

type DashboardState = {
  payload: BatteryPayload | null;
  transport: "rest" | "websocket" | "disconnected";
  thresholds: ThresholdConfig;
  alarmLog: AlarmRecord[];
  activeAlarms: AlarmRecord[];
  operationLog: OperationRecord[];
  trend24h: DashboardPoint[];
  strip5m: DashboardPoint[];
  messageCount: number;
  selectedChannel: number | null;
  setTransport: (transport: DashboardState["transport"]) => void;
  ingestPayload: (payload: BatteryPayload, source: "rest" | "websocket") => void;
  acknowledgeAlarm: (alarmId: string) => void;
  snoozeAlarm: (alarmId: string) => void;
  setThreshold: <K extends keyof ThresholdConfig>(
    metric: K,
    key: keyof ThresholdConfig[K],
    value: number,
  ) => void;
  restoreThresholds: () => void;
  selectChannel: (channel: number | null) => void;
};

function reEvaluateActiveAlarms(
  payload: BatteryPayload,
  thresholds: ThresholdConfig,
  alarms: AlarmRecord[],
  operations: OperationRecord[],
) {
  const nextActive = [...alarms];
  const nextOps = [...operations];
  const metrics: MetricKey[] = ["voltage", "current", "cell_diff", "max_temp", "pressure", "soc"];

  for (const metric of metrics) {
    const level = evaluateMetricLevel(metric, payload[metric], thresholds);
    const existing = nextActive.find((alarm) => alarm.metric === metric);

    if (level === "normal") {
      if (existing) {
        existing.status = "recovered";
        existing.value = payload[metric];
      }
      continue;
    }

    if (!existing) {
      nextActive.unshift({
        id: `${metric}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        metric,
        label: metric,
        value: payload[metric],
        threshold: getThresholdValue(metric, level, thresholds),
        level,
        status: "active",
        operator: "User",
      });
      nextOps.unshift(createOperation("阈值重评估", `${metric} 重新进入 ${level}`));
    } else {
      existing.value = payload[metric];
      existing.level = level;
      existing.threshold = getThresholdValue(metric, level, thresholds);
      if (existing.status !== "acknowledged") existing.status = "active";
    }
  }

  return nextActive.filter((alarm) => alarm.status !== "recovered");
}

function createOperation(action: string, detail: string): OperationRecord {
  return {
    id: `${action}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action,
    detail,
  };
}

function ensureTrendWindow(points: DashboardPoint[], maxPoints: number) {
  if (points.length <= maxPoints) return points;
  return points.slice(points.length - maxPoints);
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
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
      setTransport: (transport) => set({ transport }),
      ingestPayload: (payload, source) => {
        const { thresholds, alarmLog, activeAlarms, operationLog, trend24h, strip5m, transport } = get();
        const point: DashboardPoint = {
          ...payload,
          epoch: new Date(payload.timestamp).getTime(),
        };

        const metrics: MetricKey[] = ["voltage", "current", "cell_diff", "max_temp", "pressure", "soc"];
        const nextActive = [...activeAlarms];
        const nextLog = [...alarmLog];
        const nextOps = [...operationLog];

        for (const metric of metrics) {
          const level = evaluateMetricLevel(metric, payload[metric], thresholds);
          const existing = nextActive.find((alarm) => alarm.metric === metric);

          if (level === "normal") {
            if (existing) {
              existing.status = "recovered";
              existing.value = payload[metric];
              nextOps.unshift(
                createOperation("恢复", `${existing.metric} 恢复正常 (${formatTimestamp(payload.timestamp)})`),
              );
            }
            continue;
          }

          if (!existing) {
            const newAlarm: AlarmRecord = {
              id: `${metric}-${payload.timestamp}`,
              timestamp: payload.timestamp,
              metric,
              label: metric,
              value: payload[metric],
              threshold: getThresholdValue(metric, level, thresholds),
              level,
              status: "active",
              operator: "User",
            };
            nextActive.unshift(newAlarm);
            nextLog.unshift(newAlarm);
          } else {
            existing.value = payload[metric];
            existing.level = level;
            existing.threshold = getThresholdValue(metric, level, thresholds);
            if (existing.status === "recovered" || existing.status === "acknowledged") {
              existing.status = "active";
            }
          }
        }

        if (transport !== source) {
          nextOps.unshift(
            createOperation("数据源切换", `切换到 ${source === "websocket" ? "WebSocket" : "REST"} 数据流`),
          );
        }

        set({
          payload,
          transport: source,
          alarmLog: nextLog.slice(0, 120),
          activeAlarms: nextActive
            .filter((alarm) => alarm.status !== "recovered")
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
          operationLog: nextOps.slice(0, 60),
          trend24h: ensureTrendWindow([...trend24h, point], 288),
          strip5m: ensureTrendWindow([...strip5m, point], 300),
          messageCount: get().messageCount + 1,
        });
      },
      acknowledgeAlarm: (alarmId) => {
        const activeAlarms = get().activeAlarms.map((alarm) =>
          alarm.id === alarmId ? { ...alarm, status: "acknowledged" as const } : alarm,
        );
        const alarm = activeAlarms.find((item) => item.id === alarmId);

        set({
          activeAlarms,
          operationLog: alarm
            ? [
                createOperation("确认告警", `${alarm.metric} 已确认 (${formatTimestamp(new Date().toISOString())})`),
                ...get().operationLog,
              ].slice(0, 60)
            : get().operationLog,
        });
      },
      snoozeAlarm: (alarmId) => {
        const activeAlarms = get().activeAlarms.map((alarm) =>
          alarm.id === alarmId ? { ...alarm, status: "snoozed" as const } : alarm,
        );
        const alarm = activeAlarms.find((item) => item.id === alarmId);

        set({
          activeAlarms,
          operationLog: alarm
            ? [
                createOperation("忽略告警", `${alarm.metric} 已忽略 5 分钟`),
                ...get().operationLog,
              ].slice(0, 60)
            : get().operationLog,
        });
      },
      setThreshold: (metric, key, value) => {
        const current = get().thresholds[metric];
        const nextThresholds = {
          ...get().thresholds,
          [metric]: {
            ...current,
            [key]: value,
          },
        };
        const payload = get().payload;
        const nextOperations = [
          createOperation("修改阈值", `${String(metric)}.${String(key)} -> ${value}`),
          ...get().operationLog,
        ].slice(0, 60);

        set({
          thresholds: nextThresholds,
          activeAlarms: payload
            ? reEvaluateActiveAlarms(payload, nextThresholds, get().activeAlarms, nextOperations)
            : get().activeAlarms,
          operationLog: nextOperations,
        });
      },
      restoreThresholds: () => {
        const payload = get().payload;
        const nextOperations = [
          createOperation("恢复默认", "阈值恢复到默认出厂配置"),
          ...get().operationLog,
        ].slice(0, 60);

        set({
          thresholds: DEFAULT_THRESHOLDS,
          activeAlarms: payload
            ? reEvaluateActiveAlarms(payload, DEFAULT_THRESHOLDS, get().activeAlarms, nextOperations)
            : get().activeAlarms,
          operationLog: nextOperations,
        });
      },
      selectChannel: (selectedChannel) => set({ selectedChannel }),
    }),
    {
      name: "battery-dashboard-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        thresholds: state.thresholds,
        alarmLog: state.alarmLog,
        operationLog: state.operationLog,
        selectedChannel: state.selectedChannel,
      }),
    },
  ),
);

export function useDerivedChannels() {
  const payload = useDashboardStore((state) => state.payload);
  if (!payload) return [];
  return buildChannels(payload);
}
