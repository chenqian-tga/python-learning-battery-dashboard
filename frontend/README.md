# Frontend

Next.js frontend for the battery dashboard migration.

## Phase 1 Scope

- REST bootstrap from `GET http://localhost:8000/api/current-data`
- WebSocket live updates from `ws://localhost:8000/ws`
- One live battery card with voltage, current, temperature, and pressure

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- This folder is the Phase 1 frontend scaffold only.
- KPI walls, alarms, charts, and industrial UI polish are intentionally deferred to Phase 2.
