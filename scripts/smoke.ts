// End-to-end smoke test against a running API (npm run dev, or npm run dev -w @hatlanh/api).
// Flow: seed -> dev-login customer -> order -> admin completes -> customer return -> admin approves
// (restock) -> stock and revenue report are checked against expected values.
// Run: npm run smoke            (add --no-seed to skip re-seeding)
// Needs OAUTH_MODE=dev in .env for /auth/dev-login. Leaves one test order and return in the database.
import { execSync } from 'node:child_process';

const API = (process.env.API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const ADMIN_EMAIL = 'admin@hatlanh.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

let step = 0;
function ok(msg: string) {
  console.log(`  ✓ ${++step}. ${msg}`);
}
function fail(msg: string): never {
  console.error(`  ✗ ${step + 1}. ${msg}`);
  process.exit(1);
}
function expectEq<T>(actual: T, expected: T, what: string) {
  if (actual !== expected) fail(`${what}: expected ${String(expected)}, got ${String(actual)}`);
}

async function call<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) fail(`${init.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : undefined) as T;
}

type Variant = { id: string; label: string; priceVnd: number; stock: number; isActive: boolean };
type Product = { id: string; name: string; isActive: boolean; variants: Variant[] };
type Order = { id: string; code: string; status: string; items: { id: string; productId: string; variantId: string; unitPriceVnd: number; quantity: number }[] };
type Return = { id: string; status: string; items: { id: string }[] };

const shopDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

async function main() {
  console.log(`Smoke test against ${API}`);

  if (!process.argv.includes('--no-seed')) {
    execSync('npm run db:seed', { stdio: 'ignore' });
    ok('seeded sample data (npm run db:seed)');
  }

  const health = await call<{ status: string }>('/health');
  expectEq(health.status, 'ok', 'health');
  ok('API is up');

  const stamp = Date.now().toString().slice(-6);
  const customer = await call<{ token: string; user: { id: string } }>('/auth/dev-login', {
    method: 'POST',
    body: { provider: 'google', email: `smoke.${stamp}@example.com`, name: `Smoke ${stamp}` },
  });
  ok('customer signed in with dev-login (Google)');

  const admin = await call<{ token: string; user: { role: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expectEq(admin.user.role, 'ADMIN', 'admin role');
  ok('admin signed in');
  const A = admin.token;

  const products = await call<Product[]>('/admin/products', { token: A });
  const product = products.find((p) => p.isActive && p.variants.some((v) => v.isActive && v.stock >= 2));
  if (!product) fail('no active product with stock >= 2 (did the seed run?)');
  const variant = product.variants.find((v) => v.isActive && v.stock >= 2)!;
  const stockOf = async () => (await call<Product[]>('/admin/products', { token: A })).flatMap((p) => p.variants).find((v) => v.id === variant.id)!.stock;
  const stock0 = await stockOf();

  const today = shopDay(new Date());
  const range = `from=${today}&to=${today}`;
  const revenueTotal = async () =>
    (await call<{ revenueVnd: number }[]>(`/admin/reports/revenue?${range}&group=day`, { token: A })).reduce((s, p) => s + p.revenueVnd, 0);
  const soldOf = async () =>
    (await call<{ productId: string; quantity: number }[]>(`/admin/reports/best-sellers?${range}`, { token: A })).find((r) => r.productId === product.id)?.quantity ?? 0;
  const revenue0 = await revenueTotal();
  const sold0 = await soldOf();

  const placed = await call<{ code: string; totalVnd: number }>('/orders', {
    method: 'POST',
    token: customer.token,
    body: {
      fullName: `Smoke ${stamp}`,
      phone: '0912345678',
      email: `smoke.${stamp}@example.com`,
      provinceCode: '01',
      wardCode: '00004',
      addressDetail: 'Số 1 đường Kiểm Thử',
      items: [{ variantId: variant.id, quantity: 2 }],
    },
  });
  expectEq(placed.totalVnd, variant.priceVnd * 2, 'order total');
  expectEq(await stockOf(), stock0 - 2, 'stock after order');
  ok(`customer placed order ${placed.code}: 2 × ${product.name} ${variant.label} (stock ${stock0} -> ${stock0 - 2})`);

  const mine = await call<Order[]>('/me/orders', { token: customer.token });
  if (!mine.some((o) => o.code === placed.code)) fail('order missing from /me/orders');
  ok('order appears in the customer account');

  const order = (await call<Order[]>('/admin/orders', { token: A })).find((o) => o.code === placed.code);
  if (!order) fail('order missing from /admin/orders');
  for (const status of ['CONFIRMED', 'SHIPPING', 'COMPLETED']) {
    const updated = await call<Order>(`/admin/orders/${order.id}/status`, { method: 'PATCH', token: A, body: { status } });
    expectEq(updated.status, status, 'order status');
  }
  ok('admin moved the order PENDING -> CONFIRMED -> SHIPPING -> COMPLETED');

  const ret = await call<Return>(`/me/orders/${placed.code}/returns`, {
    method: 'POST',
    token: customer.token,
    body: { items: [{ orderItemId: order.items[0].id, quantity: 1, reason: 'DAMAGED' }], note: 'Smoke test' },
  });
  expectEq(ret.status, 'REQUESTED', 'return status');
  ok('customer requested a return of 1 item');

  const decided = await call<Return>(`/admin/returns/${ret.id}/decision`, {
    method: 'PATCH',
    token: A,
    body: { decision: 'APPROVED', restockItemIds: ret.items.map((i) => i.id) },
  });
  expectEq(decided.status, 'APPROVED', 'return decision');
  expectEq(await stockOf(), stock0 - 1, 'stock after restock');
  ok(`admin approved the return with restock (stock ${stock0 - 2} -> ${stock0 - 1})`);

  const expectedRevenue = variant.priceVnd * (2 - 1);
  expectEq((await revenueTotal()) - revenue0, expectedRevenue, "today's revenue increase");
  expectEq((await soldOf()) - sold0, 2, 'best-sellers increase');
  ok(`reports: today's revenue +${expectedRevenue.toLocaleString('vi-VN')}đ (2 sold - 1 returned), best-sellers +2`);

  console.log('\nSMOKE TEST PASSED');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
