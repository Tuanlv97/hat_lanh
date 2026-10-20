/** Events the shop owner is told about (spec §8.1). */
export type NotificationEvent =
  | {
      type: 'ORDER_CREATED';
      code: string;
      fullName: string;
      phone: string;
      totalVnd: number;
      lines: { name: string; variant: string; quantity: number }[];
    }
  | { type: 'RETURN_REQUESTED'; orderCode: string; returnId: string; fullName: string; itemCount: number };

/** Sends a notification to the shop owner. Implementations may fail; callers must not let that break business flows. */
export interface Notifier {
  notify(e: NotificationEvent): Promise<void>;
}

/** Injection token: `@Inject(NOTIFIER) private readonly notifier: Notifier`. */
export const NOTIFIER = Symbol('NOTIFIER');
