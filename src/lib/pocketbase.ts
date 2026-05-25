// PocketBase data layer (Phase 4b) — replaces the Airtable REST layer.
//
// Returns are shaped like the old Airtable helpers — pbList -> { records: [{ id, fields }] }
// and pbGetRecord -> { id, fields } — so call sites keep using `.records` / `.fields.x`
// with minimal churn. The big change is the query language: callers now pass a
// PocketBase `filter` string (e.g. `username='jane'`, `user='REC' && status='active'`,
// `end_date < @now`) instead of an Airtable `filterByFormula`.
//
// Env: PB_URL (e.g. http://pocketbase.railway.internal:8090) and optional PB_TOKEN
// (superuser/admin auth token sent as the Authorization header for server-side access).
//
// NOTE: not runtime-verified — needs a live PocketBase instance + the pb_migrations
// applied before merge.

const PB_URL = (process.env.PB_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.PB_TOKEN) h['Authorization'] = process.env.PB_TOKEN;
  return h;
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

  const res = await fetch(`${PB_URL}/api/collections/${collection}/records?${params}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PocketBase list error: ${res.status} - ${body}`);
  }
  const data = (await res.json()) as any;
  const records = (data.items || []).map((rec: any) => ({ id: rec.id, fields: rec }));
  return { records };
}

// Fetch one record by id. Returns { id, fields } or null.
export async function pbGetRecord(collection: string, recordId: string): Promise<any> {
  const res = await fetch(`${PB_URL}/api/collections/${collection}/records/${recordId}`, {
    headers: headers(),
  });
  if (!res.ok) return null;
  const rec = (await res.json()) as any;
  return { id: rec.id, fields: rec };
}

// Create a record. Returns { id, fields }.
export async function pbCreate(collection: string, fields: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${PB_URL}/api/collections/${collection}/records`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PocketBase create error: ${res.status} - ${body}`);
  }
  const rec = (await res.json()) as any;
  return { id: rec.id, fields: rec };
}

// Update a record by id. Returns { id, fields }.
export async function pbUpdate(
  collection: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<any> {
  const res = await fetch(`${PB_URL}/api/collections/${collection}/records/${recordId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PocketBase update error: ${res.status} - ${body}`);
  }
  const rec = (await res.json()) as any;
  return { id: rec.id, fields: rec };
}
