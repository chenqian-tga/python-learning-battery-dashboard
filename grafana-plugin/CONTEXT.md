# Battery Operations

Battery Operations is an industrial battery monitoring context. It turns live equipment signals into operational attention, human handling records, and diagnostic evidence without tying the product to a particular factory's workflow.

## Operating Model

**Asset**:
A monitored physical unit arranged as a hierarchy such as rack, pack, and channel. An asset is the scope used to understand a signal, an exception, or a task.
_Avoid_: device card, data point

**Signal**:
A timestamped measurement received from an asset, such as voltage, temperature, pressure, or state of charge.
_Avoid_: metric, chart value

**Evidence Provenance**:
The declared origin of a signal or derived indicator: original measured input, calculated aggregate, cached value, or simulator output. Provenance limits what operational conclusion the system may state.
_Avoid_: real-time as a synonym for measured

**Operating Condition**:
The current derived health of an asset or signal: normal, attention, or critical. It is recalculated from live signals and policy thresholds.
_Avoid_: alarm status

**Exception**:
A policy-relevant deviation that needs a human decision. An exception has a scope, severity, evidence window, and lifecycle independent from the latest signal value.
_Avoid_: warning, red item

**Handling Task**:
A durable human work item created from an exception or observation. It records ownership, outcome, and timestamps.
_Avoid_: button state, note

**Observation**:
A lower-severity watch placed on an asset for a defined period. It is not an active exception unless a policy condition is met.
_Avoid_: soft alarm

**Evidence Window**:
The bounded time range, signal values, thresholds, and related events used to explain an exception or a handling decision.
_Avoid_: history

## Governance

**Operational Role**:
A work-mode contract that defines the default view and allowed handling actions. Initial roles are Operator, Shift Lead, and Engineer; role names and permissions are configuration, not layout rules.
_Avoid_: Grafana viewer, editor

**Policy**:
A configurable set of thresholds, severity mapping, escalation timing, and handling requirements. Policies are authoritative business rules and must not be embedded in page components.
_Avoid_: if statement, card color

**Audit Record**:
An immutable record of a user or system action, including actor, time, target, previous state, and outcome.
_Avoid_: activity text
