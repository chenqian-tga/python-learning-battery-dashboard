"use client";

import { CheckCheck, Download, Eye, ListFilter, Settings2 } from "lucide-react";

import { LEVEL_COLORS, METRIC_LABELS, type AlarmRecord, type OperationRecord, type ThresholdConfig } from "@/lib/battery-dashboard";
import {
  OPERATION_COLORS,
  type AlarmFilter,
  type AlarmLevelFilter,
  formatMetricValue,
  type MetricFilter,
  type OperationFilter,
  type ThresholdFeedback,
} from "@/lib/dashboard-ui";

type Props = {
  alarmLevelFilter: AlarmLevelFilter;
  alarmMetricFilter: MetricFilter;
  alarmStatusFilter: AlarmFilter;
  filterSummary: string[];
  filteredOperationLog: OperationRecord[];
  latestAlarmRows: AlarmRecord[];
  traceContextLabel: string | null;
  onAlarmAction: (alarm: AlarmRecord, action: "acknowledge" | "snooze" | "watch") => void;
  onAlarmRowSelect: (alarm: AlarmRecord) => void;
  onClearFilters: () => void;
  onAlarmLevelFilterChange: (value: AlarmLevelFilter) => void;
  onAlarmMetricFilterChange: (value: MetricFilter) => void;
  onAlarmStatusFilterChange: (value: AlarmFilter) => void;
  onExport: () => void;
  onOperationFilterChange: (value: OperationFilter) => void;
  onRestoreThresholds: () => void;
  onSetThreshold: (metric: string, key: string, value: number) => void;
  operationFilter: OperationFilter;
  thresholdFeedback: ThresholdFeedback;
  thresholds: ThresholdConfig;
  thresholdsDirty: boolean;
};

export function AlarmAndLogPanel({
  alarmLevelFilter,
  alarmMetricFilter,
  alarmStatusFilter,
  filterSummary,
  filteredOperationLog,
  latestAlarmRows,
  traceContextLabel,
  onAlarmAction,
  onAlarmRowSelect,
  onClearFilters,
  onAlarmLevelFilterChange,
  onAlarmMetricFilterChange,
  onAlarmStatusFilterChange,
  onExport,
  onOperationFilterChange,
  onRestoreThresholds,
  onSetThreshold,
  operationFilter,
  thresholdFeedback,
  thresholds,
  thresholdsDirty,
}: Props) {
  return (
    <section className="grid gap-2.5 xl:grid-cols-[1.4fr_1fr] xl:gap-3">
      <div className="rounded-lg border border-[#2A3142] bg-[#151A25]/95 p-2.5 md:p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#F0F2F5]">告警历史表</div>
            <div className="text-xs text-[#8B95A5]">最近 20 条告警记录，支持按状态和级别筛选</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md border border-[#2A3142] px-3 py-1.5 text-xs text-[#F0F2F5]"
              onClick={onClearFilters}
            >
              清空筛选
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-[#2A3142] px-3 py-1.5 text-xs text-[#F0F2F5]"
              onClick={onExport}
            >
              <Download className="size-3.5" />
              导出告警记录
            </button>
          </div>
        </div>
        <div className="mb-2.5 flex flex-wrap gap-2">
          {filterSummary.length > 0 ? (
            filterSummary.map((item) => (
              <div
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[#D6DCE7]"
              >
                {item}
              </div>
            ))
          ) : (
            <div className="rounded-full border border-dashed border-[#2A3142] px-2.5 py-1 text-[11px] text-[#8B95A5]">
              当前未启用筛选
            </div>
          )}
          {traceContextLabel ? (
            <div className="rounded-full border border-[#7000ff]/30 bg-[#7000ff]/10 px-2.5 py-1 text-[11px] text-[#E6D7FF]">
              时间上下文: {traceContextLabel}
            </div>
          ) : null}
        </div>
        <div className="mb-2.5 flex flex-col gap-2 rounded-lg border border-[#2A3142] bg-[rgba(15,20,29,0.72)] p-2.5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "全部状态", value: "all" },
              { label: "活跃", value: "active" },
              { label: "已确认", value: "acknowledged" },
              { label: "忽略中", value: "snoozed" },
              { label: "已恢复", value: "recovered" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => onAlarmStatusFilterChange(option.value as AlarmFilter)}
                className="rounded-full border px-3 py-1 text-xs transition"
                style={{
                  borderColor: alarmStatusFilter === option.value ? "#00f0ff" : "#2A3142",
                  backgroundColor: alarmStatusFilter === option.value ? "rgba(0,240,255,0.12)" : "transparent",
                  color: alarmStatusFilter === option.value ? "#F0F2F5" : "#8B95A5",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "全部级别", value: "all" },
              { label: "L3", value: "L3" },
              { label: "L2", value: "L2" },
              { label: "L1", value: "L1" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => onAlarmLevelFilterChange(option.value as AlarmLevelFilter)}
                className="rounded-full border px-3 py-1 text-xs transition"
                style={{
                  borderColor: alarmLevelFilter === option.value ? "#7000ff" : "#2A3142",
                  backgroundColor: alarmLevelFilter === option.value ? "rgba(112,0,255,0.12)" : "transparent",
                  color: alarmLevelFilter === option.value ? "#F0F2F5" : "#8B95A5",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-2.5 flex flex-wrap gap-2">
          {[{ label: "全部指标", value: "all" }, ...Object.entries(METRIC_LABELS).map(([key, label]) => ({ label, value: key }))].map((option) => (
            <button
              key={option.value}
              onClick={() => onAlarmMetricFilterChange(option.value as MetricFilter)}
              className="rounded-full border px-3 py-1 text-xs transition"
              style={{
                borderColor: alarmMetricFilter === option.value ? "#00f0ff" : "#2A3142",
                backgroundColor: alarmMetricFilter === option.value ? "rgba(0,240,255,0.12)" : "transparent",
                color: alarmMetricFilter === option.value ? "#F0F2F5" : "#8B95A5",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-1.5 text-left text-sm">
            <thead className="text-[#8B95A5]">
              <tr>
                <th>时间</th>
                <th>指标</th>
                <th>当前值</th>
                <th>阈值</th>
                <th>级别</th>
                <th>状态</th>
                <th>操作员</th>
                <th>处理</th>
              </tr>
            </thead>
            <tbody>
              {latestAlarmRows.map((alarm) => (
                <tr
                  key={alarm.id}
                  onClick={() => onAlarmRowSelect(alarm)}
                  className="rounded-lg bg-[#0F141D] text-[#F0F2F5]"
                  style={{ boxShadow: `inset 2px 0 0 ${LEVEL_COLORS[alarm.level]}`, cursor: "pointer" }}
                >
                  <td className="rounded-l-lg px-3 py-1.5">{alarm.timestamp}</td>
                  <td className="px-3 py-1.5">{METRIC_LABELS[alarm.metric]}</td>
                  <td className="px-3 py-1.5">{formatMetricValue(alarm.metric, alarm.value)}</td>
                  <td className="px-3 py-1.5">{formatMetricValue(alarm.metric, alarm.threshold)}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className="inline-flex rounded-full border px-2 py-0.5 text-xs"
                      style={{
                        borderColor: `${LEVEL_COLORS[alarm.level]}50`,
                        color: LEVEL_COLORS[alarm.level],
                        backgroundColor: `${LEVEL_COLORS[alarm.level]}14`,
                      }}
                    >
                      {alarm.level}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-[#D6DCE7]">
                      {alarm.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">{alarm.operator}</td>
                  <td className="rounded-r-lg px-3 py-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onAlarmAction(alarm, "acknowledge");
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-[#D6DCE7] transition hover:bg-white/10"
                      >
                        <CheckCheck className="size-3.5" />
                        确认
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onAlarmAction(alarm, "snooze");
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-[#D6DCE7] transition hover:bg-white/10"
                      >
                        忽略
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onAlarmAction(alarm, "watch");
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-[#D6DCE7] transition hover:bg-white/10"
                      >
                        <Eye className="size-3.5" />
                        观察
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {latestAlarmRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="rounded-lg px-3 py-6 text-center text-sm text-[#8B95A5]">
                    当前筛选条件下没有告警记录。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2.5 md:space-y-3">
        <div className="rounded-lg border border-[#2A3142] bg-[#151A25]/95 p-2.5 md:p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#F0F2F5]">阈值配置面板</div>
              <div className="text-xs text-[#8B95A5]">即时生效，本地持久化，支持变更提示</div>
            </div>
            <div className="flex items-center gap-2">
              {thresholdsDirty && (
                <span className="rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-2 py-0.5 text-[11px] text-[#D6FCFF]">
                  已修改
                </span>
              )}
              {thresholdFeedback !== "idle" && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-[#D6DCE7]">
                  {thresholdFeedback === "edited" ? "阈值已更新" : "已恢复默认"}
                </span>
              )}
              <Settings2 className="size-4 text-[#8B95A5]" />
            </div>
          </div>
          <div className="space-y-2.5">
            {Object.entries(thresholds).map(([metric, config]) => (
              <details key={metric} className="rounded-lg border border-[#2A3142] bg-[#0F141D] p-2.5">
                <summary className="cursor-pointer text-sm font-medium text-[#F0F2F5]">
                  {METRIC_LABELS[metric as keyof typeof METRIC_LABELS] ?? metric}
                </summary>
                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  {Object.entries(config).map(([key, value]) =>
                    typeof value === "number" ? (
                      <label key={key} className="text-xs text-[#8B95A5]">
                        {key}
                        <input
                          type="number"
                          step="0.1"
                          value={value}
                          onChange={(event) => onSetThreshold(metric, key, Number(event.target.value))}
                          className="mt-1 w-full rounded-md border border-[#2A3142] bg-[#151A25] px-3 py-2 text-sm text-[#F0F2F5] outline-none transition focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/30"
                        />
                      </label>
                    ) : null,
                  )}
                </div>
              </details>
            ))}
          </div>
          <button
            className="mt-3 rounded-md border border-[#2A3142] px-3 py-1.5 text-sm text-[#F0F2F5]"
            onClick={onRestoreThresholds}
          >
            恢复默认
          </button>
        </div>

        <div className="rounded-lg border border-[#2A3142] bg-[#151A25]/95 p-2.5 md:p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#F0F2F5]">操作日志</div>
              <div className="text-xs text-[#8B95A5]">按动作分类查看最近操作与系统变化</div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#AAB4C5]">
              <ListFilter className="size-3.5" />
              {filteredOperationLog.length} 条
            </div>
          </div>
          <div className="mb-2.5 flex flex-wrap gap-2">
            {([{ label: "全部", value: "all" }, ...Object.keys(OPERATION_COLORS).map((key) => ({ label: key, value: key }))] as const).map((option) => (
              <button
                key={option.value}
                onClick={() => onOperationFilterChange(option.value as OperationFilter)}
                className="rounded-full border px-3 py-1 text-xs transition"
                style={{
                  borderColor:
                    operationFilter === option.value
                      ? option.value === "all"
                        ? "#00f0ff"
                        : OPERATION_COLORS[option.value as keyof typeof OPERATION_COLORS]
                      : "#2A3142",
                  backgroundColor:
                    operationFilter === option.value
                      ? option.value === "all"
                        ? "rgba(0,240,255,0.12)"
                        : `${OPERATION_COLORS[option.value as keyof typeof OPERATION_COLORS]}20`
                      : "transparent",
                  color: operationFilter === option.value ? "#F0F2F5" : "#8B95A5",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {filteredOperationLog.map((entry, index) => {
              const entryColor = OPERATION_COLORS[entry.action as keyof typeof OPERATION_COLORS] ?? "#8B95A5";
              const previousEntry = filteredOperationLog[index - 1];
              const showTimeDivider =
                !previousEntry || previousEntry.timestamp.slice(0, 10) !== entry.timestamp.slice(0, 10);

              return (
                <div key={entry.id}>
                  {showTimeDivider && (
                    <div className="mb-2 mt-1 text-[11px] uppercase tracking-[0.12em] text-[#667085]">
                      {entry.timestamp.slice(0, 10)}
                    </div>
                  )}
                  <div
                    className="rounded-lg border bg-[#0F141D] p-2.5 text-xs"
                    style={{ borderColor: `${entryColor}35`, boxShadow: `inset 2px 0 0 ${entryColor}` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium" style={{ color: entryColor }}>{entry.action}</div>
                        <div className="mt-1 text-[#8B95A5]">{entry.detail}</div>
                      </div>
                      <div className="shrink-0 text-[#8B95A5]">{entry.timestamp.slice(11, 19)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredOperationLog.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#2A3142] bg-[#0F141D] p-3 text-xs text-[#8B95A5]">
                当前筛选条件下没有操作记录。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
