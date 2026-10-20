import { Module } from '@nestjs/common';
import { ModerationModule } from '../moderation/moderation.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({ imports: [ModerationModule], controllers: [CommentsController], providers: [CommentsService] })
export class CommentsModule {}
