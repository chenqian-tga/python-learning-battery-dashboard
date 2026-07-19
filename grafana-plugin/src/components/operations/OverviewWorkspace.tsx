import React from 'react';
import { Button } from '@grafana/ui';
import { buildChannels, dataQualityLabel, dataSourceLabel, formatTime, lifecycleLabel, type OperationsException } from '../../domain/operations';
import type { OperationsState } from '../../store/operationsStore';
import type { OperationsStyles } from './operationsStyles';

type Props = {
  state: OperationsState;
  styles: OperationsStyles;
  onSelectException: (id: string) => void;
  onSelectChannel: (channel: number) => void;
};

function connectionLabel(connection: OperationsState['connection']) {
  return { connecting: '连接中', online: '实时在线', reconnecting: '正在重连', degraded: '降级采样' }[connection];
}

function ExceptionRow({ exceptionItem, styles, onClick }: { exceptionItem: OperationsException; styles: OperationsStyles; onClick: () => void }) {
  return (
    <button className={`${styles.row} ${styles.rowButton}`} onClick={onClick}>
      <span>
        <span className="exceptionName">{exceptionItem.title}</span>
        <span className={styles.exceptionMeta}>{exceptionItem.scope} · {exceptionItem.relatedChannel ? `关联 CH${String(exceptionItem.relatedChannel).padStart(2, '0')}` : '无单体通道关联'} · {formatTime(exceptionItem.latestSeen)}</span>
      </span>
      <span className={`${styles.status} ${styles[exceptionItem.severity]}`}>{lifecycleLabel(exceptionItem.lifecycle)}</span>
    </button>
  );
}

export function OverviewWorkspace({ state, styles, onSelectChannel, onSelectException }: Props) {
  const channels = buildChannels(state.payload);
  const affected = state.exceptions.filter((item) => item.lifecycle !== 'closed');
  const health = channels.filter((channel) => channel.level === 'normal').length;
  const priority = affected[0];

  return (
    <section className={styles.content} aria-label="本班总览">
      {priority ? (
        <div className={styles.priority}>
          <div>
            <div className={`${styles.priorityTitle} ${styles[priority.severity]}`}>需要处置：{priority.title} {priority.value.toFixed(priority.metric === 'pressure' ? 3 : 1)} {priority.unit}</div>
            <div className={styles.priorityDetail}>{priority.scope} · 超出关注阈值 · 首次发现 {formatTime(priority.firstSeen)}</div>
          </div>
          <Button variant="secondary" icon="arrow-right" onClick={() => onSelectException(priority.id)}>进入处置</Button>
        </div>
      ) : (
        <div className={styles.priority}>
          <div><div className={`${styles.priorityTitle} ${styles.normal}`}>当前没有需要人工确认的异常</div><div className={styles.priorityDetail}>持续保留数据链路与通道健康的实时监测。</div></div>
        </div>
      )}

      <div className={styles.grid4}>
        <article className={styles.statistic}><div className={styles.statLabel}>本班待处理</div><div className={styles.statValue}>{affected.length} 项</div><div className={styles.statDetail}>{affected.filter((item) => item.severity === 'critical').length} 项严重 · 按风险排序</div></article>
        <article className={styles.statistic}><div className={styles.statLabel}>通道视图</div><div className={styles.statValue}>{state.payload?.channel_data_available ? `${health} / ${channels.length}` : '估算'}</div><div className={styles.statDetail}>{state.payload?.channel_data_available ? '真实通道数据' : '后端只有聚合数据，不能代表单体健康'}</div></article>
        <article className={styles.statistic}><div className={styles.statLabel}>数据来源</div><div className={`${styles.statValue} ${state.payload?.data_quality === 'measured' ? styles.normal : styles.attention}`}>{dataSourceLabel(state.payload)}</div><div className={styles.statDetail}>{connectionLabel(state.connection)} · {dataQualityLabel(state.payload)}</div></article>
        <article className={styles.statistic}><div className={styles.statLabel}>当前范围</div><div className={styles.statValue}>机架 A</div><div className={styles.statDetail}>{state.payload?.channel_data_available ? '电池包 A · 化成区 · 16 个真实通道' : '电池包 A · 化成区 · 当前仅有聚合数据'}</div></article>
      </div>

      <div className={styles.split}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>{state.payload?.channel_data_available ? '通道健康矩阵' : '通道数据待接入'}</div><div className={styles.panelSub}>{state.payload?.channel_data_available ? '正常状态降噪；选择通道后进入诊断证据页。' : '当前后端没有单体通道寄存器，以下位号仅作为布局占位，不显示推导数值。'}</div></div><span className={`${styles.status} ${state.payload?.channel_data_available ? styles.normal : styles.attention}`}>{state.payload?.channel_data_available ? '真实通道' : '未接入'}</span></div>
          <div className={styles.heatGrid}>
            {channels.map((channel) => (
              <button key={channel.id} disabled={channel.estimated} title={channel.estimated ? '暂无真实通道数据，不能进入单体诊断' : undefined} className={`${styles.channel} ${styles[channel.estimated ? 'attention' : channel.level]} ${state.selectedChannel === channel.index ? styles.channelSelected : ''}`} onClick={() => onSelectChannel(channel.index)}>
                <span className={styles.channelTop}><span>{channel.id}</span><span>{channel.estimated ? '未接入' : channel.level === 'normal' ? '正常' : channel.level === 'attention' ? '关注' : '严重'}</span></span>
                <strong className={styles.channelValue}>{channel.estimated ? '暂无数据' : `${channel.voltage.toFixed(2)} V`}</strong>
                <span className={styles.channelMeta}>{channel.estimated ? '不可作为单体证据' : `${channel.temperature.toFixed(1)} C`}</span>
              </button>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>关注事项</div><div className={styles.panelSub}>只呈现需要判断或升级的实时策略结果。</div></div><span className={`${styles.status} ${affected.length ? styles.attention : styles.normal}`}>{affected.length} 项</span></div>
          <div className={styles.list}>
            {affected.length ? affected.map((item) => <ExceptionRow key={item.id} exceptionItem={item} styles={styles} onClick={() => onSelectException(item.id)} />) : <div className={styles.empty}>当前范围内没有活跃异常。</div>}
          </div>
          <div className={styles.note}>异常由后端策略统一计算，并保留状态、责任角色与操作审计。当前页面的异常是聚合指标异常，不等同于某个单体通道已经确认损坏。</div>
        </article>
      </div>

      <article className={styles.panel}>
        <div className={styles.panelHeader}><div><div className={styles.panelTitle}>关键事件</div><div className={styles.panelSub}>系统采样、策略判断与人工处置的审计记录。</div></div></div>
        <div className={styles.list}>
          {state.activity.length ? state.activity.slice(0, 5).map((item) => <div className={styles.event} key={item.id}><span>{formatTime(item.timestamp)}</span><span className="eventKind">{item.title}</span><span className="eventDetail">{item.detail}</span></div>) : <div className={styles.event}><span>{formatTime(state.payload?.timestamp)}</span><span className="eventKind">实时链路</span><span className="eventDetail">等待操作事件；实时数据已进入当前工作台。</span></div>}
        </div>
      </article>
    </section>
  );
}
