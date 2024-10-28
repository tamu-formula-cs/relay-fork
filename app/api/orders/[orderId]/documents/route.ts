// app/api/orders/[orderId]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
    const { orderId } = params;

    try {
        const documents = await prisma.document.findMany({
            where: {
                orderId: Number(orderId),
            },
            select: {
                id: true,
                url: true,
                uploadedAt: true,
            },
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json({ error: 'Error fetching documents' }, { status: 500 });
    }
}
