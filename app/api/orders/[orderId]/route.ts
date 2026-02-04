import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const orderId = parseInt((await params).orderId);

        if (isNaN(orderId)) {
            return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                items: true,
                supportingDocs: true,
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const serializedOrder = {
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
        };

        return NextResponse.json({ order: serializedOrder });
    } catch (error) {
        console.error('Error fetching order:', error);
        return NextResponse.json({ error: 'Error fetching order' }, { status: 500 });
    }
}
