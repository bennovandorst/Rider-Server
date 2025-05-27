import { F1TelemetryClient, constants } from '@racehub-io/f1-telemetry-client';
import EventEmitter from 'events';
import { CONFIG } from '../config/config.js';

const { PACKETS } = constants;

export class TelemetryService extends EventEmitter {
  constructor() {
    super();
    this.client = new F1TelemetryClient({ port: CONFIG.UDP_PORT, bigintEnabled: false });

    Object.values(PACKETS).forEach(packetType => {
      this.client.on(packetType, packet => this.emit(packetType, packet));
    });
  }

  start() {
    this.client.start();
  }

  stop() {
    this.client.stop();
  }
}
