// OpenTelemetry: traces, metrics and logs, sent to an OTLP endpoint such as Grafana's
// all-in-one image. It's loaded before the app (`node --import ./dist/instrumentation.js`)
// because the libraries it instruments must be patched before the app imports them.
//
// It does nothing unless OTEL_EXPORTER_OTLP_ENDPOINT is set, so tests and plain runs are
// unaffected. Everything else is configured with the standard OTEL_* variables, e.g.
// OTEL_SERVICE_NAME.

import { register } from 'node:module';

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  // Lets OpenTelemetry patch libraries loaded with `import` (ES modules).
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

  const [{ NodeSDK }, http, express, mongodb, pino, undici] = await Promise.all([
    import('@opentelemetry/sdk-node'),
    import('@opentelemetry/instrumentation-http'),
    import('@opentelemetry/instrumentation-express'),
    import('@opentelemetry/instrumentation-mongodb'),
    import('@opentelemetry/instrumentation-pino'),
    import('@opentelemetry/instrumentation-undici'),
  ]);

  const sdk = new NodeSDK({
    instrumentations: [
      // Incoming requests: a span per request, plus request duration metrics. Health
      // checks run every few seconds and would drown out real traffic, so skip them.
      new http.HttpInstrumentation({
        ignoreIncomingRequestHook: (request) => request.url?.startsWith('/health') ?? false,
      }),
      // Names spans after the matched route, e.g. "GET /api/books/:id". Only the route's
      // handler gets its own span; one per middleware (helmet, cors...) is just noise.
      new express.ExpressInstrumentation({
        ignoreLayersType: [express.ExpressLayerType.MIDDLEWARE, express.ExpressLayerType.ROUTER],
      }),
      // A span per database query. Query values aren't recorded (they may contain
      // personal data); only the operation and collection are.
      new mongodb.MongoDBInstrumentation({ enhancedDatabaseReporting: false }),
      // Adds trace and span IDs to every log line and sends logs to the endpoint too, so
      // a log line leads straight to its trace.
      new pino.PinoInstrumentation(),
      // Outgoing fetch() calls (e.g. user-service -> book-service): a span per call, and
      // the trace context is passed along so the trace continues in the other service.
      new undici.UndiciInstrumentation(),
    ],
  });

  sdk.start();

  // Send whatever is still buffered before the process exits.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => void sdk.shutdown());
  }
}
