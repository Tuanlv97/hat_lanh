import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import type { AuthedRequest } from './jwt.guard';
import { ROLES_KEY } from './roles.decorator';

/** Must run after JwtGuard: `@UseGuards(JwtGuard, RolesGuard)` + `@Roles('ADMIN')`. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const user = context.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) throw new UnauthorizedException({ statusCode: 401, error: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập' });
    if (!roles.includes(user.role)) {
      throw new ForbiddenException({ statusCode: 403, error: 'FORBIDDEN', message: 'Bạn không có quyền truy cập' });
    }
    return true;
  }
}
