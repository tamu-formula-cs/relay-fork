import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { del } from '@vercel/blob';

export async function DELETE(request: Request) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    // Fetch the document to get the blob URL
    const document = await prisma.document.findUnique({
      where: { id: Number(documentId) },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete the blob from Vercel Blob storage
    await del(document.url);

    // Delete the document record from the database
    await prisma.document.delete({
      where: { id: Number(documentId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}