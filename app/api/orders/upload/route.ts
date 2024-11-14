import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { parse } from 'csv-parse/sync';
import { ItemStatus, OrderStatus } from '@prisma/client';

interface Record {
    Item: string;
    'Part Number'?: string;
    Notes?: string;
    'QTY to Buy': string;
    Cost: string;
    Vendor: string;
    Link?: string;
    [key: string]: string | undefined;
}

export async function POST(request: NextRequest) {

    // Parse the multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    const userEmail = formData.get('userEmail') as string;

    // Get the user from the database
    const user = await prisma.user.findUnique({
        where: { email: userEmail },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    let records: Record[];
    try {
        const parsedData: string[][] = parse(content, {
            columns: false,
            skip_empty_lines: true,
            relax_column_count: true, // Allows rows with fewer columns
        });

        // Check if the first row contains the unwanted line
        if (
            parsedData.length > 0 &&
            parsedData[0][0] &&
            parsedData[0][0].startsWith('MAKE A COPY AND FILL OUT YOUR OWN FILE')
        ) {
            // Remove the first row
            parsedData.shift();
        }

        // Now extract the headers
        const headers = parsedData.shift();

        if (!headers) {
            throw new Error('CSV headers missing');
        }

        // Convert the rest of the data into records with headers
        records = parsedData.map((row: string[]) => {
            const record = {} as Record;
            headers.forEach((header: string, index: number) => {
                record[header] = row[index];
            });
            return record;
        });
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 });
    }

    // Filter out empty or invalid records
    records = records.filter((record: Record) => {
        const { Item, 'QTY to Buy': qtyToBuy, Cost, Vendor } = record;
        return Item && qtyToBuy && Cost && Vendor;
    });

    const itemsData = [];
    for (const record of records) {
        const { Item, 'Part Number': partNumber, Notes, 'QTY to Buy': qtyToBuy, Cost, Vendor, Link } = record;

        // Remove any non-numeric characters from Cost
        const sanitizedCost = Cost.replace(/[^0-9.-]+/g, '');

        // Parse the quantity and cost
        const quantity = parseInt(qtyToBuy, 10);
        const price = parseFloat(sanitizedCost);

        if (isNaN(quantity) || isNaN(price)) {
            return NextResponse.json({ error: 'Invalid number format in CSV' }, { status: 400 });
        }

        itemsData.push({
            internalItemId: `ITEM-${Math.floor(Math.random() * 100000)}`,
            name: Item,
            partNumber: partNumber || '',
            notes: Notes || null,
            quantity,
            price,
            vendor: Vendor,
            link: Link || null,
            status: ItemStatus.TO_ORDER,
        });
    }

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
                    supportingOrderId: order.id,
                })),
            });
        }

        if (itemsData.length > 0) {
            await prisma.item.createMany({
                data: itemsData.map((item) => ({
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
