import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(request: Request) {
    try {
      const url = new URL(request.url);
      const orderId = url.searchParams.get('orderId');
  
      if (!orderId) {
        throw new Error('orderId is required');
      }
  
      const formData = await request.formData();
      const file = formData.get('file') as File;
  
      if (!file) {
        throw new Error('No file provided');
      }
  
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }
  
      const arrayBuffer = await file.arrayBuffer();
  
      const blob = await put(`receipts/${orderId}/${file.name}`, Buffer.from(arrayBuffer), {
        access: 'public',
        contentType: 'application/pdf',
      });
  
      // Save the blob URL to your database
      await prisma.document.create({
        data: {
          url: blob.url,
          receiptOrder: {
            connect: { id: Number(orderId) },
          },
        },
      });
  
      return NextResponse.json({ success: true, url: blob.url });
    } catch (error) {
      console.error('Error uploading receipt:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      );
    }
  }
  