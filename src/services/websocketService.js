import http from 'http';
import { WebSocketServer } from 'ws';
import { logInfo, logError } from '../utils/logger.js';

export class WebSocketService {
  constructor() {
    this.clients = {};
    this.server = http.createServer();
    this.wss = new WebSocketServer({ server: this.server });
  }

  start(port) {
    this.wss.on('connection', (ws, req) => {
      const match = (req.url || '').match(/^\/simrig\/(\d+)$/);
      if (!match) {
        ws.send(JSON.stringify({ error: 'Invalid SimRig ID' }));
        ws.close();
        return;
      }
      const simrigId = match[1];
      if (!this.clients[simrigId]) this.clients[simrigId] = new Set();
      this.clients[simrigId].add(ws);
      logInfo(`Client connected to SimRig ${simrigId}`);

      ws.on('close', () => this.clients[simrigId].delete(ws));
      ws.on('error', err => {
        logError(`WebSocket error: ${err.message}`);
        this.clients[simrigId].delete(ws);
      });
    });

    this.server.listen(port, () => {
      logInfo(`WebSocket server running on ws://localhost:${port}`);
    });
  }

  broadcast(simrigId, message) {
    const data = JSON.stringify(message);
    for (const client of this.clients[simrigId] || []) {
      if (client.readyState === client.OPEN) {
        client.send(data);
      }
    }
  }
}
