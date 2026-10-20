import { normalizeVi } from '@hatlanh/shared';

export function slugify(text: string): string {
  return normalizeVi(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Returns `base`, or `base-2`, `base-3`... — the first one for which `isTaken` is false. */
export async function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  let candidate = base;
  for (let n = 2; await isTaken(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}
