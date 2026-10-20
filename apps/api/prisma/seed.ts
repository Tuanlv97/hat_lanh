// Idempotent seed: safe to run many times (upserts by slug / email / unique term).
// Re-running resets the sample products, variants (stock 50) and sample posts to the values
// in seed-data/. The admin password is only set when the admin account is first created.
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { normalizeVi } from '@hatlanh/shared';
import { categories, products, ORIGIN_PLACEHOLDER, SEED_STOCK } from './seed-data/products';
import { posts, topics } from './seed-data/posts';
import { sensitiveWords } from './seed-data/words';

export const ADMIN_EMAIL = 'admin@hatlanh.local';
const DEFAULT_ADMIN_PASSWORD = 'ChangeMe123!';

export async function seedAdmin(prisma: PrismaClient): Promise<void> {
  const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    return;
  }
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: 'Quản trị viên',
      role: 'ADMIN',
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
}

async function seedCatalogue(prisma: PrismaClient): Promise<Map<string, string>> {
  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, sortOrder: c.sortOrder },
    });
    categoryIds.set(c.slug, row.id);
  }

  const productIds = new Map<string, string>();
  for (const p of products) {
    const data = {
      name: p.name,
      categoryId: categoryIds.get(p.categorySlug)!,
      description: p.description,
      benefits: p.benefits,
      origin: ORIGIN_PLACEHOLDER,
      images: [`/placeholder/${p.slug}.svg`],
      isActive: true,
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    });
    productIds.set(p.slug, product.id);

    for (const v of p.variants) {
      const variantData = { priceVnd: v.priceVnd, stock: SEED_STOCK, isActive: true };
      await prisma.variant.upsert({
        where: { productId_label: { productId: product.id, label: v.label } },
        create: { productId: product.id, label: v.label, ...variantData },
        update: variantData,
      });
    }
  }
  return productIds;
}

async function seedBlog(prisma: PrismaClient, productIds: Map<string, string>): Promise<void> {
  const topicIds = new Map<string, string>();
  for (const t of topics) {
    const row = await prisma.topic.upsert({
      where: { slug: t.slug },
      create: t,
      update: { name: t.name },
    });
    topicIds.set(t.slug, row.id);
  }

  for (const p of posts) {
    const data = {
      title: p.title,
      excerpt: p.excerpt,
      html: p.html,
      topicId: topicIds.get(p.topicSlug)!,
      status: 'PUBLISHED' as const,
      publishAt: new Date(p.publishAt),
    };
    const post = await prisma.post.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    });
    for (const slug of p.productSlugs) {
      const productId = productIds.get(slug)!;
      await prisma.postProduct.upsert({
        where: { postId_productId: { postId: post.id, productId } },
        create: { postId: post.id, productId },
        update: {},
      });
    }
  }
}

async function seedSensitiveWords(prisma: PrismaClient): Promise<void> {
  const terms = [...new Set(sensitiveWords.map((w) => normalizeVi(w).trim()).filter(Boolean))];
  for (const term of terms) {
    await prisma.sensitiveWord.upsert({ where: { term }, create: { term }, update: {} });
  }
}

export async function seed(prisma: PrismaClient): Promise<void> {
  await seedAdmin(prisma);
  const productIds = await seedCatalogue(prisma);
  await seedBlog(prisma, productIds);
  await seedSensitiveWords(prisma);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seed(prisma)
    .then(() => console.log('Seed completed.'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
