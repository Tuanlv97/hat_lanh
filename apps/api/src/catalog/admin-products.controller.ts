import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodPipe } from '../common/zod.pipe';
import { ProductsService } from './products.service';

const text = z.string().trim().min(1, 'Không được để trống').max(5000);
const slugField = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');
const variantFields = {
  label: z.string().trim().min(1, 'Không được để trống').max(100),
  priceVnd: z
    .number({ invalid_type_error: 'Giá phải là số' })
    .int('Giá phải là số nguyên')
    .positive('Giá phải lớn hơn 0'),
  stock: z
    .number({ invalid_type_error: 'Tồn kho phải là số' })
    .int('Tồn kho phải là số nguyên')
    .min(0, 'Tồn kho không được âm'),
  isActive: z.boolean(),
};
const createVariantSchema = z.object({ ...variantFields, isActive: variantFields.isActive.optional() });
const updateVariantSchema = z.object(variantFields).partial();
const productFields = {
  name: text.max(200),
  slug: slugField,
  categoryId: z.string().min(1),
  description: text,
  origin: text,
  benefits: text,
  images: z.array(z.string().min(1).max(500)).max(20),
  isActive: z.boolean(),
};
const createProductSchema = z.object({
  ...productFields,
  slug: slugField.optional(),
  images: productFields.images.optional(),
  isActive: z.boolean().optional(),
  variants: z.array(createVariantSchema).max(30).optional(),
});
const updateProductSchema = z.object(productFields).partial();

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('products')
  list() {
    return this.products.adminList();
  }

  @Post('products')
  create(@Body(new ZodPipe(createProductSchema)) body: z.infer<typeof createProductSchema>) {
    return this.products.create(body);
  }

  @Patch('products/:id')
  update(@Param('id') id: string, @Body(new ZodPipe(updateProductSchema)) body: z.infer<typeof updateProductSchema>) {
    return this.products.update(id, body);
  }

  @Patch('products/:id/hide')
  hide(@Param('id') id: string) {
    return this.products.hide(id);
  }

  @Post('products/:id/variants')
  createVariant(
    @Param('id') id: string,
    @Body(new ZodPipe(createVariantSchema)) body: z.infer<typeof createVariantSchema>,
  ) {
    return this.products.createVariant(id, body);
  }

  @Patch('variants/:id')
  updateVariant(@Param('id') id: string, @Body(new ZodPipe(updateVariantSchema)) body: z.infer<typeof updateVariantSchema>) {
    return this.products.updateVariant(id, body);
  }

  @Delete('variants/:id')
  @HttpCode(200)
  deleteVariant(@Param('id') id: string) {
    return this.products.deleteVariant(id);
  }
}
