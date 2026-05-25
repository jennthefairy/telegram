import { Bot } from 'grammy';
import { pbList, pbCreate, pbUpdate, sanitizeParam } from '../lib/pocketbase.js';
import { mainMenuKeyboard, campaignListKeyboard } from './keyboards.js';
import {
  onboardingValueProp,
  onboardingProfitExample,
  onboardingCta,
  usernamePrompt,
  returningDashboard,
  myCampaigns,
} from './messages.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function registerCommands(bot: Bot) {
  bot.command('start', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const firstName = ctx.from?.first_name || 'there';

    // Check for deep link parameters (e.g., order success redirect)
    const param = ctx.match;
    if (param?.startsWith('order_success')) {
      await ctx.reply(
        'Your pre-order is confirmed! We\'ll keep you updated on the campaign progress.',
        { reply_markup: mainMenuKeyboard() }
      );
      return;
    }

    // Look up user by telegram_chat_id
    const data = await pbList('users', {
      filter: `telegram_chat_id='${sanitizeParam(chatId)}'`,
      maxRecords: 1,
    });
    const user = data.records?.[0];

    if (!user) {
      // New user — create record and start onboarding
      await pbCreate('users', {
        telegram_chat_id: chatId,
        first_name: firstName,
        bot_state: 'new',
      });

      // Onboarding sequence — 3 staged messages (value prop -> profit example -> CTA)
      await ctx.reply(onboardingValueProp(firstName));
      await sleep(1500);
      await ctx.reply(onboardingProfitExample, { parse_mode: 'Markdown' });
      await sleep(1500);
      await ctx.reply(onboardingCta);

      // Set state to awaiting_username, then prompt for the username
      const created = await pbList('users', {
        filter: `telegram_chat_id='${sanitizeParam(chatId)}'`,
        maxRecords: 1,
      });
      if (created.records?.[0]) {
        await pbUpdate('users', created.records[0].id, { bot_state: 'awaiting_username' });
      }

      // Plain text — prompt contains literal underscores
      await ctx.reply(usernamePrompt);
      return;
    }

    // Existing user without username — re-prompt
    if (!user.fields.username) {
      await pbUpdate('users', user.id, { bot_state: 'awaiting_username' });
      await ctx.reply(usernamePrompt);
      return;
    }

    // Returning user with username — show dashboard
    const campaigns = await pbList('campaigns', {
      filter: `user='${user.id}' && status='active'`,
    });
    const campaignList = campaigns.records || [];

    await ctx.reply(returningDashboard(firstName, campaignList), {
      reply_markup: mainMenuKeyboard(),
    });
  });

  // /mycampaigns — full campaign list (all statuses)
  bot.command('mycampaigns', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const data = await pbList('users', {
      filter: `telegram_chat_id='${sanitizeParam(chatId)}'`,
      maxRecords: 1,
    });
    const user = data.records?.[0];

    if (!user?.fields.username) {
      await ctx.reply('Set up your account first with /start');
      return;
    }

    const campaigns = await pbList('campaigns', {
      filter: `user='${user.id}'`,
      maxRecords: 10,
    });
    const campaignList = campaigns.records || [];

    await ctx.reply(myCampaigns(campaignList), {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard(),
    });
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '*PageFairy Bot*\n\n' +
      'Available commands:\n' +
      '/start — Main menu & dashboard\n' +
      '/shop — Browse active campaigns\n' +
      '/help — Show this help message\n\n' +
      'Tap the buttons below to navigate!',
      { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() }
    );
  });

  bot.command('shop', async (ctx) => {
    const campaigns = await pbList('campaigns', {
      filter: `status='active'`,
    });

    const campaignList = campaigns.records || [];
    if (campaignList.length === 0) {
      await ctx.reply('No active campaigns right now. Check back soon!', {
        reply_markup: mainMenuKeyboard(),
      });
      return;
    }

    await ctx.reply('Browse active campaigns:', {
      reply_markup: campaignListKeyboard(campaignList),
    });
  });
}
