import { PrismaClient, OrderStatus, ItemStatus } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
  prismaMiddlewareAdded?: boolean;
};

const prisma = globalForPrisma.prisma || new PrismaClient();

// Add middleware for automatic notifications (only once)
if (!globalForPrisma.prismaMiddlewareAdded) {
  // Middleware to track order status changes
  prisma.$use(async (params, next) => {
    // Only handle Order updates
    if (params.model === 'Order' && params.action === 'update') {
      // Get the current order state before update
      const orderId = params.args.where.id;
      if (orderId) {
        const oldOrder = await prisma.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });

        // Perform the update
        const result = await next(params);

        // Get the new status if it changed
        if (params.args.data.status && oldOrder) {
          const newStatus = params.args.data.status as OrderStatus;
          if (newStatus !== oldOrder.status) {
            // Dynamically import to avoid circular dependencies
            const { notifyOrderStatusChange } = await import('./notifications');
            // Fire and forget notification (don't await)
            notifyOrderStatusChange(orderId, newStatus).catch(
              (err) => console.error('Notification error:', err)
            );
          }
        }

        return result;
      }
    }

    // Only handle Item updates
    if (params.model === 'Item' && params.action === 'update') {
      const itemId = params.args.where.id;
      if (itemId) {
        const oldItem = await prisma.item.findUnique({
          where: { id: itemId },
          select: { status: true },
        });

        const result = await next(params);

        if (params.args.data.status && oldItem) {
          const newStatus = params.args.data.status as ItemStatus;
          if (newStatus !== oldItem.status) {
            const { notifyItemStatusChange } = await import('./notifications');
            notifyItemStatusChange(itemId, newStatus).catch(
              (err) => console.error('Notification error:', err)
            );
          }
        }

        return result;
      }
    }

    return next(params);
  });

  globalForPrisma.prismaMiddlewareAdded = true;
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;