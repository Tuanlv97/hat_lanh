import { Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

/** Never includes passwordHash. */
const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  provider: true,
  emailVerified: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.user.findMany({ select: ADMIN_USER_SELECT, orderBy: { createdAt: 'desc' } });
    return { items };
  }

  async resetPassword(id: string, password: string): Promise<{ ok: true }> {
    const exists = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException({ statusCode: 404, error: 'NOT_FOUND', message: 'Không tìm thấy người dùng' });
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }
}
