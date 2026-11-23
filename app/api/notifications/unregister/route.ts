import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { requireMember } from '../../../lib/requireUser';

export async function POST(request: Request) {
  const actor = await requireMember();
  if (actor instanceof NextResponse) return actor;
  try {
    const body = await request.json();
    const { pushToken } = body;

    if (!pushToken) {
      return NextResponse.json(
        { error: 'pushToken is required' },
        { status: 400 }
      );
    }

    const result = await prisma.pushToken.deleteMany({
      where: { token: pushToken, userId: actor.user.id },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Push token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Push token unregistered successfully',
    });
  } catch (error) {
    console.error('Error unregistering push token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  return POST(request);
}
