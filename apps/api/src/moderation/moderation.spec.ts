import { ModerationService } from './moderation.service';

const make = (terms: string[]) =>
  new ModerationService({ sensitiveWord: { findMany: jest.fn().mockResolvedValue(terms.map((term) => ({ term }))) } } as never);

describe('ModerationService.check', () => {
  const svc = make(['tri benh', 'chua khoi', 'so']);

  it.each([
    'TRỊ BỆNH rất tốt',
    'tri benh',
    'chua khoi',
    'Sản phẩm này, trị bệnh rất tốt',
    'gọi 0912 345 678',
    'gọi 0912345678 nhé',
    'zalo +84 912 345 678',
    'xem https://x.vn',
    'vào www.shop.com mua',
    'xem abc.com nhé',
    'mua tại x.vn',
    'đường link a.vn/abc',
  ])('flags %s as PENDING', async (text) => {
    expect(await svc.check(text)).toBe('PENDING');
  });

  it.each([
    'Gạo lứt rất ngon',
    'Ngon quá.Rất tốt',
    'Giao sau 3 ngày, hộp chắc chắn',
    'Mua 2 túi giá 50.000 đồng, 100000000 hạt',
    'Hạt điều 2024 rất ngon, mình mua lần 3',
    'trị bệnhx không khớp',
  ])('keeps %s VISIBLE', async (text) => {
    expect(await svc.check(text)).toBe('VISIBLE');
  });

  it('a short term does not fire inside a longer word but fires as a whole word', async () => {
    expect(await svc.check('sau khi dùng')).toBe('VISIBLE');
    expect(await svc.check('ăn so tốt')).toBe('PENDING');
    expect(await svc.check('ok, so.')).toBe('PENDING');
  });

  it('treats regex metacharacters in terms literally', async () => {
    const s = make(['a+b', '(x']);
    expect(await s.check('aab')).toBe('VISIBLE');
    expect(await s.check('mua a+b nhé')).toBe('PENDING');
    expect(await s.check('hello (x world')).toBe('PENDING');
  });

  it('loads words on every call', async () => {
    const findMany = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ term: 'xau' }]);
    const s = new ModerationService({ sensitiveWord: { findMany } } as never);
    expect(await s.check('xau')).toBe('VISIBLE');
    expect(await s.check('xau')).toBe('PENDING');
  });
});
