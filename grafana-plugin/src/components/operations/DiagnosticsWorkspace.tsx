import React from 'react';
import { Button } from '@grafana/ui';
import { dataQualityLabel, dataSourceLabel, formatTime, formatValue, metricEvidenceLabel, metrics, recommendationFor, type MetricKey } from '../../domain/operations';
import type { BatteryPayload } from '../../services/batteryApi';
import type { OperationsState } from '../../store/operationsStore';
import type { OperationsStyles } from './operationsStyles';

type Props = {
  state: OperationsState;
  styles: OperationsStyles;
  onSelectChannel: (channel: number) => void;
  onSelectException: (id: string) => void;
};

const chartBox = { width: 720, height: 240, left: 46, right: 18, top: 18, bottom: 30 };

function chartPath(history: BatteryPayload[], key: MetricKey, min: number, max: number) {
  const { width, height, left, right, top, bottom } = chartBox;
  const span = Math.max(max - min, 0.001);
  const drawableWidth = width - left - right;
  const drawableHeight = height - top - bottom;
  return history.map((point, index) => {
    const value = point[key] as number;
    const x = left + (history.length === 1 ? drawableWidth : (index / (history.length - 1)) * drawableWidth);
    const y = top + (1 - Math.min(1, Math.max(0, (value - min) / span))) * drawableHeight;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

function scaleY(value: number, min: number, max: number) {
  const { height, top, bottom } = chartBox;
  const span = Math.max(max - min, 0.001);
  return top + (1 - Math.min(1, Math.max(0, (value - min) / span))) * (height - top - bottom);
}

export function DiagnosticsWorkspace({ state, styles, onSelectException }: Props) {
  const payload = state.payload;
  const exceptionItem = state.exceptions.find((item) => item.id === state.selectedExceptionId && item.lifecycle !== 'closed')
    ?? state.exceptions.find((item) => item.lifecycle !== 'closed');
  const history = state.history.length ? state.history : payload ? [payload] : [];
  const metricKey = exceptionItem?.metric ?? 'max_temp';
  const metric = metrics.find((item) => item.key === metricKey) ?? metrics[2];
  const currentValue = payload?.[metricKey] ?? 0;
  const observedValues = history.map((item) => item[metricKey] as number);
  const chartMin = Math.min(...observedValues, metric.threshold[0]) * (metricKey === 'pressure' ? 0.7 : 0.92);
  const chartMax = Math.max(...observedValues, metric.threshold[1]) * 1.12;
  const attentionY = scaleY(metric.threshold[0], chartMin, chartMax);
  const criticalY = scaleY(metric.threshold[1], chartMin, chartMax);
  const condition = currentValue >= metric.threshold[1] ? '超过严重线，暂缓放行并升级质量复核' : currentValue >= metric.threshold[0] ? '超过关注线，需要质量确认' : '当前回到阈值内，等待复核后决定放行';
  const clipId = `batch-chart-${payload?.batch.id ?? 'fallback'}`;

  if (!payload) return <section className={styles.content}><article className={styles.panel}><div className={styles.empty}>等待批次数据到达后再开始诊断。</div></article></section>;

  return (
    <section className={styles.content} aria-label="诊断与追溯">
      <div className={styles.diagnosticHeader}>
        <div><div className={styles.eyebrow}>BATCH EVIDENCE</div><div className={styles.entityName}>{payload.batch.id}</div><div className={styles.subtitle}>{payload.batch.recipe} · {payload.equipment.id} / {payload.equipment.station} · {payload.batch.stage}</div></div>
        <div className={styles.detailStrip}><span>影响范围 <b>{payload.quality_disposition.affected_cells ?? payload.batch.cell_count} 个电芯</b></span><span>质量处置 <b>{payload.quality_disposition.label}</b></span><span className={styles.attention}>{payload.measurement_scope === 'aggregate' ? '聚合证据' : '通道证据'}</span></div>
      </div>

      {exceptionItem && <div className={styles.priority}><div><div className={`${styles.priorityTitle} ${styles[exceptionItem.severity]}`}>批次偏离：{exceptionItem.title}</div><div className={styles.priorityDetail}>当前值 {formatValue(metricKey, currentValue)} {metric.unit} · 关注线 {metric.threshold[0]} · 严重线 {metric.threshold[1]} {metric.unit} · 用于质量复核，不直接判定单体损坏</div></div><Button variant="secondary" onClick={() => onSelectException(exceptionItem.id)}>返回处置</Button></div>}

      <div className={styles.split}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>{metric.label}趋势</div><div className={styles.panelSub}>当前批次的持久化证据窗口，虚线表示质量策略阈值。</div></div><span className={styles.smallLabel}>{history.length} 个样本</span></div>
          <div className={styles.readingBar}><span className={styles.readingValue}>{formatValue(metricKey, currentValue)} {metric.unit}</span><span className={styles.readingMeta}>{metricEvidenceLabel(payload, metricKey)} · 关注线 {metric.threshold[0]} · 严重线 {metric.threshold[1]} {metric.unit}<br />{condition}</span></div>
          <div className={styles.trend}>
            <svg className={styles.trendSvg} viewBox={`0 0 ${chartBox.width} ${chartBox.height}`} role="img" aria-label={`${metric.label}批次趋势，包含质量阈值`}>
              <defs><clipPath id={clipId}><rect x={chartBox.left} y={chartBox.top} width={chartBox.width - chartBox.left - chartBox.right} height={chartBox.height - chartBox.top - chartBox.bottom} /></clipPath></defs>
              <line x1={chartBox.left} x2={chartBox.width - chartBox.right} y1={chartBox.top} y2={chartBox.top} className={styles.gridLine} />
              <line x1={chartBox.left} x2={chartBox.width - chartBox.right} y1={(chartBox.top + chartBox.height - chartBox.bottom) / 2} y2={(chartBox.top + chartBox.height - chartBox.bottom) / 2} className={styles.gridLine} />
              <line x1={chartBox.left} x2={chartBox.width - chartBox.right} y1={chartBox.height - chartBox.bottom} y2={chartBox.height - chartBox.bottom} className={styles.gridLine} />
              <line x1={chartBox.left} x2={chartBox.width - chartBox.right} y1={attentionY} y2={attentionY} className={styles.attentionLine} />
              <line x1={chartBox.left} x2={chartBox.width - chartBox.right} y1={criticalY} y2={criticalY} className={styles.criticalLine} />
              <g clipPath={`url(#${clipId})`}><path d={chartPath(history, metricKey, chartMin, chartMax)} className={styles.focusedLine} /></g>
              <text x="2" y={chartBox.top + 4} className={styles.axisText}>{chartMax.toFixed(metricKey === 'pressure' ? 2 : 0)}</text>
              <text x="2" y={chartBox.height - chartBox.bottom + 4} className={styles.axisText}>{chartMin.toFixed(metricKey === 'pressure' ? 2 : 0)}</text>
              <text x={chartBox.width - chartBox.right - 4} y={attentionY - 5} textAnchor="end" className={styles.axisText}>关注线 {metric.threshold[0]}</text>
              <text x={chartBox.width - chartBox.right - 4} y={criticalY - 5} textAnchor="end" className={styles.axisText}>严重线 {metric.threshold[1]}</text>
              <text x={chartBox.left} y={chartBox.height - 8} className={styles.axisText}>{formatTime(history[0]?.timestamp)}</text>
              <text x={chartBox.width - chartBox.right} y={chartBox.height - 8} textAnchor="end" className={styles.axisText}>{formatTime(payload.timestamp)}</text>
            </svg>
          </div>
          <div className={styles.trendCaption}><span>曲线只反映 {metric.label}，单位为 {metric.unit}</span><span>最近采样 {formatTime(payload.timestamp)}</span></div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>质量工程师现在要做</div><div className={styles.panelSub}>证据用于选择复测、隔离或放行。</div></div></div>
          <div className={styles.nextAction}><div className={styles.nextActionTitle}>{condition}</div><div className={styles.muted}>{recommendationFor(exceptionItem)}</div>{exceptionItem && <Button variant="primary" onClick={() => onSelectException(exceptionItem.id)}>回到批次处置</Button>}</div>
          <div className={styles.facts}>
            <div className={styles.fact}><div className={styles.smallLabel}>批次配方</div><div className={styles.smallValue}>{payload.batch.recipe}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>设备工位</div><div className={styles.smallValue}>{payload.equipment.id} / {payload.equipment.station}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>质量处置</div><div className={styles.smallValue}>{payload.quality_disposition.label}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>证据来源</div><div className={styles.smallValue}>{dataSourceLabel(payload)}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>数据范围</div><div className={styles.smallValue}>{dataQualityLabel(payload)}</div></div>
          </div>
        </article>
      </div>

      <article className={styles.panel}>
        <div className={styles.panelHeader}><div><div className={styles.panelTitle}>证据边界</div><div className={styles.panelSub}>当前数据用于批次质量复核，不包含可定位到单个电芯的真实通道寄存器。</div></div></div>
        <div className={styles.note}>数据来源：{dataSourceLabel(payload)} · {dataQualityLabel(payload)} · 证据等级：{metricEvidenceLabel(payload, metricKey)}。下一步应是复测、隔离或放行判定，而不是直接宣布某个单体损坏。</div>
      </article>
    </section>
  );
}
