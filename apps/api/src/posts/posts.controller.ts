import { Controller, Get, Param, Query } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  list(@Query('topic') topic?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.posts.list({
      topic: typeof topic === 'string' && topic ? topic : undefined,
      page: typeof page === 'string' ? page : undefined,
      pageSize: typeof pageSize === 'string' ? pageSize : undefined,
    });
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.posts.detail(slug);
  }
}
