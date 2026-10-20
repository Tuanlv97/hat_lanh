import { Module } from '@nestjs/common';
import { AdminPostsController } from './admin-posts.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { AdminTopicsController, TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  controllers: [PostsController, AdminPostsController, TopicsController, AdminTopicsController],
  providers: [PostsService, TopicsService],
})
export class PostsModule {}
