export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { ItemStatus, StockLevel } from '@prisma/client';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body.name) {
            return NextResponse.json({ error: 'A name is required to create an item!' }, { status: 400 });
        }  

        await prisma.item.create({
            data: {
                internalItemId: `ITEM-${Math.floor(Math.random() * 100000)}`,
                name: body.name,
                internalSKU: body.internalSKU,
                quantity: parseInt(body.quantity, 10) || null,
                level: body.level || StockLevel.IN_STOCK,
                location: body.location || '',
                vendor: body.vendor || '',
                vendorSKU: body.vendorSKU || '',
                status: ItemStatus.PICKED_UP
            },
        });

        return NextResponse.json({ message: 'Item created successfully' }, { status: 201 });
    } catch (error) {
        console.error('Error creating item:', error);
        return NextResponse.json({ error: 'Error creating item' }, { status: 500 });
    }
}