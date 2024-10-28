import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const body = await request.json();
    
    try {
        const response = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async () => ({
                allowedContentTypes: ['application/pdf'],
                tokenPayload: JSON.stringify({ orderId: body.orderId }),
            }),
            onUploadCompleted: async ({ blob, tokenPayload }) => {
            },
        });

        return NextResponse.json(response);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
