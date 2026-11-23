import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { User } from '@prisma/client';
import { authOptions } from './auth';
import { isPM } from './budget-config';
import { getOmsRoles } from './checkAdmin';
import prisma from './prisma';
import { AccessFlags, canApprove, canEdit, machineAuthOk } from './access';

export type Actor = AccessFlags & {
  email: string;
  user: User;
};

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function requireMember(): Promise<Actor | NextResponse> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const roles = await getOmsRoles(email.split('@')[0]);
  if (roles.length === 0) return forbidden();

  return {
    email,
    user,
    subteam: user.subteam,
    isAdmin: roles.includes('ADMIN'),
    isLead: roles.includes('LEAD'),
    isPm: isPM(email),
  };
}

// Signed in with an OMS role, before a profile row exists.
export async function requireKnownEmail(): Promise<{ email: string } | NextResponse> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const roles = await getOmsRoles(email.split('@')[0]);
  if (roles.length === 0) return forbidden();
  return { email };
}

export async function denyMember(): Promise<NextResponse | null> {
  const actor = await requireMember();
  return actor instanceof NextResponse ? actor : null;
}

export async function denyUnlessEditor(): Promise<NextResponse | null> {
  const actor = await requireMember();
  if (actor instanceof NextResponse) return actor;
  if (!canEdit(actor)) return forbidden();
  return null;
}

export async function denyUnlessApprover(): Promise<NextResponse | null> {
  const actor = await requireMember();
  if (actor instanceof NextResponse) return actor;
  if (!canApprove(actor)) return forbidden();
  return null;
}

export async function denyUnlessAdmin(): Promise<NextResponse | null> {
  const actor = await requireMember();
  if (actor instanceof NextResponse) return actor;
  if (!actor.isAdmin) return forbidden();
  return null;
}

export function machineDenied(request: Request): NextResponse | null {
  const token = new URL(request.url).searchParams.get('token');
  if (machineAuthOk(request.headers.get('authorization'), token)) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function machineHeader(request: Request): string {
  const header = request.headers.get('authorization');
  if (header) return header;
  const token = new URL(request.url).searchParams.get('token');
  return token ? `Bearer ${token}` : '';
}
