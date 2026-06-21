import { METRIC_LABELS, type AlarmLevel, type AlarmRecord } from "@/lib/battery-dashboard";

export type AlarmFilter = "all" | AlarmRecord["status"];
export type AlarmLevelFilter = "all" | Exclude<AlarmLevel, "normal">;
export type MetricFilter = "all" | keyof typeof METRIC_LABELS;
export type OperationFilter =
  | "all"
  | "恢复"
  | "确认告警"
  | "忽略告警"
  | "修改阈值"
  | "恢复默认"
  | "数据源切换"
  | "阈值重评估";
export type ChannelFilter = "all" | "abnormal" | "critical" | "normal";
export type TrendRange = "5m" | "1h" | "24h";
export type ThresholdFeedback = "idle" | "edited" | "restored";
export type ChannelFocusMode = "locked" | "follow-risk";

export const OPERATION_COLORS = {
  恢复: "#00D084",
  确认告警: "#00f0ff",
  忽略告警: "#FFB800",
  修改阈值: "#BF5AF2",
  恢复默认: "#8B95A5",
  数据源切换: "#0A84FF",
  阈值重评估: "#FF6D00",
} as const;

export function formatMetricValue(metric: keyof typeof METRIC_LABELS, value: number) {
  if (metric === "pressure") return value.toFixed(3);
  if (metric === "soc") return value.toFixed(0);
  if (metric === "cell_diff") return value.toFixed(0);
  if (metric === "voltage") return value.toFixed(2);
  return value.toFixed(1);
}

export function getFreshnessLabel(timestamp?: string | null) {
  if (!timestamp) return "等待数据";
  const diffSeconds = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (diffSeconds < 5) return "刚刚更新";
  if (diffSeconds < 60) return `${diffSeconds}s 前`;
  const diffMinutes = Math.round(diffSeconds / 60);
  return `${diffMinutes}m 前`;
}
