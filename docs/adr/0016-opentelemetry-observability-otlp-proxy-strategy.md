# ADR 0016: OpenTelemetry Observability — OTLP Proxy Strategy

- Status: Accepted
- Date: 2026-04-04
- Owners: Backend Developer, Frontend Developer
- Related Contracts:
  - docs/contracts/api/telemetry-proxy-traces-contract.yaml

## Context

### Problem Statement

`Tenax.ServiceDefaults` (`src/Tenax.ServiceDefaults/ServiceDefaultsExtensions.cs`) contains no OpenTelemetry
wiring. As a result:

- Traces, metrics, and logs from the ASP.NET Core host are invisible in the Aspire dashboard.
- `ILogger<T>` log records carry no `TraceId` / `SpanId` correlation to active request spans.
- The Aspire AppHost (`src/Tenax.AppHost/Program.cs`) has no `.WithOtlpExporter()` call on the
  `tenax-web` resource, so Aspire never injects `OTEL_EXPORTER_OTLP_ENDPOINT` into the service.
- Browser-initiated fetch requests carry no `traceparent` header. Every React-originated network call
  is a disconnected root span in the trace graph — impossible to correlate with the server-side span
  that handled it.

### Constraints

- The OTLP collector port must **not** be publicly reachable. Browser code running in untrusted
  networks cannot connect directly to the Aspire OTLP endpoint.
- Frontend observability must not send instrumentation data to any third-party SaaS service.
- Frontend bundle size increase must be bounded; only high-value, low-frequency events are
  instrumented.
- All trace data must flow through the existing authenticated API surface.
- The logging strategy must not introduce Serilog or any additional logging framework dependency;
  .NET 10 built-in `AddOpenTelemetry()` logging integration covers all enrichment requirements.

### Existing System Assumptions

- Authentication: JWT Bearer, issued by Keycloak (ADR 0006). All authenticated API calls carry a
  valid `Authorization: Bearer <token>` header managed by `oidc-client-ts` (ADR 0008).
- Frontend: Vite + React SPA served from `src/Tenax.Web/frontend/`. Entry point is `main.tsx`.
- Backend: ASP.NET Core Minimal API in `src/Tenax.Api/`. Clean architecture layers:
  Web → Application → Domain, with Infrastructure at the outer ring.
- Service defaults are applied to all services via `AddTenaxServiceDefaults()` /
  `MapTenaxDefaultEndpoints()` in `Tenax.ServiceDefaults`.
- Aspire AppHost (`src/Tenax.AppHost/Program.cs`) controls resource definitions and environment
  variable injection.

---

## Decision

**Option C — Backend OTLP Proxy with Scoped Frontend Instrumentation** is adopted.

### Backend Observability Wiring

#### NuGet Packages — add to `Tenax.ServiceDefaults`

| Package | Signal |
|---|---|
| `OpenTelemetry.Extensions.Hosting` | Hosting integration |
| `OpenTelemetry.Instrumentation.AspNetCore` | Traces + Metrics (HTTP server) |
| `OpenTelemetry.Instrumentation.Http` | Traces + Metrics (HttpClient) |
| `OpenTelemetry.Instrumentation.EntityFrameworkCore` | Traces (EF Core queries) |
| `OpenTelemetry.Exporter.OpenTelemetryProtocol` | OTLP export (all three signals) |

#### `ServiceDefaultsExtensions.cs` — `AddTenaxServiceDefaults()`

Call `AddOpenTelemetry()` immediately after `AddProblemDetails()`. Wire all three signals:

- **Tracing** via `.WithTracing()`: add `AspNetCoreInstrumentation`, `HttpClientInstrumentation`,
  `EntityFrameworkCoreInstrumentation`.
- **Metrics** via `.WithMetrics()`: add `AspNetCoreInstrumentation`, `HttpClientInstrumentation`.
- **Logging** via `.WithLogging()`: `IncludeFormattedMessage = true`, `IncludeScopes = true`.
  This enriches every `ILogger<T>` emission with `TraceId`, `SpanId`, and `TraceFlags` via the
  OTLP log exporter — no Serilog required.

Call `.UseOtlpExporter()` once on the builder to activate OTLP export for all three signals.
`OTEL_EXPORTER_OTLP_ENDPOINT` is injected at runtime by Aspire (see AppHost section below).

#### `Tenax.AppHost/Program.cs`

- Add `.WithOtlpExporter()` to the `tenax-web` resource. Aspire auto-injects
  `OTEL_EXPORTER_OTLP_ENDPOINT` pointing to the local Aspire OTLP collector.
- Add environment variable `OTEL_SERVICE_NAME=tenax-web` so the resource is named correctly in
  the Aspire dashboard and trace UIs.

#### New API Endpoint — OTLP Proxy

```
POST /api/telemetry/traces
```

- **Authentication**: JWT Bearer required. Requests without a valid token receive `401`.
- **Request body**: raw OTLP payload forwarded as-is from the browser SDK.
  Accepted content types: `application/x-protobuf` (binary OTLP), `application/json` (OTLP JSON).
- **Behaviour**: read the raw body, forward it unchanged to `OTEL_EXPORTER_OTLP_ENDPOINT/v1/traces`
  via a named `HttpClient` (`TelemetryOtlpProxy`). Preserve the incoming `Content-Type`.
- **Responses**:
  - `204 No Content` — upstream collector accepted the payload.
  - `401 Unauthorized` — missing or invalid JWT.
  - `502 Bad Gateway` — upstream OTLP collector unreachable or returned a non-success status.
- The named `HttpClient` (`TelemetryOtlpProxy`) is registered in DI with base address bound to
  `OTEL_EXPORTER_OTLP_ENDPOINT`. It must **not** be instrumented by `HttpClientInstrumentation`
  (use filter) to prevent recursive trace creation.
- Endpoint lives in the Web layer (`Tenax.Api`) as a Minimal API endpoint group
  `/api/telemetry`. No Application/Domain layer penetration — this is a pure infrastructure
  pass-through.

### Frontend Observability Wiring

#### npm Packages — add to `src/Tenax.Web/frontend/`

| Package | Purpose |
|---|---|
| `@opentelemetry/sdk-web` | Core SDK, `WebTracerProvider` |
| `@opentelemetry/instrumentation-fetch` | Auto-instruments all `fetch` calls; injects `traceparent`/`tracestate` headers |
| `@opentelemetry/exporter-trace-otlp-http` | Exports spans via HTTP to `/api/telemetry/traces` |
| `@opentelemetry/resources` | Resource definition (`SERVICE_NAME`, `SERVICE_VERSION`) |
| `@opentelemetry/semantic-conventions` | Semantic attribute constants |

#### `src/Tenax.Web/frontend/src/lib/telemetry.ts`

- Instantiate `WebTracerProvider` with `Resource` carrying `service.name = "tenax-web"`.
- Register `FetchInstrumentation`. This auto-instruments every `fetch` call made by
  `oidc-client-ts`, TanStack Query, and direct service calls — injecting `traceparent` and
  `tracestate` headers so backend spans are children of browser spans in the same trace.
- Configure `OTLPTraceExporter` with `url = "/api/telemetry/traces"` (same-origin — no CORS
  required). Add `Authorization: Bearer <token>` header from the `oidc-client-ts` session.
- SDK flushes span batches asynchronously every 5 seconds (default `BatchSpanProcessor` interval).
- Export a named tracer `studySessionTracer` for manual instrumentation.
- Call `provider.register()` at module level.

#### Initialization

- Import `telemetry.ts` in `main.tsx` **before** the React root is created so the provider is
  active before any fetch calls are made.

#### Manual Spans — Study Mode

| Span Name | Attributes |
|---|---|
| `study.session.start` | `deckId` (string), `cardCount` (integer), `shuffled` (boolean) |
| `study.session.complete` | `cardsStudied` (integer), `durationMs` (integer) |

These are the only manual spans. All other instrumentation is exclusively auto-instrumentation
via `FetchInstrumentation`.

#### Explicitly Excluded Events

Mouse moves, hover events, keystrokes, scroll events, window resize events, and every-click
instrumentation are **not** instrumented. Only high-value, low-frequency events are captured.

### Logging Strategy

Built-in .NET 10 `builder.Logging.AddOpenTelemetry()` (called inside `AddOpenTelemetry()`) handles
all log enrichment. Each `ILogger<T>` emission is automatically correlated with its active span
(`TraceId`, `SpanId`, `TraceFlags`) and exported via OTLP. Serilog is not introduced.

### Architectural Boundaries

```
Browser (React SPA)
  └─ telemetry.ts: WebTracerProvider + FetchInstrumentation + OTLPTraceExporter
        │  POST /api/telemetry/traces  (same-origin, JWT Bearer)
        ▼
Tenax.Api (Web layer — Minimal API endpoint group /api/telemetry)
  └─ TelemetryController.MapTraces()  ← raw body pass-through only
        │  Named HttpClient: TelemetryOtlpProxy → OTEL_EXPORTER_OTLP_ENDPOINT/v1/traces
        ▼
Aspire OTLP Collector (internal, not publicly reachable)
  └─ Aspire Dashboard (traces, metrics, logs)
```

---

## Alternatives Considered

### Option A — Direct Browser → Aspire OTLP (Rejected)

The browser SDK would export spans directly to the Aspire OTLP gRPC/HTTP port (e.g.,
`http://localhost:4317` or `http://localhost:18889`). This works in a pure local development
scenario but is rejected because:

- The OTLP port cannot be publicly exposed in staging or production environments.
- Exposing an unauthenticated OTLP ingest port to a browser client allows any party to inject
  arbitrary telemetry into the pipeline.
- No authentication mechanism exists on the raw OTLP ingest endpoint.

### Option B — `traceparent` Header Propagation Only (Rejected)

The frontend would include only a manually constructed `traceparent` header on outbound fetch
requests, without emitting any browser spans. This is rejected because:

- No browser spans reach Aspire at all. The distributed trace starts at the server-side HTTP
  handler, making user-perceived latency and browser-side failures invisible.
- Study session events (`study.session.start`, `study.session.complete`) cannot be captured
  without a span emitter on the frontend.
- The trace graph is incomplete — the browser leg of the transaction is entirely absent.

### Option D — Serilog Sink Approach (Rejected)

Introducing Serilog with an OpenTelemetry sink was considered for structured log enrichment.
Rejected because:

- .NET 10 `builder.Logging.AddOpenTelemetry()` natively enriches `ILogger<T>` calls with
  `TraceId`, `SpanId`, and `TraceFlags` and exports via OTLP without additional packages.
- Adding Serilog introduces a second logging pipeline, increases package surface area, and
  requires configuration of two formatters for no incremental benefit.

---

## Consequences

### Positive Impacts

- **End-to-end distributed traces**: a browser click that triggers a study session produces a
  single connected trace: browser span → HTTP server span → EF Core query spans — all visible in
  the Aspire dashboard.
- **Production-safe**: the OTLP collector is never exposed beyond the internal service mesh.
  All telemetry exits the browser through the authenticated `/api/telemetry/traces` endpoint.
- **Log correlation**: every server log line carries `TraceId` and `SpanId`, enabling
  log-to-trace navigation in the Aspire dashboard without additional tooling.
- **Metrics baseline**: ASP.NET Core and HttpClient request duration histograms are available
  in Aspire immediately after the ServiceDefaults wiring is in place.
- **Zero breaking changes**: existing health-check endpoints, problem-details middleware, and
  JWT authentication are unaffected.

### Trade-offs and Risks

- **Frontend bundle size**: `@opentelemetry/sdk-web` + supporting packages add approximately
  45 KB (gzip) to the production bundle. This is bounded and acceptable.
- **Bearer token availability at init time**: `telemetry.ts` initialises before React mounts,
  but the OIDC session (and thus the Bearer token) is loaded asynchronously. The `OTLPTraceExporter`
  header callback must read the token from `oidc-client-ts`'s `UserManager` at flush time, not
  at SDK init time, to avoid exporting with a stale or missing token.
- **Recursive trace risk**: the `TelemetryOtlpProxy` named `HttpClient` must be excluded from
  `HttpClientInstrumentation` (via an instrumentation filter on the client name or URL) to
  prevent the proxy's own outbound call from generating a trace that re-enters the proxy.
- **Upstream OTLP unavailability**: if the Aspire collector is down, all spans queue in the
  `BatchSpanProcessor` until the buffer limit is reached and spans are dropped. The `502`
  response from the proxy is not surfaced to the user; telemetry loss is silent. This is
  acceptable for observability infrastructure.
- **Content-Type fidelity**: the proxy must forward the `Content-Type` header from the browser
  request unchanged so the upstream collector correctly parses protobuf vs. JSON payloads.

### Follow-up Tasks

1. Add `HttpClientInstrumentation` exclusion filter for `TelemetryOtlpProxy` in
   `ServiceDefaultsExtensions.cs`.
2. Implement Bearer token deferred resolution in `telemetry.ts` (read token at flush time via
   `UserManager.getUser()`).
3. Add integration test verifying `POST /api/telemetry/traces` returns `401` without JWT and
   `204` with a valid JWT and a well-formed OTLP JSON payload against a stub upstream.
4. Verify `OTEL_SERVICE_NAME` and `OTEL_EXPORTER_OTLP_ENDPOINT` are visible in Aspire resource
   environment variables after AppHost wiring.

---

## Parallel Delivery Notes

### Backend Track

Deliverable order (no frontend dependency):

1. Add OTel NuGet packages to `Tenax.ServiceDefaults`.
2. Wire `AddOpenTelemetry()` (tracing, metrics, logging) in `ServiceDefaultsExtensions.cs`.
   Call `.UseOtlpExporter()`.
3. Update `Tenax.AppHost/Program.cs`: `.WithOtlpExporter()` + `OTEL_SERVICE_NAME=tenax-web` on
   `tenax-web` resource.
4. Register named `HttpClient` `TelemetryOtlpProxy` in `Tenax.Api` DI, base address bound to
   `OTEL_EXPORTER_OTLP_ENDPOINT`.
5. Implement `POST /api/telemetry/traces` endpoint (JWT guard → read raw body → forward via
   `TelemetryOtlpProxy` → return `204` / `502`).
6. Verify traces, metrics, and logs appear in Aspire dashboard for server-side requests.

Contract milestone: endpoint ready at `POST /api/telemetry/traces` before frontend track
step 4 below.

### Frontend Track

Deliverable order (steps 1–3 do not require backend endpoint to be ready):

1. Install OTel npm packages.
2. Create `src/Tenax.Web/frontend/src/lib/telemetry.ts` — provider, exporter (URL
   `/api/telemetry/traces`), `FetchInstrumentation`, `studySessionTracer` export.
3. Import `telemetry.ts` at the top of `main.tsx` before `ReactDOM.createRoot`.
4. (Requires backend contract milestone) Smoke-test: confirm browser spans appear in Aspire
   dashboard after login and deck navigation.
5. Add `study.session.start` and `study.session.complete` manual spans in study mode components.

### Shared Contract Milestones

| Milestone | Owner | Blocks |
|---|---|---|
| `POST /api/telemetry/traces` returns `204` for valid OTLP JSON | Backend | Frontend step 4 |
| `telemetry.ts` exports `studySessionTracer` | Frontend | Study mode manual spans |
| End-to-end trace visible in Aspire dashboard | Both | Feature acceptance |
