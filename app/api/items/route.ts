export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { denyMember } from '../../lib/requireUser';

export async function GET() {
    const denied = await denyMember();
    if (denied) return denied;
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