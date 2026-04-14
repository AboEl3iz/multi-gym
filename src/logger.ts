import winston from 'winston';
import LokiTransport from 'winston-loki';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'multi-gym', labels: { app: 'multi-gym' } },
  transports: [
    new winston.transports.Console(),
    new LokiTransport({
      host: process.env.LOKI_HOST || 'http://localhost:3100',
      labels: { app: 'multi-gym' },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error(err)
    })
  ],
});
