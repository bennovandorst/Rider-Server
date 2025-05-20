import amqp from 'amqplib';
import { logError, logSuccess } from '../utils/logger.js';

export class MessagingService {
  constructor(url) {
    this.url = url;
    this.connections = {};
    this.channels = {};
    this.connectedPromises = {};
    this.consumers = {};
  }

  async connect(simRigId, queues) {
    if (this.connectedPromises[simRigId]) {
      return this.connectedPromises[simRigId];
    }

    this.connectedPromises[simRigId] = new Promise(async (resolve) => {
      const connectAndSetup = async () => {
        try {
          const conn = await amqp.connect(this.url);

          conn.on('error', (err) => {
            logError(`RabbitMQ error for SimRig ${simRigId}: ${err.message}`);
          });
          conn.on('close', () => {
            logError(`RabbitMQ closed for SimRig ${simRigId}, reconnecting...`);
            this.connectedPromises[simRigId] = null;
            setTimeout(connectAndSetup, 5000);
          });

          const channel = await conn.createChannel();

          for (const queue of queues) {
            await channel.assertQueue(queue);
            logSuccess(`Listening to RabbitMQ [SimRig ${simRigId}] on queue ${queue}`);
          }

          this.connections[simRigId] = conn;
          this.channels[simRigId] = channel;

          if (this.consumers[simRigId]) {
            for (const { queue, handler } of this.consumers[simRigId]) {
              await channel.consume(queue, (msg) => {
                if (msg !== null) {
                  try {
                    const data = JSON.parse(msg.content.toString());
                    handler(data);
                    channel.ack(msg);
                  } catch (err) {
                    logError(`Failed to process message from ${queue}: ${err.message}`);
                  }
                }
              });
            }
          }

          logSuccess(`Connected to RabbitMQ for SimRig ${simRigId}`);

          resolve();
        } catch (err) {
          logError(`Connection error for SimRig ${simRigId}: ${err.message}`);
          setTimeout(connectAndSetup, 5000);
        }
      };

      await connectAndSetup();
    });

    return this.connectedPromises[simRigId];
  }

  async consume(simRigId, queue, handler) {
    if (!this.consumers[simRigId]) this.consumers[simRigId] = [];
    this.consumers[simRigId].push({ queue, handler });

    const channel = this.channels[simRigId];
    if (!channel) {
      logError(`No RabbitMQ channel available for SimRig ${simRigId} to consume ${queue}`);
      return;
    }

    await channel.consume(queue, (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          handler(data);
          channel.ack(msg);
        } catch (err) {
          logError(`Failed to process message from ${queue}: ${err.message}`);
        }
      }
    });
  }

  publish(simRigId, queue, data) {
    const channel = this.channels[simRigId];
    if (!channel) {
      logError(`No RabbitMQ channel available for SimRig ${simRigId} to publish to ${queue}`);
      return;
    }
    try {
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
    } catch (err) {
      logError(`Failed to publish message to ${queue}: ${err.message}`);
    }
  }
}
