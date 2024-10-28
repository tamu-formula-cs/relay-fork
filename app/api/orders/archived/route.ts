import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET(request: Request) {
    try {
        const orders = await prisma.order.findMany({
            where: {
                status: 'ARCHIVED',
            },
            include: {
                user: true,
                items: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Serialize dates to strings
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
        console.error('Error fetching archived orders:', error);
        return NextResponse.json({ error: 'Error fetching archived orders' }, { status: 500 });
    }
}