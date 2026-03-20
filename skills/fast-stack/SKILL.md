---
name: fast-stack
description: Direct-to-Runtime Zero-Hop Stack — Bun + WebTransport + XState + LanceDB architecture. Use when building high-frequency data apps, real-time streaming UIs, or deploying to Coolify with Traefik/Caddy. Covers stack setup, WebTransport bypass pattern, and proxy config.
---

# Fast Stack

Single-process architecture: Bun serves HTTP + WebTransport, stores data in embedded LanceDB/libsql (Apache Arrow), orchestrates state with XState, renders with WebJSX — zero hops between layers.

## Stack

| Layer | Package | Purpose |
|---|---|---|
| Runtime | Bun | JIT server, TS transpile, package manager |
| Transport | WebTransport (HTTP/3) | Bidirectional QUIC streams, no TCP HOL blocking |
| Serialization | msgpackr | Binary payloads, 2-3x faster than JSON |
| Storage | busybase / libsql | Arrow-backed embedded vector + tabular store |
| State | XState | Deterministic FSM for stream coordination |
| UI | WebJSX + Ripple UI + Tailwind | No VDOM, direct DOM mutation |

## Architecture Rules

- One Bun process terminates TLS, serves HTTP, and holds the DB in memory
- WebTransport requires HTTP/3 (QUIC/UDP) — never route through a Layer 7 proxy
- Hot reload: XState serializes state to Web Storage; browser re-imports updated ESM module
- All dependencies resolved locally — no CDN, no runtime CSS-in-JS

## Bun Server Pattern

```ts
Bun.serve({ port: 3000, fetch: appHandler });

Bun.serve({
  port: 4443,
  tls: { cert: Bun.file("/certs/fullchain.pem"), key: Bun.file("/certs/privkey.pem") },
  fetch: wtHandler,
});
```

Port 3000 — plain HTTP for proxy backend. Port 4443 — native TLS+QUIC for WebTransport.

## Coolify + Traefik v3 Deployment

Enable HTTP/3 in Coolify → Proxy → Traefik → Dynamic Configuration:

```yaml
entryPoints:
  websecure:
    address: ":443"
    http3: {}
```

docker-compose override:

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

Firewall: UDP :443 (Traefik HTTP/3) + UDP :4443 (Bun WebTransport).

## Caddy Deployment

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

Disable Coolify's Traefik (Settings → Proxy → None). Expose port 4443/udp for WebTransport bypass. Firewall: TCP :80 + TCP+UDP :443 + UDP :4443.

## WebTransport Client

```js
const transport = new WebTransport("https://yourdomain.com:4443/wt");
await transport.ready;
```

## Install

```bash
bun x xbrw
npx xbrw
npx skills add AnEntrypoint/fast-stack
```

Docs: readme.md in this repo covers all packages with install snippets and links.
