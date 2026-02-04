// app/api/orders/[orderId]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params;

    try {
        const documents = await prisma.document.findMany({
            where: {
                supportingOrderId: Number(orderId),
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
