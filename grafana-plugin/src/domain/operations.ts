import type { BatteryPayload } from '../services/batteryApi';

export type ConnectionState = 'connecting' | 'online' | 'reconnecting' | 'degraded';
export type ConditionLevel = 'normal' | 'attention' | 'critical';
export type Workspace = 'overview' | 'exceptions' | 'diagnostics';
export type OperationalRole = 'operator' | 'shift_lead' | 'engineer' | 'quality_engineer';
export type ExceptionLifecycle = 'detected' | 'acknowledged' | 'assigned' | 'in_progress' | 'pending_review' | 'closed';

export type MetricKey = 'voltage' | 'current' | 'max_temp' | 'pressure' | 'soc' | 'cell_diff';

export type MetricDefinition = {
  key: MetricKey;
  label: string;
  unit: string;
  detail: string;
  threshold: [number, number];
};

export type Channel = {
  id: string;
  index: number;
  voltage: number;
  temperature: number;
  level: ConditionLevel;
  estimated: boolean;
};

export type OperationsException = {
  id: string;
  metric: MetricKey;
  title: string;
  severity: Exclude<ConditionLevel, 'normal'>;
  lifecycle: ExceptionLifecycle;
  value: number;
  unit: string;
  threshold: [number, number];
  scope: string;
  relatedChannel?: number;
  firstSeen: string;
  latestSeen: string;
  source: 'client_policy' | 'backend_policy';
  evidenceType?: 'measured' | 'derived' | 'stale' | 'simulated' | string;
  disposition?: 'review' | 'hold' | 'release' | string;
};

export type ActivityEntry = {
  id: string;
  timestamp: string;
  kind: 'system' | 'operator';
  title: string;
  detail: string;
};

export const metrics: MetricDefinition[] = [
  { key: 'voltage', label: '总电压', unit: 'V', detail: '电池包 A / 24 单体', threshold: [52, 55] },
  { key: 'current', label: '总电流', unit: 'A', detail: '化成电流', threshold: [30, 40] },
  { key: 'max_temp', label: '最高温度', unit: 'C', detail: '热点单体', threshold: [45, 60] },
  { key: 'pressure', label: '化成压力', unit: 'MPa', detail: '化成区', threshold: [0.5, 0.8] },
  { key: 'soc', label: '荷电状态', unit: '%', detail: '可用容量', threshold: [95, 98] },
  { key: 'cell_diff', label: '单体压差', unit: 'mV', detail: 'Max - Min', threshold: [50, 80] },
];

export const roleLabels: Record<OperationalRole, string> = {
  operator: '现场操作员',
  shift_lead: '班组长',
  engineer: '工艺 / 设备工程师',
  quality_engineer: '质量工程师',
};

export const workspaceLabels: Record<Workspace, string> = {
  overview: '本班总览',
  exceptions: '异常处置',
  diagnostics: '诊断与追溯',
};

export function metricLevel(metric: MetricDefinition, value: number): ConditionLevel {
  const checked = metric.key === 'current' ? Math.abs(value) : value;
  if (checked >= metric.threshold[1]) return 'critical';
  if (checked >= metric.threshold[0]) return 'attention';
  return 'normal';
}

export function buildChannels(payload?: BatteryPayload): Channel[] {
  if (!payload) return [];
  return Array.from({ length: 16 }, (_, index) => {
    const channel = index + 1;
    const voltage = Number((payload.voltage / 16 + (index % 4) * 0.018 + payload.cell_diff / 1900).toFixed(2));
    const temperature = Number((payload.max_temp - 2.4 + ((index * 5) % 7) * 0.42).toFixed(1));
    const level: ConditionLevel = temperature >= 45 || voltage >= 3.9 ? 'critical' : temperature >= 39 || voltage >= 3.84 ? 'attention' : 'normal';
    return { id: `CH${String(channel).padStart(2, '0')}`, index: channel, voltage, temperature, level, estimated: !payload.channel_data_available };
  });
}

export function buildExceptions(payload?: BatteryPayload, previous: OperationsException[] = []): OperationsException[] {
  if (!payload) return [];
  const firstSeenByMetric = new Map(previous.map((item) => [item.metric, item.firstSeen]));

  return metrics.flatMap((metric) => {
    const value = payload[metric.key];
    const severity = metricLevel(metric, value);
    if (severity === 'normal') return [];
    const timestamp = payload.timestamp;
    return [{
      id: `signal-${metric.key}`,
      metric: metric.key,
      title: metric.label,
      severity,
      lifecycle: previous.find((item) => item.metric === metric.key)?.lifecycle ?? 'detected',
      value,
      unit: metric.unit,
      threshold: metric.threshold,
      scope: metric.key === 'pressure' ? '化成区' : '机架 A / 电池包 A',
      relatedChannel: undefined,
      firstSeen: firstSeenByMetric.get(metric.key) ?? timestamp,
      latestSeen: timestamp,
      source: 'client_policy',
      evidenceType: payload.metric_provenance?.[metric.key] ?? payload.data_quality,
    }];
  });
}

export function formatValue(key: MetricKey, value?: number) {
  if (value === undefined) return '--';
  return value.toFixed(key === 'pressure' ? 3 : key === 'cell_diff' ? 0 : 1);
}

export function formatTime(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('zh-CN', { hour12: false });
}

export function lifecycleLabel(value: ExceptionLifecycle) {
  return {
    detected: '待确认',
    acknowledged: '已确认',
    assigned: '已指派',
    in_progress: '处理中',
    pending_review: '待复核',
    closed: '已关闭',
  }[value];
}

export function recommendationFor(exception?: OperationsException) {
  if (!exception) return '选择一项异常后，系统会展示阈值、证据窗口与建议动作。';
  if (exception.metric === 'pressure') return '核查化成柜环境与工位状态，确认是否需要暂缓当前批次放行。';
  if (exception.metric === 'cell_diff') return '对比同配方正常批次曲线，决定复测、隔离或提交质量判定。';
  if (exception.metric === 'max_temp') return '先排查 FORM-08 设备侧原因，再判断是否扩大批次影响范围。';
  return '复核配方阶段、设备范围和同批次证据，再决定复测、隔离或放行。';
}

export function dataSourceLabel(payload?: BatteryPayload) {
  if (!payload) return '等待数据';
  if (payload.data_quality === 'measured' && payload.data_source === 'modbus') return 'Modbus 实测';
  if (payload.data_quality === 'derived' && payload.data_source === 'modbus') return 'Modbus + 计算';
  if (payload.data_quality === 'stale' || payload.data_source === 'modbus_cache') return 'Modbus 缓存';
  if (payload.data_quality === 'simulated' || payload.data_source === 'simulator' || payload.connection_status === 'fallback') return '模拟器数据';
  return '数据来源未确认';
}

export function dataQualityLabel(payload?: BatteryPayload) {
  if (!payload) return '无数据';
  if (payload.channel_data_available) return payload.data_quality === 'measured' ? '真实通道数据' : payload.data_quality === 'stale' ? '缓存通道数据' : '通道数据未确认';
  return payload.data_quality === 'measured' ? '实测聚合数据' : payload.data_quality === 'derived' ? '实测输入 + 计算聚合' : payload.data_quality === 'stale' ? '缓存聚合数据' : '模拟聚合数据';
}

export function metricEvidenceLabel(payload: BatteryPayload | undefined, key: MetricKey) {
  const evidence = payload?.metric_provenance?.[key];
  if (evidence === 'measured') return '原始实测';
  if (evidence === 'derived') return '计算推导';
  if (evidence === 'stale') return '缓存推导';
  if (evidence === 'simulated') return '模拟推导';
  return payload?.data_quality === 'measured' ? '实测来源未细分' : '来源未确认';
}

export const dispositionLabels: Record<string, string> = {
  review: '待质量复核',
  hold: '暂缓放行',
  retest: '待复测',
  isolate: '批次隔离',
  release: '质量放行',
};
