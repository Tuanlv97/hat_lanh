import { Injectable } from '@nestjs/common';
import type { NotificationEvent, Notifier } from './notifier';

/**
 * Current implementation: prints the event to the API terminal.
 *
 * TODO(Telegram): replace with a TelegramNotifier once the shop owner has a bot.
 *  - The owner creates a bot with @BotFather on Telegram and gets its token, then sends the bot a message
 *    so we can read the owner's chat id (getUpdates).
 *  - Put TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env (never hard-code them; add to .env.example).
 *  - Implement `notify` as POST https://api.telegram.org/bot<TOKEN>/sendMessage { chat_id, text } with a short
 *    timeout, formatting the event as readable Vietnamese text.
 *  - Swap the provider in NotificationsModule (`useClass: TelegramNotifier`); nothing else changes.
 *  Zalo was ruled out: personal Zalo accounts have no official way to send automated messages.
 */
@Injectable()
export class ConsoleNotifier implements Notifier {
  async notify(e: NotificationEvent): Promise<void> {
    console.log(`[NOTIFY] ${JSON.stringify(e)}`);
  }
}
