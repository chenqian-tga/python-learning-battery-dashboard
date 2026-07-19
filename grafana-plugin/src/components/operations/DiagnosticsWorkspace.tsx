import React from 'react';
import { Button } from '@grafana/ui';
import { buildChannels, dataQualityLabel, dataSourceLabel, formatTime, formatValue, metricEvidenceLabel, metrics, recommendationFor, type MetricKey } from '../../domain/operations';
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
  return history
    .map((point, index) => {
      const value = point[key] as number;
      const x = left + (history.length === 1 ? drawableWidth : (index / (history.length - 1)) * drawableWidth);
      const y = top + (1 - Math.min(1, Math.max(0, (value - min) / span))) * drawableHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function scaleY(value: number, min: number, max: number) {
  const { height, top, bottom } = chartBox;
  const span = Math.max(max - min, 0.001);
  return top + (1 - Math.min(1, Math.max(0, (value - min) / span))) * (height - top - bottom);
}

export function DiagnosticsWorkspace({ state, styles, onSelectChannel, onSelectException }: Props) {
  const channels = buildChannels(state.payload);
  const selected = channels.find((item) => item.index === state.selectedChannel) ?? channels[0];
  const exceptionItem = state.exceptions.find((item) => item.id === state.selectedExceptionId && item.lifecycle !== 'closed')
    ?? state.exceptions.find((item) => item.relatedChannel === selected?.index && item.lifecycle !== 'closed');
  const aggregateScope = Boolean(!state.payload?.channel_data_available || (exceptionItem && !exceptionItem.relatedChannel));
  const history = state.history.length ? state.history : state.payload ? [state.payload] : [];
  const metricKey = exceptionItem?.metric ?? 'max_temp';
  const metric = metrics.find((item) => item.key === metricKey) ?? metrics[2];
  const currentValue = state.payload?.[metricKey] ?? 0;
  const observedValues = history.map((item) => item[metricKey] as number);
  const chartMin = Math.min(...observedValues, metric.threshold[0]) * (metricKey === 'pressure' ? 0.7 : 0.92);
  const chartMax = Math.max(...observedValues, metric.threshold[1]) * 1.12;
  const attentionY = scaleY(metric.threshold[0], chartMin, chartMax);
  const criticalY = scaleY(metric.threshold[1], chartMin, chartMax);
  const condition = currentValue >= metric.threshold[1] ? '超过严重线，立即处置' : currentValue >= metric.threshold[0] ? '超过关注线，需要确认' : '当前已回到阈值内，等待复核';
  const clipId = `metric-chart-${selected?.id ?? 'fallback'}`;

  if (!selected) return <section className={styles.content}><article className={styles.panel}><div className={styles.empty}>等待电池数据到达后再开始诊断。</div></article></section>;

  return (
    <section className={styles.content} aria-label="诊断与追溯">
      <div className={styles.diagnosticHeader}>
        <div><div className={styles.eyebrow}>诊断范围</div><div className={styles.entityName}>{aggregateScope ? '机架 A / 电池包 A' : selected.id}</div><div className={styles.subtitle}>化成区 · {aggregateScope ? '聚合指标证据，不代表某个单体通道' : selected.estimated ? '估算通道视图，不是单体实测' : '当前异常的真实通道证据'}</div></div>
        <div className={styles.detailStrip}><span>{aggregateScope ? '总量' : selected.estimated ? '估算电压' : '电压'} <b>{aggregateScope ? '聚合值' : `${selected.voltage.toFixed(2)} V`}</b></span><span>{aggregateScope ? '范围' : selected.estimated ? '估算温度' : '温度'} <b>{aggregateScope ? '电池包 A' : `${selected.temperature.toFixed(1)} C`}</b></span><span className={styles[aggregateScope || selected.estimated ? 'attention' : selected.level]}>{aggregateScope ? '无单体结论' : selected.estimated ? '不可作为单体结论' : selected.level === 'normal' ? '状态正常' : selected.level === 'attention' ? '需要关注' : '严重风险'}</span></div>
      </div>

      {exceptionItem && <div className={styles.priority}><div><div className={`${styles.priorityTitle} ${styles[exceptionItem.severity]}`}>关联异常：{exceptionItem.title}</div><div className={styles.priorityDetail}>当前值 {formatValue(metricKey, currentValue)} {metric.unit} · 关注线 {metric.threshold[0]} · 严重线 {metric.threshold[1]} {metric.unit} · {exceptionItem.relatedChannel ? '存在通道关联' : '仅为聚合指标，未关联单体通道'}</div></div><Button variant="secondary" onClick={() => onSelectException(exceptionItem.id)}>返回处置</Button></div>}

      <div className={styles.split}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>{metric.label}趋势</div><div className={styles.panelSub}>只显示当前异常指标。虚线是处理阈值，不混合不同单位的数据。</div></div><span className={styles.smallLabel}>{history.length} 个样本</span></div>
          <div className={styles.readingBar}><span className={styles.readingValue}>{formatValue(metricKey, currentValue)} {metric.unit}</span><span className={styles.readingMeta}>{metricEvidenceLabel(state.payload, metricKey)} · 关注线 {metric.threshold[0]} · 严重线 {metric.threshold[1]} {metric.unit}<br />{condition}</span></div>
          <div className={styles.trend}>
            <svg className={styles.trendSvg} viewBox={`0 0 ${chartBox.width} ${chartBox.height}`} role="img" aria-label={`${metric.label}历史趋势，包含关注线和严重线`}>
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
              <text x={chartBox.width - chartBox.right} y={chartBox.height - 8} textAnchor="end" className={styles.axisText}>{formatTime(state.payload?.timestamp)}</text>
            </svg>
          </div>
          <div className={styles.trendCaption}><span>曲线只反映 {metric.label}，单位为 {metric.unit}</span><span>最近采样 {formatTime(state.payload?.timestamp)}</span></div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>操作员现在要做</div><div className={styles.panelSub}>先看结论，再决定是否进入完整诊断。</div></div></div>
          <div className={styles.nextAction}><div className={styles.nextActionTitle}>{condition}</div><div className={styles.muted}>{recommendationFor(exceptionItem)}</div>{exceptionItem && <Button variant="primary" onClick={() => onSelectException(exceptionItem.id)}>去处理 {exceptionItem.title}</Button>}</div>
          <div className={styles.facts}>
            <div className={styles.fact}><div className={styles.smallLabel}>诊断范围</div><div className={styles.smallValue}>{aggregateScope ? '电池包 A' : selected.id}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>相邻通道</div><div className={styles.smallValue}>CH{String(Math.max(1, selected.index - 1)).padStart(2, '0')} / CH{String(Math.min(16, selected.index + 1)).padStart(2, '0')}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>数据新鲜度</div><div className={styles.smallValue}>{formatTime(state.payload?.timestamp)}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>证据来源</div><div className={styles.smallValue}>{dataSourceLabel(state.payload)}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>数据范围</div><div className={styles.smallValue}>{dataQualityLabel(state.payload)}</div></div>
          </div>
        </article>
      </div>

      <article className={styles.panel}>
        <div className={styles.panelHeader}><div><div className={styles.panelTitle}>查看其他通道</div><div className={styles.panelSub}>只有需要比较相邻通道时才切换，不要求操作员逐个检查。</div></div></div>
        <div className={styles.heatGrid}>
          {channels.map((channel) => <button key={channel.id} disabled={channel.estimated} title={channel.estimated ? '暂无真实通道数据，不能进入单体诊断' : undefined} className={`${styles.channel} ${styles[channel.estimated ? 'attention' : channel.level]} ${channel.index === selected.index ? styles.channelSelected : ''}`} onClick={() => onSelectChannel(channel.index)}><span className={styles.channelTop}><span>{channel.id}</span><span>{channel.estimated ? '未接入' : channel.level === 'normal' ? '正常' : channel.level === 'attention' ? '关注' : '严重'}</span></span><strong className={styles.channelValue}>{channel.estimated ? '暂无数据' : `${channel.voltage.toFixed(2)} V`}</strong><span className={styles.channelMeta}>{channel.estimated ? '不可作为单体证据' : `${channel.temperature.toFixed(1)} C`}</span></button>)}
        </div>
      </article>
    </section>
  );
}
