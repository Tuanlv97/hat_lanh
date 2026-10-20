// Sample catalogue for local development. Prices are sample integer VND values for the
// shop owner to edit. Copy is written in a "hỗ trợ / bổ sung dinh dưỡng" style and must
// never claim to cure or treat disease. Origin is a placeholder for the owner to fill in.

export const ORIGIN_PLACEHOLDER = '[Điền vùng trồng / nhà cung cấp]';
export const SEED_STOCK = 50;

export type SeedCategory = { slug: string; name: string; sortOrder: number };
export type SeedVariant = { label: string; priceVnd: number };
export type SeedProduct = {
  slug: string;
  name: string;
  categorySlug: string;
  description: string;
  benefits: string;
  variants: SeedVariant[];
};

export const categories: SeedCategory[] = [
  { slug: 'gao-lut', name: 'Gạo lứt', sortOrder: 1 },
  { slug: 'tra', name: 'Trà', sortOrder: 2 },
  { slug: 'gia-vi-cham', name: 'Gia vị chấm', sortOrder: 3 },
  { slug: 'hat-ngu-coc', name: 'Hạt & ngũ cốc', sortOrder: 4 },
];

export const products: SeedProduct[] = [
  {
    slug: 'gao-lut-do',
    name: 'Gạo lứt đỏ',
    categorySlug: 'gao-lut',
    description:
      'Gạo lứt đỏ chỉ xát bỏ lớp vỏ trấu, giữ nguyên lớp cám màu đỏ nâu. Hạt dẻo vừa, thơm nhẹ, hợp nấu cơm hằng ngày, nấu cháo hoặc rang làm trà.',
    benefits:
      'Bổ sung chất xơ, vitamin nhóm B và khoáng chất từ lớp cám gạo. Hỗ trợ bữa ăn chay cân bằng, giúp no lâu hơn so với gạo trắng.',
    variants: [
      { label: '1kg', priceVnd: 45000 },
      { label: '2kg', priceVnd: 88000 },
      { label: '5kg', priceVnd: 210000 },
    ],
  },
  {
    slug: 'gao-lut-den',
    name: 'Gạo lứt đen',
    categorySlug: 'gao-lut',
    description:
      'Gạo lứt đen (gạo lứt tím than) có lớp cám màu tím đậm, hạt dẻo và thơm. Nấu cơm, nấu cháo hoặc trộn cùng gạo lứt đỏ cho bữa cơm nhiều màu sắc.',
    benefits:
      'Bổ sung chất xơ và hợp chất anthocyanin tự nhiên có trong lớp cám tím. Hỗ trợ chế độ ăn thực dưỡng đa dạng, giàu dinh dưỡng.',
    variants: [
      { label: '1kg', priceVnd: 65000 },
      { label: '2kg', priceVnd: 125000 },
    ],
  },
  {
    slug: 'gao-lut-trang',
    name: 'Gạo lứt trắng',
    categorySlug: 'gao-lut',
    description:
      'Gạo lứt trắng (gạo lứt tẻ) có lớp cám màu ngà, hạt mềm, dễ ăn, phù hợp cho người mới bắt đầu chuyển sang ăn gạo lứt.',
    benefits:
      'Bổ sung chất xơ và vitamin nhóm B. Hỗ trợ làm quen dần với gạo lứt nhờ vị nhẹ, cơm mềm.',
    variants: [
      { label: '1kg', priceVnd: 40000 },
      { label: '2kg', priceVnd: 78000 },
      { label: '5kg', priceVnd: 185000 },
    ],
  },
  {
    slug: 'tra-gao-lut-rang',
    name: 'Trà gạo lứt rang',
    categorySlug: 'tra',
    description:
      'Gạo lứt được rang chín vàng đều trên lửa nhỏ, có mùi thơm bùi đặc trưng. Hãm với nước sôi 10 phút để dùng như trà, uống nóng hoặc để nguội.',
    benefits:
      'Thức uống thanh nhẹ thay cho nước lọc, bổ sung nước cho cơ thể mỗi ngày. Hỗ trợ thói quen uống trà không đường.',
    variants: [
      { label: '250g', priceVnd: 55000 },
      { label: '500g', priceVnd: 100000 },
    ],
  },
  {
    slug: 'tra-gao-rang',
    name: 'Trà gạo rang',
    categorySlug: 'tra',
    description:
      'Gạo rang thơm, vị ngọt nhẹ tự nhiên. Có thể hãm riêng hoặc pha cùng trà xanh. Không thêm hương liệu.',
    benefits:
      'Thức uống ấm, dễ uống cho cả gia đình. Hỗ trợ bổ sung nước và tạo cảm giác thư thái sau bữa ăn.',
    variants: [
      { label: '250g', priceVnd: 45000 },
      { label: '500g', priceVnd: 85000 },
    ],
  },
  {
    slug: 'mo-muoi',
    name: 'Mơ muối',
    categorySlug: 'gia-vi-cham',
    description:
      'Mơ chín được ngâm muối và phơi theo cách làm truyền thống, vị mặn chua đậm đà. Dùng kèm cơm gạo lứt, cháo hoặc pha nước uống.',
    benefits:
      'Gia vị quen thuộc trong bữa ăn thực dưỡng, giúp bữa cơm đậm vị. Hỗ trợ kích thích vị giác khi ăn.',
    variants: [
      { label: '200g', priceVnd: 85000 },
      { label: '500g', priceVnd: 195000 },
    ],
  },
  {
    slug: 'me-rang',
    name: 'Mè rang',
    categorySlug: 'gia-vi-cham',
    description:
      'Mè đen được làm sạch và rang chín thơm. Rắc lên cơm, cháo, salad hoặc xay làm muối mè.',
    benefits:
      'Bổ sung chất béo thực vật, canxi và chất xơ. Hỗ trợ tăng hương vị và dinh dưỡng cho món chay.',
    variants: [
      { label: '250g', priceVnd: 55000 },
      { label: '500g', priceVnd: 100000 },
    ],
  },
  {
    slug: 'muoi-me',
    name: 'Muối mè',
    categorySlug: 'gia-vi-cham',
    description:
      'Muối mè (gomasio) gồm mè đen rang và muối hạt rang, giã vừa đủ để giữ vị bùi. Chấm cơm gạo lứt là món quen thuộc của bữa ăn thực dưỡng.',
    benefits:
      'Giúp bữa cơm gạo lứt đậm đà với lượng muối vừa phải. Bổ sung chất béo thực vật và khoáng chất từ mè.',
    variants: [
      { label: '200g', priceVnd: 45000 },
      { label: '400g', priceVnd: 85000 },
    ],
  },
  {
    slug: 'bot-ngu-coc',
    name: 'Bột ngũ cốc',
    categorySlug: 'hat-ngu-coc',
    description:
      'Bột ngũ cốc từ gạo lứt, các loại đậu và hạt rang chín, xay mịn. Pha với nước ấm hoặc sữa hạt cho bữa sáng nhanh gọn.',
    benefits:
      'Bổ sung năng lượng, chất xơ và đạm thực vật. Hỗ trợ bữa sáng đủ chất cho người bận rộn.',
    variants: [
      { label: '500g', priceVnd: 120000 },
      { label: '1kg', priceVnd: 230000 },
    ],
  },
  {
    slug: 'hat-oc-cho',
    name: 'Hạt óc chó',
    categorySlug: 'hat-ngu-coc',
    description:
      'Hạt óc chó tách vỏ, sấy giòn, vị béo bùi. Ăn trực tiếp, trộn salad, làm sữa hạt hoặc rắc lên bột ngũ cốc.',
    benefits:
      'Bổ sung chất béo không bão hòa, trong đó có omega-3 nguồn thực vật. Hỗ trợ chế độ ăn chay đủ chất béo tốt.',
    variants: [
      { label: '250g', priceVnd: 95000 },
      { label: '500g', priceVnd: 180000 },
    ],
  },
];
