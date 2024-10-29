import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export async function GET(request: Request) {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        items: true,
        supportingDocs: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const serializedOrders = orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      user: {
        ...order.user,
        createdAt: order.user.createdAt.toISOString(),
        updatedAt: order.user.updatedAt.toISOString(),
      },
      items: order.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    }));

    return NextResponse.json({ orders: serializedOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Error fetching orders' }, { status: 500 });
  }
}
