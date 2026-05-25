import { Bot } from 'grammy';
import {
  pbList,
  pbGetRecord,
  pbUpdate,
  pbCreate,
  sanitizeParam,
} from '../lib/pocketbase.js';
import { mainMenuKeyboard, campaignListKeyboard, campaignDetailKeyboard } from './keyboards.js';
import { createBotCheckoutSession } from './checkout.js';
import {
  campaignApprovedDM,
  campaignRejectedDM,
  adminApproveToast,
  adminRejectToast,
  errSoldOut,
  errExpiredLink,
} from './messages.js';

export function registerCallbacks(bot: Bot) {
  // Shop — list active campaigns
  bot.callbackQuery('shop', async (ctx) => {
    await ctx.answerCallbackQuery();
    const campaigns = await pbList('campaigns', {
      filter: `status='active'`,
    });
    const list = campaigns.records || [];
    if (list.length === 0) {
      await ctx.editMessageText('No active campaigns right now. Check back soon!', {
        reply_markup: mainMenuKeyboard(),
      });
      return;
    }
    await ctx.editMessageText('Browse active campaigns:', {
      reply_markup: campaignListKeyboard(list),
    });
  });

  // Help callback
  bot.callbackQuery('help', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      '*PageFairy Bot*\n\n' +
      'Available commands:\n' +
      '/start — Main menu & dashboard\n' +
      '/shop — Browse active campaigns\n' +
      '/help — Show this help message\n\n' +
      'Tap the buttons below to navigate!',
      { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() }
    );
  });

  // My orders
  bot.callbackQuery('myorders', async (ctx) => {
    await ctx.answerCallbackQuery();
    const chatId = String(ctx.chat!.id);

    const userData = await pbList('users', {
      filter: `telegram_chat_id='${sanitizeParam(chatId)}'`,
      maxRecords: 1,
    });
    const user = userData.records?.[0];

    if (!user?.fields.username) {
      await ctx.editMessageText('Set up your account first with /start', {
        reply_markup: mainMenuKeyboard(),
      });
      return;
    }

    const campaigns = await pbList('campaigns', {
      filter: `user='${user.id}'`,
    });
    const campaignIds = (campaigns.records || []).map((c: any) => c.id);

    if (campaignIds.length === 0) {
      await ctx.editMessageText('No orders yet. Browse campaigns with /shop!', {
        reply_markup: mainMenuKeyboard(),
      });
      return;
    }

    let orderText = 'Your campaign orders:\n\n';
    for (const cId of campaignIds.slice(0, 5)) {
      const campaign = await pbGetRecord('campaigns', cId);
      if (!campaign) continue;
      const name = campaign.fields.campaign_name || 'Campaign';
      const current = campaign.fields.current_units || 0;
      const goal = campaign.fields.goal_units || 10;
      const status = campaign.fields.status || 'unknown';
      orderText += `${name}\n  ${current}/${goal} sold — Status: ${status}\n\n`;
    }

    await ctx.editMessageText(orderText, { reply_markup: mainMenuKeyboard() });
  });

  // Campaign detail
  bot.callbackQuery(/^campaign:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const campaignId = ctx.match[1];
    const campaign = await pbGetRecord('campaigns', campaignId);

    if (!campaign) {
      await ctx.editMessageText('Campaign not found.', { reply_markup: mainMenuKeyboard() });
      return;
    }

    const f = campaign.fields;
    const name = f.campaign_name || 'Campaign';
    const description = f.description || 'No description available.';
    const price = f.retail_price ? `$${parseFloat(f.retail_price).toFixed(2)}` : 'TBD';
    const current = f.current_units || 0;
    const goal = f.goal_units || 10;
    const pct = Math.round((current / goal) * 100);

    const filled = Math.round(pct / 10);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);

    const text =
      `*${name}*\n\n` +
      `${description}\n\n` +
      `Price: ${price}\n` +
      `Progress: ${bar} ${current}/${goal} (${pct}%)\n\n` +
      (current >= goal ? 'Goal reached! Orders will ship soon.' : `${goal - current} more needed to reach the goal.`);

    if (f.image_url) {
      try {
        await ctx.deleteMessage();
        await ctx.replyWithPhoto(f.image_url, {
          caption: text,
          parse_mode: 'Markdown',
          reply_markup: campaignDetailKeyboard(campaignId),
        });
        return;
      } catch {
        // Fall through to text if photo fails
      }
    }

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: campaignDetailKeyboard(campaignId),
    });
  });

  // Pre-order
  bot.callbackQuery(/^preorder:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery('Creating your checkout link...');
    const campaignId = ctx.match[1];
    const campaign = await pbGetRecord('campaigns', campaignId);

    if (!campaign) {
      await ctx.reply('Campaign not found.');
      return;
    }

    // Sold-out / expired guards (verbatim n8n error/state messages)
    const cf = campaign.fields;
    const cStatus = cf.status;
    const cCurrent = cf.current_units || 0;
    const cGoal = cf.goal_units || 10;
    if (cStatus === 'cancelled' || cStatus === 'failed') {
      await ctx.reply(errExpiredLink);
      return;
    }
    if (cCurrent >= cGoal || cStatus === 'successful' || cStatus === 'completed') {
      await ctx.reply(errSoldOut);
      return;
    }

    const chatId = String(ctx.chat!.id);
    const userData = await pbList('users', {
      filter: `telegram_chat_id='${sanitizeParam(chatId)}'`,
      maxRecords: 1,
    });
    const user = userData.records?.[0];
    const email = user?.fields.email || '';
    const name = user?.fields.first_name || ctx.from?.first_name || '';
    const username = user?.fields.username || 'shop';

    const f = campaign.fields;
    const amount = Math.round((parseFloat(f.retail_price) || 0) * 100);

    if (!amount) {
      await ctx.reply('This campaign doesn\'t have a price set yet.');
      return;
    }

    try {
      const result = await createBotCheckoutSession({
        campaignId,
        email,
        name,
        campaignName: f.campaign_name || 'Product',
        amount,
        username,
      });

      await ctx.reply(
        `Here's your checkout link:\n\n${result.checkoutUrl}\n\nComplete payment to secure your pre-order!`
      );
    } catch (err: any) {
      console.error('Bot checkout error:', err);
      await ctx.reply('Something went wrong creating your checkout. Please try again.');
    }
  });

  // Back navigation
  bot.callbackQuery('back:menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    const firstName = ctx.from?.first_name || 'there';

    try {
      await ctx.editMessageText(`Welcome back, ${firstName}!`, {
        reply_markup: mainMenuKeyboard(),
      });
    } catch {
      try { await ctx.deleteMessage(); } catch {}
      await ctx.reply(`Welcome back, ${firstName}!`, {
        reply_markup: mainMenuKeyboard(),
      });
    }
  });

  bot.callbackQuery('back:shop', async (ctx) => {
    await ctx.answerCallbackQuery();
    const campaigns = await pbList('campaigns', {
      filter: `status='active'`,
    });
    const list = campaigns.records || [];

    try {
      await ctx.editMessageText('Browse active campaigns:', {
        reply_markup: campaignListKeyboard(list),
      });
    } catch {
      try { await ctx.deleteMessage(); } catch {}
      await ctx.reply('Browse active campaigns:', {
        reply_markup: campaignListKeyboard(list),
      });
    }
  });

  // ---- Admin approval: approve ----
  bot.callbackQuery(/^approve:(.+)$/, async (ctx) => {
    const campaignId = ctx.match[1];
    const adminChatId = String(ctx.chat?.id ?? '');

    const campaign = await pbGetRecord('campaigns', campaignId);
    if (!campaign) {
      await ctx.answerCallbackQuery({ text: 'Campaign not found', show_alert: true });
      return;
    }

    // Set campaign active
    await pbUpdate('campaigns', campaignId, {
      status: 'active',
      admin_approved_by: adminChatId,
      admin_approved_at: new Date().toISOString(),
    });

    // DM the creator
    const creatorIds: string[] = campaign.fields.user ? [campaign.fields.user] : [];
    if (creatorIds[0]) {
      const creator = await pbGetRecord('users', creatorIds[0]);
      const creatorChatId = creator?.fields.telegram_chat_id;
      const username = creator?.fields.username || 'shop';
      if (creatorChatId) {
        await bot.api
          .sendMessage(creatorChatId, campaignApprovedDM(username), { parse_mode: 'Markdown' })
          .catch((err) => console.error('Approved DM failed:', err));
      }
    }

    await ctx.answerCallbackQuery({ text: adminApproveToast });
    try {
      await ctx.editMessageReplyMarkup(); // strip the approve/reject buttons
    } catch {}
  });

  // ---- Admin approval: reject ----
  bot.callbackQuery(/^reject:(.+)$/, async (ctx) => {
    const campaignId = ctx.match[1];

    const campaign = await pbGetRecord('campaigns', campaignId);
    if (!campaign) {
      await ctx.answerCallbackQuery({ text: 'Campaign not found', show_alert: true });
      return;
    }

    // Set campaign cancelled
    await pbUpdate('campaigns', campaignId, { status: 'cancelled' });

    const creatorIds: string[] = campaign.fields.user ? [campaign.fields.user] : [];
    const creatorRecordId = creatorIds[0];

    // DM the creator
    if (creatorRecordId) {
      const creator = await pbGetRecord('users', creatorRecordId);
      const creatorChatId = creator?.fields.telegram_chat_id;
      if (creatorChatId) {
        await bot.api
          .sendMessage(creatorChatId, campaignRejectedDM)
          .catch((err) => console.error('Rejected DM failed:', err));
      }

      // 2nd-rejection flagging: count this creator's cancelled campaigns
      const rejected = await pbList('campaigns', {
        filter: `user='${creatorRecordId}' && status='cancelled'`,
      });
      if ((rejected.records?.length || 0) >= 2 && !creator?.fields.is_flagged) {
        await pbUpdate('users', creatorRecordId, { is_flagged: true });
        await pbCreate('audit_logs', {
          actor: 'onboarding_bot',
          action: 'user_flagged',
          target_type: 'users',
          target_id: creatorRecordId,
          details: JSON.stringify({ reason: 'second_rejection', campaign_id: campaignId }),
        }).catch((err) => console.error('AUDIT_LOGS write failed:', err));
      }
    }

    await ctx.answerCallbackQuery({ text: adminRejectToast });
    try {
      await ctx.editMessageReplyMarkup();
    } catch {}
  });
}
