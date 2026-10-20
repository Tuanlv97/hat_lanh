/**
 * Fetches Vietnam's administrative units in the 2-level structure in force since 01/07/2025
 * (province/city -> ward/commune; districts abolished) from the public Provinces Open API v2,
 * and writes apps/api/src/address/data/vn-address.json plus SOURCE.md.
 *
 * Usage (from repo root): npx tsx scripts/fetch-address.ts
 *
 * Codes are written as strings zero-padded to the official GSO width
 * (province: 2 digits, ward: 5 digits), e.g. Hà Nội "01", Phường Ba Đình "00004".
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SOURCE_URL = 'https://provinces.open-api.vn/api/v2/?depth=2';
const OUT_DIR = path.resolve(__dirname, '../apps/api/src/address/data');

type ApiWard = { code: number; name: string };
type ApiProvince = { code: number; name: string; wards: ApiWard[] };

export type AddressData = {
  provinces: { code: string; name: string; wards: { code: string; name: string }[] }[];
};

async function main(): Promise<void> {
  const res = await fetch(SOURCE_URL, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${SOURCE_URL} -> HTTP ${res.status}`);
  const raw = (await res.json()) as ApiProvince[];
  if (!Array.isArray(raw)) throw new Error('Unexpected response shape: expected an array');

  const data: AddressData = {
    provinces: raw.map((p) => {
      if (typeof p.code !== 'number' || !p.name || !Array.isArray(p.wards)) {
        throw new Error(`Unexpected province entry: ${JSON.stringify(p).slice(0, 200)}`);
      }
      return {
        code: String(p.code).padStart(2, '0'),
        name: p.name.trim(),
        wards: p.wards.map((w) => ({ code: String(w.code).padStart(5, '0'), name: w.name.trim() })),
      };
    }),
  };

  const provinceCount = data.provinces.length;
  const wardCount = data.provinces.reduce((n, p) => n + p.wards.length, 0);
  // Sanity checks for the post-01/07/2025 structure (34 provinces/cities, 3,000+ wards/communes).
  if (provinceCount < 30 || provinceCount > 40) throw new Error(`Suspicious province count: ${provinceCount}`);
  if (wardCount < 3000) throw new Error(`Suspicious ward count: ${wardCount}`);
  const wardCodes = new Set(data.provinces.flatMap((p) => p.wards.map((w) => w.code)));
  if (wardCodes.size !== wardCount) throw new Error('Duplicate ward codes in dataset');

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, 'vn-address.json'), JSON.stringify(data, null, 2) + '\n', 'utf8');

  const fetchedOn = new Date().toISOString().slice(0, 10);
  const source = `# Nguồn dữ liệu địa giới hành chính

- Dữ liệu: danh sách Tỉnh/Thành phố và Phường/Xã theo cơ cấu 2 cấp áp dụng từ 01/07/2025.
- Nguồn: Provinces Open API v2 (công khai) — ${SOURCE_URL}
- Ngày lấy dữ liệu: ${fetchedOn}
- Số lượng: ${provinceCount} tỉnh/thành phố, ${wardCount} phường/xã/đặc khu.
- Mã (code) được chuyển thành chuỗi, thêm số 0 ở đầu theo độ dài mã của Tổng cục Thống kê
  (tỉnh 2 chữ số, phường/xã 5 chữ số).

Cập nhật lại: từ thư mục gốc dự án chạy \`npx tsx scripts/fetch-address.ts\`.
Chủ shop có thể sửa trực tiếp \`vn-address.json\` nếu có thay đổi địa giới.
`;
  writeFileSync(path.join(OUT_DIR, 'SOURCE.md'), source, 'utf8');

  console.log(`Wrote ${provinceCount} provinces, ${wardCount} wards to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
