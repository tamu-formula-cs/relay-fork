import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { requireMember } from '../../../lib/requireUser';
import { Expo } from 'expo-server-sdk';

export async function POST(request: Request) {
  const actor = await requireMember();
  if (actor instanceof NextResponse) return actor;
  try {
    const body = await request.json();
    const { pushToken, platform, deviceId } = body;
    const userId = actor.user.id;

    if (!pushToken) {
      return NextResponse.json(
        { error: 'pushToken is required' },
        { status: 400 }
      );
    }

    if (!Expo.isExpoPushToken(pushToken)) {
      return NextResponse.json(
        { error: 'Invalid push token format. Must be a valid Expo push token.' },
        { status: 400 }
      );
    }

    const token = await prisma.pushToken.upsert({
      where: { token: pushToken },
      update: {
        userId: Number(userId),
        platform: platform || 'expo',
        deviceId: deviceId || null,
        updatedAt: new Date(),
      },
      create: {
        token: pushToken,
        userId: Number(userId),
        platform: platform || 'expo',
        deviceId: deviceId || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Push token registered successfully',
      tokenId: token.id,
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
