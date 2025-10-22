import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import prisma from './prisma';
import { OrderStatus, ItemStatus, Role } from '@prisma/client';

const expo = new Expo();

interface NotificationPayload {
  title: string;
  body: string;
  data?: 
    | { type: 'order_status_change'; orderId: number; status: OrderStatus; internalOrderId?: string }
    | { type: 'item_status_change'; itemId: number; status: ItemStatus; internalItemId?: string; orderId: number }
    | Record<string, unknown>;
}

/**
 * Send push notification to specific users
 */
export async function sendPushNotification(
  userIds: number[],
  payload: NotificationPayload
): Promise<void> {
  try {
    const pushTokens = await prisma.pushToken.findMany({
      where: {
        userId: { in: userIds },
      },
      select: {
        token: true,
        userId: true,
      },
    });

    if (pushTokens.length === 0) {
      console.log('No push tokens found for users:', userIds);
      return;
    }

    // Filter valid Expo push tokens
    const validTokens = pushTokens.filter((pt) =>
      Expo.isExpoPushToken(pt.token)
    );

    if (validTokens.length === 0) {
      console.log('No valid Expo push tokens found');
      return;
    }

    const messages: ExpoPushMessage[] = validTokens.map((pt) => ({
      to: pt.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }));

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    console.log(`Sent ${tickets.length} push notifications`);
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
  }
}

/**
 * Determine which users should receive notifications for an order status change
 */
export async function getUsersToNotifyForOrder(
  orderId: number,
  newStatus: OrderStatus,
): Promise<number[]> {
  // don't send notifications for ARCHIVED status
  if (newStatus === OrderStatus.ARCHIVED) {
    return [];
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
    },
  });

  if (!order) {
    return [];
  }

  const userIds = new Set<number>();

  userIds.add(order.userId);

  const subteamUsers = await prisma.user.findMany({
    where: {
      subteam: order.subteam,
    },
    select: {
      id: true,
      role: true,
    },
  });

  for (const user of subteamUsers) {
    // finance users: notify when OTHER people's orders are PLACED
    // (they get ALL notifications for their own orders via the owner rule above)
    if (user.role === Role.FINANCE && newStatus === OrderStatus.PLACED && user.id !== order.userId) {
      userIds.add(user.id);
    }

    // operations users: notify when order is SHIPPED or DELIVERED
    if (
      user.role === Role.OPERATIONS &&
      (newStatus === OrderStatus.SHIPPED || newStatus === OrderStatus.DELIVERED)
    ) {
      userIds.add(user.id);
    }
  }

  return Array.from(userIds);
}

/**
 * Determine which users should receive notifications for an item status change
 */
export async function getUsersToNotifyForItem(
  itemId: number,
  newStatus: ItemStatus,
): Promise<number[]> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      order: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!item || !item.order) {
    return [];
  }

  const userIds = new Set<number>();

  userIds.add(item.order.userId);

  const subteamUsers = await prisma.user.findMany({
    where: {
      subteam: item.order.subteam,
    },
    select: {
      id: true,
      role: true,
    },
  });

  for (const user of subteamUsers) {
    if (
      user.role === Role.OPERATIONS &&
      (newStatus === ItemStatus.SHIPPED || newStatus === ItemStatus.DELIVERED)
    ) {
      userIds.add(user.id);
    }
  }

  return Array.from(userIds);
}

/**
 * Send notification for order status change
 */
export async function notifyOrderStatusChange(
  orderId: number,
  newStatus: OrderStatus,
): Promise<void> {
  // skip notifications for ARCHIVED status
  if (newStatus === OrderStatus.ARCHIVED) {
    console.log(`Skipping notification for order ${orderId} - status is ARCHIVED`);
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return;
  }

  const userIds = await getUsersToNotifyForOrder(orderId, newStatus);

  if (userIds.length === 0) {
    return;
  }

  const statusMessages: Record<OrderStatus, string> = {
    TO_ORDER: 'is ready to be ordered',
    PLACED: 'has been placed',
    PROCESSED: 'is being processed',
    SHIPPED: 'has been shipped',
    PARTIAL: 'has been partially delivered',
    DELIVERED: 'has been delivered',
    ARCHIVED: 'has been archived',
  };

  await sendPushNotification(userIds, {
    title: 'Order Status Update',
    body: `Order "${order.name}" ${statusMessages[newStatus]}`,
    data: {
      type: 'order_status_change',
      orderId: order.id,
      status: newStatus,
      internalOrderId: order.internalOrderId,
    },
  });
}

/**
 * Send notification for item status change
 */
export async function notifyItemStatusChange(
  itemId: number,
  newStatus: ItemStatus,
): Promise<void> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      order: true,
    },
  });

  if (!item) {
    return;
  }

  const userIds = await getUsersToNotifyForItem(itemId, newStatus);

  if (userIds.length === 0) {
    return;
  }

  const statusMessages: Record<ItemStatus, string> = {
    TO_ORDER: 'is ready to be ordered',
    PLACED: 'has been placed',
    PROCESSED: 'is being processed',
    SHIPPED: 'has been shipped',
    DELIVERED: 'has been delivered',
    PICKED_UP: 'has been picked up',
  };

  await sendPushNotification(userIds, {
    title: 'Item Status Update',
    body: `Item "${item.name}" ${statusMessages[newStatus]}`,
    data: {
      type: 'item_status_change',
      itemId: item.id,
      status: newStatus,
      internalItemId: item.internalItemId,
      orderId: item.orderId,
    },
  });
}

/**
 * Send notification for new order created
 */
export async function notifyNewOrder(orderId: number): Promise<void> {
  await notifyOrderStatusChange(orderId, OrderStatus.PLACED);
}
