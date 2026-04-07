import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { OrderStatus } from '@prisma/client';
import { del } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const orderIdNum = Number(orderId);

    const order = await prisma.order.findUnique({
      where: { id: orderIdNum },
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

    // Fetch all documents associated with the order
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { receiptOrderId: orderIdNum },
          { supportingOrderId: orderIdNum },
        ],
      },
    });

    const urls = documents.map((doc) => doc.url);

    // Delete blobs from Vercel Blob storage
    if (urls.length > 0) {
      await del(urls);
    }

    // Delete records from the database
    await prisma.$transaction([
      prisma.document.deleteMany({
        where: {
          OR: [
            { receiptOrderId: orderIdNum },
            { supportingOrderId: orderIdNum },
          ],
        },
      }),
      prisma.item.deleteMany({
        where: { orderId: orderIdNum },
      }),
      prisma.order.delete({
        where: { id: orderIdNum },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Order denied and deleted' });
  } catch (error) {
    console.error('Error denying order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error denying order' },
      { status: 500 }
    );
  }
}
