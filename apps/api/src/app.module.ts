import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

/** Global default: 300 requests/min per IP. Stricter routes use @Throttle(...) later. */
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]), PrismaModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
