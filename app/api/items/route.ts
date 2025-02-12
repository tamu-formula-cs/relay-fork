export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export async function GET() {
    try {
        const items = await prisma.item.findMany({
            where: {
                status: 'PICKED_UP',
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        const serializedItems = items.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        }));

        const response = NextResponse.json({ items: serializedItems });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Error fetching orders' }, { status: 500 });
    }
}