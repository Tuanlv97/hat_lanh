import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify, uniqueSlug } from './slug';

const notFound = () => new NotFoundException({ statusCode: 404, error: 'NOT_FOUND', message: 'Không tìm thấy chủ đề' });
const conflict = (error: string, message: string) => new ConflictException({ statusCode: 409, error, message });
const prismaCode = (e: unknown) => (e instanceof Prisma.PrismaClientKnownRequestError ? e.code : undefined);

@Injectable()
export class TopicsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.topic.findMany({ orderBy: { name: 'asc' }, select: { id: true, slug: true, name: true } });
  }

  async create(input: { name: string; slug?: string }) {
    const slug =
      input.slug ??
      (await uniqueSlug(slugify(input.name) || 'chu-de', async (s) => (await this.prisma.topic.count({ where: { slug: s } })) > 0));
    try {
      return await this.prisma.topic.create({ data: { name: input.name, slug } });
    } catch (e) {
      if (prismaCode(e) === 'P2002') throw conflict('SLUG_TAKEN', 'Slug đã tồn tại');
      throw e;
    }
  }

  async update(id: string, input: { name?: string; slug?: string }) {
    try {
      return await this.prisma.topic.update({ where: { id }, data: input });
    } catch (e) {
      if (prismaCode(e) === 'P2002') throw conflict('SLUG_TAKEN', 'Slug đã tồn tại');
      if (prismaCode(e) === 'P2025') throw notFound();
      throw e;
    }
  }

  async remove(id: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id }, select: { id: true } });
    if (!topic) throw notFound();
    const posts = await this.prisma.post.count({ where: { topicId: id } });
    if (posts > 0) throw conflict('TOPIC_HAS_POSTS', 'Chủ đề vẫn còn bài viết, hãy chuyển hoặc xóa bài trước');
    try {
      await this.prisma.topic.delete({ where: { id } });
    } catch (e) {
      if (prismaCode(e) === 'P2025') throw notFound();
      throw e;
    }
    return { ok: true };
  }
}
