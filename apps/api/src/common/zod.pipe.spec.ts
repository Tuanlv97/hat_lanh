import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from './zod.pipe';

describe('ZodPipe', () => {
  const pipe = new ZodPipe(z.object({ name: z.string().min(2), age: z.number().int() }));

  it('returns parsed value', () => {
    expect(pipe.transform({ name: 'ab', age: 3 })).toEqual({ name: 'ab', age: 3 });
  });

  it('throws 400 VALIDATION_ERROR with field messages', () => {
    try {
      pipe.transform({ name: 'a', age: 'x' });
      fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const body = (e as BadRequestException).getResponse() as any;
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(Object.keys(body.fields).sort()).toEqual(['age', 'name']);
      expect(typeof body.fields.name).toBe('string');
    }
  });
});
