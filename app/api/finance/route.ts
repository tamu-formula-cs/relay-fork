export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date('2025-07-01T00:00:00Z'),
        },
        NOT: {
          status: 'AWAITING_APPROVAL',
        },
      },
      select: {
        id: true,
        internalOrderId: true,
        meenOrderId: true,
        name: true,
        userId: true,
        subteam: true,
        status: true,
        vendor: true,
        totalCost: true,
        costVerified: true,
        comments: true,
        url: true,
        carrier: true,
        trackingId: true,
        costBreakdown: true,
        createdAt: true,
        updatedAt: true,
        deliveryLocation: true,
        deliveryPhotoUrl: true,
        user: {
          select: { id: true, name: true, email: true, subteam: true, role: true },
        },
        items: {
          select: {
            id: true, internalItemId: true, internalSKU: true, orderId: true,
            name: true, partNumber: true, notes: true, quantity: true, price: true,
            priceVerified: true, vendor: true, vendorSKU: true, link: true,
            status: true, location: true, level: true, createdAt: true,
            updatedAt: true, deliveryPhotoUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const serializedOrders = orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      user: { ...order.user, createdAt: '', updatedAt: '' },
      items: order.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      supportingDocs: [],
      costBreakdown: order.costBreakdown
        ? JSON.parse(JSON.stringify(order.costBreakdown))
        : null,
    }));

    const response = NextResponse.json({ orders: serializedOrders });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Error fetching orders' }, { status: 500 });
  }
}
