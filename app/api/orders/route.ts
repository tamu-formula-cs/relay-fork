export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export async function GET() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                NOT: {
                    status: 'ARCHIVED',
                },
            },
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
            supportingDocs: order.supportingDocs.map((doc) => ({
                ...doc,
                uploadedAt: doc.uploadedAt.toISOString(),
            })),
            costBreakdown: order.costBreakdown ? JSON.parse(JSON.stringify(order.costBreakdown)) : null,
        }));

        const response = NextResponse.json({ orders: serializedOrders });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Error fetching orders' }, { status: 500 });
    }
}