import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
  @SkipThrottle()
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
