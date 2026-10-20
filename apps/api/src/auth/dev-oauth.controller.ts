import { Body, Controller, HttpCode, NotFoundException, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { loadEnv } from '../config/env';
import { AuthThrottle } from './auth.controller';
import { AuthService, type Session } from './auth.service';

const devLoginSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  email: z.string().trim().toLowerCase().max(254).email('Email không hợp lệ'),
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(100),
});

/**
 * Fake Google/Facebook sign-in for local development (OAUTH_MODE=dev only; 404 otherwise).
 *
 * TODO(OAuth): replace with real provider flows (e.g. /auth/google + /auth/google/callback,
 * /auth/facebook + /auth/facebook/callback) that end in AuthService.socialLogin() with the provider's
 * stable user id as providerId and only a provider-verified email. Env vars to add:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET     (Google Cloud Console -> OAuth client)
 *   FACEBOOK_APP_ID, FACEBOOK_APP_SECRET       (Facebook Developers -> app)
 * Caveat: a Facebook app in development mode only lets its own admins/testers log in; it must pass
 * Facebook App Review (business verification, privacy policy URL, "email" permission) before
 * the public can use it. Never trust an email the provider has not verified.
 */
@Controller('auth')
export class DevOAuthController {
  constructor(private readonly auth: AuthService) {}

  @AuthThrottle()
  @Post('dev-login')
  @HttpCode(200)
  devLogin(@Body() body: unknown): Promise<Session> {
    // Checked before validation so that, when disabled, the route is indistinguishable from an unknown one.
    if (loadEnv().oauthMode !== 'dev') {
      throw new NotFoundException({ statusCode: 404, error: 'NOT_FOUND', message: 'Cannot POST /auth/dev-login' });
    }
    const input = new ZodPipe(devLoginSchema).transform(body);
    // In dev the "provider user id" is derived from the email; real OAuth uses the provider's subject id.
    return this.auth.socialLogin({ provider: input.provider, providerId: input.email, email: input.email, name: input.name });
  }
}
