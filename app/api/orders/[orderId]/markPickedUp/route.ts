import { NextRequest, NextResponse } from 'next/server';
import { OrderStatus, ItemStatus } from '@prisma/client';
import prisma from '../../../../lib/prisma';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const orderId = parseInt((await params).orderId, 10);

    try {
        await prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.ARCHIVED },
        });
        
        await prisma.item.updateMany({
            where: { orderId: orderId },
            data: { status: ItemStatus.PICKED_UP },
        });

        return NextResponse.json({ message: 'Order and items updated successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update order and items' }, { status: 500 });
    }
}
