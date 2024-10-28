import { NextRequest, NextResponse } from 'next/server';
import { ItemStatus, OrderStatus } from '@prisma/client';
import prisma from '../../../../lib/prisma';

export async function POST(
    request: NextRequest,
    { params }: { params: { itemId: string } }
) {
    const itemId = parseInt(params.itemId, 10);

    try {
        // Step 1: Update the item's status to PICKED_UP
        const updatedItem = await prisma.item.update({
            where: { id: itemId },
            data: { status: ItemStatus.PICKED_UP },
            include: { order: true },
        });

        // Step 2: Check if all items in the parent order are PICKED_UP
        const allItemsPickedUp = await prisma.item.findMany({
            where: {
                orderId: updatedItem.orderId,
                status: { not: ItemStatus.PICKED_UP },
            },
        });

        // Step 3: If no items are left that are not PICKED_UP, archive the order
        if (allItemsPickedUp.length === 0) {
            await prisma.order.update({
                where: { id: updatedItem.orderId },
                data: { status: OrderStatus.ARCHIVED },
            });
        }

        return NextResponse.json({ message: 'Item and order status updated successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update item and order status' }, { status: 500 });
    }
}