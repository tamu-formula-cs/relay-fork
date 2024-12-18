import { NextRequest, NextResponse } from 'next/server';
import sanitize from 'sanitize-html';

export async function POST(req: NextRequest) {
    try {
        const { historyId } = await req.json();

        const response = await fetch(`https://relay.tamuformulaelectric.com/api/gmail/getEmail?historyId=${historyId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch emails');
        }
        const fetchedEmails = await response.json();

        const sanitizedQuery = fetchedEmails[0].subject + sanitize(fetchedEmails[0].body!);
        const encodedQuery = encodeURIComponent(sanitizedQuery);

        const llmResponse = await fetch(`https://relay.tamuformulaelectric.com/api/llm?query=${encodedQuery}`);
        if (!llmResponse.ok) {
            throw new Error('Failed to fetch order status');
        }
        const llmData = await llmResponse.json();

        const updateData = {
            meenId: llmData.meenId || '', 
            status: llmData.orderStatus || '',
            itemName: llmData.itemName || '',
            vendorName: llmData.vendorName || '',
            carrier: llmData.carrier,
            trackingId: llmData.trackingNumber,
        };

        const updateResponse = await fetch(`https://relay.tamuformulaelectric.com/api/orders/update/mail/${encodeURIComponent(llmData.itemName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update order');
        }

        console.log('Order updated successfully:', updateData);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error processing notification:', err);
        return NextResponse.json({ success: false });
    }
}
