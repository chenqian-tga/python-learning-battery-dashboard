"use client";

import { AlertTriangle } from "lucide-react";

import { type AlarmLevel } from "@/lib/battery-dashboard";

type TopOverviewProps = {
  alarmCounts: { L1: number; L2: number; L3: number };
  channelSummary: { normal: number; warning: number; critical: number; offline: number };
  criticalMetricCount: number;
  freshnessLabel: string;
  levelColors: Record<AlarmLevel, string>;
  onAlarmLevelSelect: (level: "L1" | "L2" | "L3") => void;
  onChannelFilterSelect: (filter: "all" | "abnormal" | "critical" | "normal") => void;
  topStatus: AlarmLevel;
  topStatusLabel: string;
};

export function TopOverview({
  alarmCounts,
  channelSummary,
  criticalMetricCount,
  freshnessLabel,
  levelColors,
  onAlarmLevelSelect,
  onChannelFilterSelect,
  topStatus,
  topStatusLabel,
}: TopOverviewProps) {
  return (
    <section className="grid gap-2.5 rounded-lg border border-[#2A3142] bg-[#151A25]/95 p-2.5 md:grid-cols-[1.45fr_repeat(4,minmax(0,1fr))] md:p-3">
      <div
        className="rounded-lg border bg-[linear-gradient(135deg,rgba(0,240,255,0.12),rgba(112,0,255,0.10))] p-3.5"
        style={{ borderColor: `${levelColors[topStatus]}45` }}
      >
        <div className="text-xs uppercase tracking-[0.18em] text-[#8B95A5]">系统总览</div>
        <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-[#F0F2F5]">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: levelColors[topStatus], boxShadow: `0 0 14px ${levelColors[topStatus]}` }}
          />
          {topStatusLabel}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-[#AAB4C5]">
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
            <div>数据新鲜度</div>
            <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">{freshnessLabel}</div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
            <div>异常指标数</div>
            <div className="mt-1 text-sm font-semibold text-[#F0F2F5]">{criticalMetricCount} / 6</div>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-2 text-xs">
          <button
            onClick={() => onChannelFilterSelect("normal")}
            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-center transition hover:bg-white/10"
          >
            <div className="text-[#8B95A5]">正常</div>
            <div className="mt-1 font-semibold text-[#00D084]">{channelSummary.normal}</div>
          </button>
          <button
            onClick={() => onChannelFilterSelect("abnormal")}
            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-center transition hover:bg-white/10"
          >
            <div className="text-[#8B95A5]">预警</div>
            <div className="mt-1 font-semibold text-[#FFB800]">{channelSummary.warning}</div>
          </button>
          <button
            onClick={() => onChannelFilterSelect("critical")}
            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-center transition hover:bg-white/10"
          >
            <div className="text-[#8B95A5]">严重</div>
            <div className="mt-1 font-semibold text-[#FF2D55]">{channelSummary.critical}</div>
          </button>
          <button
            onClick={() => onChannelFilterSelect("all")}
            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-center transition hover:bg-white/10"
          >
            <div className="text-[#8B95A5]">全部</div>
            <div className="mt-1 font-semibold text-[#94A3B8]">
              {channelSummary.normal + channelSummary.warning + channelSummary.critical + channelSummary.offline}
            </div>
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-[#2A3142] bg-[#0F141D] p-2.5">
        <div className="text-xs uppercase tracking-[0.18em] text-[#8B95A5]">连接状态</div>
        <div className="mt-2 text-sm font-semibold text-[#F0F2F5]">采集链路在线</div>
        <div className="mt-1 text-xs text-[#8B95A5]">Modbus / WebSocket 实时同步</div>
      </div>
      <div className="rounded-lg border border-[#2A3142] bg-[#0F141D] p-2.5">
        <div className="text-xs uppercase tracking-[0.18em] text-[#8B95A5]">当前工序</div>
        <div className="mt-2 text-sm font-semibold text-[#F0F2F5]">化成工位 01-16</div>
        <div className="mt-1 text-xs text-[#8B95A5]">Rack A / Formation Zone</div>
      </div>
      <div className="rounded-lg border border-[#2A3142] bg-[#0F141D] p-2.5">
        <div className="text-xs uppercase tracking-[0.18em] text-[#8B95A5]">班次信息</div>
        <div className="mt-2 text-sm font-semibold text-[#F0F2F5]">当前班次运行中</div>
        <div className="mt-1 text-xs text-[#8B95A5]">操作员登录状态待接入</div>
      </div>
      <div className="rounded-lg border border-[#2A3142] bg-[#0F141D] p-2.5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8B95A5]">
          <AlertTriangle className="size-3.5" />
          告警计数
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#F0F2F5]">
          <button onClick={() => onAlarmLevelSelect("L3")} className="text-[#FF2D55] transition hover:opacity-80">
            L3 {alarmCounts.L3}
          </button>
          <button onClick={() => onAlarmLevelSelect("L2")} className="text-[#FF6D00] transition hover:opacity-80">
            L2 {alarmCounts.L2}
          </button>
          <button onClick={() => onAlarmLevelSelect("L1")} className="text-[#FFB800] transition hover:opacity-80">
            L1 {alarmCounts.L1}
          </button>
        </div>
        <div className="mt-1 text-xs text-[#8B95A5]">点击后联动到告警中心与历史记录</div>
      </div>
    </section>
  );
}
