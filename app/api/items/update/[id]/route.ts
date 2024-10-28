import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { OrderStatus, ItemStatus } from '@prisma/client';

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

function mapItemStatusToOrderStatus(itemStatus: ItemStatus): OrderStatus | null {
    switch (itemStatus) {
        case ItemStatus.TO_ORDER:
            return OrderStatus.TO_ORDER;
        case ItemStatus.PLACED:
            return OrderStatus.PLACED;
        case ItemStatus.PROCESSED:
            return OrderStatus.PROCESSED;
        case ItemStatus.SHIPPED:
            return OrderStatus.SHIPPED;
        case ItemStatus.DELIVERED:
            return OrderStatus.DELIVERED;
        case ItemStatus.PICKED_UP:
            return OrderStatus.ARCHIVED;
        default:
            return null;
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const itemId = Number(params.id);
    const { status: statusString } = await request.json();
    const status = statusString as ItemStatus;

    try {
        // Step 1: Update the item
        const updatedItem = await prisma.item.update({
            where: { id: itemId },
            data: { status },
        });

        const orderId = updatedItem.orderId;

        // Step 2: Fetch the order with its items
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Step 3: Check if all items have the same status as the updated item
        const allItemsSameStatus = order.items.every((item) => item.status === status);

        if (allItemsSameStatus) {
            // Step 4: Map the item status to the corresponding order status
            const mappedOrderStatus = mapItemStatusToOrderStatus(status);
            if (mappedOrderStatus && order.status !== mappedOrderStatus) {
                // Update the order's status to match all item statuses
                await prisma.order.update({
                    where: { id: orderId },
                    data: { status: mappedOrderStatus },
                });
            }
        } else {
            // Check if any items are DELIVERED and others are not yet DELIVERED
            const hasDeliveredItems = order.items.some((item) => item.status === ItemStatus.DELIVERED);
            const hasNonDeliveredItems = order.items.some(
                (item) => item.status !== ItemStatus.DELIVERED && item.status !== ItemStatus.PICKED_UP
            );

            // Step 5: If mixed status, set the order status to PARTIAL
            if (hasDeliveredItems && hasNonDeliveredItems && order.status !== OrderStatus.PARTIAL) {
                await prisma.order.update({
                    where: { id: orderId },
                    data: { status: OrderStatus.PARTIAL },
                });
            }
        }

        return NextResponse.json({ message: 'Item and order status updated successfully' });
    } catch (error) {
        console.error('Failed to update item:', error);
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }
}
