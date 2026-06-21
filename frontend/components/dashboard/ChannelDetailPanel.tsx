"use client";

import { BellRing, ChevronLeft, ChevronRight, LocateFixed, ShieldAlert } from "lucide-react";

import { LEVEL_COLORS, METRIC_LABELS, type AlarmRecord, type ChannelRecord } from "@/lib/battery-dashboard";

type ChannelTrendPoint = {
  label: string;
  temp: number;
  voltage: number;
};

type ChannelWorkflowState = {
  balanceStatus: "idle" | "queued" | "done";
  updatedAtLabel: string | null;
  watchStatus: "idle" | "watching";
};

type TraceSnapshot = {
  current: string;
  pressure: string;
  timestampLabel: string;
};

type ChannelDetailPanelProps = {
  onNavigateChannel: (direction: "prev" | "next") => void;
  channelFocusMode: "locked" | "follow-risk";
  onFocusModeChange: (mode: "locked" | "follow-risk") => void;
  onQuickAction: (action: "watch" | "balance") => void;
  workflowState: ChannelWorkflowState;
  payloadTimestamp?: string | null;
  recentAlarms: AlarmRecord[];
  selectedChannelRecord: ChannelRecord | null;
  selectedChannelMetrics: Array<{ label: string; value: string }>;
  selectedChannelTrend: ChannelTrendPoint[];
  traceSnapshot: TraceSnapshot | null;
};

const CHANNEL_STATUS_COLORS = {
  normal: "#00D084",
  warning: "#FFB800",
  critical: "#FF2D55",
  offline: "#8B95A5",
} as const;

export function ChannelDetailPanel({
  onNavigateChannel,
  channelFocusMode,
  onFocusModeChange,
  onQuickAction,
  workflowState,
  payloadTimestamp,
  recentAlarms,
  selectedChannelRecord,
  selectedChannelMetrics,
  selectedChannelTrend,
  traceSnapshot,
}: ChannelDetailPanelProps) {
  return (
    <div className="rounded-lg border border-[#2A3142] bg-[#151A25]/95 p-2.5 md:p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[#F0F2F5]">通道详情</div>
          <div className="text-xs text-[#8B95A5]">聚焦设备面板与关联风险摘要</div>
        </div>
        <BellRing className="size-4 text-[#8B95A5]" />
      </div>
      <div className="mb-2.5 flex flex-wrap gap-2">
        {[
          { label: "锁定当前", value: "locked" },
          { label: "跟随异常", value: "follow-risk" },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => onFocusModeChange(option.value as "locked" | "follow-risk")}
            className="rounded-full border px-3 py-1 text-xs transition"
            style={{
              borderColor: channelFocusMode === option.value ? "#00f0ff" : "#2A3142",
              backgroundColor: channelFocusMode === option.value ? "rgba(0,240,255,0.12)" : "transparent",
              color: channelFocusMode === option.value ? "#F0F2F5" : "#8B95A5",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      {selectedChannelRecord ? (
        <div className="space-y-2.5 rounded-lg border border-[#2A3142] bg-[#0F141D] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-[#F0F2F5]">
                CH{String(selectedChannelRecord.ch).padStart(2, "0")}
              </div>
              <div className="mt-1 text-xs text-[#8B95A5]">
                Rack A / Formation Zone / Cell Group {String(selectedChannelRecord.ch).padStart(2, "0")}
              </div>
              <div className="mt-2 text-[11px] text-[#8B95A5]">
                {channelFocusMode === "follow-risk" ? "当前处于异常跟随模式" : "当前处于手动锁定模式"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateChannel("prev")}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-[#D6DCE7] transition hover:bg-white/10"
              >
                <ChevronLeft className="size-3.5" />
                上一通道
              </button>
              <button
                onClick={() => onNavigateChannel("next")}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-[#D6DCE7] transition hover:bg-white/10"
              >
                下一通道
                <ChevronRight className="size-3.5" />
              </button>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#D6DCE7]">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: CHANNEL_STATUS_COLORS[selectedChannelRecord.status] }}
                />
                {selectedChannelRecord.status}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {selectedChannelMetrics.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[#2A3142] bg-[rgba(21,26,37,0.82)] px-3 py-2"
              >
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">{item.label}</div>
                <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <button
              onClick={() => onQuickAction("watch")}
              className="inline-flex items-center justify-between rounded-lg border border-[#2A3142] bg-[rgba(21,26,37,0.82)] px-3 py-2.5 text-left text-sm text-[#F0F2F5] transition hover:border-[#00f0ff]/50 hover:bg-[rgba(0,240,255,0.08)]"
            >
              <span className="inline-flex items-center gap-2">
                <LocateFixed className="size-4 text-[#00f0ff]" />
                {workflowState.watchStatus === "watching" ? "取消重点观察" : "加入重点观察"}
              </span>
              <span className="text-xs text-[#8B95A5]">
                {workflowState.watchStatus === "watching" ? "观察中" : "开始跟踪"}
              </span>
            </button>
            <button
              onClick={() => onQuickAction("balance")}
              className="inline-flex items-center justify-between rounded-lg border border-[#2A3142] bg-[rgba(21,26,37,0.82)] px-3 py-2.5 text-left text-sm text-[#F0F2F5] transition hover:border-[#7000ff]/50 hover:bg-[rgba(112,0,255,0.10)]"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldAlert className="size-4 text-[#BF5AF2]" />
                {workflowState.balanceStatus === "idle"
                  ? "生成均衡建议"
                  : workflowState.balanceStatus === "queued"
                    ? "完成均衡复核"
                    : "重开均衡建议"}
              </span>
              <span className="text-xs text-[#8B95A5]">
                {workflowState.balanceStatus === "idle"
                  ? "辅助动作"
                  : workflowState.balanceStatus === "queued"
                    ? "待处理"
                    : "已完成"}
              </span>
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-[1.2fr_1fr]">
            <div className="rounded-lg border border-[#2A3142] bg-[rgba(21,26,37,0.82)] p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.12em] text-[#8B95A5]">处理状态</div>
                <div className="text-xs text-[#8B95A5]">{workflowState.updatedAtLabel ?? "等待动作"}</div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span
                  className="rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    borderColor: workflowState.watchStatus === "watching" ? "rgba(0,240,255,0.35)" : "rgba(255,255,255,0.1)",
                    backgroundColor: workflowState.watchStatus === "watching" ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)",
                    color: workflowState.watchStatus === "watching" ? "#D6FCFF" : "#8B95A5",
                  }}
                >
                  {workflowState.watchStatus === "watching" ? "重点观察中" : "未加入观察"}
                </span>
                <span
                  className="rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    borderColor:
                      workflowState.balanceStatus === "queued"
                        ? "rgba(112,0,255,0.35)"
                        : workflowState.balanceStatus === "done"
                          ? "rgba(0,208,132,0.35)"
                          : "rgba(255,255,255,0.1)",
                    backgroundColor:
                      workflowState.balanceStatus === "queued"
                        ? "rgba(112,0,255,0.12)"
                        : workflowState.balanceStatus === "done"
                          ? "rgba(0,208,132,0.12)"
                          : "rgba(255,255,255,0.04)",
                    color:
                      workflowState.balanceStatus === "queued"
                        ? "#E6D7FF"
                        : workflowState.balanceStatus === "done"
                          ? "#CFFAEA"
                          : "#8B95A5",
                  }}
                >
                  {workflowState.balanceStatus === "idle"
                    ? "未生成均衡建议"
                    : workflowState.balanceStatus === "queued"
                      ? "均衡建议待处理"
                      : "均衡建议已闭环"}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-[#2A3142] bg-[rgba(21,26,37,0.42)] p-2.5 text-xs text-[#8B95A5]">
              {workflowState.watchStatus === "watching"
                ? "该通道已进入重点观察队列，建议结合下方近场趋势继续跟踪热稳定性。"
                : workflowState.balanceStatus === "queued"
                  ? "均衡建议已生成，下一步适合复核压差与采样一致性。"
                  : workflowState.balanceStatus === "done"
                    ? "本轮均衡复核已完成，可以回到趋势区检查处理前后变化。"
                    : "先加入观察或生成均衡建议，右侧日志会同步留下处理痕迹。"}
            </div>
          </div>
          <div className="rounded-lg border border-[#2A3142] bg-[rgba(21,26,37,0.82)] p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.12em] text-[#8B95A5]">近场趋势</div>
              <div className="text-xs text-[#8B95A5]">最近 24 个采样点</div>
            </div>
            <div className="mt-2.5 space-y-2.5">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-[#8B95A5]">
                  <span>Voltage</span>
                  <span>{selectedChannelRecord.voltage.toFixed(2)} V</span>
                </div>
                <div className="flex h-9 items-end gap-1">
                  {selectedChannelTrend.map((point, index) => (
                    <div
                      key={`voltage-${index}`}
                      className="flex-1 rounded-sm bg-[#00f0ff]/60"
                      style={{ height: `${Math.max(16, (point.voltage / 4.1) * 100)}%` }}
                      title={`${point.label} ${point.voltage.toFixed(2)}V`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-[#8B95A5]">
                  <span>Temp</span>
                  <span>{selectedChannelRecord.temp.toFixed(1)} °C</span>
                </div>
                <div className="flex h-9 items-end gap-1">
                  {selectedChannelTrend.map((point, index) => (
                    <div
                      key={`temp-${index}`}
                      className="flex-1 rounded-sm bg-[#7000ff]/65"
                      style={{ height: `${Math.max(16, (point.temp / 60) * 100)}%` }}
                      title={`${point.label} ${point.temp.toFixed(1)}°C`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[#2A3142] bg-[rgba(21,26,37,0.82)] p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.12em] text-[#8B95A5]">健康评估</div>
              <div className="text-xs text-[#8B95A5]">{traceSnapshot?.timestampLabel ?? payloadTimestamp ?? "--"}</div>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#1A2233]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(12, Math.min(100, 100 - selectedChannelRecord.temp))}%`,
                  background:
                    selectedChannelRecord.status === "critical"
                      ? "#FF2D55"
                      : selectedChannelRecord.status === "warning"
                        ? "#FFB800"
                        : "#00D084",
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[#8B95A5]">
              <span>热稳定性 / 电压一致性</span>
              <span>
                {selectedChannelRecord.status === "critical"
                  ? "需要处理"
                  : selectedChannelRecord.status === "warning"
                    ? "建议关注"
                    : "运行平稳"}
              </span>
            </div>
            {traceSnapshot ? (
              <div className="mt-2.5 grid gap-2 md:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">追溯电流</div>
                  <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">{traceSnapshot.current}</div>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B95A5]">追溯压力</div>
                  <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">{traceSnapshot.pressure}</div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-[#2A3142] bg-[rgba(21,26,37,0.82)] p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.12em] text-[#8B95A5]">最近关联告警</div>
              <div className="text-xs text-[#8B95A5]">{recentAlarms.length} 条</div>
            </div>
            <div className="mt-2 space-y-1.5">
              {recentAlarms.length > 0 ? (
                recentAlarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className="rounded-md border px-2.5 py-2 text-xs"
                    style={{
                      borderColor: `${LEVEL_COLORS[alarm.level]}40`,
                      backgroundColor: `${LEVEL_COLORS[alarm.level]}10`,
                    }}
                  >
                    <div className="font-medium" style={{ color: LEVEL_COLORS[alarm.level] }}>
                      [{alarm.level}] {METRIC_LABELS[alarm.metric]}
                    </div>
                    <div className="mt-1 text-[#8B95A5]">{alarm.timestamp}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-[#2A3142] px-2.5 py-2 text-xs text-[#8B95A5]">
                  当前通道暂无直接关联告警。
                </div>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-[#2A3142] bg-[rgba(21,26,37,0.42)] p-2.5 text-xs text-[#8B95A5]">
            建议动作:{" "}
            {selectedChannelRecord.temp > 45
              ? "检查温控与接触电阻"
              : selectedChannelRecord.voltage > 3.88
                ? "复核均衡状态与采样精度"
                : "继续观察实时趋势"}
            。
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#2A3142] bg-[#0F141D] p-4 text-sm text-[#8B95A5]">
          点击左侧通道卡片查看详细信息。
        </div>
      )}
    </div>
  );
}
