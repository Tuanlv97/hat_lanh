import { ORDER_CODE_ALPHABET, generateOrderCode } from './order-code';

describe('generateOrderCode', () => {
  it('is HL + 8 chars from the unambiguous alphabet (no I, O, 0, 1)', () => {
    expect(ORDER_CODE_ALPHABET).toBe('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    for (let i = 0; i < 200; i++) {
      expect(generateOrderCode()).toMatch(/^HL[A-HJ-NP-Z2-9]{8}$/);
    }
  });

  it('1000 codes are (almost) all unique', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateOrderCode()));
    // 32^8 ≈ 1.1e12 possibilities: a collision in 1000 draws has probability ~5e-7.
    expect(codes.size).toBeGreaterThanOrEqual(999);
  });

  it('uses every character of the alphabet over many draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) for (const c of generateOrderCode().slice(2)) seen.add(c);
    expect(seen.size).toBe(32);
  });
});
