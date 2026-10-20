export function normalizePhone(input: string): string | null {
  let s = input.replace(/[\s.\-]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length === 11) s = '0' + s.slice(2);
  return /^0[35789]\d{8}$/.test(s) ? s : null;
}

export function isValidVnMobile(input: string): boolean {
  return normalizePhone(input) !== null;
}
