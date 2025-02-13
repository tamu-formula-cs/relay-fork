import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { parse } from 'csv-parse/sync';
import { ItemStatus, OrderStatus } from '@prisma/client';

const REQUIRED_HEADERS = ['Item', 'Part Number', 'Notes', 'QTY to Buy', 'Cost', 'Vendor', 'Link'];

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

interface SupportingDoc {
    name: string;
    url: string;
}

export async function POST(request: NextRequest) {
    try {
        // Parse the multipart/form-data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const userEmail = formData.get('userEmail') as string;

        // Input validation
        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const orderName = formData.get('orderName') as string;
        const vendor = formData.get('vendor') as string;
        const notes = formData.get('notes') as string;
        const estimatedCost = parseFloat(formData.get('estimatedCost') as string) || 0;

        // Process cost breakdown
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

        // Parse CSV content
        const content = await file.text();
        const parsedData: string[][] = parse(content, {
            columns: false,
            skip_empty_lines: true,
            relax_column_count: true,
        });

        // Remove header instruction if present
        if (
            parsedData.length > 0 &&
            parsedData[0][0] &&
            parsedData[0][0].startsWith('MAKE A COPY AND FILL OUT YOUR OWN FILE')
        ) {
            parsedData.shift();
        }

        // Validate headers
        const headers = parsedData.shift();
        if (!headers) {
            return NextResponse.json({ error: 'CSV headers missing' }, { status: 400 });
        }

        const headersMatch = REQUIRED_HEADERS.every((header, index) => headers[index] === header);
        if (!headersMatch) {
            return NextResponse.json({ 
                error: 'Invalid CSV format. Headers must exactly match the template.',
                expected: REQUIRED_HEADERS,
                received: headers
            }, { status: 400 });
        }

        // Process records
        let records = parsedData.map((row: string[]) => {
            const record = {} as Record;
            headers.forEach((header: string, index: number) => {
                record[header] = row[index];
            });
            return record;
        });

        // Filter valid records
        records = records.filter((record: Record) => {
            const { Item, 'QTY to Buy': qtyToBuy, Cost, Vendor } = record;
            const quantity = parseInt(qtyToBuy, 10);
            const sanitizedCost = Cost ? Cost.replace(/[^0-9.-]+/g, '') : '';
            const price = parseFloat(sanitizedCost);
            return (
                Item && qtyToBuy && Cost && Vendor && 
                !isNaN(quantity) && !isNaN(price)
            );
        });

        // Prepare items data
        const itemsData = records.map(record => {
            const { Item, 'Part Number': partNumber, Notes, 'QTY to Buy': qtyToBuy, Cost, Vendor, Link } = record;
            const sanitizedCost = Cost.replace(/[^0-9.-]+/g, '');
            const quantity = parseInt(qtyToBuy, 10);
            const price = parseFloat(sanitizedCost);

            return {
                internalItemId: `ITEM-${Math.floor(Math.random() * 100000)}`,
                name: Item,
                partNumber: partNumber || '',
                notes: Notes || null,
                quantity,
                price,
                vendor: Vendor,
                link: Link || null,
                status: ItemStatus.TO_ORDER,
            };
        });

        // Process supporting documents
        const supportingDocs: SupportingDoc[] = [];
        for (let i = 0; formData.has(`supportingDocs[${i}][url]`); i++) {
            const name = formData.get(`supportingDocs[${i}][name]`) as string;
            const url = formData.get(`supportingDocs[${i}][url]`) as string;
            supportingDocs.push({ name, url });
        }

        // Execute database operations in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create order
            const order = await tx.order.create({
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
                include: {
                    items: true
                }
            });

            // Create items if any
            if (itemsData.length > 0) {
                await tx.item.createMany({
                    data: itemsData.map((item) => ({
                        ...item,
                        orderId: order.id,
                    })),
                });
            }

            // Create supporting documents if any
            if (supportingDocs.length > 0) {
                await tx.document.createMany({
                    data: supportingDocs.map((doc) => ({
                        url: doc.url,
                        supportingOrderId: order.id,
                    })),
                });
            }

            // Return complete order with all relations
            return await tx.order.findUnique({
                where: { id: order.id },
                include: {
                    items: true,
                    supportingDocs: true
                }
            });
        });

        console.log('Created order with items:', JSON.stringify(result, null, 2));
        
        return NextResponse.json({ 
            message: 'Order, items, and documents created successfully',
            order: result 
        });

    } catch (error) {
        console.error('Error processing upload:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Error creating order'
        }, { status: 500 });
    }
}