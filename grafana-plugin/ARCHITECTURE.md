# Battery Operations Architecture

## System Summary

Battery Operations is a Grafana App Plugin that receives live battery data, derives operational conditions from configurable policies, and presents role-specific overview, exception handling, and diagnostic workspaces.

## Runtime Layers

- **Source layer**: Modbus equipment or simulator.
- **Transport layer**: FastAPI exposes an HTTP snapshot and a WebSocket live stream.
- **State layer**: the plugin store owns volatile live data, the selected scope, active work mode, connection state, and a bounded signal buffer.
- **Rule layer**: policy evaluation derives operating conditions, exceptions, channel health, and recommended next actions. It contains no React code.
- **UI layer**: overview, exception center, and diagnostics compose data owned by the store and rules.
- **Persistence layer**: the future FastAPI storage owns exceptions, handling tasks, policies, and audit records. The browser must not be the system of record for these entities.

## Data Flow

`Modbus / simulator -> FastAPI snapshot + WebSocket -> operations store -> policy rules -> workspace modules`

The HTTP snapshot establishes initial state. WebSocket updates are the preferred live path; a bounded exponential-backoff reconnect loop protects the session. When live transport is unavailable, the store reports degraded state rather than silently presenting stale data as current.

## Workspace Model

- **Overview**: a shift lead's one-glance view of scope, active exceptions, asset health, and recent events.
- **Exception Center**: an operator's work queue and selected exception context. This owns the handling path, not a secondary panel at the bottom of a dashboard.
- **Diagnostics**: an engineer's focused evidence workspace for a selected channel or exception.

All three workspaces share the same selected asset and live state. Users can move from an exception to diagnostics and return without losing context.

## Policy Contract

The generic policy model supports:

- severity: `critical`, `attention`, `observation`
- lifecycle: `detected`, `acknowledged`, `assigned`, `in_progress`, `pending_review`, `closed`
- permission actions: acknowledge, assign, observe, resolve, reopen
- evidence: source signal, threshold, scope, first seen, latest seen, and related channel values

Specific limits, escalation durations, role names, and approval requirements remain configuration until verified with a factory.

## Implementation Order

1. Extract domain types and policy rules from the page component.
2. Add a shared live-data store with HTTP bootstrap and WebSocket reconnect.
3. Compose the three workspace views around shared selection and exception context.
4. Replace client-derived exception lifecycle with FastAPI persistence.
5. Add a historian-backed evidence window and audit export.
