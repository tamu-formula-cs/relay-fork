import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and WebP images are allowed' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const blob = await put(
      `delivery-photos/orders/${orderId}/${Date.now()}-${file.name}`,
      Buffer.from(arrayBuffer),
      {
        access: 'public',
        contentType: file.type,
      }
    );

    await prisma.order.update({
      where: { id: Number(orderId) },
      data: { deliveryPhotoUrl: blob.url },
    });
    await prisma.$executeRaw`
      UPDATE "Order"
      SET "deliveryPhotoUrl" = ${blob.url}
      WHERE id = ${Number(orderId)}
    `;
    return NextResponse.json({
      success: true,
      url: blob.url,
      orderId: Number(orderId),
    });
  } catch (error) {
    console.error('Error uploading order delivery photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      select: { deliveryPhotoUrl: true, id: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.deliveryPhotoUrl) {
      return NextResponse.json(
        { error: 'No delivery photo found for this order' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      url: order.deliveryPhotoUrl,
      orderId: order.id,
    });
  } catch (error) {
    console.error('Error fetching order delivery photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
