import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const orderIdNum = Number(orderId);

    // Start transaction
    await prisma.$transaction([
      // Delete related receipts
      prisma.document.deleteMany({
        where: { receiptOrderId: orderIdNum },
      }),

      // Delete related supporting documents
      prisma.document.deleteMany({
        where: { supportingOrderId: orderIdNum },
      }),

      // Delete related items
      prisma.item.deleteMany({
        where: { orderId: orderIdNum },
      }),

      // Delete the order
      prisma.order.delete({
        where: { id: orderIdNum },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
