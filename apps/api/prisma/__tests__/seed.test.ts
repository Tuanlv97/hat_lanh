import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { seed } from '../seed';
import { resetDb } from '../../test/helpers';

const SLUGS = [
  'gao-lut-do',
  'gao-lut-den',
  'gao-lut-trang',
  'tra-gao-lut-rang',
  'tra-gao-rang',
  'mo-muoi',
  'me-rang',
  'muoi-me',
  'bot-ngu-coc',
  'hat-oc-cho',
];
const FORBIDDEN = /chữa|trị bệnh|khỏi bệnh/i;
const ORIGIN = '[Điền vùng trồng / nhà cung cấp]';

describe('seed', () => {
  const prisma = new PrismaClient();

  beforeAll(async () => {
    await resetDb(prisma);
    await seed(prisma);
    await seed(prisma); // must be idempotent
  });

  afterAll(async () => {
    await resetDb(prisma);
    await prisma.$disconnect();
  });

  it('creates exactly the 10 sample products with active variants and placeholder origin', async () => {
    const products = await prisma.product.findMany({ include: { variants: true } });
    expect(products.map((p) => p.slug).sort()).toEqual([...SLUGS].sort());
    for (const p of products) {
      const active = p.variants.filter((v) => v.isActive);
      expect(active.length).toBeGreaterThanOrEqual(2);
      for (const v of active) {
        expect(v.stock).toBe(50);
        expect(Number.isInteger(v.priceVnd)).toBe(true);
        expect(v.priceVnd).toBeGreaterThan(0);
      }
      expect(p.origin).toBe(ORIGIN);
      expect(p.images).toEqual([`/placeholder/${p.slug}.svg`]);
    }
  });

  it('creates exactly one ADMIN, admin@hatlanh.local, with a bcrypt password hash', async () => {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    expect(admins).toHaveLength(1);
    expect(admins[0].email).toBe('admin@hatlanh.local');
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    expect(await bcrypt.compare(password, admins[0].passwordHash ?? '')).toBe(true);
  });

  it('creates at least 3 published posts', async () => {
    expect(await prisma.post.count({ where: { status: 'PUBLISHED' } })).toBeGreaterThanOrEqual(3);
  });

  it('never claims to cure or treat disease in product or post copy', async () => {
    const products = await prisma.product.findMany();
    for (const p of products) {
      expect(p.description.normalize('NFC')).not.toMatch(FORBIDDEN);
      expect(p.benefits.normalize('NFC')).not.toMatch(FORBIDDEN);
    }
    const posts = await prisma.post.findMany();
    for (const post of posts) {
      expect(post.html.normalize('NFC')).not.toMatch(FORBIDDEN);
      expect(`${post.title} ${post.excerpt}`.normalize('NFC')).not.toMatch(FORBIDDEN);
    }
  });

  it('seeds normalized sensitive-word defaults', async () => {
    const terms = (await prisma.sensitiveWord.findMany()).map((w) => w.term);
    expect(terms).toEqual(expect.arrayContaining(['chua khoi', 'tri benh', 'khoi benh']));
  });
});
