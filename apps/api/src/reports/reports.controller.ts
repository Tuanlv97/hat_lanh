import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodPipe } from '../common/zod.pipe';
import { ReportsService } from './reports.service';

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 366;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Date-only values are Asia/Ho_Chi_Minh (UTC+7, no DST) calendar days; datetimes need an explicit offset. */
const bound = (edge: 'from' | 'to') =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === '') return undefined;
      let iso: string | null = null;
      if (DATE_ONLY.test(v)) {
        // V8 rolls 2026-02-31 over to March 3rd: reject dates that do not round-trip.
        const [y, m, d] = v.split('-').map(Number);
        const check = new Date(Date.UTC(y, m - 1, d));
        if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
          ctx.addIssue({ code: 'custom', message: 'Ngày không hợp lệ (YYYY-MM-DD hoặc ISO 8601)' });
          return z.NEVER;
        }
        iso = edge === 'from' ? `${v}T00:00:00.000+07:00` : `${v}T23:59:59.999+07:00`;
      } else if (z.string().datetime({ offset: true }).safeParse(v).success) iso = v;
      const d = iso ? new Date(iso) : new Date(NaN);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'Ngày không hợp lệ (YYYY-MM-DD hoặc ISO 8601)' });
        return z.NEVER;
      }
      return d;
    });

const rangeShape = { from: bound('from'), to: bound('to') };

const resolveRange = (q: { from?: Date; to?: Date }, ctx: z.RefinementCtx) => {
  const to = q.to ?? new Date();
  const from = q.from ?? new Date(to.getTime() - 30 * DAY_MS);
  if (from > to) {
    ctx.addIssue({ code: 'custom', path: ['from'], message: 'Ngày bắt đầu phải trước ngày kết thúc' });
    return z.NEVER;
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    ctx.addIssue({ code: 'custom', path: ['to'], message: `Khoảng thời gian tối đa ${MAX_RANGE_DAYS} ngày` });
    return z.NEVER;
  }
  return { from, to };
};

const rangeSchema = z.object(rangeShape).transform(resolveRange);

const revenueSchema = z
  .object({
    ...rangeShape,
    group: z.enum(['day', 'week', 'month'], { errorMap: () => ({ message: 'Nhóm không hợp lệ' }) }).default('day'),
  })
  .transform((q, ctx) => ({ ...resolveRange(q, ctx), group: q.group }));

@Controller('admin/reports')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('best-sellers')
  bestSellers(@Query(new ZodPipe(rangeSchema)) q: z.infer<typeof rangeSchema>) {
    return this.reports.bestSellers(q.from, q.to);
  }

  @Get('returns')
  returns(@Query(new ZodPipe(rangeSchema)) q: z.infer<typeof rangeSchema>) {
    return this.reports.returns(q.from, q.to);
  }

  @Get('revenue')
  revenue(@Query(new ZodPipe(revenueSchema)) q: z.infer<typeof revenueSchema>) {
    return this.reports.revenue(q.from, q.to, q.group);
  }
}
