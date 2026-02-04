
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { OrderStatus } from '@prisma/client';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const orderId = parseInt((await params).orderId, 10);
    const { meenOrderId } = await request.json();

    if (!meenOrderId) {
        return NextResponse.json({ error: 'meenOrderId is required' }, { status: 400 });
    }

    try {
        await prisma.order.update({
        where: { id: orderId },
        data: { 
            meenOrderId,
            status: OrderStatus.PLACED
         },
        });
        return NextResponse.json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}