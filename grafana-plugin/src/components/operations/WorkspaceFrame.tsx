import React, { type ReactNode } from 'react';
import type { OperationalRole, Workspace } from '../../domain/operations';
import type { OperationsStyles } from './operationsStyles';

type Props = {
  workspace: Workspace;
  role: OperationalRole;
  styles: OperationsStyles;
  children: ReactNode;
};

const copy: Record<Workspace, { label: string; title: string; description: string; focus: string }> = {
  overview: {
    label: 'SHIFT SITUATION',
    title: '本班态势',
    description: '先判断哪些批次不能直接放行，再进入具体质量异常。',
    focus: '优先看暂缓放行与待质量复核批次',
  },
  exceptions: {
    label: 'EXCEPTION WORKBENCH',
    title: '异常处置',
    description: '围绕一个批次质量任务完成确认、分流、复测和放行判定。',
    focus: '优先完成当前批次的下一步',
  },
  diagnostics: {
    label: 'DIAGNOSTIC EVIDENCE',
    title: '诊断与追溯',
    description: '对比配方、设备和批次趋势，为复测或隔离提供证据。',
    focus: '当前证据覆盖最近持久化样本',
  },
};

export function WorkspaceFrame({ workspace, role, styles, children }: Props) {
  const content = copy[workspace];
  return (
    <section className={styles.workspaceStage} aria-label={content.title}>
      <div className={styles.workspaceIntro}>
        <div><div className={styles.eyebrow}>{content.label}</div><h2 className={styles.workspaceTitle}>{content.title}</h2><p className={styles.workspaceDescription}>{content.description}</p></div>
        <div className={styles.workspaceFocus}><span>当前工作模式</span><b>{role === 'operator' ? '现场操作员' : role === 'shift_lead' ? '班组长' : role === 'engineer' ? '工艺 / 设备工程师' : '质量工程师'}</b><small>{content.focus}</small></div>
      </div>
      <div className={styles.workspaceEnter} key={workspace}>{children}</div>
    </section>
  );
}
