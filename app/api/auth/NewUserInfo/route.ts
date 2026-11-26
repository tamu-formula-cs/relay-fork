import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { signupAllowed } from '../../../lib/access';
import { requireKnownEmail } from '../../../lib/requireUser';

export async function POST(request: Request) {
    const known = await requireKnownEmail();
    if (known instanceof NextResponse) return known;

    const email = known.email;
    const { name, role, subteam, phone, carrier } = await request.json();

    if (!signupAllowed(role, subteam)) {
        return NextResponse.json({ error: 'Invalid role or subteam' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return NextResponse.json({ error: 'Account already exists' }, { status: 409 });
    }

    try {
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                role,
                subteam,
                phone,
                carrier,
                password: null,
            },
        });
        return NextResponse.json({ user: newUser });
    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
