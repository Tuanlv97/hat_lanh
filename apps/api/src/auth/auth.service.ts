import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { normalizePhone, type AuthUser } from '@hatlanh/shared';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './jwt.guard';

export const BCRYPT_COST = 10;

const emailField = z.string().trim().toLowerCase().max(254).email('Email không hợp lệ');
/** bcrypt only uses the first 72 bytes, so cap the length instead of silently truncating. */
export const passwordField = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(100),
  email: emailField,
  phone: z
    .string()
    .max(20)
    .transform((v, ctx) => {
      const p = normalizePhone(v);
      if (!p) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Số điện thoại không hợp lệ' });
        return z.NEVER;
      }
      return p;
    }),
  password: passwordField,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Vui lòng nhập email hoặc số điện thoại').max(254),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface Session {
  token: string;
  user: AuthUser;
}

export const AUTH_USER_SELECT = { id: true, name: true, email: true, phone: true, role: true } as const;

const INVALID_CREDENTIALS = 'Email/số điện thoại hoặc mật khẩu không đúng';

export const emailTaken = () =>
  new ConflictException({ statusCode: 409, error: 'EMAIL_TAKEN', message: 'Email đã được dùng cho tài khoản khác' });
const phoneTaken = () =>
  new ConflictException({
    statusCode: 409,
    error: 'PHONE_TAKEN',
    message: 'Số điện thoại đã được dùng cho tài khoản khác',
  });

/** Unique-constraint violation on User -> EMAIL_TAKEN / PHONE_TAKEN (covers concurrent registrations). */
function mapUniqueError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = JSON.stringify(err.meta?.target ?? '');
    if (target.includes('phone')) throw phoneTaken();
    throw emailTaken();
  }
  throw err;
}

@Injectable()
export class AuthService {
  /** Compared against when the identifier is unknown, so response time does not reveal which accounts exist. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<Session> {
    const [byEmail, byPhone] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { phone: input.phone }, select: { id: true } }),
    ]);
    if (byEmail) throw emailTaken();
    if (byPhone) throw phoneTaken();
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    // emailVerified stays false and guest orders are NOT claimed: nobody proved they own this email/phone.
    const user = await this.prisma.user
      .create({
        data: { name: input.name, email: input.email, phone: input.phone, passwordHash },
        select: AUTH_USER_SELECT,
      })
      .catch(mapUniqueError);
    return this.session(user);
  }

  async login(input: LoginInput): Promise<Session> {
    const where = this.identifierWhere(input.identifier);
    const user = where
      ? await this.prisma.user.findUnique({ where, select: { ...AUTH_USER_SELECT, passwordHash: true } })
      : null;
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const ok = await bcrypt.compare(input.password, hash);
    if (!user || !user.passwordHash || !ok) {
      throw new UnauthorizedException({ statusCode: 401, error: 'INVALID_CREDENTIALS', message: INVALID_CREDENTIALS });
    }
    const { passwordHash: _omit, ...authUser } = user;
    return this.session(authUser);
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: AUTH_USER_SELECT });
    if (!user) throw new UnauthorizedException({ statusCode: 401, error: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập' });
    return user;
  }

  /**
   * Sign-in through a social provider whose email is verified by that provider.
   * Finds by (provider, providerId) or creates the user with emailVerified=true, then claims guest orders
   * placed with the same email. Refuses (409 EMAIL_TAKEN) when the email belongs to a password account,
   * so a social login can never take over an email/phone-registered account or its orders.
   */
  async socialLogin(input: { provider: string; providerId: string; email: string; name: string }): Promise<Session> {
    const email = input.email.trim().toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { provider_providerId: { provider: input.provider, providerId: input.providerId } },
      select: AUTH_USER_SELECT,
    });
    if (!user) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email },
        select: { ...AUTH_USER_SELECT, provider: true },
      });
      if (byEmail) {
        if (!byEmail.provider) throw emailTaken();
        // Same provider-verified email already signed in through another social provider: same person.
        const { provider: _p, ...rest } = byEmail;
        user = rest;
      } else {
        user = await this.prisma.user
          .create({
            data: { name: input.name, email, provider: input.provider, providerId: input.providerId, emailVerified: true },
            select: AUTH_USER_SELECT,
          })
          .catch(async (err: unknown) => {
            // Concurrent first sign-in: the other request created this exact social user first -> use it.
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
              const winner = await this.prisma.user.findUnique({
                where: { provider_providerId: { provider: input.provider, providerId: input.providerId } },
                select: AUTH_USER_SELECT,
              });
              if (winner) return winner;
            }
            return mapUniqueError(err);
          });
      }
    }
    if (user.email) await this.claimGuestOrders(user.id, user.email);
    return this.session(user);
  }

  /** Only for verified (social) emails. Runs on every social login to also catch orders placed while logged out. */
  private async claimGuestOrders(userId: string, email: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "Order" SET "userId" = ${userId}
      WHERE lower("email") = lower(${email}) AND "userId" IS NULL`;
  }

  private identifierWhere(identifier: string): Prisma.UserWhereUniqueInput | null {
    if (identifier.includes('@')) return { email: identifier.toLowerCase() };
    const phone = normalizePhone(identifier);
    return phone ? { phone } : null;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= bcrypt.hash('timing-equalizer-not-a-password', BCRYPT_COST);
    return this.dummyHash;
  }

  private async session(user: AuthUser): Promise<Session> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return { token: await this.jwt.signAsync(payload), user: toAuthUser(user) };
  }
}

/** Whitelists AuthUser fields so nothing else (e.g. passwordHash) can leak into a response. */
export function toAuthUser(u: AuthUser): AuthUser {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
}
