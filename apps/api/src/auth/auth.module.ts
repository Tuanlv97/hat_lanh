import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { loadEnv } from '../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DevOAuthController } from './dev-oauth.controller';
import { JwtGuard, OptionalJwtGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';

/** Global so any feature module can use `@UseGuards(JwtGuard | OptionalJwtGuard, RolesGuard)`. */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: loadEnv().jwtSecret,
        signOptions: { expiresIn: '7d', algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController, DevOAuthController],
  providers: [AuthService, JwtGuard, OptionalJwtGuard, RolesGuard],
  exports: [AuthService, JwtModule, JwtGuard, OptionalJwtGuard, RolesGuard],
})
export class AuthModule {}
