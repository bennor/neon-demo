// instrumentation.ts
import {
  AlwaysOnSampler,
  BasicTracerProvider,
  RandomIdGenerator,
  SimpleSpanProcessor,
  type SpanExporter
} from '@opentelemetry/sdk-trace-base';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { Resource } from '@opentelemetry/resources';
import {
  createExportTraceServiceRequest,
  type IExportTraceServiceRequest
} from '@opentelemetry/otlp-transformer';
import { trace as tracing, type SpanContext } from '@opentelemetry/api';

interface Reader {
  get: () => {
    telemetry: TelemetryContext;
  };
}

interface TelemetryContext {
  rootSpanContext: SpanContext;
  reportSpans: (data: IExportTraceServiceRequest) => void;
}

const symbol = Symbol.for('@vercel/request-context');
export const requestContext = () =>
  (globalThis as { [symbol]?: Reader })[symbol]?.get();

export function setupTelemetry() {
  const spanExporter: SpanExporter = {
    export: (spans, resultCallback) => {
      const data = createExportTraceServiceRequest(spans, {
        useHex: true,
        useLongBits: false
      });

      const context = requestContext();
      context?.telemetry.reportSpans(data);
      resultCallback({ code: 0, error: undefined });
    },
    shutdown: () => {
      return Promise.resolve();
    }
  };

  const tracerProvider = new BasicTracerProvider({
    idGenerator: new RandomIdGenerator(),
    sampler: new AlwaysOnSampler(),
    resource: new Resource({
      'service.name': 'bennor-neon-demo',
      'node.env': process.env.NODE_ENV,
      env: process.env.VERCEL_ENV ?? 'development'
    })
  });

  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(spanExporter));
  tracerProvider.register({
    contextManager: new AsyncLocalStorageContextManager(),
    propagator: {
      inject: () => undefined,
      fields: () => [],
      extract: (context) => {
        const { rootSpanContext } = requestContext()?.telemetry ?? {};
        return rootSpanContext
          ? tracing.setSpanContext(context, rootSpanContext)
          : context;
      }
    }
  });
}
