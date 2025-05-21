import { CONFIG } from './config/config.js';
import { MessagingService } from './services/messagingService.js';
import { WebSocketService } from './services/websocketService.js';
import { TelemetryService } from './services/telemetryService.js';
import { getLocalIp } from './utils/ip.js';
import { launchRider } from './utils/rider.js';
import { logError, logInfo, logSuccess } from './utils/logger.js';
import readline from 'readline';

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

  await messaging.connect(simrigId, [
    simRigConfig.cartelemetryQueue,
    simRigConfig.lapdataQueue,
    simRigConfig.cardamageQueue,
  ]);

  messaging.consume(simrigId, simRigConfig.cartelemetryQueue, data => {
    websocket.broadcast(simrigId, { type: 'carTelemetry', data });
  });

  messaging.consume(simrigId, simRigConfig.lapdataQueue, data => {
    websocket.broadcast(simrigId, { type: 'lapData', data });
  });

  messaging.consume(simrigId, simRigConfig.cardamageQueue, data => {
    websocket.broadcast(simrigId, { type: 'carDamage', data });
  })

  telemetry.on('carTelemetry', data => {
    messaging.publish(simrigId, simRigConfig.cartelemetryQueue, data);
  });
  telemetry.on('lapData', data => {
    messaging.publish(simrigId, simRigConfig.lapdataQueue, data);
  });
  telemetry.on('carDamage', data => {
    messaging.publish(simrigId, simRigConfig.cardamageQueue, data);
  })

  telemetry.start();

  //logInfo(`UDP listening on port ${CONFIG.UDP_PORT}`);
  logSuccess(`WebSocket available at ws://${getLocalIp()}:${CONFIG.PORT}/simrig/${simrigId}`);

  process.on('SIGINT', () => {
    telemetry.stop();
    logInfo('\nGracefully shutting down...');
    rl.close();
    process.exit(0);
  });
});
