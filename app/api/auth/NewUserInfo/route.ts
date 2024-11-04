import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(request: Request) {
    const { email, name, role, subteam, phone } = await request.json();

    try {
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                role,
                subteam,
                phone, 
            },
        });
        return NextResponse.json({ user: newUser });
    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
