import { useSyncExternalStore } from 'react';
import {
  type ActivityEntry,
  type ConnectionState,
  type ExceptionLifecycle,
  type OperationalRole,
  type OperationsException,
  type Workspace,
  buildExceptions,
} from '../domain/operations';
import { type BackendAlert, type BackendOperation, getCurrentBatteryData, getOperationsSnapshot, transitionAlert, updateBatchDisposition, type BatteryPayload, type OperationsSnapshot } from '../services/batteryApi';
import { createBatteryStream } from '../services/batteryStream';

export type OperationsState = {
  payload?: BatteryPayload;
  history: BatteryPayload[];
  connection: ConnectionState;
  error?: string;
  selectedChannel: number;
  selectedExceptionId?: string;
  workspace: Workspace;
  role: OperationalRole;
  exceptions: OperationsException[];
  activity: ActivityEntry[];
};

const initialState: OperationsState = {
  history: [],
  connection: 'connecting',
  selectedChannel: 8,
  workspace: 'overview',
  role: 'shift_lead',
  exceptions: [],
  activity: [],
};

let state = initialState;
let streamStop: (() => void) | undefined;
let fallbackTimer: number | undefined;
let subscribers = new Set<() => void>();

function publish(next: Partial<OperationsState>) {
  state = { ...state, ...next };
  subscribers.forEach((subscriber) => subscriber());
}

function addActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>) {
  const activity: ActivityEntry = { id: `${Date.now()}-${Math.random()}`, timestamp: new Date().toISOString(), ...entry };
  publish({ activity: [activity, ...state.activity].slice(0, 24) });
}

function mapAlert(alert: BackendAlert): OperationsException {
  return {
    id: alert.id,
    metric: alert.metric as OperationsException['metric'],
    title: alert.title,
    severity: alert.severity,
    lifecycle: alert.lifecycle as ExceptionLifecycle,
    value: alert.value,
    unit: alert.unit,
    threshold: alert.threshold,
    scope: alert.scope,
    relatedChannel: alert.related_channel > 0 ? alert.related_channel : undefined,
    firstSeen: alert.first_seen,
    latestSeen: alert.latest_seen,
    source: 'backend_policy',
    evidenceType: alert.evidence_type,
  };
}

function mapOperation(operation: BackendOperation): ActivityEntry {
  return { id: operation.id, timestamp: operation.timestamp, kind: operation.kind, title: operation.action, detail: operation.detail };
}

function receiveSnapshot(snapshot: OperationsSnapshot) {
  const history = snapshot.history?.length ? snapshot.history.slice(-180) : [...state.history, snapshot.payload].slice(-180);
  publish({
    payload: snapshot.payload,
    history,
    exceptions: snapshot.alerts ? snapshot.alerts.map(mapAlert) : buildExceptions(snapshot.payload, state.exceptions),
    activity: snapshot.operations?.map(mapOperation) ?? state.activity,
    connection: 'online',
    error: undefined,
  });
}

async function requestSnapshot() {
  try {
    receiveSnapshot(await getOperationsSnapshot());
  } catch (error) {
    try {
      const payload = await getCurrentBatteryData();
      receiveSnapshot({ payload });
      publish({ connection: 'degraded', error: undefined });
    } catch {
      publish({ connection: 'degraded', error: error instanceof Error ? error.message : '数据服务不可用' });
    }
  }
}

function startFallbackPolling() {
  if (fallbackTimer !== undefined) return;
  fallbackTimer = window.setInterval(() => void requestSnapshot(), 5_000);
}

function stopFallbackPolling() {
  if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer);
  fallbackTimer = undefined;
}

export const operationsActions = {
  start() {
    void requestSnapshot();
    streamStop?.();
    streamStop = createBatteryStream({
      onMessage: receiveSnapshot,
      onState: (connection) => {
        publish({ connection });
        if (connection === 'online') stopFallbackPolling();
        else startFallbackPolling();
      },
    });

    return () => {
      streamStop?.();
      streamStop = undefined;
      stopFallbackPolling();
    };
  },
  refresh: requestSnapshot,
  selectWorkspace(workspace: Workspace) {
    publish({ workspace });
  },
  selectChannel(selectedChannel: number) {
    publish({ selectedChannel, workspace: 'diagnostics' });
  },
  selectException(selectedExceptionId: string) {
    const exceptionItem = state.exceptions.find((item) => item.id === selectedExceptionId);
    publish({ selectedExceptionId, selectedChannel: exceptionItem?.relatedChannel ?? state.selectedChannel, workspace: 'exceptions' });
  },
  selectRole(role: OperationalRole) {
    const workspace: Workspace = role === 'operator' ? 'exceptions' : role === 'engineer' ? 'diagnostics' : 'overview';
    publish({ role, workspace });
  },
  async transitionException(id: string, lifecycle: ExceptionLifecycle, action: string) {
    const exceptionItem = state.exceptions.find((item) => item.id === id);
    if (!exceptionItem) return;
    try {
      const result = await transitionAlert(id, lifecycle, state.role, `${action}：${exceptionItem.title}`);
      const nextAlert = mapAlert(result.alert);
      publish({ exceptions: state.exceptions.map((item) => (item.id === id ? nextAlert : item)) });
      addActivity(mapOperation(result.operation));
    } catch (error) {
      publish({ error: error instanceof Error ? error.message : '异常状态更新失败' });
    }
  },
  async updateBatchDisposition(status: string, note: string) {
    if (!state.payload?.batch?.id) return;
    try {
      const result = await updateBatchDisposition(state.payload.batch.id, status, state.role, note, state.payload.batch.cell_count);
      publish({ payload: { ...state.payload, quality_disposition: { ...state.payload.quality_disposition, ...result } } });
      addActivity({ kind: 'operator', title: '批次质量处置已更新', detail: `${result.label}：${note || state.payload.batch.id}` });
    } catch (error) {
      publish({ error: error instanceof Error ? error.message : '批次质量处置更新失败' });
    }
  },
};

export function useOperationsStore() {
  return useSyncExternalStore(
    (subscriber) => {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    () => state,
    () => initialState
  );
}
