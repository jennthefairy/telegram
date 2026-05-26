# Archived n8n workflows (retired)

These are the 6 n8n workflow exports from the former `jennthefairy/n8n-server` repo,
preserved here for historical reference after that system was retired. **Nothing in the
running app uses these** — the bot/cron logic was rewritten natively in grammY/TypeScript
(see `src/bot/` and `src/routes/`). Kept only so the `n8n-server` repo can be safely deleted.

| File | Replaced by (native) |
|---|---|
| PageFairy Bot — Onboarding & Dispatch.json | `src/bot/commands.ts`, `src/bot/index.ts`, `src/bot/callbacks.ts`, `src/bot/messages.ts` |
| PageFairy — Admin Approval (Campaign Created).json | `src/routes/campaignReview.ts` + approve/reject in `src/bot/callbacks.ts` |
| PageFairy — Campaign Auto-Close.json | `src/bot/scheduler.ts` → `runCampaignAutoClose` |
| PageFairy — Stuck Order Watchdog.json | `src/bot/scheduler.ts` → `runStuckOrderWatchdog` |
| PageFairy — Campaign Close Notifications.json | `src/bot/notifications.ts` → `sendCampaignCloseNotification` |
| PageFairy — Order Notification.json | `src/bot/notifications.ts` → `sendOrderNotification` (via `src/routes/checkout.ts`) |
