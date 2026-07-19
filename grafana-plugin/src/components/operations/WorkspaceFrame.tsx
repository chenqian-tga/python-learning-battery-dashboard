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
    description: '用最少的状态判断当前范围是否需要介入，再进入具体异常。',
    focus: '优先看待处理异常与通道健康',
  },
  exceptions: {
    label: 'EXCEPTION WORKBENCH',
    title: '异常处置',
    description: '围绕一项异常完成确认、归属、处理和复核，不在总览里完成操作。',
    focus: '优先完成当前队列中的下一步',
  },
  diagnostics: {
    label: 'DIAGNOSTIC EVIDENCE',
    title: '诊断与追溯',
    description: '在选定范围内查看趋势、阈值与关联通道，为处置提供证据。',
    focus: '当前证据覆盖最近持久化样本',
  },
};

export function WorkspaceFrame({ workspace, role, styles, children }: Props) {
  const content = copy[workspace];
  return (
    <section className={styles.workspaceStage} aria-label={content.title}>
      <div className={styles.workspaceIntro}>
        <div><div className={styles.eyebrow}>{content.label}</div><h2 className={styles.workspaceTitle}>{content.title}</h2><p className={styles.workspaceDescription}>{content.description}</p></div>
        <div className={styles.workspaceFocus}><span>当前工作模式</span><b>{role === 'operator' ? '现场操作员' : role === 'shift_lead' ? '班组长' : '工艺 / 设备工程师'}</b><small>{content.focus}</small></div>
      </div>
      <div className={styles.workspaceEnter} key={workspace}>{children}</div>
    </section>
  );
}
