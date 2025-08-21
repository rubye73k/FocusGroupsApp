# RDS Scaling Architecture with Prisma
**Date:** 2025-08-20  
**Author:** Platform Engineering

This document proposes an AWS architecture to scale **reads** and **writes** for a Node.js service using **Prisma** and **Amazon RDS for PostgreSQL**, with options for **RDS Proxy**, **Multi‑AZ / read replicas**, and **Redis caching**. It also shows how to split Prisma workloads across **writer** and **reader** connections and includes an ASCII diagram of the data flow.

---

## 1) Proposed AWS Architecture

### Core goals
- **Protect Postgres** from connection storms and N+1 patterns (pooling & caching).
- **Scale reads** horizontally via read replicas / reader endpoints.
- **Keep writes highly available** via Multi‑AZ automatic failover.
- **Minimize app changes**: one Prisma client for writes, one for reads.
- **Bound staleness**: opt‑in read‑after‑write when needed.

### High‑level
- **Compute**: API in **AWS Lambda** (Node.js) behind **Amazon API Gateway** (or ALB). Lambdas run in a **VPC** subnets with **NAT** egress.
- **Database**: 
  - **Option A (recommended)**: **RDS Multi‑AZ DB *Cluster*** for PostgreSQL. Gives a **writer endpoint** and **reader endpoint(s)** with fast failover, plus the ability to add **additional read replicas**.
  - **Option B**: RDS Single‑AZ with **read replicas** + **Multi‑AZ DB instance** failover (slower) if budget‑constrained.
- **Connection management**: **RDS Proxy** in front of both **writer** and **reader** target groups to pool Lambda connections and smooth failovers.
- **Caching**: **ElastiCache for Redis** (cluster‑mode disabled at first; can scale later). Cache hot list/detail queries and ephemeral auth/session/ratelimit tokens.
- **Secrets & config**: **Secrets Manager** stores DB credentials; Lambda environment overrides Prisma datasource URLs at runtime.
- **Migrations**: run via **one-off job** (e.g., GitHub Actions → ECS Fargate task) targeting **writer endpoint** only.

### Endpoints you’ll have
- **`DB_WRITER_PROXY_URL`** → RDS Proxy **writer** endpoint (points to current primary).  
- **`DB_READER_PROXY_URL`** → RDS Proxy **read‑only** endpoint (routes to replicas / reader instances).  
- Optional (without Proxy): **`DB_WRITER_URL`** and **`DB_READER_URL`** directly to RDS writer/reader endpoints.

> Using the Proxy is strongly recommended for Lambda to avoid exhausting Postgres connection limits and to speed up failovers.

---

## 2) Splitting Prisma Workloads (reads vs writes)

Prisma allows overriding the datasource URL when constructing a client. Create two clients: **`prismaRW`** (writer) and **`prismaRO`** (reader). Route all **mutations, transactions, and read‑after‑write** to `prismaRW`. Route **eventual‑consistency‑tolerant reads** to `prismaRO`.

### Pseudo‑code (TypeScript / Node.js)

```ts
// db.ts
import { PrismaClient } from '@prisma/client';

// Writer: pinned to primary via Proxy writer endpoint
export const prismaRW = new PrismaClient({
  datasources: {
    db: { url: process.env.DB_WRITER_PROXY_URL! }
  },
  // good practice in serverless
  log: ['error', 'warn'],
});

// Reader: goes to RDS Proxy read-only (which fans out to replicas)
export const prismaRO = new PrismaClient({
  datasources: {
    db: { url: process.env.DB_READER_PROXY_URL ?? process.env.DB_READER_URL! }
  },
  log: ['error', 'warn'],
});
```

Usage examples:

```ts
// write-heavy path: always use RW
export async function createOrder(input: CreateOrderInput) {
  return prismaRW.$transaction(async (tx) => {
    const order = await tx.order.create({ data: input });
    await tx.event.create({ data: { type: 'ORDER_CREATED', orderId: order.id }});
    return order;
  });
}

// read path with tolerance for staleness: use RO
export async function getCatalogPage(params: CatalogQuery) {
  return prismaRO.product.findMany({
    where: { ...params.filters },
    orderBy: [{ popularityScore: 'desc' }],
    take: params.pageSize,
    skip: params.offset,
  });
}

// read-after-write (avoid replica lag): force RW
export async function getOrderAfterCreate(id: string) {
  // to guarantee the fresh read, hit the writer
  return prismaRW.order.findUnique({ where: { id } });
}
```

**Notes**
- Use **`prismaRW.$transaction()`** for mutations and any request that requires read‑your‑writes guarantees.
- For **background workers** (e.g., queues), also instantiate both clients; most jobs should use `prismaRW`.
- Keep **pool size small** in Lambda (Proxy pools upstream). Prefer **short query timeouts** and **retry with jitter** on transient errors.
- Ensure **migrations** only run against the **writer** URL.

### Environment configuration

```
# with RDS Proxy
DB_WRITER_PROXY_URL="postgresql://.../appdb?sslmode=require"
DB_READER_PROXY_URL="postgresql://.../appdb?sslmode=require"

# (fallback without Proxy)
DB_WRITER_URL="postgresql://.../appdb"
DB_READER_URL="postgresql://.../appdb"     # reader/replica endpoint
```

---

## 3) Data Flow Diagram (ASCII)

```
               ┌───────────────────────────────┐
               │           Internet            │
               └──────────────┬────────────────┘
                              │ HTTPS
                        ┌─────▼─────┐
                        │ API GW/ALB│
                        └─────┬─────┘
                              │ invokes
                        ┌─────▼──────────────────────────┐
                        │ Lambda / ECS (VPC subnets)     │
                        │  Node.js + Prisma              │
                        │  - prismaRW → writer endpoint  │
                        │  - prismaRO → reader endpoint  │
                        │    (fallback to writer for     │
                        │     strong reads or no readers)│
                        └───┬───────────────┬────────────┘
                            │               │
                     cache hit              │ cache miss / DB path
                            │               │
                     ┌──────▼─────┐         │
                     │ ElastiCache│         │
                     │   (Redis)  │         │
                     └────────────┘         │
                                            │
                                  ┌─────────▼─────────┐
                                  │     RDS Proxy     │
                                  │  - writer EP      │
                                  │  - read-only EP   │
                                  └───────┬─────┬─────┘
                                          │     │
                               prismaRW ──┘     └─── prismaRO
                                          │     │
                                    ┌─────▼─────┐
                                    │  Writer   │  RDS for PostgreSQL
                                    │ (Primary) │  Multi-AZ DB Cluster
                                    └─────┬─────┘
                                          │ Physical replication
                                ┌─────────┴─────────┐
                                │                   │
                          ┌─────▼─────┐       ┌─────▼─────┐
                          │ Reader A  │       │ Reader B  │   (readable standbys)
                          └───────────┘       └───────────┘
```

Notes:
- App routes:
  - Writes and read-after-write/strong-consistency reads → RDS Proxy writer endpoint.
  - Eventual-consistency reads → RDS Proxy read-only endpoint (load-balanced to readers).
  - If no healthy readers or freshness required → fallback to writer endpoint.
- This uses the Multi-AZ DB Cluster flavor (readable standbys). Classic Multi-AZ standby is not readable.
---

## 4) Trade‑offs & Considerations

1) **Replica lag vs. throughput**  
- **Pros**: Offloading read traffic to replicas scales throughput dramatically.  
- **Cons**: Replication is asynchronous; **stale reads** are possible. Mitigations: route **read‑after‑write** to `prismaRW`, add **`Cache-Control`/TTL** that tolerates lag, or use **logical decoding + change streams** to warm caches.

2) **Prisma client split & operational complexity**  
- **Pros**: Very explicit: developers choose RO vs RW per call.  
- **Cons**: Requires discipline and code review to avoid writing through `prismaRO`. Consider lightweight lint rules / helper methods (e.g., `db.read()` vs `db.write()`) to standardize usage.

3) **Cost vs. resilience**  
- **Pros**: Multi‑AZ clusters + Proxy give fast failover and protect DB from connection spikes.  
- **Cons**: **Multi‑AZ** roughly doubles instance cost; **RDS Proxy** adds hourly + per‑ACU cost; **Redis** adds cluster cost. Use autoscaling and right‑size based on CloudWatch metrics.

4) **Failover behavior**  
- With **RDS Proxy**, client reconnection/failover is smoother; without it, Lambdas can hit `Too many connections` or prolonged DNS TTL issues. Ensure **short TCP/statement timeouts**, exponential backoff, and idempotent handlers.

5) **Migrations & schema changes**  
- Must run **against the writer** only. Some DDL will lock tables—use **zero‑downtime patterns** (expand/contract), **`lock_timeout`**, and off‑peak windows. Replicas can briefly fall behind during heavy DDL or vacuum.

6) **Caching correctness**  
- Redis boosts read latency but introduces **invalidation complexity**. Prefer **TTL‑based** caching first (seconds to a few minutes). For critical entities, use **write‑through** (write DB → invalidate or update cache synchronously on the write path).

---

## 5) Implementation Checklist

- [ ] Provision **RDS PostgreSQL Multi‑AZ *Cluster*** (writer + readers).  
- [ ] Create **RDS Proxy** with **two target groups**: `WRITER` and `READ_ONLY` (Lambda in same VPC).  
- [ ] Publish Proxy endpoints as **Secrets Manager** values; inject into Lambda as env vars.  
- [ ] Add **ElastiCache Redis** for hot reads and tokens.  
- [ ] Update service code to use **`prismaRW`/`prismaRO`** pattern.  
- [ ] Add **health probes** that validate the RO path is truly read‑only.  
- [ ] Create **migration job** (Fargate/ECS) pointing to **writer** only.  
- [ ] Add **CloudWatch alarms**: CPU/IOPS, DB connections, replica lag, Proxy metrics, Lambda errors/timeouts.  
- [ ] Load test with **read ratio sweeps** (e.g., 70/30 → 95/5) and **failover drills**.

---

## 6) Operational Tips

- **Pool sizing**: keep Prisma pool minimal in Lambda; rely on RDS Proxy pooling upstream.  
- **Timeouts**: set `statement_timeout` (e.g., 3–5s) and application‑level timeouts with retries.  
- **Read routing**: centralize helpers (`db.read()`, `db.write()`) to avoid accidental writes via RO client.  
- **Read‑your‑writes**: for user‑facing actions immediately after a write, **always** query via `prismaRW`.  
- **Vacuum & autovacuum**: tune for replica catch‑up; monitor **replica lag** explicitly.  
- **Indexes**: add covering indexes for cache‑miss hot paths; replicas benefit equally.  
- **Data tiering**: archive cold data into cheaper storage (S3 + external tables) if needed.

---

## Appendix: Example Lambda Handler Snippet

```ts
import { prismaRO, prismaRW } from './db';

export const handler = async (event: any) => {
  const route = routeFrom(event);

  if (route.method === 'POST' && route.path === '/orders') {
    const order = await createOrder(route.body);       // uses prismaRW
    const fresh = await getOrderAfterCreate(order.id); // read-after-write via prismaRW
    return json(201, fresh);
  }

  if (route.method === 'GET' && route.path === '/catalog') {
    // Try cache first
    const cached = await redisGet(route.queryKey);
    if (cached) return json(200, cached);

    const data = await getCatalogPage(route.query);    // uses prismaRO
    // set short TTL (e.g., 60s) to tolerate replica lag
    await redisSet(route.queryKey, data, 60);
    return json(200, data);
  }

  return json(404, { error: 'Not found' });
};
```
