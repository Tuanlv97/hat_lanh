import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeVi } from '@hatlanh/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface VariantInput {
  label: string;
  priceVnd: number;
  stock: number;
  isActive?: boolean;
}
export interface ProductInput {
  name: string;
  slug?: string;
  categoryId: string;
  description: string;
  origin: string;
  benefits: string;
  images?: string[];
  isActive?: boolean;
  variants?: VariantInput[];
}

export function slugify(name: string): string {
  return normalizeVi(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const notFound = (message: string) => new NotFoundException({ statusCode: 404, error: 'NOT_FOUND', message });
const conflict = (error: string, message: string) => new ConflictException({ statusCode: 409, error, message });
const prismaCode = (e: unknown): string | undefined =>
  e instanceof Prisma.PrismaClientKnownRequestError ? e.code : undefined;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- public ----

  categories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true, name: true, sortOrder: true },
    });
  }

  async list(category?: string, q?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        variants: { some: { isActive: true } },
        ...(category ? { category: { slug: category } } : {}),
      },
      include: {
        category: { select: { slug: true, name: true } },
        variants: { where: { isActive: true }, orderBy: { priceVnd: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const needle = q ? normalizeVi(q.trim()) : '';
    const filtered = needle ? products.filter((p) => normalizeVi(p.name).includes(needle)) : products;
    return filtered.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      images: p.images,
      minPriceVnd: p.variants[0].priceVnd,
      variants: p.variants,
    }));
  }

  async detail(slug: string) {
    const p = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        category: { select: { slug: true, name: true } },
        variants: { where: { isActive: true }, orderBy: { priceVnd: 'asc' } },
        reviews: {
          where: { status: 'VISIBLE' },
          orderBy: { createdAt: 'desc' },
          select: { id: true, rating: true, content: true, createdAt: true, user: { select: { name: true } } },
        },
      },
    });
    if (!p) throw notFound('Không tìm thấy sản phẩm');
    const { reviews, ...rest } = p;
    const reviewCount = reviews.length;
    const averageRating = reviewCount
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
      : 0;
    return {
      ...rest,
      averageRating,
      reviewCount,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        content: r.content,
        createdAt: r.createdAt,
        userName: r.user.name,
      })),
    };
  }

  // ---- admin ----

  adminList() {
    return this.prisma.product.findMany({
      include: { category: { select: { slug: true, name: true } }, variants: { orderBy: { priceVnd: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertCategory(categoryId: string) {
    const c = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!c) throw notFound('Không tìm thấy danh mục');
  }

  async create(input: ProductInput) {
    await this.assertCategory(input.categoryId);
    const slug = input.slug ?? slugify(input.name);
    if (!slug) throw conflict('SLUG_TAKEN', 'Không tạo được slug từ tên sản phẩm');
    try {
      return await this.prisma.product.create({
        data: {
          slug,
          name: input.name,
          categoryId: input.categoryId,
          description: input.description,
          origin: input.origin,
          benefits: input.benefits,
          images: input.images ?? [],
          isActive: input.isActive ?? true,
          variants: { create: (input.variants ?? []).map((v) => ({ ...v, isActive: v.isActive ?? true })) },
        },
        include: { variants: true },
      });
    } catch (e) {
      if (prismaCode(e) === 'P2002') {
        const target = String((e as Prisma.PrismaClientKnownRequestError).meta?.target ?? '');
        if (target.includes('slug')) throw conflict('SLUG_TAKEN', 'Slug đã tồn tại');
        throw conflict('VARIANT_LABEL_TAKEN', 'Tên phân loại bị trùng');
      }
      throw e;
    }
  }

  async update(id: string, input: Partial<Omit<ProductInput, 'variants'>>) {
    if (input.categoryId) await this.assertCategory(input.categoryId);
    try {
      return await this.prisma.product.update({ where: { id }, data: input, include: { variants: true } });
    } catch (e) {
      if (prismaCode(e) === 'P2002') throw conflict('SLUG_TAKEN', 'Slug đã tồn tại');
      if (prismaCode(e) === 'P2025') throw notFound('Không tìm thấy sản phẩm');
      throw e;
    }
  }

  async hide(id: string) {
    try {
      return await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    } catch (e) {
      if (prismaCode(e) === 'P2025') throw notFound('Không tìm thấy sản phẩm');
      throw e;
    }
  }

  async createVariant(productId: string, input: VariantInput) {
    const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!p) throw notFound('Không tìm thấy sản phẩm');
    try {
      return await this.prisma.variant.create({ data: { productId, ...input, isActive: input.isActive ?? true } });
    } catch (e) {
      if (prismaCode(e) === 'P2002') throw conflict('VARIANT_LABEL_TAKEN', 'Tên phân loại bị trùng');
      throw e;
    }
  }

  async updateVariant(id: string, input: Partial<VariantInput>) {
    try {
      return await this.prisma.variant.update({ where: { id }, data: input });
    } catch (e) {
      if (prismaCode(e) === 'P2002') throw conflict('VARIANT_LABEL_TAKEN', 'Tên phân loại bị trùng');
      if (prismaCode(e) === 'P2025') throw notFound('Không tìm thấy phân loại');
      throw e;
    }
  }

  async deleteVariant(id: string) {
    const v = await this.prisma.variant.findUnique({ where: { id }, select: { id: true } });
    if (!v) throw notFound('Không tìm thấy phân loại');
    const used = await this.prisma.orderItem.count({ where: { variantId: id } });
    if (used > 0) throw conflict('VARIANT_HAS_ORDERS', 'Phân loại đã có trong đơn hàng, chỉ có thể ngừng bán');
    try {
      await this.prisma.variant.delete({ where: { id } });
    } catch (e) {
      // an order referencing it was created between the check and the delete
      if (prismaCode(e) === 'P2003') throw conflict('VARIANT_HAS_ORDERS', 'Phân loại đã có trong đơn hàng, chỉ có thể ngừng bán');
      throw e;
    }
    return { ok: true };
  }
}
