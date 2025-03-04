import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'bennor-neon-demo',
    traceExporter:
      process.env.NODE_ENV === 'development'
        ? new ConsoleSpanExporter()
        : undefined
  });
}
