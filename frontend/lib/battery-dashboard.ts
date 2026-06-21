export type BatteryPayload = {
  voltage: number;
  current: number;
  temperature: number;
  pressure: number;
  soc: number;
  cell_diff: number;
  max_temp: number;
  connection_status: string;
  timestamp: string;
};

export type MetricKey =
  | "voltage"
  | "current"
  | "cell_diff"
  | "max_temp"
  | "pressure"
  | "soc";

export type AlarmLevel = "normal" | "L1" | "L2" | "L3";

export type AlarmRecord = {
  id: string;
  timestamp: string;
  metric: MetricKey;
  label: string;
  value: number;
  threshold: number;
  level: Exclude<AlarmLevel, "normal">;
  status: "active" | "acknowledged" | "snoozed" | "recovered";
  operator: string;
};

export type OperationRecord = {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
};

export type ChannelStatus = "normal" | "warning" | "critical" | "offline";

export type ChannelRecord = {
  ch: number;
  voltage: number;
  temp: number;
  status: ChannelStatus;
};

export type ThresholdConfig = {
  voltage: { green: number; yellow: number; orange: number; red: number; unit: string };
  current: { green: number; yellow: number; orange: number; red: number; unit: string };
  cell_diff: { green: number; yellow: number; orange: number; red: number; unit: string };
  max_temp: { green: number; yellow: number; orange: number; red: number; unit: string };
  pressure: { green: number; yellow: number; orange: number; red: number; unit: string };
  soc: {
    green_low: number;
    yellow_low: number;
    orange_low: number;
    red_low: number;
    green_high: number;
    yellow_high: number;
    orange_high: number;
    unit: string;
  };
};

export type DashboardPoint = BatteryPayload & {
  epoch: number;
};

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  voltage: { green: 48, yellow: 52, orange: 55, red: 60, unit: "V" },
  current: { green: 20, yellow: 30, orange: 40, red: 50, unit: "A" },
  cell_diff: { green: 30, yellow: 50, orange: 80, red: 100, unit: "mV" },
  max_temp: { green: 40, yellow: 45, orange: 60, red: 70, unit: "°C" },
  pressure: { green: 0.3, yellow: 0.5, orange: 0.8, red: 1.0, unit: "MPa" },
  soc: {
    green_low: 20,
    yellow_low: 10,
    orange_low: 5,
    red_low: 0,
    green_high: 95,
    yellow_high: 98,
    orange_high: 100,
    unit: "%",
  },
};

export const METRIC_LABELS: Record<MetricKey, string> = {
  voltage: "总电压",
  current: "总电流",
  cell_diff: "单体压差",
  max_temp: "最高电芯温度",
  pressure: "化成压力",
  soc: "荷电状态",
};

export const LEVEL_COLORS: Record<AlarmLevel, string> = {
  normal: "#00D084",
  L1: "#FFB800",
  L2: "#FF6D00",
  L3: "#FF2D55",
};

export function clamp(value: number, minValue: number, maxValue: number) {
  return Math.max(minValue, Math.min(maxValue, value));
}

export function evaluateMetricLevel(
  metric: MetricKey,
  value: number,
  thresholds: ThresholdConfig,
): AlarmLevel {
  if (metric === "soc") {
    const rules = thresholds.soc;
    if (value <= rules.orange_low || value >= rules.orange_high) return "L3";
    if (value <= rules.yellow_low || value >= rules.yellow_high) return "L1";
    return "normal";
  }

  const rules = thresholds[metric];
  const compareValue = metric === "current" ? Math.abs(value) : value;

  if (compareValue >= rules.orange) return "L3";
  if (compareValue >= rules.yellow) return "L2";
  if (compareValue >= rules.green) return "L1";
  return "normal";
}

export function getThresholdValue(
  metric: MetricKey,
  level: Exclude<AlarmLevel, "normal">,
  thresholds: ThresholdConfig,
) {
  if (metric === "soc") {
    const rules = thresholds.soc;
    if (level === "L3") return rules.orange_low;
    return rules.yellow_low;
  }

  const rules = thresholds[metric];
  if (level === "L3") return rules.orange;
  if (level === "L2") return rules.yellow;
  return rules.green;
}

export function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function getShiftLabel(timestamp: string) {
  const date = new Date(timestamp);
  const hour = date.getHours();
  if (hour >= 8 && hour < 16) return "早班 08:00-16:00";
  if (hour >= 16 && hour < 24) return "中班 16:00-24:00";
  return "夜班 00:00-08:00";
}

export function buildChannels(payload: BatteryPayload): ChannelRecord[] {
  return Array.from({ length: 16 }, (_, index) => {
    const channelVoltage = Number((3.72 + (index % 4) * 0.02 + payload.cell_diff / 1000).toFixed(2));
    const channelTemp = Number((payload.max_temp - 2 + (index % 3) * 0.6).toFixed(1));
    const status: ChannelStatus =
      payload.connection_status !== "connected" && payload.connection_status !== "fallback"
        ? "offline"
        : channelTemp > 45 || channelVoltage > 3.9
          ? "critical"
          : channelTemp > 38 || channelVoltage > 3.86
            ? "warning"
            : "normal";

    return {
      ch: index + 1,
      voltage: channelVoltage,
      temp: channelTemp,
      status,
    };
  });
}
