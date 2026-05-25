import { Context } from 'hono';
import { pbUpdate } from '../lib/pocketbase.js';
import { sendAdminApprovalRequest } from '../bot/notifications.js';

// Replaces the n8n "campaign-for-review" webhook: whatever creates a CAMPAIGNS
// record (status=pending_approval) POSTs here, and we DM the admin an approve/
// reject inline keyboard. The approve:/reject: callbacks live in bot/callbacks.ts.
export async function handleCampaignForReview(c: Context): Promise<Response> {
  const body = await c.req.json<{
    campaign_id: string;
    campaign_name?: string;
    username: string;
    product_name: string;
    wholesale_cost: number;
    retail_price: number;
    goal_units: number;
    tech_chat_id?: string;
    tech_record_id?: string;
  }>();

  const { campaign_id, username, product_name, wholesale_cost, retail_price, goal_units } = body;

  if (!campaign_id || !username) {
    return c.json({ error: 'campaign_id and username are required' }, 400);
  }

  // Re-assert pending status (parity with the n8n PATCH; harmless if already set).
  await pbUpdate('campaigns', campaign_id, { status: 'pending_approval' }).catch((err) =>
    console.error('campaign-for-review: status PATCH failed:', err)
  );

  await sendAdminApprovalRequest({
    campaignId: campaign_id,
    username,
    productName: product_name,
    wholesaleCost: Number(wholesale_cost) || 0,
    retailPrice: Number(retail_price) || 0,
    goalUnits: Number(goal_units) || 0,
  });

  return c.json({ success: true });
}
