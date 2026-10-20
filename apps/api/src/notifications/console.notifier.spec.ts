import { ConsoleNotifier } from './console.notifier';
import type { NotificationEvent } from './notifier';

describe('ConsoleNotifier', () => {
  it('logs "[NOTIFY] <json>" with console.log', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const e: NotificationEvent = {
        type: 'ORDER_CREATED',
        code: 'HLABCDEFGH',
        fullName: 'A',
        phone: '0901234567',
        totalVnd: 1000,
        lines: [{ name: 'Gạo', variant: '1kg', quantity: 1 }],
      };
      await new ConsoleNotifier().notify(e);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(`[NOTIFY] ${JSON.stringify(e)}`);
    } finally {
      spy.mockRestore();
    }
  });
});
