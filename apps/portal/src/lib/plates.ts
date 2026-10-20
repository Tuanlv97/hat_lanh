/**
 * Public-domain botanical plates (Wikimedia Commons) of the plants behind the shop's goods.
 * They illustrate the plant, never a specific product or where it was grown.
 */
export type Plate = {
  key: string;
  src: string;
  width: number;
  height: number;
  /** Alt text and caption: what the picture shows. */
  alt: string;
  caption: string;
  credit: { title: string; author: string; url: string };
};

export const PLATES: Plate[] = [
  {
    key: 'lua',
    src: '/thuc-vat/lua-oryza-sativa.jpg',
    width: 1417,
    height: 2060,
    alt: 'Tranh thực vật cây lúa (Oryza sativa): ba khóm lúa trổ bông, có rễ',
    caption: 'Cây lúa · Oryza sativa',
    credit: {
      title: 'Oryza sativa Blanco1.102',
      author: 'Francisco Manuel Blanco, Flora de Filipinas (1880–1883)',
      url: 'https://commons.wikimedia.org/wiki/File:Oryza_sativa_Blanco1.102.jpg',
    },
  },
  {
    key: 'tra',
    src: '/thuc-vat/tra-camellia-sinensis.jpg',
    width: 1424,
    height: 1725,
    alt: 'Tranh thực vật cành chè (Camellia sinensis) với hoa trắng và quả',
    caption: 'Cây chè · Camellia sinensis',
    credit: {
      title: 'Camellia sinensis – Köhler’s Medizinal-Pflanzen 025',
      author: 'Franz Eugen Köhler (1897)',
      url: 'https://commons.wikimedia.org/wiki/File:Camellia_sinensis_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-025.jpg',
    },
  },
  {
    key: 'me',
    src: '/thuc-vat/me-sesamum-indicum.jpg',
    width: 1416,
    height: 2086,
    alt: 'Tranh thực vật cây mè (Sesamum indicum) với lá thuôn và hoa trắng',
    caption: 'Cây mè · Sesamum indicum',
    credit: {
      title: 'Sesamum indicum Blanco2.273',
      author: 'Francisco Manuel Blanco, Flora de Filipinas (1880–1883)',
      url: 'https://commons.wikimedia.org/wiki/File:Sesamum_indicum_Blanco2.273.jpg',
    },
  },
  {
    key: 'oc-cho',
    src: '/thuc-vat/oc-cho-juglans-regia.jpg',
    width: 1920,
    height: 2007,
    alt: 'Tranh thực vật cành óc chó (Juglans regia) với quả xanh và hạt bổ đôi',
    caption: 'Cây óc chó · Juglans regia',
    credit: {
      title: 'Köhler Walnuss 1887',
      author: 'Franz Eugen Köhler (1887)',
      url: 'https://commons.wikimedia.org/wiki/File:K%C3%B6hler_Walnuss_1887.jpg',
    },
  },
  {
    key: 'mo',
    src: '/thuc-vat/mo-prunus-mume.png',
    width: 1701,
    height: 2292,
    alt: 'Tranh thực vật cành mơ (Prunus mume) với hoa trắng, hoa hồng và quả vàng',
    caption: 'Cây mơ · Prunus mume',
    credit: {
      title: 'Prunus mume SZ11',
      author: 'Philipp Franz von Siebold & Joseph Gerhard Zuccarini, Flora Japonica (1870)',
      url: 'https://commons.wikimedia.org/wiki/File:Prunus_mume_SZ11.png',
    },
  },
];

/** Which plate stands for each seeded category (unknown categories fall back to rice). */
const BY_CATEGORY: Record<string, string> = {
  'gao-lut': 'lua',
  tra: 'tra',
  'gia-vi-cham': 'me',
  'hat-ngu-coc': 'oc-cho',
};

export function plateForCategory(slug: string): Plate {
  const key = BY_CATEGORY[slug] ?? 'lua';
  return PLATES.find((p) => p.key === key) ?? PLATES[0];
}
