import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { ItemStatus, OrderStatus } from '@prisma/client';

// Define the progression of statuses with corresponding indices
const orderStatusIndices: { [key in OrderStatus]: number } = {
  TO_ORDER: 0,
  PLACED: 1,
  PROCESSED: 2,
  SHIPPED: 3,
  PARTIAL: 4,
  DELIVERED: 5,
  ARCHIVED: 6,
};

const itemStatusIndices: { [key in ItemStatus]: number } = {
  TO_ORDER: 0,
  PLACED: 1,
  PROCESSED: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  PICKED_UP: 5,
};

// Map order statuses to item statuses
function mapOrderStatusToItemStatus(orderStatus: OrderStatus): ItemStatus | null {
  if (orderStatus === OrderStatus.PARTIAL) {
    // Do not update items if order status is PARTIAL
    return null;
  } else if (orderStatus === OrderStatus.ARCHIVED) {
    // Map ARCHIVED to PICKED_UP for items
    return ItemStatus.PICKED_UP;
  } else if (orderStatus in ItemStatus) {
    return orderStatus as ItemStatus;
  } else {
    // If the order status doesn't directly map to an item status, return null
    return null;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  const { status: statusString, totalCost, costVerified, carrier, trackingId, meenOrderId } = await request.json();
  const newOrderStatus = statusString as OrderStatus;

  try {
    // Fetch the current order status before updating
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentOrderStatus = currentOrder.status;
    const currentOrderStatusIndex = orderStatusIndices[currentOrderStatus];
    const newOrderStatusIndex = orderStatusIndices[newOrderStatus];

    // Update the order status, total cost, and cost verification if provided
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newOrderStatus,
        totalCost: totalCost !== undefined ? totalCost : undefined,
        costVerified: costVerified !== undefined ? costVerified : undefined,
        carrier: carrier !== undefined ? carrier : undefined,
        trackingId: trackingId !== undefined ? trackingId : undefined,
        meenOrderId: meenOrderId !== undefined ? meenOrderId : undefined,
      },
    });

    // Map the new order status to an item status, if applicable
    const mappedItemStatus = mapOrderStatusToItemStatus(newOrderStatus);

    // Proceed only if the new order status is not PARTIAL and a mapped item status exists
    if (newOrderStatus !== OrderStatus.PARTIAL && mappedItemStatus) {
      if (newOrderStatusIndex < currentOrderStatusIndex) {
        // Reverse update: Update all items to match the new order status if moving backward
        await prisma.item.updateMany({
          where: { orderId },
          data: { status: mappedItemStatus },
        });
      } else {
        // Forward update: Only update items that are less advanced than the new order status
        const statusesToUpdate = (Object.keys(itemStatusIndices) as ItemStatus[])
          .filter(
            (itemStatus) =>
              itemStatusIndices[itemStatus] < newOrderStatusIndex &&
              itemStatus !== ItemStatus.PICKED_UP // Exclude the highest item status
          );

        await prisma.item.updateMany({
          where: {
            orderId,
            status: { in: statusesToUpdate },
          },
          data: { status: mappedItemStatus },
        });
      }
    }

    // Fetch the updated order with related data to return
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: true },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
