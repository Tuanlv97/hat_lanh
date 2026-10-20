import { Body, Controller, Get, HttpCode, Param, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { passwordField } from '../auth/auth.service';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodPipe } from '../common/zod.pipe';
import { UsersService } from './users.service';

const resetPasswordSchema = z.object({ password: passwordField });

@Controller('admin/users')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  /** Customers who forgot their password contact the shop; the admin sets a new one here (no email/SMS flow). */
  @Patch(':id/password')
  @HttpCode(200)
  resetPassword(@Param('id') id: string, @Body(new ZodPipe(resetPasswordSchema)) body: z.infer<typeof resetPasswordSchema>) {
    return this.users.resetPassword(id, body.password);
  }
}
