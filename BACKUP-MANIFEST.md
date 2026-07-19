# Battery Operations Backup

This repository snapshot preserves the current Battery Operations prototype before the next product redesign.

## Included

- `backend/`: FastAPI service, simulated/Modbus adapter, operations repository, and resilience tests.
- `frontend/`: existing standalone dashboard frontend.
- `grafana-plugin/`: Grafana Battery Operations app source, provisioning, tests, and project documentation.

## Deliberately Excluded

- `node_modules/`, `.next/`, and plugin `dist/` build output.
- `backend/data/` runtime SQLite state and local logs.
- Other unrelated experiments in this workspace.

## Current Boundary

The backend currently uses simulator/fallback data when a complete Modbus path is unavailable. Aggregate indicators must not be interpreted as measured individual-cell evidence.

## Main Runtime Entry

The current Grafana workbench is served at:

`http://127.0.0.1:3001/a/chenq-batteryops-app/operations`

## Demo Media

The repository includes the existing battery workshop image at
`frontend/public/showcase/battery-energy-storage-workshop.jpg`.

An actual browser screenshot of the Grafana workbench is not included in this snapshot because the local Chrome/Playwright screenshot runtime was unavailable during backup. Do not treat the workshop image as a UI screenshot.
