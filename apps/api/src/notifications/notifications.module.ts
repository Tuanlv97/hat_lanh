import { Module } from '@nestjs/common';
import { ConsoleNotifier } from './console.notifier';
import { NOTIFIER } from './notifier';

/** Provides the shop-owner Notifier (console today, Telegram later — see ConsoleNotifier). */
@Module({
  providers: [{ provide: NOTIFIER, useClass: ConsoleNotifier }],
  exports: [NOTIFIER],
})
export class NotificationsModule {}
