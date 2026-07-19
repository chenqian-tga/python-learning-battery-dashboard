import React, { startTransition, useCallback, useEffect } from 'react';
import { Button, useStyles2 } from '@grafana/ui';
import { dataSourceLabel, type OperationalRole, roleLabels, workspaceLabels } from '../domain/operations';
import { operationsActions, useOperationsStore } from '../store/operationsStore';
import { DiagnosticsWorkspace } from '../components/operations/DiagnosticsWorkspace';
import { ExceptionWorkspace } from '../components/operations/ExceptionWorkspace';
import { OverviewWorkspace } from '../components/operations/OverviewWorkspace';
import { getOperationsStyles } from '../components/operations/operationsStyles';
import { WorkspaceFrame } from '../components/operations/WorkspaceFrame';

const roles: OperationalRole[] = ['operator', 'shift_lead', 'engineer'];
const workspaces = ['overview', 'exceptions', 'diagnostics'] as const;

function connectionText(connection: ReturnType<typeof useOperationsStore>['connection']) {
  return { connecting: '正在建立实时链路', online: '实时链路在线', reconnecting: '实时链路重连中', degraded: '降级为快照采样' }[connection];
}

export function BatteryOperationsPage() {
  const styles = useStyles2(getOperationsStyles);
  const state = useOperationsStore();

  useEffect(() => operationsActions.start(), []);
  useEffect(() => {
    const documentRoot = document.documentElement;
    const previousTranslate = documentRoot.getAttribute('translate');
    const previousLanguage = documentRoot.lang;
    documentRoot.setAttribute('translate', 'no');
    documentRoot.lang = 'zh-CN';
    return () => {
      if (previousTranslate) documentRoot.setAttribute('translate', previousTranslate);
      else documentRoot.removeAttribute('translate');
      documentRoot.lang = previousLanguage;
    };
  }, []);

  const openException = useCallback((id: string) => startTransition(() => operationsActions.selectException(id)), []);
  const openChannel = useCallback((channel: number) => startTransition(() => operationsActions.selectChannel(channel)), []);
  const selectWorkspace = useCallback((workspace: (typeof workspaces)[number]) => startTransition(() => operationsActions.selectWorkspace(workspace)), []);
  const selectRole = useCallback((role: OperationalRole) => startTransition(() => operationsActions.selectRole(role)), []);

  return (
    <main className={`${styles.app} notranslate`} translate="no" aria-live="polite">
      <header className={styles.header}>
        <div className={styles.contextRow}>
          <div>
            <div className={styles.eyebrow}>BATTERY OPERATIONS WORKBENCH</div>
            <h1 className={styles.heading}>电池运行与异常处置</h1>
            <p className={styles.subtitle}>围绕本班态势、异常决策和诊断证据组织实时数据。</p>
          </div>
          <div className={styles.context}>
            <span className={styles.meta}>机架 A / 电池包 A</span>
            <span className={styles.meta}>化成区</span>
            <span className={`${styles.linkState} ${state.connection === 'online' ? styles.normal : styles.degraded}`}>{connectionText(state.connection)}</span>
            <span className={styles.meta}>{dataSourceLabel(state.payload)}</span>
            <span className={styles.meta}>最近采样 {state.payload ? new Date(state.payload.timestamp).toLocaleTimeString('zh-CN', { hour12: false }) : '--'}</span>
            <Button variant="secondary" icon="sync" onClick={() => void operationsActions.refresh()} aria-label="刷新实时数据">刷新</Button>
          </div>
        </div>

        <div className={styles.contextRow} style={{ marginTop: 14 }}>
          <nav className={styles.nav} aria-label="工作台导航">
            {workspaces.map((workspace) => <button key={workspace} className={`${styles.navButton} ${state.workspace === workspace ? styles.navActive : ''}`} aria-current={state.workspace === workspace ? 'page' : undefined} onClick={() => selectWorkspace(workspace)}>{workspaceLabels[workspace]}</button>)}
          </nav>
          <div className={styles.roleGroup} aria-label="工作模式">
            {roles.map((role) => <button key={role} className={`${styles.roleButton} ${state.role === role ? styles.roleActive : ''}`} aria-pressed={state.role === role} onClick={() => selectRole(role)}>{roleLabels[role]}</button>)}
          </div>
        </div>
      </header>

      {state.payload?.measurement_note && <div className={`${styles.priority} ${styles.attention}`} style={{ marginTop: 12 }}>
        <div>
          <div className={styles.priorityTitle}>数据边界：{dataSourceLabel(state.payload)} · {state.payload.channel_data_available ? '存在通道数据' : '当前没有真实单体通道数据'}</div>
          <div className={styles.priorityDetail}>{state.payload.measurement_note} 页面中的阈值判断用于发现需要确认的信号，不等同于已确认的设备故障。</div>
        </div>
      </div>}

      {state.error && <div className={`${styles.priority} ${styles.critical}`} style={{ marginTop: 12 }}><div><div className={styles.priorityTitle}>数据服务不可用</div><div className={styles.priorityDetail}>{state.error}</div></div></div>}

      <WorkspaceFrame workspace={state.workspace} role={state.role} styles={styles}>
        {state.workspace === 'overview' && <OverviewWorkspace state={state} styles={styles} onSelectException={openException} onSelectChannel={openChannel} />}
        {state.workspace === 'exceptions' && <ExceptionWorkspace state={state} styles={styles} onSelect={openException} onDiagnose={openChannel} onTransition={operationsActions.transitionException} />}
        {state.workspace === 'diagnostics' && <DiagnosticsWorkspace state={state} styles={styles} onSelectChannel={openChannel} onSelectException={openException} />}
      </WorkspaceFrame>
    </main>
  );
}
