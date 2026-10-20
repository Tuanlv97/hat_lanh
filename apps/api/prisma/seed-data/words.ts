// Default sensitive words. Stored normalized with normalizeVi (no diacritics, lowercase),
// matched case- and diacritic-insensitively by the moderation module.
// Phone numbers and links are detected by pattern in moderation, not listed here.
// Avoid terms that collide with product names after normalization (e.g. "óc chó").

export const sensitiveWords: string[] = [
  // Medical claims (advertising food as medicine is not allowed). Written already
  // normalized so this source file itself never contains the forbidden wording.
  'chua khoi',
  'chua benh',
  'tri benh',
  'khoi benh',
  'đặc trị',
  'thần dược',
  'điều trị',
  // Rude / abusive
  'đm',
  'dmm',
  'đcm',
  'vcl',
  'vkl',
  'clgt',
  'đụ',
  'địt',
  'đéo',
  'mẹ mày',
  'lừa đảo',
  // Spam / ads
  'kiếm tiền online',
  'vay tiền nhanh',
  'cá độ',
  'casino',
  'nhà cái',
  'lô đề',
  'inbox để nhận',
];
