import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { parse } from 'csv-parse/sync';
import { Item, ItemStatus, OrderStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
    const userEmail = 'user1@example.com';

    // Get the user from the database
    const user = await prisma.user.findUnique({
        where: { email: userEmail },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse the multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const orderName = formData.get('orderName') as string;
    const vendor = formData.get('vendor') as string;
    const notes = formData.get('notes') as string;
    const estimatedCost = parseFloat(formData.get('estimatedCost') as string) || 0;

    const costBreakdownEntries: [string, number][] = [];
    for (const entry of formData.entries()) {
        const [key, value] = entry;
        if (key.startsWith('costBreakdown[') && key.endsWith(']')) {
            const subteam = key.slice(14, -1);
            const percentage = parseFloat(value as string);
            if (!isNaN(percentage)) {
                costBreakdownEntries.push([subteam, percentage]);
            }
        }
    }
    const costBreakdown = Object.fromEntries(costBreakdownEntries);

    const content = await file.text();

    let records;
    try {
        records = parse(content, {
            columns: true,
            skip_empty_lines: true,
        });
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 });
    }

    const itemsData = records.map((record: { Item: string; "Part Number": string; Notes: string; "QTY to Buy": string; Cost: string; Vendor: string; Link: string; }) => {
        const { Item, 'Part Number': partNumber, Notes, 'QTY to Buy': qtyToBuy, Cost, Vendor, Link } = record;

        if (!Item || !qtyToBuy || !Cost || !Vendor) {
            return NextResponse.json({ error: 'Missing required fields in CSV' }, { status: 400 });
        }

        return {
            internalItemId: `ITEM-${Math.floor(Math.random() * 100000)}`,
            name: Item,
            partNumber: partNumber || '',
            notes: Notes || null,
            quantity: parseInt(qtyToBuy, 10),
            price: parseFloat(Cost),
            vendor: Vendor,
            link: Link || null,
            status: ItemStatus.TO_ORDER,
        };
    });

    const supportingDocs = [];
    for (let i = 0; formData.has(`supportingDocs[${i}][url]`); i++) {
        const name = formData.get(`supportingDocs[${i}][name]`) as string;
        const url = formData.get(`supportingDocs[${i}][url]`) as string;
        supportingDocs.push({ name, url });
    }

    try {
        const order = await prisma.order.create({
            data: {
                internalOrderId: `ORD-${Math.floor(Math.random() * 100000)}`,
                name: orderName,
                userId: user.id,
                subteam: user.subteam,
                status: OrderStatus.TO_ORDER,
                vendor: vendor || '',
                totalCost: estimatedCost,
                comments: notes || '',
                costBreakdown,
            },
        });

        if (supportingDocs.length > 0) {
            await prisma.document.createMany({
                data: supportingDocs.map((doc) => ({
                    url: doc.url,
                    orderId: order.id,
                })),
            });
        }

        if (itemsData.length > 0) {
            await prisma.item.createMany({
                data: itemsData.map((item: Item) => ({
                    ...item,
                    orderId: order.id,
                })),
            });
        }

        return NextResponse.json({ message: 'Order, items, and documents created successfully' });
    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: 'Error creating order' }, { status: 500 });
    }
}
