# Battery Dashboard Migration

This workspace now uses a split architecture:

- [frontend](C:/Users/chenq/Desktop/python学习/frontend): Next.js frontend
- [backend](C:/Users/chenq/Desktop/python学习/backend): FastAPI backend

## Run the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Run the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase 1 Status

- Backend REST endpoint: `/api/current-data`
- Backend WebSocket endpoint: `/ws`
- Frontend: REST on mount, then WebSocket live updates
- Current mode: mock/fallback battery data until real Modbus integration is activated
