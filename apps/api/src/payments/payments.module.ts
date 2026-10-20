import { Module } from '@nestjs/common';

/**
 * Online payment seam — intentionally empty.
 *
 * TODO(VietQR): online payment via VietQR. Notes required by the shop owner:
 *  1. Needs a VietQR / bank account link. The shop does not have one yet — that is the reason this is not built.
 *  2. Needs a payment reconciliation mechanism (a bank/payment-provider webhook, or periodically checking
 *     transactions) to know that the customer has actually paid, matching the transfer to the order code.
 *  3. When a payment is received, the order status must be updated accordingly (e.g. mark it paid/confirmed
 *     through the same race-safe status transition used by the admin).
 *  4. The current flow (the shop owner messages the customer to confirm the order and the payment method)
 *     must keep working alongside online payment.
 */
@Module({})
export class PaymentsModule {}
