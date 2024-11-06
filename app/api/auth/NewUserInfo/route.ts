import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { hash } from 'bcryptjs';

export async function POST(request: Request) {
    const { email, name, role, subteam, phone, password } = await request.json();
    const auth_emails = (process.env.AUTHORIZED_EMAILS || "").split(',');

    if (!auth_emails.includes(email)) {
        return NextResponse.json({ error: 'Email not authorized' }, { status: 403 });
    }

    try {
        const hashedPassword = await hash(password, 12);

        const newUser = await prisma.user.create({
        data: {
            email,
            name,
            role,
            subteam,
            phone,
            password: hashedPassword,
        },
        });
        return NextResponse.json({ user: newUser });
    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
