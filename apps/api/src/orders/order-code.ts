import { randomInt } from 'node:crypto';

/** No I, O, 0, 1: easy to read out over the phone. 32 symbols -> 32^8 ≈ 1.1e12 codes. */
export const ORDER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** `HL` + 8 random chars (CSPRNG), e.g. `HL7K2MXQ9P`. Random, not sequential, so codes cannot be guessed. */
export function generateOrderCode(): string {
  let code = 'HL';
  for (let i = 0; i < 8; i++) code += ORDER_CODE_ALPHABET[randomInt(ORDER_CODE_ALPHABET.length)];
  return code;
}
