export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = Number(params.id);
        if (!id) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }

        await prisma.item.delete({
            where: {
                id: id,
            },
        });

        return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting item:', error);
        return NextResponse.json({ error: 'Error deleting item' }, { status: 500 });
    }
}
