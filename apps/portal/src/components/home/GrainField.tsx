/**
 * A handful of brown rice drawn in code: red, black and white grains scattered on a leaf-green field.
 * Positions come from a fixed seed, so the server and the browser draw the same picture.
 */
const COLOURS = ['#9c5b45', '#3d3238', '#f1e4c3', '#e8c27a'];

function grains(count: number) {
  // mulberry32: small, well-mixed, deterministic.
  let s = 20261019;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, (_, i) => {
    // Denser towards the middle, like grains poured from a cup.
    const angle = rnd() * Math.PI * 2;
    const radius = Math.sqrt(rnd()) * 178;
    return {
      cx: 240 + Math.cos(angle) * radius,
      cy: 300 + Math.sin(angle) * radius * 1.12,
      rot: Math.round(rnd() * 180),
      scale: 0.85 + rnd() * 0.3,
      fill: COLOURS[i % COLOURS.length],
    };
  });
}

const GRAINS = grains(86);

export function GrainField() {
  return (
    <figure className="overflow-hidden rounded-[var(--radius-softer)] bg-green-500">
      <svg viewBox="0 0 480 600" role="img" aria-labelledby="grain-field-title" className="block h-auto w-full">
        <title id="grain-field-title">Hình vẽ một nắm gạo lứt đỏ, đen và trắng rải trên nền xanh lá</title>
        {GRAINS.map((g, i) => (
          <g key={i} transform={`translate(${g.cx.toFixed(1)} ${g.cy.toFixed(1)}) rotate(${g.rot}) scale(${g.scale.toFixed(2)})`}>
            <ellipse rx="7.5" ry="17" fill={g.fill} />
            <path d="M-2.2 -11 C -0.6 -3 -0.6 4 -2 11" stroke="#2e3b33" strokeOpacity=".22" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>
        ))}
      </svg>
      <figcaption className="bg-green-100 px-5 py-3.5 text-base font-medium">Gạo lứt đỏ, đen và trắng</figcaption>
    </figure>
  );
}
