export type BatteryPayload = {
  voltage: number;
  current: number;
  temperature: number;
  pressure: number;
  soc: number;
  cell_diff: number;
  max_temp: number;
  connection_status: string;
  data_source: 'modbus' | 'simulator' | string;
  data_quality: 'measured' | 'derived' | 'stale' | 'simulated' | string;
  measurement_scope: 'aggregate' | 'channel' | string;
  channel_data_available: boolean;
  metric_provenance?: Record<string, 'measured' | 'derived' | 'stale' | 'simulated' | string>;
  measurement_note?: string;
  batch: {
    id: string;
    recipe: string;
    stage: string;
    cell_count: number;
    started_at: string;
  };
  equipment: {
    id: string;
    line: string;
    station: string;
  };
  quality_disposition: {
    status: 'release' | 'review' | 'hold' | string;
    label: string;
    owner_role?: string;
    affected_cells?: number;
  };
  production_kpis: {
    active_batches: number;
    review_batches: number;
    hold_batches: number;
    equipment_exceptions: number;
  };
  timestamp: string;
};

export type BackendAlert = {
  id: string;
  metric: string;
  title: string;
  severity: 'attention' | 'critical';
  lifecycle: string;
  value: number;
  unit: string;
  threshold: [number, number];
  scope: string;
  related_channel: number;
  evidence_type?: 'measured' | 'derived' | 'stale' | 'simulated' | string;
  first_seen: string;
  latest_seen: string;
  source: 'backend_policy';
  owner_role?: string;
};

export type BackendOperation = {
  id: string;
  alert_id?: string;
  timestamp: string;
  kind: 'system' | 'operator';
  actor_role?: string;
  action: string;
  from_lifecycle?: string;
  to_lifecycle?: string;
  detail: string;
};

export type OperationsSnapshot = {
  payload: BatteryPayload;
  alerts?: BackendAlert[];
  operations?: BackendOperation[];
  history?: BatteryPayload[];
};

const API_BASE_URL = 'http://127.0.0.1:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store', ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw new Error(body?.detail ?? `Battery API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getCurrentBatteryData(): Promise<BatteryPayload> {
  return request<BatteryPayload>('/api/current-data');
}

export function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  return request<OperationsSnapshot>('/api/operations/snapshot');
}

export function transitionAlert(id: string, lifecycle: string, actorRole: string, note = '') {
  return request<{ alert: BackendAlert; operation: BackendOperation }>(`/api/alerts/${id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lifecycle, actor_role: actorRole, note }),
  });
}

export function updateBatchDisposition(batchId: string, status: string, actorRole: string, note = '', affectedCells = 0) {
  return request<{ batch_id: string; status: string; label: string; owner_role: string; updated_at: string; note: string }>(`/api/batches/${encodeURIComponent(batchId)}/disposition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, actor_role: actorRole, note, affected_cells: affectedCells }),
  });
}
