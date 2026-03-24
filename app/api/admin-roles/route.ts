import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';

const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL;

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ roles: [] }, { status: 401 });
    }

    const netId = session.user.email.split('@')[0];

    try {
        const res = await fetch(`${ADMIN_SERVICE_URL}/admin/${netId}`, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
            return NextResponse.json({ roles: [] });
        }

        const data = await res.json();
        const roles = Array.isArray(data.servicesRoles)
            ? data.servicesRoles
                .filter((r: { service: string; role: string }) => r.service === 'EV_OMS')
                .map((r: { service: string; role: string }) => r.role)
            : [];

        return NextResponse.json({ roles });
    } catch {
        return NextResponse.json({ roles: [] });
    }
}
