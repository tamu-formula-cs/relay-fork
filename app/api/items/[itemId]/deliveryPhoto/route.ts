import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      );
    }

    const item = await prisma.item.findUnique({
      where: { id: Number(itemId) },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
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
      `delivery-photos/items/${itemId}/${Date.now()}-${file.name}`,
      Buffer.from(arrayBuffer),
      {
        access: 'public',
        contentType: file.type,
      }
    );

    await prisma.item.update({
      where: { id: Number(itemId) },
      data: { deliveryPhotoUrl: blob.url },
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      itemId: Number(itemId),
    });
  } catch (error) {
    console.error('Error uploading item delivery photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      );
    }

    const item = await prisma.item.findUnique({
      where: { id: Number(itemId) },
      select: { deliveryPhotoUrl: true, id: true },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (!item.deliveryPhotoUrl) {
      return NextResponse.json(
        { error: 'No delivery photo found for this item' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      url: item.deliveryPhotoUrl,
      itemId: item.id,
    });
  } catch (error) {
    console.error('Error fetching item delivery photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
