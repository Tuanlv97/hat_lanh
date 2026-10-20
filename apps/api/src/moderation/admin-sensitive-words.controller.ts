import { Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeVi } from '@hatlanh/shared';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

const wordSchema = z.object({
  term: z
    .string({ required_error: 'Vui lòng nhập từ khóa', invalid_type_error: 'Từ khóa không hợp lệ' })
    .trim()
    .min(1, 'Vui lòng nhập từ khóa')
    .max(100, 'Từ khóa tối đa 100 ký tự'),
});

@Controller('admin/sensitive-words')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSensitiveWordsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.sensitiveWord.findMany({ orderBy: { term: 'asc' } });
  }

  @Post()
  async create(@Body(new ZodPipe(wordSchema)) body: z.infer<typeof wordSchema>) {
    const term = normalizeVi(body.term).trim();
    try {
      return await this.prisma.sensitiveWord.create({ data: { term } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({ statusCode: 409, error: 'WORD_EXISTS', message: 'Từ khóa đã tồn tại' });
      }
      throw e;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.prisma.sensitiveWord.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException({ statusCode: 404, error: 'NOT_FOUND', message: 'Không tìm thấy từ khóa' });
      }
      throw e;
    }
    return { ok: true };
  }
}
