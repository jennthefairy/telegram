import { Bot, webhookCallback } from 'grammy';
import { registerCommands } from './commands.js';
import { registerCallbacks } from './callbacks.js';
import { airtableFetch, airtableUpdate, sanitizeParam } from '../lib/airtable.js';
import { usernameInvalid, usernameTaken, usernameConfirmation } from './messages.js';

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || '');

// Register handlers
registerCommands(bot);
registerCallbacks(bot);

// Text message handler — username registration flow
bot.on('message:text', async (ctx) => {
  const chatId = String(ctx.chat.id);
  const text = ctx.message.text.trim();

  if (text.startsWith('/')) return;

  const data = await airtableFetch('USERS', {
    filterByFormula: `{telegram_chat_id}='${sanitizeParam(chatId)}'`,
    maxRecords: 1,
  });
  const user = data.records?.[0];

  if (user && user.fields.bot_state === 'awaiting_username') {
    const username = text.toLowerCase().replace(/\s+/g, '');

    if (!/^[a-z0-9]{3,32}$/.test(username)) {
      await ctx.reply(usernameInvalid);
      return;
    }

    const existing = await airtableFetch('USERS', {
      filterByFormula: `{username}='${sanitizeParam(username)}'`,
      maxRecords: 1,
    });

    if (existing.records?.length > 0) {
      await ctx.reply(usernameTaken);
      return;
    }

    await airtableUpdate('USERS', user.id, { username, bot_state: 'active' });

    await ctx.reply(usernameConfirmation(username), { parse_mode: 'Markdown' });
    return;
  }

  await ctx.reply("I didn't quite get that. Use /shop to browse campaigns or /help for available commands.");
});

// Webhook handler compatible with Hono's c.req.raw
export const handleTelegramWebhook = webhookCallback(bot, 'std/http');

// For dev mode: long polling
export async function startPolling() {
  console.log('Starting Telegram bot in long polling mode...');
  await bot.start();
}
