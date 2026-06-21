"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";

import { LEVEL_COLORS, METRIC_LABELS, type AlarmRecord } from "@/lib/battery-dashboard";
import { formatMetricValue } from "@/lib/dashboard-ui";

type AlarmCenterProps = {
  alarmCenterOpen: boolean;
  alarmCounts: { L1: number; L2: number; L3: number };
  allActiveAlarms: AlarmRecord[];
  bannerStackHeight: number;
  hiddenAlarmCount: number;
  onAcknowledge: (alarm: AlarmRecord) => void;
  onSnooze: (alarm: AlarmRecord) => void;
  onToggleOpen: () => void;
  totalActiveAlarmCount: number;
  visibleAlarms: AlarmRecord[];
};

export function AlarmCenter({
  alarmCenterOpen,
  alarmCounts,
  allActiveAlarms,
  bannerStackHeight,
  hiddenAlarmCount,
  onAcknowledge,
  onSnooze,
  onToggleOpen,
  totalActiveAlarmCount,
  visibleAlarms,
}: AlarmCenterProps) {
  if (visibleAlarms.length === 0) return null;

  return (
    <>
      <div className="fixed inset-x-4 top-3 z-50 flex flex-col gap-2 md:inset-x-8">
        <div className="flex items-center justify-between rounded-lg border border-[#2A3142] bg-[rgba(10,14,23,0.86)] px-4 py-2.5 text-xs text-[#AAB4C5] shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-[#FFB800]" />
            <span className="font-medium text-[#F0F2F5]">告警中心</span>
            <span>当前活跃 {totalActiveAlarmCount} 条</span>
          </div>
          <div className="flex items-center gap-3">
            <span>L3 {alarmCounts.L3}</span>
            <span>L2 {alarmCounts.L2}</span>
            <span>L1 {alarmCounts.L1}</span>
            <button
              onClick={onToggleOpen}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[#F0F2F5] transition hover:bg-white/10"
            >
              全部告警
              <ChevronDown className={`size-3.5 transition-transform ${alarmCenterOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {alarmCenterOpen && (
          <div className="rounded-lg border border-[#2A3142] bg-[rgba(10,14,23,0.92)] p-3 shadow-lg backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#F0F2F5]">活跃告警列表</div>
                <div className="text-xs text-[#8B95A5]">按时间倒序，保留当前待处理告警</div>
              </div>
              <div className="text-xs text-[#8B95A5]">{allActiveAlarms.length} 条</div>
            </div>
            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {allActiveAlarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="rounded-lg border px-3 py-2.5 text-sm"
                  style={{
                    borderColor: `${LEVEL_COLORS[alarm.level]}45`,
                    backgroundColor: `${LEVEL_COLORS[alarm.level]}10`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium" style={{ color: LEVEL_COLORS[alarm.level] }}>
                        [{alarm.level}] {METRIC_LABELS[alarm.metric]}
                      </div>
                      <div className="mt-1 break-words text-xs text-[#D6DCE7]">
                        当前值 {formatMetricValue(alarm.metric, alarm.value)}，阈值 {formatMetricValue(alarm.metric, alarm.threshold)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-[#F0F2F5] transition hover:bg-white/10"
                        onClick={() => onAcknowledge(alarm)}
                      >
                        确认
                      </button>
                      <button
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-[#F0F2F5] transition hover:bg-white/10"
                        onClick={() => onSnooze(alarm)}
                      >
                        忽略
                      </button>
                      <div className="text-xs text-[#8B95A5]">{alarm.timestamp.slice(11, 19)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {visibleAlarms.map((alarm) => (
          <div
            key={alarm.id}
            className="rounded-md border px-4 py-3 shadow-lg backdrop-blur-md"
            style={{
              borderColor: LEVEL_COLORS[alarm.level],
              backgroundColor: `${LEVEL_COLORS[alarm.level]}20`,
              color: LEVEL_COLORS[alarm.level],
              animationDuration: alarm.level === "L3" ? "1s" : "0s",
              animationName: alarm.level === "L3" ? "pulse" : "none",
            }}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3 text-sm font-medium leading-6">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 break-words">
                  [{alarm.level}] {METRIC_LABELS[alarm.metric]} {formatMetricValue(alarm.metric, alarm.value)} &gt; 阈值{" "}
                  {formatMetricValue(alarm.metric, alarm.threshold)} | {alarm.timestamp}
                </span>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                <button
                  className="rounded-md border border-current px-3 py-1 text-xs font-semibold"
                  onClick={() => onAcknowledge(alarm)}
                >
                  确认
                </button>
                <button
                  className="rounded-md border border-current px-3 py-1 text-xs font-semibold"
                  onClick={() => onSnooze(alarm)}
                >
                  忽略5分钟
                </button>
              </div>
            </div>
          </div>
        ))}
        {hiddenAlarmCount > 0 && <div className="ml-auto text-xs text-[#FFB800]">+{hiddenAlarmCount} more</div>}
      </div>
      {bannerStackHeight > 0 && <div style={{ height: `${bannerStackHeight}px` }} aria-hidden="true" />}
    </>
  );
}
