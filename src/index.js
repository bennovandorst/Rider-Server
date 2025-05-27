import { CONFIG } from './config/config.js';
import { MessagingService } from './services/messagingService.js';
import { WebSocketService } from './services/websocketService.js';
import { TelemetryService } from './services/telemetryService.js';
import { getLocalIp } from './utils/ip.js';
import { launchRider } from './utils/rider.js';
import { logError, logInfo, logSuccess } from './utils/logger.js';
import readline from 'readline';
import { constants } from '@racehub-io/f1-telemetry-client';

const { PACKETS } = constants;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Which SimRig are we using? (1 or 2): ', async simrigId => {
  const simRigConfig = CONFIG.SIM_RIGS[simrigId];
  if (!simRigConfig) {
    logError('Invalid SimRig ID. Exiting.');
    rl.close();
    process.exit(1);
  }

  if (process.env.DEV_MODE === 'true') {
    logSuccess(`SimRig ${simrigId} selected (DEV MODE - skipping Rider launch)`);
  } else {
    logSuccess(`SimRig ${simrigId} selected. Launching Rider...`);
    launchRider();
  }

  const telemetry = new TelemetryService();
  const messaging = new MessagingService(CONFIG.RABBIT_URL);
  const websocket = new WebSocketService();

  websocket.start(CONFIG.PORT);

  const packetQueuePairs = Object.entries(PACKETS)
      .map(([packetKey, packetType]) => {
        const queueKey = packetKey.replace(/([A-Z])/g, l => l.toLowerCase());
        const configQueue =
            simRigConfig[`${queueKey}Queue`] ||
            simRigConfig[`${packetKey.charAt(0).toLowerCase()}${packetKey.slice(1)}Queue`];
        return configQueue ? { packetType, packetKey, configQueue } : null;
      })
      .filter(Boolean);

  await messaging.connect(simrigId, packetQueuePairs.map(p => p.configQueue));

  for (const { packetType, packetKey, configQueue } of packetQueuePairs) {
    messaging.consume(simrigId, configQueue, data => {
      websocket.broadcast(simrigId, { type: packetKey, data });
    });

    telemetry.on(packetKey, data => {
      messaging.publish(simrigId, configQueue, data);
    });
  }

  telemetry.start();

  logSuccess(`WebSocket available at ws://${getLocalIp()}:${CONFIG.PORT}/simrig/${simrigId}`);

  process.on('SIGINT', () => {
    telemetry.stop();
    logInfo('\nGracefully shutting down...');
    rl.close();
    process.exit(0);
  });
});
