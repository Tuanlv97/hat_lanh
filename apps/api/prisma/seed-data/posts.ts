// Sample blog content. Sharing experience only; never claims to cure or treat disease.

export type SeedTopic = { slug: string; name: string };
export type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  html: string;
  topicSlug: string;
  publishAt: string; // ISO date, fixed so the seed stays idempotent
  productSlugs: string[];
};

export const topics: SeedTopic[] = [
  { slug: 'an-chay-tu-hanh', name: 'Ăn chay tu hành' },
  { slug: 'giam-can', name: 'Giảm cân' },
  { slug: 'song-khoe', name: 'Sống khỏe' },
];

export const posts: SeedPost[] = [
  {
    slug: 'an-chay-thuc-duong-bat-dau-tu-dau',
    title: 'Ăn chay thực dưỡng: bắt đầu từ đâu?',
    excerpt: 'Vài gợi ý nhẹ nhàng cho người mới làm quen với bữa ăn chay thực dưỡng.',
    topicSlug: 'an-chay-tu-hanh',
    publishAt: '2026-10-01T01:00:00.000Z',
    productSlugs: ['gao-lut-do', 'muoi-me'],
    html: [
      '<p>Thực dưỡng là cách ăn uống đơn giản, lấy ngũ cốc nguyên hạt làm nền, kết hợp rau củ theo mùa và các loại gia vị truyền thống. Với nhiều người ăn chay tu hành, đây là cách giữ bữa ăn thanh đạm mà vẫn đủ chất.</p>',
      '<h2>Bắt đầu từ bát cơm gạo lứt</h2>',
      '<p>Bạn có thể thay dần gạo trắng bằng gạo lứt, ví dụ trộn một phần gạo lứt vào nồi cơm rồi tăng dần theo khẩu vị. Nhai kỹ giúp cảm nhận rõ vị ngọt tự nhiên của hạt gạo.</p>',
      '<h2>Gia vị đơn giản</h2>',
      '<p>Muối mè, mơ muối hay tương là những gia vị quen thuộc. Chỉ cần một lượng nhỏ là bữa cơm đã đậm đà.</p>',
      '<p>Mỗi người có thể trạng khác nhau. Nếu có vấn đề sức khỏe, hãy hỏi ý kiến bác sĩ hoặc chuyên gia dinh dưỡng trước khi thay đổi chế độ ăn.</p>',
    ].join('\n'),
  },
  {
    slug: 'cach-nau-com-gao-lut-deo-mem',
    title: 'Cách nấu cơm gạo lứt dẻo mềm bằng nồi cơm điện',
    excerpt: 'Ngâm gạo đúng cách và canh lượng nước để cơm gạo lứt mềm, dễ ăn.',
    topicSlug: 'song-khoe',
    publishAt: '2026-10-05T01:00:00.000Z',
    productSlugs: ['gao-lut-do', 'gao-lut-den', 'gao-lut-trang'],
    html: [
      '<p>Gạo lứt còn lớp cám nên cần ngâm và nấu lâu hơn gạo trắng. Làm theo các bước sau, cơm sẽ dẻo và mềm hơn.</p>',
      '<ol>',
      '<li>Vo gạo nhẹ tay một đến hai lần.</li>',
      '<li>Ngâm gạo trong nước sạch từ 4 đến 8 tiếng (hoặc qua đêm).</li>',
      '<li>Chắt nước ngâm, cho nước mới theo tỉ lệ khoảng 1 gạo : 1,5 nước.</li>',
      '<li>Thêm một chút muối hạt, nấu như cơm thường, sau khi chín ủ thêm 15 phút.</li>',
      '</ol>',
      '<p>Gạo lứt trắng mềm hơn, hợp người mới ăn; gạo lứt đỏ và gạo lứt đen đậm vị hơn. Bạn có thể trộn nhiều loại để bữa cơm nhiều màu sắc.</p>',
    ].join('\n'),
  },
  {
    slug: 'bua-an-chay-can-bang-khi-muon-giam-can',
    title: 'Bữa ăn chay cân bằng khi muốn giảm cân',
    excerpt: 'Gợi ý xây dựng bữa ăn chay no lâu, đủ chất, hỗ trợ kiểm soát cân nặng.',
    topicSlug: 'giam-can',
    publishAt: '2026-10-10T01:00:00.000Z',
    productSlugs: ['gao-lut-trang', 'tra-gao-lut-rang', 'hat-oc-cho'],
    html: [
      '<p>Ăn chay không có nghĩa là ăn ít. Một bữa ăn cân bằng giúp bạn no lâu và đủ năng lượng cho cả ngày.</p>',
      '<h2>Gợi ý một đĩa ăn</h2>',
      '<ul>',
      '<li>Một phần tư là ngũ cốc nguyên hạt như cơm gạo lứt.</li>',
      '<li>Một nửa là rau củ theo mùa, luộc, hấp hoặc xào ít dầu.</li>',
      '<li>Một phần tư là đạm thực vật: đậu, đậu phụ, các loại hạt.</li>',
      '</ul>',
      '<p>Thay nước ngọt bằng trà gạo lứt rang không đường, ăn chậm và nhai kỹ. Kết hợp vận động đều đặn để hỗ trợ kiểm soát cân nặng.</p>',
      '<p>Bài viết chỉ mang tính chia sẻ kinh nghiệm, không thay thế lời khuyên của bác sĩ hay chuyên gia dinh dưỡng.</p>',
    ].join('\n'),
  },
];
