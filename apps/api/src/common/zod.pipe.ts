import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';

/** Validates a body/query with a zod schema; failure -> 400 VALIDATION_ERROR with per-field messages. */
export class ZodPipe<S extends ZodTypeAny> implements PipeTransform<unknown, z.infer<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.infer<S> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!(key in fields)) fields[key] = issue.message;
    }
    throw new BadRequestException({ statusCode: 400, error: 'VALIDATION_ERROR', fields });
  }
}
