import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/** What the guards put on `req.user`. */
export interface RequestUser {
  id: string;
  role: Role;
}

export type AuthedRequest = Request & { user?: RequestUser };

export interface JwtPayload {
  sub: string;
  role: Role;
}

const unauthorized = (message = 'Bạn cần đăng nhập') =>
  new UnauthorizedException({ statusCode: 401, error: 'UNAUTHORIZED', message });

/** Verifies the bearer token and re-reads id/role from the DB (so stale or forged roles never apply). */
@Injectable()
export class JwtGuard implements CanActivate {
  /** OptionalJwtGuard overrides this: no Authorization header -> continue as guest. */
  protected readonly optional: boolean = false;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (header === undefined || header === '') {
      if (this.optional) return true;
      throw unauthorized();
    }
    // A header that is present but invalid is always rejected, even on optional routes,
    // so a logged-in client with an expired token is told to re-login instead of silently acting as a guest.
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) throw unauthorized('Phiên đăng nhập không hợp lệ');
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(match[1]);
    } catch {
      throw unauthorized('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }
    if (typeof payload?.sub !== 'string') throw unauthorized('Phiên đăng nhập không hợp lệ');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true } });
    if (!user) throw unauthorized('Phiên đăng nhập không hợp lệ');
    req.user = { id: user.id, role: user.role };
    return true;
  }
}

/** Like JwtGuard, but requests without an Authorization header pass with `req.user` undefined. */
@Injectable()
export class OptionalJwtGuard extends JwtGuard {
  protected override readonly optional = true;
}

/** `@CurrentUser()` -> `req.user` (undefined on optional routes for guests). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);
