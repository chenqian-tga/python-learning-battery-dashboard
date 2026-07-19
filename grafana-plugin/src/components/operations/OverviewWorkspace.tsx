import React from 'react';
import { Button } from '@grafana/ui';
import { dataQualityLabel, dataSourceLabel, formatTime, lifecycleLabel, type OperationsException } from '../../domain/operations';
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
  const affected = state.exceptions.filter((item) => item.lifecycle !== 'closed');
  const priority = affected[0];
  const batch = state.payload?.batch;
  const equipment = state.payload?.equipment;
  const kpis = state.payload?.production_kpis;

  return (
    <section className={styles.content} aria-label="本班总览">
      {priority ? (
        <div className={styles.priority}>
          <div>
            <div className={`${styles.priorityTitle} ${styles[priority.severity]}`}>批次需要判断：{batch?.id ?? '当前批次'} · {priority.title}</div>
            <div className={styles.priorityDetail}>{batch?.recipe} · {equipment?.id} / {equipment?.station} · 当前状态 {state.payload?.quality_disposition.label ?? '待质量复核'}</div>
          </div>
          <Button variant="secondary" icon="arrow-right" onClick={() => onSelectException(priority.id)}>进入处置</Button>
        </div>
      ) : (
        <div className={styles.priority}>
          <div><div className={`${styles.priorityTitle} ${styles.normal}`}>当前没有待处理批次异常</div><div className={styles.priorityDetail}>持续接收化成和老化过程数据，异常出现后自动进入质量队列。</div></div>
        </div>
      )}

      <div className={styles.grid4}>
        <article className={styles.statistic}><div className={styles.statLabel}>待质量复核</div><div className={styles.statValue}>{kpis?.review_batches ?? affected.length} 批</div><div className={styles.statDetail}>异常批次需要质量工程师判断</div></article>
        <article className={styles.statistic}><div className={styles.statLabel}>暂缓放行</div><div className={`${styles.statValue} ${styles.critical}`}>{kpis?.hold_batches ?? (state.payload?.quality_disposition.status === 'hold' ? 1 : 0)} 批</div><div className={styles.statDetail}>需完成复测或隔离结论</div></article>
        <article className={styles.statistic}><div className={styles.statLabel}>数据来源</div><div className={`${styles.statValue} ${state.payload?.data_quality === 'measured' ? styles.normal : styles.attention}`}>{dataSourceLabel(state.payload)}</div><div className={styles.statDetail}>{connectionLabel(state.connection)} · {dataQualityLabel(state.payload)}</div></article>
        <article className={styles.statistic}><div className={styles.statLabel}>当前批次</div><div className={styles.statValue}>{batch?.id ?? '--'}</div><div className={styles.statDetail}>{batch?.cell_count ?? '--'} 个电芯 · {batch?.stage ?? '化成 / 老化'}</div></article>
      </div>

      <div className={styles.split}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>当前生产范围</div><div className={styles.panelSub}>把异常放回批次、配方和设备上下文，不要求操作员逐个盯单体通道。</div></div><span className={`${styles.status} ${styles.attention}`}>{state.payload?.quality_disposition.label ?? '待质量复核'}</span></div>
          <div className={styles.facts}>
            <div className={styles.fact}><div className={styles.smallLabel}>批次</div><div className={styles.smallValue}>{batch?.id ?? '--'}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>配方</div><div className={styles.smallValue}>{batch?.recipe ?? '--'}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>设备 / 工位</div><div className={styles.smallValue}>{equipment ? `${equipment.id} / ${equipment.station}` : '--'}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>影响范围</div><div className={styles.smallValue}>{state.payload?.quality_disposition.affected_cells ?? batch?.cell_count ?? '--'} 个电芯</div></div>
          </div>
          <div className={styles.note}>当前仍是模拟聚合数据，不能证明单个电芯已经损坏；它只用于演示批次异常进入质量复核和放行决策的流程。</div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>关注事项</div><div className={styles.panelSub}>只呈现需要判断或升级的实时策略结果。</div></div><span className={`${styles.status} ${affected.length ? styles.attention : styles.normal}`}>{affected.length} 项</span></div>
          <div className={styles.list}>
            {affected.length ? affected.map((item) => <ExceptionRow key={item.id} exceptionItem={item} styles={styles} onClick={() => onSelectException(item.id)} />) : <div className={styles.empty}>当前范围内没有活跃异常。</div>}
          </div>
          <div className={styles.note}>异常由后端策略统一计算，并保留批次范围、状态、责任角色与操作审计。</div>
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
