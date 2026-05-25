// PocketBase data layer (Phase 4b) — replaces the Airtable REST layer.
//
// Returns are shaped like the old Airtable helpers — pbList -> { records: [{ id, fields }] }
// and pbGetRecord -> { id, fields } — so call sites keep using `.records` / `.fields.x`
// with minimal churn. The big change is the query language: callers now pass a
// PocketBase `filter` string (e.g. `username='jane'`, `user='REC' && status='active'`,
// `end_date < @now`) instead of an Airtable `filterByFormula`.
//
// Auth: a dedicated PocketBase superuser. Set PB_URL plus PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD;
// the token is fetched on first use, cached, and re-fetched on expiry or any 401.
// (PB_TOKEN may be set to use a fixed token instead, e.g. for tests.)
//
// Verified against the live instance: relation filters (user='ID'), && / ||, @now, and
// ISO datetime cutoffs all behave as expected.

const PB_URL = (process.env.PB_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');

// ---- auth token cache ----
let cachedToken = '';
let tokenExpiresAt = 0; // epoch ms

async function getToken(force = false): Promise<string> {
  if (process.env.PB_TOKEN) return process.env.PB_TOKEN; // fixed-token override (tests)
  if (!force && cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('PocketBase auth not configured (PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD)');

  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  });
  if (!res.ok) throw new Error(`PocketBase auth failed: ${res.status} - ${await res.text()}`);
  const data = (await res.json()) as any;
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + 60 * 60 * 1000; // refresh hourly (token TTL is longer)
  return cachedToken;
}

// Authenticated fetch with one automatic re-auth + retry on 401.
async function pbFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = async (token: string) =>
    fetch(`${PB_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: token, ...(init.headers || {}) },
    });

  let res = await doFetch(await getToken());
  if (res.status === 401) res = await doFetch(await getToken(true)); // token expired -> re-auth once
  return res;
}

// Strips quote/backslash chars before interpolating user input into a PB filter.
export function sanitizeParam(input: string): string {
  return input.replace(/['"\\]/g, '').slice(0, 64);
}

type ListOptions = { filter?: string; maxRecords?: number; sort?: string };

// List records. Returns { records: [{ id, fields }] } to mirror the old airtableFetch.
export async function pbList(collection: string, options: ListOptions = {}): Promise<any> {
  const params = new URLSearchParams();
  if (options.filter) params.set('filter', options.filter);
  params.set('perPage', String(options.maxRecords ?? 200));
  if (options.sort) params.set('sort', options.sort);

  const res = await pbFetch(`/api/collections/${collection}/records?${params}`);
  if (!res.ok) throw new Error(`PocketBase list error: ${res.status} - ${await res.text()}`);
  const data = (await res.json()) as any;
  const records = (data.items || []).map((rec: any) => ({ id: rec.id, fields: rec }));
  return { records };
}

// Fetch one record by id. Returns { id, fields } or null.
export async function pbGetRecord(collection: string, recordId: string): Promise<any> {
  const res = await pbFetch(`/api/collections/${collection}/records/${recordId}`);
  if (!res.ok) return null;
  const rec = (await res.json()) as any;
  return { id: rec.id, fields: rec };
}

// Create a record. Returns { id, fields }.
export async function pbCreate(collection: string, fields: Record<string, unknown>): Promise<any> {
  const res = await pbFetch(`/api/collections/${collection}/records`, {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`PocketBase create error: ${res.status} - ${await res.text()}`);
  const rec = (await res.json()) as any;
  return { id: rec.id, fields: rec };
}

// Update a record by id. Returns { id, fields }.
export async function pbUpdate(
  collection: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<any> {
  const res = await pbFetch(`/api/collections/${collection}/records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`PocketBase update error: ${res.status} - ${await res.text()}`);
  const rec = (await res.json()) as any;
  return { id: rec.id, fields: rec };
}
