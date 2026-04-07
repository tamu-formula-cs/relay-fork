import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { OrderStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== OrderStatus.AWAITING_APPROVAL) {
      return NextResponse.json(
        { error: 'Order is not pending approval' },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: { id: Number(orderId) },
      data: { status: OrderStatus.TO_ORDER },
    });

    return NextResponse.json({ success: true, message: 'Order approved' });
  } catch (error) {
    console.error('Error approving order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error approving order' },
      { status: 500 }
    );
  }
}
