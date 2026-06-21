"use client";

import ReactECharts from "echarts-for-react";
import {
  BatteryCharging,
  ChevronRight,
  Clock3,
  Cpu,
  Gauge,
  RefreshCcw,
  Thermometer,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_THRESHOLDS,
  evaluateMetricLevel,
  LEVEL_COLORS,
  METRIC_LABELS,
  formatTimestamp,
  type MetricKey,
  type AlarmLevel,
  type BatteryPayload,
  type ThresholdConfig,
} from "@/lib/battery-dashboard";
import { AlarmAndLogPanel } from "@/components/dashboard/AlarmAndLogPanel";
import { AlarmCenter } from "@/components/dashboard/AlarmCenter";
import { ChannelDetailPanel } from "@/components/dashboard/ChannelDetailPanel";
import { TopOverview } from "@/components/dashboard/TopOverview";
import {
  type AlarmFilter,
  type AlarmLevelFilter,
  type ChannelFilter,
  type ChannelFocusMode,
  type MetricFilter,
  type OperationFilter,
  type ThresholdFeedback,
  type TrendRange,
  formatMetricValue,
  getFreshnessLabel,
} from "@/lib/dashboard-ui";
import { useDashboardStore, useDerivedChannels } from "@/lib/dashboard-store";

const API_BASE = "http://localhost:8000";

const KPI_META = [
  { key: "voltage", icon: BatteryCharging, unit: "V", detail: "24 cells" },
  { key: "current", icon: Waves, unit: "A", detail: "方向图标↑充↓放" },
  { key: "cell_diff", icon: Gauge, unit: "mV", detail: "Max-Min" },
  { key: "max_temp", icon: Thermometer, unit: "°C", detail: "Cell #08" },
  { key: "pressure", icon: Cpu, unit: "MPa", detail: "Formation" },
  { key: "soc", icon: Gauge, unit: "%", detail: "120 Ah" },
] as const;

const LEVEL_RING_CLASS: Record<AlarmLevel, string> = {
  normal: "bg-[#00D084]",
  L1: "bg-[#FFB800]",
  L2: "bg-[#FF6D00]",
  L3: "bg-[#FF2D55]",
};

const CHANNEL_STATUS_COLORS = {
  normal: "#00D084",
  warning: "#FFB800",
  critical: "#FF2D55",
  offline: "#8B95A5",
} as const;

function levelLabel(level: AlarmLevel) {
  if (level === "normal") return "正常";
  return level;
}

function exportCsv(rows: Record<string, string | number>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const content = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")),
  ].join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `alarm_log_${new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildTrendOption(data: BatteryPayload[], thresholds: ThresholdConfig) {
  const times = data.map((item) => formatTimestamp(item.timestamp).slice(11));
  return {
    backgroundColor: "transparent",
    textStyle: { color: "#F0F2F5" },
    animation: false,
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(10, 14, 23, 0.94)",
      borderColor: "#243047",
      textStyle: { color: "#F0F2F5" },
      extraCssText: "box-shadow: 0 14px 32px rgba(0,0,0,0.35); border-radius: 12px;",
      formatter: (params: Array<{ axisValueLabel: string; seriesName: string; data: number; color: string }>) => {
        if (!params.length) return "";
        const rows = params
          .map(
            (item) =>
              `<div style="display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:6px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="width:8px;height:8px;border-radius:9999px;background:${item.color};display:inline-block;"></span>
                  <span style="color:#AAB4C5;">${item.seriesName}</span>
                </div>
                <span style="color:#F0F2F5;font-weight:600;">${item.data}</span>
              </div>`,
          )
          .join("");
        return `<div style="min-width:180px;">
          <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8B95A5;">采样时刻</div>
          <div style="margin-top:4px;font-size:14px;font-weight:600;color:#F0F2F5;">${params[0].axisValueLabel}</div>
          <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.08);padding-top:8px;">${rows}</div>
        </div>`;
      },
    },
    legend: {
      top: 0,
      itemWidth: 10,
      itemHeight: 10,
      icon: "circle",
      textStyle: { color: "#8B95A5", fontSize: 11 },
      data: ["总电压", "总电流", "最高温度", "压力"],
    },
    grid: { left: 44, right: 18, top: 42, bottom: 30 },
    xAxis: {
      type: "category",
      data: times,
      boundaryGap: false,
      axisLabel: { color: "#8B95A5", fontSize: 11, hideOverlap: true },
      axisLine: { lineStyle: { color: "#2A3142" } },
    },
    yAxis: [
      {
        type: "value",
        name: "V",
        axisLabel: { color: "#8B95A5", fontSize: 11 },
        splitLine: { lineStyle: { color: "#2A3142" } },
      },
      {
        type: "value",
        name: "A / °C / MPa",
        axisLabel: { color: "#8B95A5", fontSize: 11 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "总电压",
        type: "line",
        data: data.map((item) => item.voltage),
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: "#0A84FF" },
        markLine: {
          silent: true,
          lineStyle: { color: "#FFB800", type: "dashed" },
          data: [{ yAxis: thresholds.voltage.yellow, name: "电压预警" }],
        },
        markArea: {
          silent: true,
          itemStyle: { color: "rgba(255, 184, 0, 0.08)" },
          data: [[{ yAxis: thresholds.voltage.yellow }, { yAxis: thresholds.voltage.orange }]],
        },
      },
      {
        name: "总电流",
        type: "line",
        yAxisIndex: 1,
        data: data.map((item) => item.current),
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: "#00D084" },
      },
      {
        name: "最高温度",
        type: "line",
        yAxisIndex: 1,
        data: data.map((item) => item.max_temp),
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: "#FF6D00" },
        markLine: {
          silent: true,
          lineStyle: { color: "#FF2D55", type: "dashed" },
          data: [{ yAxis: thresholds.max_temp.orange, name: "温度告警" }],
        },
        markArea: {
          silent: true,
          itemStyle: { color: "rgba(255, 45, 85, 0.08)" },
          data: [[{ yAxis: thresholds.max_temp.yellow }, { yAxis: thresholds.max_temp.orange }]],
        },
      },
      {
        name: "压力",
        type: "line",
        yAxisIndex: 1,
        data: data.map((item) => item.pressure),
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: "#BF5AF2" },
      },
    ],
  };
}

function buildStripOption(data: BatteryPayload[]) {
  return {
    backgroundColor: "transparent",
    textStyle: { color: "#F0F2F5" },
    animation: false,
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 14, top: 22, bottom: 26 },
    xAxis: {
      type: "category",
      data: data.map((item) => formatTimestamp(item.timestamp).slice(11)),
      boundaryGap: false,
      axisLabel: { color: "#8B95A5", fontSize: 11, showMaxLabel: true, showMinLabel: true, hideOverlap: true },
      axisLine: { lineStyle: { color: "#2A3142" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#8B95A5", fontSize: 11 },
      splitLine: { lineStyle: { color: "#2A3142" } },
    },
    series: [
      {
        name: "Voltage",
        type: "line",
        data: data.map((item) => item.voltage),
        symbol: "none",
        smooth: true,
        lineStyle: { width: 2.5, color: "#0A84FF" },
        areaStyle: { color: "rgba(10, 132, 255, 0.14)" },
      },
      {
        name: "Current",
        type: "line",
        data: data.map((item) => item.current),
        symbol: "none",
        smooth: true,
        lineStyle: { width: 2.5, color: "#00D084" },
        areaStyle: { color: "rgba(0, 208, 132, 0.12)" },
      },
    ],
  };
}

function createOperationNote(action: string, detail: string) {
  return {
    id: `${action}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action,
    detail,
  };
}

function isWithinTraceWindow(target: string, center: string, windowMinutes = 20) {
  const targetMs = new Date(target).getTime();
  const centerMs = new Date(center).getTime();
  if (Number.isNaN(targetMs) || Number.isNaN(centerMs)) return false;
  return Math.abs(targetMs - centerMs) <= windowMinutes * 60 * 1000;
}

export default function Home() {
  const [alarmCenterOpen, setAlarmCenterOpen] = useState(false);
  const [alarmStatusFilter, setAlarmStatusFilter] = useState<AlarmFilter>("all");
  const [alarmLevelFilter, setAlarmLevelFilter] = useState<AlarmLevelFilter>("all");
  const [alarmMetricFilter, setAlarmMetricFilter] = useState<MetricFilter>("all");
  const [operationFilter, setOperationFilter] = useState<OperationFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [trendRange, setTrendRange] = useState<TrendRange>("24h");
  const [thresholdFeedback, setThresholdFeedback] = useState<ThresholdFeedback>("idle");
  const [channelFocusMode, setChannelFocusMode] = useState<ChannelFocusMode>("locked");
  const [trendMetricFocus, setTrendMetricFocus] = useState<MetricFilter>("all");
  const [selectedTraceTimestamp, setSelectedTraceTimestamp] = useState<string | null>(null);
  const [recentlyCompletedNotice, setRecentlyCompletedNotice] = useState<string | null>(null);
  const [workflowState, setWorkflowState] = useState<{
    balanceStatus: "idle" | "queued" | "done";
    updatedAtLabel: string | null;
    watchStatus: "idle" | "watching";
  }>({
    balanceStatus: "idle",
    updatedAtLabel: null,
    watchStatus: "idle",
  });
  const payload = useDashboardStore((state) => state.payload);
  const transport = useDashboardStore((state) => state.transport);
  const thresholds = useDashboardStore((state) => state.thresholds);
  const alarmLog = useDashboardStore((state) => state.alarmLog);
  const activeAlarms = useDashboardStore((state) => state.activeAlarms);
  const operationLog = useDashboardStore((state) => state.operationLog);
  const trend24h = useDashboardStore((state) => state.trend24h);
  const strip5m = useDashboardStore((state) => state.strip5m);
  const messageCount = useDashboardStore((state) => state.messageCount);
  const selectedChannel = useDashboardStore((state) => state.selectedChannel);
  const setTransport = useDashboardStore((state) => state.setTransport);
  const ingestPayload = useDashboardStore((state) => state.ingestPayload);
  const acknowledgeAlarm = useDashboardStore((state) => state.acknowledgeAlarm);
  const snoozeAlarm = useDashboardStore((state) => state.snoozeAlarm);
  const setThreshold = useDashboardStore((state) => state.setThreshold);
  const restoreThresholds = useDashboardStore((state) => state.restoreThresholds);
  const selectChannel = useDashboardStore((state) => state.selectChannel);
  const channels = useDerivedChannels();

  useEffect(() => {
    let mounted = true;
    let socket: WebSocket | null = null;

    const fetchInitial = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/current-data`, { cache: "no-store" });
        const initialPayload = (await response.json()) as BatteryPayload;
        if (mounted) ingestPayload(initialPayload, "rest");
      } catch {
        if (mounted) setTransport("disconnected");
      }
    };

    fetchInitial();

    socket = new WebSocket("ws://localhost:8000/ws");
    socket.onopen = () => mounted && setTransport("websocket");
    socket.onmessage = (event) => {
      if (!mounted) return;
      ingestPayload(JSON.parse(event.data) as BatteryPayload, "websocket");
    };
    socket.onerror = () => mounted && setTransport("disconnected");
    socket.onclose = () => mounted && setTransport("disconnected");

    return () => {
      mounted = false;
      socket?.close();
    };
  }, [ingestPayload, setTransport]);

  useEffect(() => {
    if (thresholdFeedback === "idle") return;
    const timer = window.setTimeout(() => setThresholdFeedback("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [thresholdFeedback]);

  const alarmCounts = useMemo(
    () => ({
      L3: activeAlarms.filter((alarm) => alarm.level === "L3" && alarm.status === "active").length,
      L2: activeAlarms.filter((alarm) => alarm.level === "L2" && alarm.status === "active").length,
      L1: activeAlarms.filter((alarm) => alarm.level === "L1" && alarm.status === "active").length,
    }),
    [activeAlarms],
  );

  const topStatus = useMemo(() => {
    if (alarmCounts.L3 > 0) return "L3";
    if (alarmCounts.L2 > 0) return "L2";
    if (alarmCounts.L1 > 0) return "L1";
    return "normal";
  }, [alarmCounts]);

  const visibleAlarms = activeAlarms.filter((alarm) => alarm.status === "active").slice(0, 3);
  const totalActiveAlarmCount = activeAlarms.filter((alarm) => alarm.status === "active").length;
  const allActiveAlarms = activeAlarms
    .filter((alarm) => alarm.status === "active")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const hiddenAlarmCount = Math.max(
    0,
    totalActiveAlarmCount - visibleAlarms.length,
  );
  const bannerStackHeight =
    visibleAlarms.length > 0
      ? visibleAlarms.length * 84 + 52 + (alarmCenterOpen ? 300 : 0) + (hiddenAlarmCount > 0 ? 28 : 0)
      : 0;

  const selectedChannelRecord =
    selectedChannel !== null ? channels.find((channel) => channel.ch === selectedChannel) ?? null : null;

  const chart24hData = trend24h.map((point) => ({
    ...point,
    timestamp: point.timestamp,
  }));
  const stripData = strip5m.map((point) => ({
    ...point,
    timestamp: point.timestamp,
  }));
  const visibleTrendData = useMemo(() => {
    if (trendRange === "5m") return stripData.slice(-60);
    if (trendRange === "1h") return chart24hData.slice(-60);
    return chart24hData;
  }, [chart24hData, stripData, trendRange]);
  const selectedTracePoint = useMemo(
    () =>
      selectedTraceTimestamp
        ? visibleTrendData.find((point) => point.timestamp === selectedTraceTimestamp) ?? null
        : null,
    [selectedTraceTimestamp, visibleTrendData],
  );
  const trendMetricCards = useMemo(
    () => [
      {
        key: "voltage" as const,
        label: "总电压",
        color: "#0A84FF",
        value: payload ? `${payload.voltage.toFixed(2)} V` : "--",
      },
      {
        key: "current" as const,
        label: "总电流",
        color: "#00D084",
        value: payload ? `${payload.current.toFixed(1)} A` : "--",
      },
      {
        key: "max_temp" as const,
        label: "最高温度",
        color: "#FF6D00",
        value: payload ? `${payload.max_temp.toFixed(1)} °C` : "--",
      },
      {
        key: "pressure" as const,
        label: "压力",
        color: "#BF5AF2",
        value: payload ? `${payload.pressure.toFixed(3)} MPa` : "--",
      },
    ],
    [payload],
  );
  const metricLevels = payload
    ? {
        voltage: evaluateMetricLevel("voltage", payload.voltage, thresholds),
        current: evaluateMetricLevel("current", payload.current, thresholds),
        cell_diff: evaluateMetricLevel("cell_diff", payload.cell_diff, thresholds),
        max_temp: evaluateMetricLevel("max_temp", payload.max_temp, thresholds),
        pressure: evaluateMetricLevel("pressure", payload.pressure, thresholds),
        soc: evaluateMetricLevel("soc", payload.soc, thresholds),
      }
    : null;
  const topStatusLabel =
    topStatus === "normal" ? "系统正常" : `${levelLabel(topStatus)} 活跃`;
  const freshnessLabel = getFreshnessLabel(payload?.timestamp);
  const criticalMetricCount = metricLevels
    ? Object.values(metricLevels).filter((level) => level !== "normal").length
    : 0;
  const thresholdsDirty = useMemo(
    () => JSON.stringify(thresholds) !== JSON.stringify(DEFAULT_THRESHOLDS),
    [thresholds],
  );
  const channelSummary = useMemo(
    () => ({
      normal: channels.filter((channel) => channel.status === "normal").length,
      warning: channels.filter((channel) => channel.status === "warning").length,
      critical: channels.filter((channel) => channel.status === "critical").length,
      offline: channels.filter((channel) => channel.status === "offline").length,
    }),
    [channels],
  );
  const latestAlarmRows = useMemo(
    () =>
      alarmLog
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .filter((alarm) => alarmStatusFilter === "all" || alarm.status === alarmStatusFilter)
        .filter((alarm) => alarmLevelFilter === "all" || alarm.level === alarmLevelFilter)
        .filter((alarm) => alarmMetricFilter === "all" || alarm.metric === alarmMetricFilter)
        .slice(0, 20),
    [alarmLevelFilter, alarmLog, alarmMetricFilter, alarmStatusFilter],
  );
  const selectedChannelMetrics = selectedChannelRecord
    ? [
        { label: "单体电压", value: `${selectedChannelRecord.voltage.toFixed(2)} V` },
        { label: "温度", value: `${selectedChannelRecord.temp.toFixed(1)} °C` },
        {
          label: "偏离均值",
          value: payload ? `${(selectedChannelRecord.voltage - payload.voltage / 16).toFixed(2)} V` : "--",
        },
        {
          label: "温升余量",
          value: payload ? `${Math.max(0, 60 - selectedChannelRecord.temp).toFixed(1)} °C` : "--",
        },
      ]
    : [];
  const selectedChannelRecentAlarms = selectedChannelRecord
    ? alarmLog
        .filter((alarm) => {
          if (alarm.metric === "max_temp") return selectedChannelRecord.temp >= (payload?.max_temp ?? 0) - 1.5;
          if (alarm.metric === "cell_diff" || alarm.metric === "voltage") return selectedChannelRecord.voltage >= 3.86;
          return false;
        })
        .slice(0, 3)
    : [];
  const selectedChannelTrend = selectedChannelRecord
    ? stripData
        .filter((point) =>
          selectedTraceTimestamp ? isWithinTraceWindow(point.timestamp, selectedTraceTimestamp, 25) : true,
        )
        .slice(-24)
        .map((point, index, points) => {
        const voltageBase = point.voltage / 16;
        const voltageOffset = (selectedChannelRecord.ch - 8.5) * 0.004;
        const voltageWave = Math.sin(index / 3) * 0.012;
        const tempBase = point.max_temp - 1.8 + ((selectedChannelRecord.ch - 1) % 3) * 0.35;
        const tempWave = Math.cos(index / 4) * 0.45;

        return {
          label: formatTimestamp(point.timestamp).slice(11, 16),
          voltage: Number((voltageBase + voltageOffset + voltageWave).toFixed(2)),
          temp: Number((tempBase + tempWave).toFixed(1)),
          progress: points.length > 1 ? index / (points.length - 1) : 0,
        };
      })
    : [];
  const visibleChannels = useMemo(() => {
    const statusPriority = { critical: 0, warning: 1, offline: 2, normal: 3 } as const;
    return channels
      .filter((channel) => {
        if (channelFilter === "all") return true;
        if (channelFilter === "abnormal") return channel.status === "critical" || channel.status === "warning";
        if (channelFilter === "critical") return channel.status === "critical";
        if (channelFilter === "normal") return channel.status === "normal";
        return true;
      })
      .slice()
      .sort((a, b) => {
        const statusDelta = statusPriority[a.status] - statusPriority[b.status];
        if (statusDelta !== 0) return statusDelta;
        if (b.temp !== a.temp) return b.temp - a.temp;
        return b.voltage - a.voltage;
      });
  }, [channelFilter, channels]);
  const highestRiskChannel = visibleChannels[0] ?? null;
  const filteredOperationLog = useMemo(
    () =>
      operationLog.filter((entry) => operationFilter === "all" || entry.action === operationFilter).slice(0, 20),
    [operationFilter, operationLog],
  );
  const traceScopedOperationLog = useMemo(() => {
    if (!selectedTraceTimestamp) return filteredOperationLog;
    return filteredOperationLog.filter((entry) => isWithinTraceWindow(entry.timestamp, selectedTraceTimestamp, 20));
  }, [filteredOperationLog, selectedTraceTimestamp]);
  const focusedChannelId = selectedChannelRecord?.ch ?? null;
  const focusOperationLog = useMemo(() => {
    if (focusedChannelId === null) return traceScopedOperationLog;
    return [
      createOperationNote(
        "数据源切换",
        `当前焦点 CH${String(focusedChannelId).padStart(2, "0")} | ${channelFocusMode === "follow-risk" ? "异常跟随" : "手动锁定"}${selectedTraceTimestamp ? " | 已锁定追溯时间" : ""}`,
      ),
      ...traceScopedOperationLog,
    ].slice(0, 20);
  }, [channelFocusMode, focusedChannelId, selectedTraceTimestamp, traceScopedOperationLog]);
  const filterSummary = useMemo(() => {
    const result: string[] = [];
    if (alarmStatusFilter !== "all") result.push(`状态: ${alarmStatusFilter}`);
    if (alarmLevelFilter !== "all") result.push(`级别: ${alarmLevelFilter}`);
    if (alarmMetricFilter !== "all") result.push(`指标: ${METRIC_LABELS[alarmMetricFilter]}`);
    if (channelFilter !== "all") result.push(`通道: ${channelFilter}`);
    if (trendMetricFocus !== "all") result.push(`趋势聚焦: ${METRIC_LABELS[trendMetricFocus]}`);
    if (selectedTraceTimestamp) result.push(`追溯: ${formatTimestamp(selectedTraceTimestamp).slice(11, 19)}`);
    return result;
  }, [alarmLevelFilter, alarmMetricFilter, alarmStatusFilter, channelFilter, selectedTraceTimestamp, trendMetricFocus]);
  const trendFocusLabel = trendMetricFocus === "all" ? "全部指标" : METRIC_LABELS[trendMetricFocus];
  const trendPointSummary = visibleTrendData.at(-1);
  const traceContextLabel = selectedTraceTimestamp ? formatTimestamp(selectedTraceTimestamp) : null;
  const traceSnapshot = selectedTracePoint
    ? {
        current: `${selectedTracePoint.current.toFixed(1)} A`,
        pressure: `${selectedTracePoint.pressure.toFixed(3)} MPa`,
        timestampLabel: formatTimestamp(selectedTracePoint.timestamp),
      }
    : null;
  const selectedChannelId = selectedChannelRecord?.ch ?? null;
  const selectedChannelVoltage = selectedChannelRecord?.voltage ?? null;
  const selectedChannelTemp = selectedChannelRecord?.temp ?? null;
  const traceChannelHint = useMemo(() => {
    if (!selectedTraceTimestamp || selectedChannelId === null) return null;
    const hintMetric =
      alarmMetricFilter === "max_temp" && selectedChannelTemp !== null
        ? `温度 ${selectedChannelTemp.toFixed(1)} °C`
        : (alarmMetricFilter === "voltage" || alarmMetricFilter === "cell_diff") && selectedChannelVoltage !== null
          ? `电压 ${selectedChannelVoltage.toFixed(2)} V`
          : null;
    return hintMetric
      ? `CH${String(selectedChannelId).padStart(2, "0")} | ${hintMetric}`
      : `CH${String(selectedChannelId).padStart(2, "0")}`;
  }, [alarmMetricFilter, selectedChannelId, selectedChannelTemp, selectedChannelVoltage, selectedTraceTimestamp]);
  const taskQueueItems = useMemo(() => {
    const items: Array<{
      key: string;
      priority: "L3" | "L2" | "L1";
      tone: "cyan" | "purple" | "amber" | "red";
      title: string;
      detail: string;
    }> = [];

    if (alarmCounts.L3 > 0 && selectedTraceTimestamp) {
      items.push({
        key: "l3-trace",
        priority: "L3",
        tone: "red",
        title: "L3 优先追溯",
        detail: formatTimestamp(selectedTraceTimestamp),
      });
    } else if (selectedTraceTimestamp) {
      items.push({
        key: "trace",
        priority: "L2",
        tone: "purple",
        title: "追溯时间已锁定",
        detail: formatTimestamp(selectedTraceTimestamp),
      });
    }

    if (workflowState.watchStatus === "watching" && selectedChannelId !== null) {
      items.push({
        key: "watch",
        priority: alarmCounts.L3 > 0 ? "L3" : "L2",
        tone: "cyan",
        title: `重点观察 CH${String(selectedChannelId).padStart(2, "0")}`,
        detail: traceChannelHint ?? "建议持续观察近场趋势",
      });
    }

    if (workflowState.balanceStatus === "queued" && selectedChannelId !== null) {
      items.push({
        key: "balance",
        priority: alarmCounts.L3 > 0 ? "L3" : "L1",
        tone: "amber",
        title: `均衡建议待复核 CH${String(selectedChannelId).padStart(2, "0")}`,
        detail: "优先复核压差、温升与采样一致性",
      });
    }

    const priorityOrder = { L3: 0, L2: 1, L1: 2 } as const;
    return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [alarmCounts.L3, selectedChannelId, selectedTraceTimestamp, traceChannelHint, workflowState.balanceStatus, workflowState.watchStatus]);

  useEffect(() => {
    if (!recentlyCompletedNotice) return;
    const timer = window.setTimeout(() => setRecentlyCompletedNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [recentlyCompletedNotice]);

  const applyMetricFocus = (metric: MetricFilter) => {
    setTrendMetricFocus(metric);
    setAlarmMetricFilter(metric);
    setAlarmStatusFilter("all");
  };

  useEffect(() => {
    if (channelFocusMode !== "follow-risk") return;
    if (!highestRiskChannel) return;
    if (selectedChannel !== highestRiskChannel.ch) {
      selectChannel(highestRiskChannel.ch);
    }
  }, [channelFocusMode, highestRiskChannel, selectChannel, selectedChannel]);

  const navigateChannel = (direction: "prev" | "next") => {
    if (!selectedChannelRecord || visibleChannels.length === 0) return;
    const currentIndex = visibleChannels.findIndex((channel) => channel.ch === selectedChannelRecord.ch);
    if (currentIndex === -1) return;
    const nextIndex =
      direction === "next"
        ? (currentIndex + 1) % visibleChannels.length
        : (currentIndex - 1 + visibleChannels.length) % visibleChannels.length;
    selectChannel(visibleChannels[nextIndex].ch);
  };

  const clearFilters = () => {
    setAlarmStatusFilter("all");
    setAlarmLevelFilter("all");
    setAlarmMetricFilter("all");
    setOperationFilter("all");
    setChannelFilter("all");
    setTrendMetricFocus("all");
    setSelectedTraceTimestamp(null);
  };

  const clearTaskQueue = () => {
    setWorkflowState({
      balanceStatus: "idle",
      updatedAtLabel: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      watchStatus: "idle",
    });
    setSelectedTraceTimestamp(null);
    setOperationFilter("all");
  };

  const handleChannelQuickAction = (action: "watch" | "balance") => {
    if (!selectedChannelRecord) return;
    let note = "";
    let actionType: "确认告警" | "修改阈值";

    if (action === "watch") {
      const nextWatchStatus = workflowState.watchStatus === "watching" ? "idle" : "watching";
      setWorkflowState((state) => ({
        ...state,
        watchStatus: nextWatchStatus,
        updatedAtLabel: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      }));
      if (nextWatchStatus === "idle") {
        setRecentlyCompletedNotice(`CH${String(selectedChannelRecord.ch).padStart(2, "0")} 重点观察刚刚完成`);
      }
      note =
        nextWatchStatus === "watching"
          ? `CH${String(selectedChannelRecord.ch).padStart(2, "0")} 已加入重点观察，建议跟踪未来 30 分钟趋势`
          : `CH${String(selectedChannelRecord.ch).padStart(2, "0")} 已移出重点观察，恢复常规巡检节奏`;
      actionType = "确认告警";
      setOperationFilter("确认告警");
    } else {
      const nextBalanceStatus =
        workflowState.balanceStatus === "idle"
          ? "queued"
          : workflowState.balanceStatus === "queued"
            ? "done"
            : "queued";
      setWorkflowState((state) => ({
        ...state,
        balanceStatus: nextBalanceStatus,
        updatedAtLabel: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      }));
      if (nextBalanceStatus === "done") {
        setRecentlyCompletedNotice(`CH${String(selectedChannelRecord.ch).padStart(2, "0")} 均衡复核刚刚完成`);
      }
      note =
        nextBalanceStatus === "queued"
          ? `CH${String(selectedChannelRecord.ch).padStart(2, "0")} 生成均衡建议，优先复核温升与压差`
          : `CH${String(selectedChannelRecord.ch).padStart(2, "0")} 完成均衡复核，建议回看趋势确认处理效果`;
      actionType = "修改阈值";
      setOperationFilter("修改阈值");
      setAlarmMetricFilter("cell_diff");
    }

    const operation = createOperationNote(actionType, note);
    useDashboardStore.setState((state) => ({
      operationLog: [operation, ...state.operationLog].slice(0, 60),
    }));
  };

  const handleAlarmRowSelect = (alarm: {
    metric: MetricKey;
    timestamp: string;
  }) => {
    applyMetricFocus(alarm.metric);
    setSelectedTraceTimestamp(alarm.timestamp);

    const relatedChannel =
      alarm.metric === "max_temp"
        ? channels
            .slice()
            .sort((a, b) => b.temp - a.temp)[0]
        : alarm.metric === "voltage" || alarm.metric === "cell_diff"
          ? channels
              .slice()
              .sort((a, b) => b.voltage - a.voltage)[0]
          : selectedChannelRecord ?? channels[0];

    if (relatedChannel) {
      selectChannel(relatedChannel.ch);
    }
  };

  const handleAlarmTableAction = (
    alarm: { id: string; level: AlarmLevel; metric: MetricKey; timestamp: string },
    action: "acknowledge" | "snooze" | "watch",
  ) => {
    handleAlarmRowSelect(alarm);

    if (action === "acknowledge") {
      acknowledgeAlarm(alarm.id);
      setAlarmStatusFilter("acknowledged");
      setAlarmLevelFilter(alarm.level === "normal" ? "all" : alarm.level);
      return;
    }

    if (action === "snooze") {
      snoozeAlarm(alarm.id);
      setAlarmStatusFilter("snoozed");
      setAlarmLevelFilter(alarm.level === "normal" ? "all" : alarm.level);
      return;
    }

    setWorkflowState((state) => ({
      ...state,
      watchStatus: "watching",
      updatedAtLabel: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    }));
    useDashboardStore.setState((state) => ({
      operationLog: [
        createOperationNote("确认告警", `${METRIC_LABELS[alarm.metric]} 已加入重点观察队列`),
        ...state.operationLog,
      ].slice(0, 60),
    }));
    setOperationFilter("确认告警");
  };

  const trendChartEvents = {
    click: (params: { seriesName?: string; dataIndex?: number }) => {
      const metricMap: Record<string, MetricKey> = {
        总电压: "voltage",
        总电流: "current",
        最高温度: "max_temp",
        压力: "pressure",
      };
      const metric = params.seriesName ? metricMap[params.seriesName] : undefined;
      if (!metric) return;
      applyMetricFocus(trendMetricFocus === metric ? "all" : metric);
      const selectedPoint =
        typeof params.dataIndex === "number" ? visibleTrendData[params.dataIndex] : undefined;
      if (selectedPoint) {
        setSelectedTraceTimestamp((current) =>
          current === selectedPoint.timestamp ? null : selectedPoint.timestamp,
        );
      }
    },
    legendselectchanged: (params: { name?: string }) => {
      const metricMap: Record<string, MetricKey> = {
        总电压: "voltage",
        总电流: "current",
        最高温度: "max_temp",
        压力: "pressure",
      };
      const metric = params.name ? metricMap[params.name] : undefined;
      if (!metric) return;
      applyMetricFocus(metric);
    },
  };

  return (
    <main className="min-h-screen bg-background px-2.5 py-2.5 text-foreground md:px-4 md:py-3">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-2.5 md:gap-3">
        <AlarmCenter
          alarmCenterOpen={alarmCenterOpen}
          alarmCounts={alarmCounts}
          allActiveAlarms={allActiveAlarms.map((alarm) => ({
            ...alarm,
            timestamp: formatTimestamp(alarm.timestamp),
          }))}
          bannerStackHeight={bannerStackHeight}
          hiddenAlarmCount={hiddenAlarmCount}
          onAcknowledge={(alarm) => {
            acknowledgeAlarm(alarm.id);
            setAlarmStatusFilter("acknowledged");
            setAlarmLevelFilter(alarm.level);
          }}
          onSnooze={(alarm) => {
            snoozeAlarm(alarm.id);
            setAlarmStatusFilter("snoozed");
            setAlarmLevelFilter(alarm.level);
          }}
          onToggleOpen={() => setAlarmCenterOpen((open) => !open)}
          totalActiveAlarmCount={totalActiveAlarmCount}
          visibleAlarms={visibleAlarms.map((alarm) => ({
            ...alarm,
            timestamp: formatTimestamp(alarm.timestamp),
          }))}
        />

        <TopOverview
          alarmCounts={alarmCounts}
          channelSummary={channelSummary}
          criticalMetricCount={criticalMetricCount}
          freshnessLabel={freshnessLabel}
          levelColors={LEVEL_COLORS}
          onAlarmLevelSelect={(level) => {
            setAlarmCenterOpen(true);
            setAlarmLevelFilter(level);
          }}
          onChannelFilterSelect={setChannelFilter}
          topStatus={topStatus}
          topStatusLabel={topStatusLabel}
        />

        <section className="rounded-lg border border-[#2A3142] bg-[#151A25]/95 p-2.5 md:p-3">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold text-[#F0F2F5]">当前处理任务</div>
              <div className="mt-1 text-xs text-[#8B95A5]">
                把正在追溯、观察和待复核的动作集中在一条带里，避免处理上下文散掉。
              </div>
              {recentlyCompletedNotice ? (
                <div className="mt-2 inline-flex rounded-full border border-[#00D084]/30 bg-[#00D084]/10 px-2.5 py-1 text-[11px] text-[#CFFAEA]">
                  刚刚完成: {recentlyCompletedNotice}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedChannelId !== null ? (
                <button
                  onClick={() => selectChannel(selectedChannelId)}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#D6DCE7] transition hover:bg-white/10"
                >
                  回到焦点通道
                </button>
              ) : null}
              {selectedTraceTimestamp ? (
                <button
                  onClick={() => setSelectedTraceTimestamp(null)}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#D6DCE7] transition hover:bg-white/10"
                >
                  清除追溯时间
                </button>
              ) : null}
              <button
                onClick={clearTaskQueue}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#D6DCE7] transition hover:bg-white/10"
              >
                清空任务条
              </button>
            </div>
          </div>
          <div className="mt-2.5 grid gap-2 md:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]">
            <div className="rounded-lg border border-[#2A3142] bg-[rgba(15,20,29,0.72)] px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">处理概况</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#D6DCE7]">
                  任务 {taskQueueItems.length}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#D6DCE7]">
                  活跃告警 {totalActiveAlarmCount}
                </span>
                {workflowState.updatedAtLabel ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#AAB4C5]">
                    最近动作 {workflowState.updatedAtLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-xs text-[#8B95A5]">
                {taskQueueItems.length > 0
                  ? "优先处理右侧卡片中的待办，处理完后可以直接在这里清空或切回焦点通道。"
                  : "当前没有挂起任务，可以从趋势图或告警表继续发起处理。"}
              </div>
            </div>
            {taskQueueItems.length > 0 ? (
              taskQueueItems.map((item) => (
                <div
                  key={item.key}
                  className="rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor:
                      item.tone === "red"
                        ? "rgba(255,45,85,0.42)"
                        : item.tone === "cyan"
                        ? "rgba(0,240,255,0.28)"
                        : item.tone === "purple"
                          ? "rgba(112,0,255,0.28)"
                          : "rgba(255,184,0,0.28)",
                    backgroundColor:
                      item.tone === "red"
                        ? "rgba(255,45,85,0.14)"
                        : item.tone === "cyan"
                        ? "rgba(0,240,255,0.08)"
                        : item.tone === "purple"
                          ? "rgba(112,0,255,0.08)"
                          : "rgba(255,184,0,0.08)",
                  }}
                >
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">
                    {item.priority} {item.tone === "cyan" ? "观察任务" : item.tone === "purple" || item.tone === "red" ? "追溯任务" : "复核任务"}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[#F0F2F5]">{item.title}</div>
                  <div className="mt-2 text-xs text-[#AAB4C5]">{item.detail}</div>
                </div>
              ))
            ) : (
              <>
                <div className="rounded-lg border border-dashed border-[#2A3142] bg-[rgba(15,20,29,0.42)] px-3 py-2.5 text-xs text-[#8B95A5]">
                  没有重点观察任务
                </div>
                <div className="rounded-lg border border-dashed border-[#2A3142] bg-[rgba(15,20,29,0.42)] px-3 py-2.5 text-xs text-[#8B95A5]">
                  没有锁定追溯时间
                </div>
                <div className="rounded-lg border border-dashed border-[#2A3142] bg-[rgba(15,20,29,0.42)] px-3 py-2.5 text-xs text-[#8B95A5]">
                  没有待复核均衡建议
                </div>
              </>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-lg border border-[#2A3142] bg-[#151A25]/95 p-2.5 md:p-3">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-[#8B95A5]">工业电池监控系统</div>
              <h1 className="mt-1.5 text-[1.7rem] font-semibold text-[#F0F2F5]">
                化成 / 储能 电池监控总览
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-[#8B95A5]">
                面向值班与巡检场景的实时监控界面，覆盖关键指标扫描、告警处理、阈值配置、
                通道追踪与趋势分析。
              </p>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg border border-[#2A3142] bg-[#0F141D] px-3 py-2.5 text-sm text-[#8B95A5]">
              <RefreshCcw className="size-4 text-[#0A84FF]" />
              数据链路: {transport} | 消息计数: {messageCount}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {KPI_META.map(({ key, icon: Icon, unit, detail }) => {
              const value = payload?.[key] ?? 0;
              const metricLevel = metricLevels?.[key] ?? "normal";
              const borderColor = LEVEL_COLORS[metricLevel];
              const level = levelLabel(metricLevel);
              const statusDotClass = LEVEL_RING_CLASS[metricLevel];
              const detailLabel =
                key === "current"
                  ? value >= 0
                    ? "↑充电"
                    : "↓放电"
                  : detail;

              return (
                <div
                  key={key}
                  onClick={() => {
                    setAlarmMetricFilter(key);
                    setAlarmStatusFilter("all");
                  }}
                  className="rounded-lg border bg-[rgba(15,20,29,0.82)] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.22)] backdrop-blur-md"
                  style={{ borderColor: `${borderColor ?? "#2A3142"}80` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-[#8B95A5]">{METRIC_LABELS[key]}</div>
                      <div className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-[#AAB4C5]">
                        {unit}
                      </div>
                    </div>
                    <div className="rounded-md border border-[#2A3142] bg-[#151A25] p-2 text-[#0A84FF]">
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <div className="mt-4 text-[1.8rem] font-semibold leading-none text-[#F0F2F5] md:text-[2rem]">
                    {formatMetricValue(key, value)}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#8B95A5]">
                    <span className="truncate">{detailLabel}</span>
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#D6DCE7]">
                      <span className={`size-2 rounded-full ${statusDotClass}`} />
                      {level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-2.5 xl:grid-cols-[1.6fr_1fr] xl:gap-3">
          <div className="rounded-lg border border-[#2A3142] bg-[#151A25]/95 p-2.5 md:p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#F0F2F5]">24h 趋势图</div>
                <div className="text-xs text-[#8B95A5]">总电压 / 总电流 / 最高温度 / 压力阈值联动趋势</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: "5m", value: "5m" },
                  { label: "1h", value: "1h" },
                  { label: "24h", value: "24h" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTrendRange(option.value as TrendRange)}
                    className="rounded-full border px-2.5 py-1 text-xs transition"
                    style={{
                      borderColor: trendRange === option.value ? "#00f0ff" : "#2A3142",
                      backgroundColor: trendRange === option.value ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.03)",
                      color: trendRange === option.value ? "#F0F2F5" : "#8B95A5",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
                <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#8B95A5]">
                  {visibleTrendData.length} 点
                </div>
              </div>
            </div>
            <div className="mb-2.5 grid gap-2 md:grid-cols-4">
              {trendMetricCards.map((metric) => {
                const active = trendMetricFocus === metric.key;
                return (
                  <button
                    key={metric.key}
                    onClick={() => {
                      applyMetricFocus(trendMetricFocus === metric.key ? "all" : metric.key);
                    }}
                    className="rounded-lg border px-3 py-2 text-left transition"
                    style={{
                      borderColor: active ? metric.color : "#2A3142",
                      backgroundColor: active ? `${metric.color}18` : "rgba(15,20,29,0.72)",
                    }}
                  >
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">{metric.label}</div>
                    <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">{metric.value}</div>
                  </button>
                );
              })}
            </div>
            <div className="mb-2.5 grid gap-2 md:grid-cols-3">
              <div className="rounded-lg border border-[#2A3142] bg-[rgba(15,20,29,0.72)] px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">电压预警带</div>
                <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">
                  {thresholds.voltage.yellow.toFixed(1)} - {thresholds.voltage.orange.toFixed(1)} V
                </div>
              </div>
              <div className="rounded-lg border border-[#2A3142] bg-[rgba(15,20,29,0.72)] px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">温度告警带</div>
                <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">
                  {thresholds.max_temp.yellow.toFixed(1)} - {thresholds.max_temp.orange.toFixed(1)} °C
                </div>
              </div>
              <div className="rounded-lg border border-[#2A3142] bg-[rgba(15,20,29,0.72)] px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">最新采样时间</div>
                <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">
                  {payload ? formatTimestamp(payload.timestamp).slice(11) : "--"}
                </div>
              </div>
            </div>
            <div className="mb-2.5 grid gap-2 md:grid-cols-[1.2fr_1fr]">
              <div className="rounded-lg border border-[#2A3142] bg-[rgba(15,20,29,0.72)] px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">趋势交互上下文</div>
                <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">{trendFocusLabel}</div>
                <div className="mt-1 text-xs text-[#8B95A5]">
                  点击曲线或图例可切换聚焦，点中某个时刻后会锁定右侧详情与下方日志的时间上下文。
                </div>
              </div>
              <div className="rounded-lg border border-[#2A3142] bg-[rgba(15,20,29,0.72)] px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">
                  {traceContextLabel ? "锁定追溯时刻" : "当前采样摘要"}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">
                  {(selectedTracePoint ?? trendPointSummary)
                    ? `${(selectedTracePoint ?? trendPointSummary)!.voltage.toFixed(1)} V / ${(selectedTracePoint ?? trendPointSummary)!.max_temp.toFixed(1)} °C`
                    : "--"}
                </div>
                <div className="mt-1 text-xs text-[#8B95A5]">
                  {(selectedTracePoint ?? trendPointSummary)
                    ? `I ${(selectedTracePoint ?? trendPointSummary)!.current.toFixed(1)} A | P ${(selectedTracePoint ?? trendPointSummary)!.pressure.toFixed(3)} MPa`
                    : "等待数据"}
                </div>
                {traceChannelHint ? (
                  <div className="mt-1 text-[11px] text-[#AAB4C5]">{traceChannelHint}</div>
                ) : null}
              </div>
            </div>
            <ReactECharts
              option={buildTrendOption(visibleTrendData, thresholds)}
              style={{ height: 286 }}
              onEvents={trendChartEvents}
            />
          </div>

          <div className="rounded-lg border border-[#2A3142] bg-[#151A25]/95 p-2.5 md:p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#F0F2F5]">实时 Strip</div>
                <div className="text-xs text-[#8B95A5]">最近 5 分钟实时采样带 / 300 点缓冲</div>
              </div>
              <Clock3 className="size-4 text-[#8B95A5]" />
            </div>
            <ReactECharts option={buildStripOption(stripData)} style={{ height: 286 }} />
          </div>
        </section>

        <section className="grid gap-2.5 xl:grid-cols-[1.5fr_1fr] xl:gap-3">
          <div className="rounded-lg border border-[#2A3142] bg-[#151A25]/95 p-2.5 md:p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#F0F2F5]">16 通道概览</div>
                <div className="text-xs text-[#8B95A5]">异常通道优先排序，支持按健康状态快速筛选</div>
              </div>
              <ChevronRight className="size-4 text-[#8B95A5]" />
            </div>
            <div className="mb-2.5 flex flex-wrap gap-2">
              {[
                { label: "全部", value: "all" },
                { label: "异常优先", value: "abnormal" },
                { label: "仅严重", value: "critical" },
                { label: "仅正常", value: "normal" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setChannelFilter(option.value as ChannelFilter)}
                  className="rounded-full border px-3 py-1 text-xs transition"
                  style={{
                    borderColor: channelFilter === option.value ? "#00f0ff" : "#2A3142",
                    backgroundColor: channelFilter === option.value ? "rgba(0,240,255,0.12)" : "transparent",
                    color: channelFilter === option.value ? "#F0F2F5" : "#8B95A5",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-2.5">
                {visibleChannels.map((channel) => {
                const color = CHANNEL_STATUS_COLORS[channel.status];
                return (
                  <button
                    key={channel.ch}
                    onClick={() => selectChannel(channel.ch)}
                    className="rounded-lg border border-[#2A3142] bg-[rgba(15,20,29,0.82)] p-2.5 text-left transition hover:border-[#0A84FF] hover:bg-[rgba(18,25,40,0.92)]"
                    style={{
                      boxShadow:
                        selectedChannel === channel.ch ? "0 0 0 1px rgba(10,132,255,0.35)" : "none",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[#F0F2F5]">CH{String(channel.ch).padStart(2, "0")}</div>
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                    </div>
                    <div className="mt-2.5 text-sm text-[#F0F2F5]">{channel.voltage.toFixed(2)} V</div>
                    <div className="mt-1 text-xs text-[#8B95A5]">{channel.temp.toFixed(1)} °C</div>
                  </button>
                );
              })}
            </div>
          </div>

          <ChannelDetailPanel
            channelFocusMode={channelFocusMode}
            onFocusModeChange={setChannelFocusMode}
            onNavigateChannel={navigateChannel}
            onQuickAction={handleChannelQuickAction}
            payloadTimestamp={payload ? formatTimestamp(payload.timestamp) : null}
            recentAlarms={selectedChannelRecentAlarms.map((alarm) => ({
              ...alarm,
              timestamp: formatTimestamp(alarm.timestamp),
            }))}
            selectedChannelMetrics={selectedChannelMetrics}
            selectedChannelRecord={selectedChannelRecord}
            selectedChannelTrend={selectedChannelTrend}
            traceSnapshot={traceSnapshot}
            workflowState={workflowState}
          />
        </section>

        <AlarmAndLogPanel
          alarmLevelFilter={alarmLevelFilter}
          alarmMetricFilter={alarmMetricFilter}
          alarmStatusFilter={alarmStatusFilter}
          filterSummary={filterSummary}
          filteredOperationLog={focusOperationLog.map((entry) => ({
            ...entry,
            timestamp: formatTimestamp(entry.timestamp),
          }))}
          latestAlarmRows={latestAlarmRows.map((alarm) => ({
            ...alarm,
            timestamp: formatTimestamp(alarm.timestamp),
          }))}
          traceContextLabel={traceContextLabel}
          onAlarmAction={handleAlarmTableAction}
          onAlarmRowSelect={handleAlarmRowSelect}
          onClearFilters={clearFilters}
          onAlarmLevelFilterChange={setAlarmLevelFilter}
          onAlarmMetricFilterChange={setAlarmMetricFilter}
          onAlarmStatusFilterChange={setAlarmStatusFilter}
          onExport={() =>
            exportCsv(
              latestAlarmRows.map((alarm) => ({
                time: formatTimestamp(alarm.timestamp),
                metric: alarm.metric,
                value: alarm.value,
                threshold: alarm.threshold,
                level: alarm.level,
                status: alarm.status,
                operator: alarm.operator,
              })),
            )
          }
          onOperationFilterChange={setOperationFilter}
          onRestoreThresholds={() => {
            restoreThresholds();
            setThresholdFeedback("restored");
          }}
          onSetThreshold={(metric, key, value) => {
            setThreshold(metric as never, key as never, value);
            setThresholdFeedback("edited");
          }}
          operationFilter={operationFilter}
          thresholdFeedback={thresholdFeedback}
          thresholds={thresholds}
          thresholdsDirty={thresholdsDirty}
        />
      </div>
    </main>
  );
}
