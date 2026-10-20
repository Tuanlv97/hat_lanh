import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '@hatlanh/shared';
import { ZodPipe } from '../common/zod.pipe';
import { loadEnv } from '../config/env';
import { AuthService, loginSchema, registerSchema, type LoginInput, type RegisterInput, type Session } from './auth.service';
import { CurrentUser, JwtGuard, type RequestUser } from './jwt.guard';

/** Stricter per-IP limit for credential endpoints (AUTH_RATE_LIMIT/min, default 10); global default stays 300/min. */
export const AuthThrottle = () => Throttle({ default: { limit: () => loadEnv().authRateLimit, ttl: 60_000 } });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @AuthThrottle()
  @Post('register')
  register(@Body(new ZodPipe(registerSchema)) body: RegisterInput): Promise<Session> {
    return this.auth.register(body);
  }

  @AuthThrottle()
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodPipe(loginSchema)) body: LoginInput): Promise<Session> {
    return this.auth.login(body);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  async me(@CurrentUser() user: RequestUser): Promise<{ user: AuthUser }> {
    return { user: await this.auth.me(user.id) };
  }
}
