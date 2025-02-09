import { NextRequest, NextResponse } from 'next/server';
import sanitize from 'sanitize-html';

export async function POST(req: NextRequest) {
    try {
        const { historyId } = await req.json();
        
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        
        const response = await fetch(`${baseUrl}/api/gmail/getEmail?historyId=${historyId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch emails');
        }
        const fetchedEmails = await response.json();

        const sanitizedQuery = fetchedEmails[0].subject + sanitize(fetchedEmails[0].body!);
        const encodedQuery = encodeURIComponent(sanitizedQuery);

        const llmResponse = await fetch(`${baseUrl}/api/llm?query=${encodedQuery}`);
        if (!llmResponse.ok) {
            throw new Error('Failed to fetch order status');
        }
        const llmData = await llmResponse.json();

        const updateResponse = await fetch(`${baseUrl}/api/orders/update/mail/${encodeURIComponent(llmData.itemName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                meenId: llmData.meenId || '', 
                status: llmData.orderStatus || '',
                itemName: llmData.itemName || '',
                vendorName: llmData.vendorName || '',
                carrier: llmData.carrier,
                trackingId: llmData.trackingNumber,
            }),
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`Failed to update order: ${JSON.stringify(errorData)}`);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error processing notification:', err);
        return NextResponse.json({ 
            success: false, 
            error: err instanceof Error ? err.message : 'Unknown error' 
        }, { status: 500 });
    }
}