import { it, expect } from 'vitest';
import { normalizeVi } from '../text';

it('removes diacritics', () => {
  expect(normalizeVi('TRỊ BỆNH Đau')).toBe('tri benh dau');
});
