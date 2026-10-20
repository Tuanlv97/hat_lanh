import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('categories')
  categories() {
    return this.products.categories();
  }

  @Get('products')
  list(@Query('category') category?: unknown, @Query('q') q?: unknown) {
    return this.products.list(
      typeof category === 'string' ? category : undefined,
      typeof q === 'string' ? q : undefined,
    );
  }

  @Get('products/:slug')
  detail(@Param('slug') slug: string) {
    return this.products.detail(slug);
  }
}
