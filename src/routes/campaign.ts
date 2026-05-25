import { Context } from 'hono';
import { pbList, sanitizeParam } from '../lib/pocketbase.js';
import { renderCampaignPageDirect, render404Page } from './bio.js';

export async function renderCampaignPage(c: Context): Promise<Response> {
  const username = sanitizeParam(c.req.param('username') ?? '');
  const slug = sanitizeParam(c.req.param('slug') ?? '');

  const usersData = await pbList('users', {
    filter: `username='${username.toLowerCase()}'`,
    maxRecords: 1,
  });
  const user = usersData.records?.[0];
  if (!user) return render404Page(c, username);

  const userRecordId = user.id;
  const campaignsData = await pbList('campaigns', {
    filter: `user='${userRecordId}'`,
  });
  const campaigns: any[] = campaignsData.records || [];

  const matched = campaigns.find(
    (camp) =>
      camp.id.toLowerCase().endsWith(slug.toLowerCase()) ||
      camp.id.toLowerCase().includes(slug.toLowerCase())
  );
  if (!matched) return render404Page(c, `${username}/${slug}`);

  return renderCampaignPageDirect(c, user, matched);
}
