import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { del } from '@vercel/blob';

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const orderIdNum = Number(orderId);

    // Fetch all documents (receipts and supporting documents) associated with the order
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { receiptOrderId: orderIdNum },
          { supportingOrderId: orderIdNum },
        ],
      },
    });

    // Extract URLs of the blobs
    const urls = documents.map((doc) => doc.url);

    // Delete blobs from Vercel Blob storage
    if (urls.length > 0) {
      await del(urls);
    }

    // Proceed to delete records from the database within a transaction
    await prisma.$transaction([
      // Delete related receipts and supporting documents
      prisma.document.deleteMany({
        where: {
          OR: [
            { receiptOrderId: orderIdNum },
            { supportingOrderId: orderIdNum },
          ],
        },
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