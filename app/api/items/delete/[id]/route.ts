export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { denyMember } from '../../../../lib/requireUser';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const denied = await denyMember();
    if (denied) return denied;
    try {
        const id = Number((await params).id);
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
