import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function DELETE(request: Request) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

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