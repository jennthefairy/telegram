// Verbatim message text ported from the n8n "Bot — Onboarding & Dispatch" and
// "Admin Approval" workflows. Kept in one module so the bot wording stays in
// sync across commands.ts, callbacks.ts and notifications.ts.
//
// parse_mode note: only messages that use *bold* are sent with Markdown. The
// username prompt contains literal underscores ("_____") which would break
// Markdown V1 parsing, so it must be sent as plain text.

// ---------------------------------------------------------------------------
// Onboarding sequence (3 staged messages, ~1.5s apart) — new user on /start
// ---------------------------------------------------------------------------
export const onboardingValueProp = (firstName: string) =>
  `Hey ${firstName}! 👋\n\n` +
  `I'm PageFairy — your secret weapon for selling lash products without buying inventory first.\n\n` +
  `💡 Here's the magic: You pick a product, set YOUR price, share with clients, and we ship directly to them. You pocket the profit.\n\n` +
  `No upfront cost. No risk. Just sales.`;

// Markdown (has *bold*)
export const onboardingProfitExample =
  `📊 *Quick Example:*\n\n` +
  `Mink Lash Set\n` +
  `• Our price: $12\n` +
  `• You sell at: $28\n` +
  `• You keep: $16 profit\n\n` +
  `Sell 20 sets = $320 in your pocket\n\n` +
  `And you never touch the product! ✨`;

export const onboardingCta = `Ready to see what you could sell?`;

// ---------------------------------------------------------------------------
// Username registration (plain text — prompt has literal underscores)
// ---------------------------------------------------------------------------
export const usernamePrompt =
  `Before we get started — let's claim your link! 🔗\n\n` +
  `What's your brand name?\n` +
  `(This becomes pagefairy.me/_____)\n\n` +
  `Type it now (letters and numbers only, no spaces):`;

export const usernameInvalid =
  `That name doesn't work. Please use only letters and numbers (3–32 characters, no spaces).\n\n` +
  `Try again:`;

export const usernameTaken = `That name is taken! Try another:`;

// Markdown (has *bold*, username is [a-z0-9] only so no stray underscores)
export const usernameConfirmation = (username: string) =>
  `✅ *Your page is live!*\n\n` +
  `🔗 pagefairy.me/${username}\n\n` +
  `Add this to your Instagram bio — it updates automatically when you launch a campaign.\n\n` +
  `Now let's find your first product!`;

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------
const STATUS_EMOJI: Record<string, string> = {
  active: '🟢',
  pending_approval: '📝',
  successful: '🎉',
  completed: '✅',
  failed: '❌',
  cancelled: '⛔',
};

const pct = (current: number, goal: number) =>
  goal > 0 ? Math.round((current / goal) * 100) : 0;

// Returning user dashboard (/start with username) — plain text
export function returningDashboard(firstName: string, activeCampaigns: any[]): string {
  if (activeCampaigns.length === 0) {
    return (
      `Welcome back, ${firstName}! ✨\n\n` +
      `You don't have any active campaigns yet.\n\n` +
      `Start one today!`
    );
  }
  const lines = activeCampaigns
    .map((c) => {
      const name = c.fields.campaign_name || 'Untitled';
      const cur = c.fields.current_units || 0;
      const goal = c.fields.goal_units || 10;
      return `• ${name}: ${cur}/${goal} (${pct(cur, goal)}%)`;
    })
    .join('\n');
  return (
    `Welcome back, ${firstName}! ✨\n\n` +
    `📊 You have ${activeCampaigns.length} active campaign(s):\n\n` +
    `${lines}\n\n` +
    `What would you like to do?`
  );
}

// /mycampaigns — all statuses — Markdown (*bold* names)
export function myCampaigns(campaigns: any[]): string {
  if (campaigns.length === 0) {
    return (
      `You don't have any campaigns yet.\n\n` +
      `Your first campaign is just a few taps away!`
    );
  }
  const blocks = campaigns
    .map((c) => {
      const emoji = STATUS_EMOJI[c.fields.status] || '📝';
      const name = c.fields.campaign_name || 'Untitled';
      const cur = c.fields.current_units || 0;
      const goal = c.fields.goal_units || 10;
      return `${emoji} *${name}*\n   Progress: ${cur}/${goal} (${pct(cur, goal)}%)`;
    })
    .join('\n\n');
  return `📊 *Your Campaigns:*\n\n${blocks}`;
}

// ---------------------------------------------------------------------------
// Admin approval — request DM + creator result DMs
// ---------------------------------------------------------------------------
// Markdown (*bold*); @username and pagefairy.me/username are underscore-free.
export function adminApprovalRequest(data: {
  username: string;
  productName: string;
  wholesaleCost: number;
  retailPrice: number;
  goalUnits: number;
}): string {
  const profit = (data.retailPrice - data.wholesaleCost).toFixed(2);
  return (
    `*NEW CAMPAIGN REQUEST*\n\n` +
    `Tech: @${data.username}\n` +
    `Product: ${data.productName}\n` +
    `Wholesale: $${data.wholesaleCost.toFixed(2)}\n` +
    `Retail: $${data.retailPrice.toFixed(2)}\n` +
    `Profit/unit: $${profit}\n` +
    `Goal: ${data.goalUnits} units\n` +
    `Link: pagefairy.me/${data.username}`
  );
}

// Markdown (*bold*)
export const campaignApprovedDM = (username: string) =>
  `🎉 *Campaign Approved!*\n\n` +
  `Your campaign is LIVE:\n` +
  `🔗 pagefairy.me/${username}\n\n` +
  `Share this link with your clients to start collecting pre-orders!`;

// Plain text. NOTE: n8n text had a literal "[Link]" placeholder with no URL;
// kept verbatim. TODO: point at a real resubmission link once that flow exists.
export const campaignRejectedDM =
  `We need a little more detail to get this right. Please update here: [Link]`;

export const adminApproveToast = `✅ Campaign approved and tech notified`;
export const adminRejectToast = `❌ Campaign rejected and tech notified`;

// ---------------------------------------------------------------------------
// Error / state messages (verbatim from n8n; these nodes were orphaned there).
// Wired where a clear trigger exists; the rest are exported for future use.
// ---------------------------------------------------------------------------
export const errRateLimit =
  `You have reached today's limit. Upgrade to Magic Wand+ for priority access.`; // TODO: needs rate-limit infra
export const errSoldOut =
  `This drop is sold out. Type NOTIFY to join the waitlist.`; // wired: preorder when goal met
export const errExpiredLink =
  `That link has expired. Type REJOIN to request a new one.`; // wired: preorder on cancelled/failed campaign
export const errSelfReferral =
  `Referral not eligible — self-referrals don't count.`; // self-referral handled in routes/checkout.ts (web)
export const errCashOutReceived =
  `Request received — review takes up to 48 hours. We'll notify you here when it's approved.`; // TODO: no cash-out flow yet
export const errBioSanitize =
  `Please use plain text only — no links or hashtags.`; // TODO: no bio-input flow yet
