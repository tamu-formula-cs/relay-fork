// /api/orders/place
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { ItemStatus, OrderStatus } from '@prisma/client';

export async function POST(request: NextRequest) {

    const body = await request.json();
    const { orderName, cartUrl, items, vendor, totalCost, comments, costBreakdown, supportingDocs } = body;

    const userEmail = body.userEmail;

    // Get the user from the database
    const user = await prisma.user.findUnique({
        where: { email: userEmail },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!orderName || !vendor) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if it's a Cart URL Order (no items but has cartUrl)
    if (cartUrl && (!items || items.length === 0)) {
        if (!orderName || !cartUrl) {
            return NextResponse.json({ error: 'Missing required fields for cart URL order' }, { status: 400 });
        }

        const totalCost = parseFloat(body.estimatedCost) || 0;

        try {
            const order = await prisma.order.create({
                data: {
                    internalOrderId: `ORD-${Math.floor(Math.random() * 100000)}`,
                    name: orderName,
                    userId: user.id,
                    subteam: user.subteam,
                    status: OrderStatus.TO_ORDER,
                    vendor,
                    totalCost,
                    comments: comments || '',
                    url: cartUrl || null,
                    costBreakdown,
                },
            });
    
            if (supportingDocs && supportingDocs.length > 0) {
                await prisma.document.createMany({
                    data: supportingDocs.map((doc: { url: string; }) => ({
                    url: doc.url,
                    orderId: order.id,
                    })),
                });
                }
    
            return NextResponse.json({ message: 'Order and documents created successfully' });
        } catch (error) {
            console.error('Error creating cart URL order:', error);
            return NextResponse.json({ error: 'Error creating cart URL order' }, { status: 500 });
        }

    } else if (items && items.length > 0) {
        // Handle Single Item Order (has items)
        const { itemName, partNumber, quantity, cost, link } = items[0]; // Assuming the first item is relevant

        if (!itemName || !quantity || !cost || !vendor) {
            return NextResponse.json({ error: 'Missing required fields for single item order' }, { status: 400 });
        }

        // Create the order with a single item
        try {
            await prisma.order.create({
                data: {
                    internalOrderId: `ORD-${Math.floor(Math.random() * 100000)}`,
                    name: orderName || `Order by ${user.name}`,
                    userId: user.id,
                    subteam: user.subteam,
                    status: OrderStatus.TO_ORDER,
                    vendor: vendor,
                    totalCost: totalCost || cost * quantity,
                    comments: comments || '',
                    costBreakdown: costBreakdown, // Include cost breakdown
                    items: {
                        create: {
                            internalItemId: `ITEM-${Math.floor(Math.random() * 100000)}`,
                            name: itemName,
                            partNumber: partNumber || '',
                            notes: comments || null,
                            quantity: parseInt(quantity, 10),
                            price: parseFloat(cost),
                            vendor: vendor,
                            link: link || null,
                            status: ItemStatus.TO_ORDER,
                        },
                    },
                },
            });

            return NextResponse.json({ message: 'Single item order created successfully' });
        } catch (error) {
            console.error('Error creating single item order:', error);
            return NextResponse.json({ error: 'Error creating single item order' }, { status: 500 });
        }

    } else {
        return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
}