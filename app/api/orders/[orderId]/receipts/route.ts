import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;

  try {
    const receipts = await prisma.document.findMany({
      where: {
        receiptOrderId: Number(orderId),
      },
      select: {
        id: true,
        url: true,
        uploadedAt: true,
      },
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json({ error: 'Error fetching receipts' }, { status: 500 });
  }
}