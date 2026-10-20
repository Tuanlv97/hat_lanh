import { it, expect } from 'vitest';
import { nextOrderStatuses } from '../status';

it('transitions', () => {
  expect(nextOrderStatuses('COMPLETED')).toEqual([]);
  expect(nextOrderStatuses('CANCELLED')).toEqual([]);
  expect(nextOrderStatuses('PENDING')).toEqual(['CONFIRMED', 'CANCELLED']);
  expect(nextOrderStatuses('SHIPPING')).toEqual(['COMPLETED', 'CANCELLED']);
});
