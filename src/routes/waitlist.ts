import { Context } from 'hono';
import { pbList, pbCreate, sanitizeParam } from '../lib/pocketbase.js';

export async function handleWaitlist(c: Context): Promise<Response> {
  const body = await c.req.json<{ email: string; username: string }>();
  const { email, username } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'Valid email required' }, 400);
  }
  if (!username) {
    return c.json({ error: 'Username required' }, 400);
  }

  const safe = sanitizeParam(username);
  const usersData = await pbList('users', {
    filter: `username='${safe.toLowerCase()}'`,
    maxRecords: 1,
  });
  const user = usersData.records?.[0];
  if (!user) return c.json({ error: 'Creator not found' }, 404);

  await pbCreate('waitlists', {
    user: user.id,
    email,
    notified: false,
  });

  return c.json({ success: true });
}
