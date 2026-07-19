import React from 'react';
import { Button } from '@grafana/ui';
import { formatTime, lifecycleLabel, metricEvidenceLabel, recommendationFor, type ExceptionLifecycle } from '../../domain/operations';
import type { OperationsState } from '../../store/operationsStore';
import type { OperationsStyles } from './operationsStyles';

type Props = {
  state: OperationsState;
  styles: OperationsStyles;
  onSelect: (id: string) => void;
  onTransition: (id: string, lifecycle: ExceptionLifecycle, action: string) => void;
  onDiagnose: (channel: number) => void;
};

const nextSteps: Record<ExceptionLifecycle, { lifecycle: ExceptionLifecycle; label: string; action: string; instruction: string } | undefined> = {
  detected: { lifecycle: 'acknowledged', label: '确认异常并接手', action: '确认异常', instruction: '先确认现场读数与设备范围无误，再接手本项异常。' },
  acknowledged: { lifecycle: 'assigned', label: '登记处理负责人', action: '指派处理人', instruction: '将异常归属给当前班组负责人，形成明确责任。' },
  assigned: { lifecycle: 'in_progress', label: '开始现场处置', action: '开始处置', instruction: '已完成归属，现在开始按建议检查设备与关联通道。' },
  in_progress: { lifecycle: 'pending_review', label: '提交复核', action: '提交复核', instruction: '处置完成后提交复核，等待确认信号是否稳定。' },
  pending_review: { lifecycle: 'closed', label: '确认关闭异常', action: '关闭异常', instruction: '信号已恢复且复核完成后，才关闭本项异常。' },
  closed: undefined,
};

const allowedTransitions: Record<OperationsState['role'], ExceptionLifecycle[]> = {
  operator: ['acknowledged', 'in_progress'],
  shift_lead: ['acknowledged', 'assigned', 'in_progress', 'pending_review', 'closed'],
  engineer: ['acknowledged', 'in_progress', 'pending_review'],
};

export function ExceptionWorkspace({ state, styles, onSelect, onTransition, onDiagnose }: Props) {
  const items = state.exceptions.filter((item) => item.lifecycle !== 'closed');
  const selected = items.find((item) => item.id === state.selectedExceptionId) ?? items[0];
  const nextStep = selected ? nextSteps[selected.lifecycle] : undefined;
  const batch = state.payload?.batch;
  const equipment = state.payload?.equipment;

  if (!selected) {
    return <section className={styles.content} aria-label="异常处置"><article className={styles.panel}><div className={styles.panelTitle}>异常处置</div><div className={styles.empty}>当前没有活跃异常。该工作台会在策略发现需要人工判断的情况时自动加入队列。</div></article></section>;
  }

  return (
    <section className={styles.content} aria-label="异常处置">
      <div className={styles.priority}>
        <div><div className={`${styles.priorityTitle} ${styles[selected.severity]}`}>{selected.severity === 'critical' ? '暂缓放行' : '需要质量复核'}：{batch?.id ?? '当前批次'}</div><div className={styles.priorityDetail}>{batch?.recipe} · {equipment?.id} / {equipment?.station} · 先确认范围和证据，再执行下一步。</div></div>
        <span className={`${styles.status} ${styles[selected.severity]}`}>{lifecycleLabel(selected.lifecycle)}</span>
      </div>

      <div className={styles.queue}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>处置队列</div><div className={styles.panelSub}>按严重级别与发现时间排序。</div></div><span className={styles.smallLabel}>{items.length} ACTIVE</span></div>
          <div className={styles.list}>
            {items.map((item) => <button key={item.id} className={`${styles.queueItem} ${selected.id === item.id ? styles.queueItemActive : ''}`} onClick={() => onSelect(item.id)}><div className={styles.exceptionName}>{item.title}</div><div className={styles.exceptionMeta}><span className={styles[item.severity]}>{item.severity === 'critical' ? '严重' : '关注'}</span> · {item.scope} · {formatTime(item.firstSeen)}</div></button>)}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>{selected.title}</div><div className={styles.panelSub}>{batch?.id} · {batch?.recipe} · {equipment?.id} / {equipment?.station}</div></div><span className={`${styles.status} ${styles[selected.severity]}`}>{selected.value.toFixed(selected.metric === 'pressure' ? 3 : 1)} {selected.unit}</span></div>
          <div className={styles.facts}>
            <div className={styles.fact}><div className={styles.smallLabel}>证据等级</div><div className={styles.smallValue}>{selected.evidenceType === 'measured' ? '原始实测' : selected.evidenceType === 'derived' ? '计算推导' : selected.evidenceType === 'stale' ? '缓存推导' : selected.evidenceType === 'simulated' ? '模拟推导' : metricEvidenceLabel(state.payload, selected.metric)}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>策略阈值</div><div className={styles.smallValue}>{selected.threshold[0]} / {selected.threshold[1]} {selected.unit}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>首次发现</div><div className={styles.smallValue}>{formatTime(selected.firstSeen)}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>最近刷新</div><div className={styles.smallValue}>{formatTime(selected.latestSeen)}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>当前状态</div><div className={styles.smallValue}>{lifecycleLabel(selected.lifecycle)}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>质量处置</div><div className={styles.smallValue}>{state.payload?.quality_disposition.label ?? '待质量复核'}</div></div>
            <div className={styles.fact}><div className={styles.smallLabel}>影响范围</div><div className={styles.smallValue}>{state.payload?.quality_disposition.affected_cells ?? batch?.cell_count ?? '--'} 个电芯</div></div>
          </div>
          <div className={styles.note}>{recommendationFor(selected)}</div>
          <div style={{ marginTop: 16 }}><Button variant="secondary" onClick={() => onDiagnose(selected.relatedChannel ?? 0)}>查看批次证据</Button></div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><div className={styles.panelTitle}>现在要做什么</div><div className={styles.panelSub}>系统只展示当前状态下允许的一个动作，不让操作员猜流程。</div></div></div>
          {nextStep ? <div className={styles.nextAction}><div className={styles.nextActionTitle}>{nextStep.instruction}</div><div className={styles.muted}>当前状态：{lifecycleLabel(selected.lifecycle)} · 下一状态：{lifecycleLabel(nextStep.lifecycle)}</div>{allowedTransitions[state.role].includes(nextStep.lifecycle) ? <Button variant="primary" onClick={() => onTransition(selected.id, nextStep.lifecycle, nextStep.action)}>{nextStep.label}</Button> : <div className={styles.note}>当前工作模式没有执行该步骤的权限。请切换到有权限的角色后继续。</div>}</div> : <div className={styles.empty}>该异常已关闭，无需再执行操作。</div>}
          <div className={styles.note}>每次操作都会写入服务端审计记录。系统不会因信号短暂恢复而跳过人工复核。</div>
        </article>
      </div>

      <article className={styles.panel}>
        <div className={styles.panelHeader}><div><div className={styles.panelTitle}>操作记录</div><div className={styles.panelSub}>服务端审计记录，包含策略检测、恢复和人工处置。</div></div></div>
        <div className={styles.list}>
          {state.activity.filter((item) => item.kind === 'operator').length ? state.activity.filter((item) => item.kind === 'operator').map((item) => <div className={styles.event} key={item.id}><span>{formatTime(item.timestamp)}</span><span className="eventKind">{item.title}</span><span className="eventDetail">{item.detail}</span></div>) : <div className={styles.empty}>尚无人工操作记录。</div>}
        </div>
      </article>
    </section>
  );
}
