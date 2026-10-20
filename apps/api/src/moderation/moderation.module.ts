import { Module } from '@nestjs/common';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminSensitiveWordsController } from './admin-sensitive-words.controller';
import { ModerationService } from './moderation.service';

@Module({
  controllers: [AdminModerationController, AdminSensitiveWordsController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
