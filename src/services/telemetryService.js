import { F1TelemetryClient, constants } from '@racehub-io/f1-telemetry-client';
import EventEmitter from 'events';
import { CONFIG } from '../config/config.js';

const { PACKETS } = constants;

export class TelemetryService extends EventEmitter {
  constructor() {
    super();
    this.client = new F1TelemetryClient({ port: CONFIG.UDP_PORT, bigintEnabled: false });

    this.client.on(PACKETS.carTelemetry, packet => {
      this.emit('carTelemetry', packet);
    });

    this.client.on(PACKETS.lapData, packet => {
      this.emit('lapData', packet);
    });

    this.client.on(PACKETS.carDamage, packet => {
        this.emit('carDamage', packet);
    });

    this.client.on(PACKETS.carSetups, packet => {
        this.emit('carSetups', packet);
    });
  }

  start() {
    this.client.start();
  }

  stop() {
    this.client.stop();
  }
}
