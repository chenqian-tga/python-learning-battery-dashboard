import type { BatteryPayload, OperationsSnapshot } from './batteryApi';

type StreamHandlers = {
  onMessage: (snapshot: OperationsSnapshot) => void;
  onState: (state: 'online' | 'reconnecting' | 'degraded') => void;
};

const STREAM_URL = 'ws://127.0.0.1:8000/ws';
const MAX_DELAY_MS = 10_000;

export function createBatteryStream(handlers: StreamHandlers) {
  let socket: WebSocket | undefined;
  let reconnectTimer: number | undefined;
  let stopped = false;
  let attempts = 0;

  const scheduleReconnect = () => {
    if (stopped) return;
    attempts += 1;
    const baseDelay = Math.min(MAX_DELAY_MS, 700 * 2 ** Math.min(attempts, 4));
    const delay = Math.round(baseDelay * (0.8 + Math.random() * 0.4));
    handlers.onState(attempts >= 4 ? 'degraded' : 'reconnecting');
    reconnectTimer = window.setTimeout(connect, delay);
  };

  const connect = () => {
    if (stopped) return;
    try {
      socket = new WebSocket(STREAM_URL);
      socket.onopen = () => {
        attempts = 0;
        handlers.onState('online');
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as OperationsSnapshot | { type?: string; payload?: OperationsSnapshot['payload'] };
          if ('payload' in message && message.payload) {
            handlers.onMessage(message as OperationsSnapshot);
          } else if ('timestamp' in message) {
            handlers.onMessage({ payload: message as BatteryPayload });
          }
        } catch {
          handlers.onState('degraded');
        }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => scheduleReconnect();
    } catch {
      scheduleReconnect();
    }
  };

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
