Architecture Motivation: The "Direct-to-Runtime" Zero-Hop Stack
1. Core Philosophy: Single-Process Supremacy
Engineered for sub-millisecond latency and maximum operational density, this architecture consolidates execution, storage, and transport into a singular Bun process. This permanently eradicates network serialization, Inter-Process Communication (IPC) bottlenecks, and microservice overhead. A "Live-Link" development paradigm supplants traditional build-bundle-deploy pipelines, enforcing real-time filesystem-to-memory synchronization.

2. Infrastructure & Ingress Routing
Execution Engine (Bun): A unified JIT runtime, package manager, and web server providing on-the-fly TypeScript/JSX transpilation, bypassing intermediate build steps.

Layer 4 UDP Passthrough: To prevent standard Layer 7 proxies from terminating HTTP/3 and downgrading WebTransport streams, the ingress routes raw, encrypted UDP packets (Port 443) directly to Bun.

Native QUIC Termination: Bun directly terminates the SSL/TLS/QUIC connection, maintaining an unbroken, non-blocking stream from the client directly to the business logic.

3. Data Transport & Storage Strategy
Multiplexed Streaming (WebTransport): Leverages HTTP/3 (UDP) for bidirectional streaming, permanently eliminating TCP Head-of-Line blocking to sustain high-frequency data pipelines.

Binary Serialization (Msgpackr): Replaces JSON with highly optimized binary payloads, minimizing network footprint and accelerating decode velocities to preserve CPU cycles for domain logic.

Embedded Columnar Abstraction (Busybase): Functioning as the preferred operational wrapper for libsql (npmjs.com/busybase), this package instantiates an Apache Arrow-backed datastore natively within Bun's memory heap. It guarantees zero-hop, high-throughput vector and tabular mutations, permanently negating network ingestion latency.

4. Buildless Hot Reloading (Live-Sync)
In-Place Memory Mutation: Bun's native filesystem watcher seamlessly updates the active process memory.

Asynchronous Invalidation: Server-side modifications trigger lightweight client invalidation signals via the persistent WebTransport stream.

Deterministic Rehydration: XState serializes current application state to native Web Storage. The browser executes a native ESM dynamic import() to fetch the updated module, seamlessly rehydrating state without page reloads.

5. UI Templating: Extending Ripple UI & Tailwind
Utility-First Integration: Combines Tailwind CSS with Ripple UI's component architectures via a localized configuration, eliminating external UI dependencies.

Zero-Runtime CSS: Generates a deterministic, strictly utilized CSS payload, eradicating the computational overhead and memory allocation of runtime CSS-in-JS.

Functional Templating (WebJSX): Employs pure functional component factories returning raw DOM nodes decorated with utility classes, enabling complex logic injection and native DOM mutation without Virtual DOM overhead.

6. Zero-CDN & Dependency Management
Localized Resolution: All critical dependencies (XState, Msgpackr, Ripple UI) are resolved locally, neutralizing external DNS lookup latency and third-party reliance.

Air-Gapped Portability: The backend, Busybase storage bindings, and frontend assets compile into a singular, self-contained deployment artifact, ensuring operational sovereignty and peak performance in edge or high-security environments.

7. Logic Orchestration & Surgical Rendering
State Orchestration (XState): A deterministic state machine coordinating high-frequency WebTransport binary streams, strictly preventing illegal or inconsistent UI states.

Surgical Rendering (WebJSX): Validated state transitions trigger direct, highly targeted DOM mutations. Bypassing Virtual DOM diffing algorithms reserves the browser's frame budget exclusively for pixel painting under high data throughput.


---

## Getting Started with Each Requirement

> For each section below: follow the install steps, use the starter snippet, then visit the linked documentation for deeper research.

---

### 1. Bun — Execution Engine, Package Manager & Web Server

**Install**
```bash
# macOS / Linux
curl -fsSL https://bun.com/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# via npm
npm install -g bun
```

**Starter**
```ts
// index.ts
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello from Bun!");
  },
});
console.log("Listening on", server.url);
```
```bash
bun run index.ts
```

> For TypeScript transpilation, hot-reload, bundler options, and the full API surface — visit the docs and research further there.

**Docs:** https://bun.com/docs

---

### 2. WebTransport — HTTP/3 Bidirectional Streaming (Browser API)

**No install required** — available natively in Chrome 97+, Edge 97+, Firefox 114+. Requires HTTPS and an explicit port.

**Starter (client)**
```js
const transport = new WebTransport("https://example.com:4999/wt");
await transport.ready;

// Unreliable (datagrams)
const writer = transport.datagrams.writable.getWriter();
await writer.write(new Uint8Array([1, 2, 3]));

// Reliable (bidirectional stream)
const stream = await transport.createBidirectionalStream();
const streamWriter = stream.writable.getWriter();
await streamWriter.write(new TextEncoder().encode("hello"));
```

> Server-side QUIC/WebTransport support, stream prioritization, and error handling — research further in the MDN docs.

**Docs:** https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API

---

### 3. Msgpackr — Binary Serialization

**Install**
```bash
npm i msgpackr
```

**Starter**
```js
import { pack, unpack } from 'msgpackr';

const encoded = pack({ id: 1, value: [0.1, 0.9], label: "vec" });
const decoded = unpack(encoded);
console.log(decoded); // { id: 1, value: [ 0.1, 0.9 ], label: 'vec' }
```

> Record extensions (2–3x faster decoding), streaming pack/unpack, structured cloning, and Bun/Deno compat — research further in the docs.

**Docs:** https://github.com/kriszyp/msgpackr

---

### 4. Busybase — Embedded Columnar Abstraction (libsql Wrapper)

**Install**
```bash
npm i busybase
```

> Busybase wraps libsql and Apache Arrow to provide a zero-hop embedded vector + tabular store inside Bun's memory heap. For full API, table schemas, and mutation methods — visit the package page and research further there.

**Package:** https://www.npmjs.com/package/busybase

---

### 5. libsql — Apache Arrow-Backed Vector Database

**Install**
```bash
npm install @libsql/libsql
# Yarn users must also add: yarn add apache-arrow
```

**Starter**
```js
import * as libsql from "@libsql/libsql";

const db = await libsql.connect("data/sample-libsql");
const table = await db.createTable("vectors", [
  { id: 1, vector: [0.1, 1.0], label: "foo" },
  { id: 2, vector: [3.9, 0.5], label: "bar" },
]);
const results = await table.vectorSearch([0.1, 0.3]).limit(5).toArray();
console.log(results);
```

> Indexing, full-text search, SQL filters, S3/GCS/Azure backends, and schema management — research further in the docs.

**Docs:** https://docs.libsql.com

---

### 6. Apache Arrow — Columnar In-Memory Format

**Install**
```bash
npm i apache-arrow
```

**Starter**
```js
import { makeVector, tableFromArrays, RecordBatchStreamWriter } from 'apache-arrow';

const ids = Int32Array.from([1, 2, 3]);
const scores = Float32Array.from([0.9, 0.4, 0.7]);

const table = tableFromArrays({ id: ids, score: scores });
console.log(table.toString());
```

> Zero-copy IPC, Flight RPC, streaming readers/writers, SIMD-aligned buffers, and DuckDB integration — research further in the docs.

**Docs:** https://arrow.apache.org/docs/js/

---

### 7. XState — Deterministic State Orchestration

**Install**
```bash
npm install xstate
```

**Starter**
```js
import { createMachine, createActor } from 'xstate';

const streamMachine = createMachine({
  id: 'stream',
  initial: 'idle',
  states: {
    idle:      { on: { CONNECT: 'connected' } },
    connected: { on: { DATA: 'processing', DISCONNECT: 'idle' } },
    processing:{ on: { DONE: 'connected', ERROR: 'idle' } },
  }
});

const actor = createActor(streamMachine);
actor.start();
actor.send({ type: 'CONNECT' });
console.log(actor.getSnapshot().value); // 'connected'
```

> Guards, context/assign, actors, delayed transitions, parallel states, TypeScript setup, and React bindings — research further in the docs.

**Docs:** https://stately.ai/docs/quick-start

---

### 8. Ripple UI — Tailwind CSS Component Library

**Requires Tailwind CSS to be installed first (see section 9).**

**Install**
```bash
npm i rippleui
```

**Configure `tailwind.config.js`**
```js
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  plugins: [require("rippleui")],
};
```

**Starter**
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-ghost">Ghost</button>
<div class="card">
  <div class="card-body">
    <h2 class="card-header">Card Title</h2>
    <p class="text-content2">Card body text.</p>
  </div>
</div>
```

> Full component catalog (modals, tables, alerts, badges, inputs) — research further in the docs.

**Docs:** https://www.ripple-ui.com/docs/get-started/installation

---

### 9. Tailwind CSS — Utility-First Zero-Runtime CSS

**Install (v4 with Vite)**
```bash
npm install tailwindcss @tailwindcss/vite
```

**`vite.config.ts`**
```ts
import tailwindcss from '@tailwindcss/vite';
export default { plugins: [tailwindcss()] };
```

**`src/index.css`**
```css
@import "tailwindcss";
```

**Starter**
```html
<div class="flex items-center gap-4 p-4 bg-gray-900 text-white rounded-xl">
  <span class="text-xl font-bold">Fast Stack</span>
</div>
```

> Custom themes, dark mode, responsive utilities, plugins, and v4 CSS-first config — research further in the docs.

**Docs:** https://tailwindcss.com/docs

---

### 10. WebJSX — Functional DOM Templating (No Virtual DOM)

**Install**
```bash
npm install webjsx
```

**Configure `tsconfig.json` (or `jsxImportSource`)**
```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "webjsx.createElement",
    "jsxFragmentFactory": "webjsx.Fragment"
  }
}
```

**Starter**
```tsx
import * as webjsx from 'webjsx';

function DataRow({ id, value }: { id: number; value: number }) {
  return <tr><td>{id}</td><td>{value.toFixed(4)}</td></tr>;
}

const rows = [{ id: 1, value: 0.91 }, { id: 2, value: 0.42 }];
webjsx.applyDiff(
  document.getElementById('table-body')!,
  <>{rows.map(r => <DataRow {...r} />)}</>
);
```

> Web Components integration, `applyDiff` diffing strategy, Shadow DOM, and Vite template — research further in the docs.

**Docs:** https://webjsx.org

---

### 11. Coolify + Traefik & Caddy — Full-Speed Deployment for WebTransport

WebTransport runs over HTTP/3 (QUIC/UDP). Both Traefik v3 and Caddy support HTTP/3 for regular traffic, but **neither currently forwards WebTransport streams end-to-end to an upstream service** — they terminate QUIC at the proxy and forward via HTTP/1.1 or HTTP/2, which breaks WebTransport.

The correct model for WebTransport at full speed: **proxy bypass on a dedicated port**. Bun terminates TLS+QUIC natively. The proxy handles all other traffic (HTTP/1.1, HTTP/2, HTTP/3) on port 443.

---

#### Option A — Traefik v3 (Coolify default)

Coolify ships Traefik v3 (v3.6+). Traefik v3 supports HTTP/3 on the `websecure` entrypoint — enable it to serve all non-WebTransport routes over QUIC. WebTransport uses a separate Bun port bypassing Traefik entirely.

**Architecture**
```
Regular HTTP/1.1 + HTTP/2 + HTTP/3  →  Traefik :443 (TCP+UDP)  →  Bun :3000
WebTransport QUIC                    →  Host UDP :4443           →  Bun :4443 (TLS-native)
```

**Enable HTTP/3 on Traefik v3 entrypoint**

In Coolify → Proxy → Traefik → Dynamic Configuration, add:

```yaml
entryPoints:
  websecure:
    address: ":443"
    http3: {}
```

Traefik automatically binds UDP :443 alongside TCP :443 when `http3: {}` is set. No separate UDP entrypoint needed.

**Coolify docker-compose override for WebTransport bypass**

```yaml
services:
  app:
    ports:
      - "4443:4443/udp"
      - "4443:4443/tcp"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.services.app.loadbalancer.server.port=3000"
    volumes:
      - /data/coolify/proxy/certs/yourdomain.com:/certs:ro
```

**Bun: two listeners**

```ts
// HTTP/1.1 + HTTP/2 backend for Traefik (no TLS — Traefik terminates)
Bun.serve({ port: 3000, fetch: appHandler });

// WebTransport — TLS-native, bypasses Traefik
Bun.serve({
  port: 4443,
  tls: { cert: Bun.file("/certs/fullchain.pem"), key: Bun.file("/certs/privkey.pem") },
  fetch: wtHandler,
});
```

**Firewall**: open UDP :443 (Traefik HTTP/3) and UDP :4443 (Bun WebTransport).

---

#### Option B — Caddy (standalone, no Coolify proxy)

Caddy 2.6+ enables HTTP/3 by default. Like Traefik, Caddy terminates QUIC and cannot forward WebTransport streams — bypass pattern is identical.

**Architecture**
```
Regular HTTP/1.1 + HTTP/2 + HTTP/3  →  Caddy :443 (TCP+UDP)  →  Bun :3000
WebTransport QUIC                    →  Host UDP :4443          →  Bun :4443 (TLS-native)
```

**Caddyfile**

```caddyfile
{
  servers {
    protocols h1 h2 h3
  }
}

yourdomain.com {
  reverse_proxy localhost:3000
  header Alt-Svc 'h3=":443"; ma=86400'
}
```

The `Alt-Svc` header advertises QUIC to browsers so they upgrade to HTTP/3 on subsequent requests. Caddy obtains and renews TLS certificates automatically via ACME.

**Bun: two listeners** (same pattern as Option A — Bun on :3000 plain + :4443 TLS-native)

**Disable Coolify's Traefik if using Caddy**: in Coolify → Settings → Proxy, switch to "None" and run Caddy as a separate service or on the host directly.

**Firewall**: open TCP :80 (ACME), TCP+UDP :443 (Caddy), UDP :4443 (Bun WebTransport).

---

#### WebTransport client (both options)

```js
const transport = new WebTransport("https://yourdomain.com:4443/wt");
await transport.ready;
```

#### TLS certificate path (Coolify)

```
/data/coolify/proxy/certs/<your-domain>/fullchain.pem
/data/coolify/proxy/certs/<your-domain>/privkey.pem
```

Mount as: `/data/coolify/proxy/certs/yourdomain.com:/certs:ro`

> Neither Traefik v3 nor Caddy currently proxies WebTransport streams to an upstream — both terminate QUIC at the edge. WebTransport bypass to Bun's native QUIC stack is required for full-speed operation regardless of which proxy fronts your other traffic.
