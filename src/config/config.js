export const CONFIG = {
  PORT: 8080,
  UDP_PORT: 20777,
  RABBIT_URL: 'amqp://127.0.0.1:5672',
  SIM_RIGS: {
    '1': {
      cartelemetryQueue: 'simrig1_cartelemetry',
      lapdataQueue: 'simrig1_lapdata',
      cardamageQueue: 'simrig1_cardamage',
      carsetupQueue: 'simrig1_carsetup',
    },
    '2': {
      cartelemetryQueue: 'simrig2_cartelemetry',
      lapdataQueue: 'simrig2_lapdata',
      cardamageQueue: 'simrig2_cardamage',
      carsetupQueue: 'simrig2_carsetup',
    }
  }
};
