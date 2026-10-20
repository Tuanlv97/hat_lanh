import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodPipe } from '../common/zod.pipe';
import { TopicsService } from './topics.service';

const name = z.string({ required_error: 'Vui lòng nhập tên chủ đề' }).trim().min(1, 'Vui lòng nhập tên chủ đề').max(100);
const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');
const createSchema = z.object({ name, slug: slug.optional() });
const updateSchema = z.object({ name, slug }).partial();

@Controller('topics')
export class TopicsController {
  constructor(private readonly topics: TopicsService) {}

  @Get()
  list() {
    return this.topics.list();
  }
}

@Controller('admin/topics')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminTopicsController {
  constructor(private readonly topics: TopicsService) {}

  @Get()
  list() {
    return this.topics.list();
  }

  @Post()
  create(@Body(new ZodPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.topics.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body(new ZodPipe(updateSchema)) body: z.infer<typeof updateSchema>) {
    return this.topics.update(id, body);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id') id: string) {
    return this.topics.remove(id);
  }
}
