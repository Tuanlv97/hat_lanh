// Verifies /admin/reports against (1) an independent recomputation from raw admin data and
// (2) exact deltas caused by a known fixture. Usage: node verify-reports.mjs
const API = process.env.API_URL ?? 'http://localhost:3000';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`);
  if (!ok) failures++;
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return data;
}

const { token } = await call('/auth/login', { method: 'POST', body: { identifier: 'admin@hatlanh.local', password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!' } });
const A = (p, o = {}) => call(p, { ...o, token });

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
const day = (iso) => fmt.format(new Date(iso));
const today = day(new Date().toISOString());
const from = day(new Date(Date.now() - 30 * 86400000).toISOString());
const range = `from=${from}&to=${today}`;
const inRange = (iso) => day(iso) >= from && day(iso) <= today;

function bucket(d, group) {
  if (group === 'day') return d;
  const [y, m, dd] = d.split('-').map(Number);
  if (group === 'month') return `${y}-${String(m).padStart(2, '0')}-01`;
  const dt = new Date(Date.UTC(y, m - 1, dd));
  const back = (dt.getUTCDay() + 6) % 7; // Monday start, like Postgres date_trunc('week')
  dt.setUTCDate(dt.getUTCDate() - back);
  return dt.toISOString().slice(0, 10);
}

/** Independent recomputation from raw admin data. */
async function expected() {
  const orders = await A('/admin/orders');
  const returns = await A('/admin/returns');
  const approvedQty = new Map(); // orderItemId -> approved returned qty (any date, as revenue does)
  for (const r of returns) if (r.status === 'APPROVED') for (const it of r.items) approvedQty.set(it.orderItem.id, (approvedQty.get(it.orderItem.id) ?? 0) + it.quantity);

  const best = new Map();
  const sold = new Map();
  for (const o of orders) {
    if (o.status === 'CANCELLED' || !inRange(o.createdAt)) continue;
    for (const it of o.items) {
      best.set(it.productId, { name: it.productName, quantity: (best.get(it.productId)?.quantity ?? 0) + it.quantity });
      sold.set(it.productId, (sold.get(it.productId) ?? 0) + it.quantity);
    }
  }
  const productOf = new Map();
  for (const o of orders) for (const it of o.items) productOf.set(it.id, { id: it.productId, name: it.productName });

  const ret = new Map();
  for (const r of returns) {
    if (r.status !== 'APPROVED' || !inRange(r.createdAt)) continue;
    for (const it of r.items) {
      const p = productOf.get(it.orderItem.id);
      const e = ret.get(p.id) ?? { name: p.name, total: 0, reasons: { DAMAGED: 0, WRONG_ITEM: 0, CHANGED_MIND: 0, OTHER: 0 } };
      e.total += it.quantity;
      e.reasons[it.reason] += it.quantity;
      ret.set(p.id, e);
    }
  }

  const revenue = { day: new Map(), week: new Map(), month: new Map() };
  for (const o of orders) {
    if (o.status !== 'COMPLETED' || !o.completedAt || !inRange(o.completedAt)) continue;
    const net = o.items.reduce((s, it) => s + it.unitPriceVnd * (it.quantity - (approvedQty.get(it.id) ?? 0)), 0);
    for (const g of ['day', 'week', 'month']) {
      const k = bucket(day(o.completedAt), g);
      revenue[g].set(k, (revenue[g].get(k) ?? 0) + net);
    }
  }
  return { best, sold, ret, revenue };
}

async function actual() {
  return {
    best: await A(`/admin/reports/best-sellers?${range}`),
    returns: await A(`/admin/reports/returns?${range}`),
    revenue: {
      day: await A(`/admin/reports/revenue?${range}&group=day`),
      week: await A(`/admin/reports/revenue?${range}&group=week`),
      month: await A(`/admin/reports/revenue?${range}&group=month`),
    },
  };
}

function compare(label, exp, act) {
  const bestExp = [...exp.best].map(([productId, v]) => ({ productId, name: v.name, quantity: v.quantity })).sort((a, b) => a.productId.localeCompare(b.productId));
  const bestAct = [...act.best].sort((a, b) => a.productId.localeCompare(b.productId));
  check(`${label}: best-sellers match raw orders`, eq(bestExp, bestAct), JSON.stringify({ bestExp, bestAct }));

  const retExp = [...exp.ret].map(([productId, v]) => ({ productId, returnedQuantity: v.total, soldQuantity: exp.sold.get(productId) ?? 0, rate: Math.round((v.total / (exp.sold.get(productId) ?? 1)) * 10000) / 10000, reasons: v.reasons })).sort((a, b) => a.productId.localeCompare(b.productId));
  const retAct = act.returns.map(({ productId, returnedQuantity, soldQuantity, rate, reasons }) => ({ productId, returnedQuantity, soldQuantity, rate, reasons })).sort((a, b) => a.productId.localeCompare(b.productId));
  check(`${label}: returns match raw approved returns (qty, sold, rate, reasons)`, eq(retExp, retAct), JSON.stringify({ retExp, retAct }));

  for (const g of ['day', 'week', 'month']) {
    const rExp = [...exp.revenue[g]].sort(([a], [b]) => a.localeCompare(b)).map(([period, revenueVnd]) => ({ period, revenueVnd }));
    check(`${label}: revenue by ${g} matches raw completed orders`, eq(rExp, act.revenue[g]), JSON.stringify({ rExp, act: act.revenue[g] }));
  }
  const total = (g) => act.revenue[g].reduce((s, p) => s + p.revenueVnd, 0);
  check(`${label}: revenue totals agree across day/week/month`, total('day') === total('week') && total('week') === total('month'));
}

// ---- 1. whole-dataset consistency ----
const before = { exp: await expected(), act: await actual() };
compare('baseline', before.exp, before.act);

// ---- 2. known fixture: exact deltas ----
const products = await A('/admin/products');
const [p1, p2] = [products[1], products[2]];
const v1 = p1.variants[0];
const v2 = p2.variants[0];
const stamp = String(Date.now()).slice(-6);
const addr = { provinceCode: '01', wardCode: '00004', addressDetail: '1 Kiem thu bao cao', email: `report${stamp}@example.com`, phone: '0912345678' };
const place = (variantId, quantity, name) => call('/orders', { method: 'POST', body: { fullName: name, ...addr, items: [{ variantId, quantity }] } });
const find = async (name) => (await A('/admin/orders')).find((o) => o.fullName === name);
const status = (id, s) => A(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status: s } });

const nA = `Bao cao A ${stamp}`; // 3 x v1, completed, 1 returned (DAMAGED, approved)
const nB = `Bao cao B ${stamp}`; // 2 x v2, cancelled (excluded)
const nC = `Bao cao C ${stamp}`; // 1 x v2, confirmed only (counts as sold, no revenue)
await place(v1.id, 3, nA);
await place(v2.id, 2, nB);
await place(v2.id, 1, nC);
const oA = await find(nA), oB = await find(nB), oC = await find(nC);
for (const s of ['CONFIRMED', 'SHIPPING', 'COMPLETED']) await status(oA.id, s);
await status(oB.id, 'CANCELLED');
await status(oC.id, 'CONFIRMED');
const itemA = oA.items[0];
await A('/admin/returns', { method: 'POST', body: { orderCode: oA.code, items: [{ orderItemId: itemA.id, quantity: 1, reason: 'DAMAGED', restock: true }] } });

const after = await actual();
const delta = (rows, id, key) => (rows.find((r) => r.productId === id)?.[key] ?? 0);
check('fixture: best-sellers +3 for product 1', delta(after.best, p1.id, 'quantity') - delta(before.act.best, p1.id, 'quantity') === 3);
check('fixture: best-sellers +1 for product 2 (cancelled order excluded, confirmed counted)', delta(after.best, p2.id, 'quantity') - delta(before.act.best, p2.id, 'quantity') === 1);
check('fixture: returns +1 returned, +3 sold for product 1', delta(after.returns, p1.id, 'returnedQuantity') - delta(before.act.returns, p1.id, 'returnedQuantity') === 1 && delta(after.returns, p1.id, 'soldQuantity') - delta(before.act.returns, p1.id, 'soldQuantity') === 3);
const dmg = (rows) => rows.find((r) => r.productId === p1.id)?.reasons.DAMAGED ?? 0;
check('fixture: DAMAGED reason +1', dmg(after.returns) - dmg(before.act.returns) === 1);
check('fixture: product 2 has no returns', !after.returns.some((r) => r.productId === p2.id && r.returnedQuantity > (before.act.returns.find((x) => x.productId === p2.id)?.returnedQuantity ?? 0)));
const sum = (rows) => rows.reduce((s, p) => s + p.revenueVnd, 0);
check(`fixture: revenue +${2 * v1.priceVnd} (3 sold - 1 returned at ${v1.priceVnd}; cancelled and unfinished orders excluded)`, sum(after.revenue.day) - sum(before.act.revenue.day) === 2 * v1.priceVnd, `${sum(after.revenue.day) - sum(before.act.revenue.day)}`);

// ---- 3. consistency again after the fixture ----
compare('after fixture', await expected(), after);

// ---- 4. input validation ----
const bad = async (q) => { try { await A(`/admin/reports/revenue?${q}`); return false; } catch (e) { return /400/.test(e.message); } };
check('validation: reversed range rejected (400)', await bad('from=2026-10-20&to=2026-10-01'));
check('validation: range over 366 days rejected (400)', await bad('from=2024-01-01&to=2026-10-20'));
check('validation: bad group rejected (400)', await bad(`${range}&group=year`));
check('validation: impossible date rejected (400)', await bad('from=2026-02-31&to=2026-03-05'));
try { await call('/admin/reports/revenue?' + range); check('auth: reports require a token', false); } catch (e) { check('auth: reports require a token (401)', /401/.test(e.message)); }

console.log(failures === 0 ? '\nALL REPORT CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
