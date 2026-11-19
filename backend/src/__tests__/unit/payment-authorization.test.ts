import { getPaymentsByOrderId } from '../../services/payment.service';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    payment: {
      findMany: jest.fn(),
    },
  },
}));

const findMany = prisma.payment.findMany as jest.Mock;

describe('getPaymentsByOrderId authorization scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([]);
  });

  it('limits a customer query to payments whose order belongs to that customer', async () => {
    await getPaymentsByOrderId('order-123', 'customer-1', false);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        orderId: 'order-123',
        order: { is: { userId: 'customer-1' } },
      },
      orderBy: { attemptNumber: 'asc' },
    });
  });

  it('does not apply an owner filter for an admin', async () => {
    await getPaymentsByOrderId('order-123', 'admin-1', true);

    expect(findMany).toHaveBeenCalledWith({
      where: { orderId: 'order-123' },
      orderBy: { attemptNumber: 'asc' },
    });
  });

  it('defaults to customer-scoped access when the admin flag is omitted', async () => {
    await getPaymentsByOrderId('order-123', 'customer-2');

    expect(findMany).toHaveBeenCalledWith({
      where: {
        orderId: 'order-123',
        order: { is: { userId: 'customer-2' } },
      },
      orderBy: { attemptNumber: 'asc' },
    });
  });
});
