import { Injectable } from '@nestjs/common';
import { normalizeVi } from '@hatlanh/shared';
import { PrismaService } from '../prisma/prisma.service';

export type ModerationResult = 'VISIBLE' | 'PENDING';

/**
 * Vietnamese phone number, not glued to other digits (so "100000000" or "2024" never match):
 * 0/84/+84, then 2-3 + 3 + 3-4 digits with optional space, dot or dash separators.
 */
const PHONE = /(?<!\d)(\+?84|0)[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}(?!\d)/;

/** Explicit scheme / www / a path after a domain ("a.vn/abc"). */
const URL_EXPLICIT = /https?:\/\/|www\.|\.[a-z]{2,}\//i;

/**
 * Bare domains ("abc.com", "x.vn"): only well-known TLDs, and the TLD must not continue into letters/digits,
 * so ordinary sentences with a missing space ("Ngon quá.Rất tốt" -> "qua.rat") do not trigger.
 */
const BARE_DOMAIN =
  /(?<![a-z0-9])[a-z0-9][a-z0-9-]*\.(?:com|vn|net|org|info|biz|xyz|shop|store|online|site|link|top|club|app|edu|gov)(?![a-z0-9])/;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  /** PENDING when the text hits a sensitive word (whole word/phrase), a phone number or a link. Words are read from the DB on every call. */
  async check(text: string): Promise<ModerationResult> {
    const normalized = normalizeVi(text);
    if (PHONE.test(normalized) || URL_EXPLICIT.test(normalized) || BARE_DOMAIN.test(normalized)) return 'PENDING';
    const words = await this.prisma.sensitiveWord.findMany({ select: { term: true } });
    for (const { term } of words) {
      const t = term.trim();
      if (!t) continue;
      if (new RegExp(`(?<![a-z0-9])${escapeRegExp(t)}(?![a-z0-9])`).test(normalized)) return 'PENDING';
    }
    return 'VISIBLE';
  }
}
