export const dynamic = 'force-dynamic';

import { OrderStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { meenBasicAuthOk } from '../../../../lib/meenBasicAuth';
import prisma from '../../../../lib/prisma';

const ORDER_STATUSES = new Set<string>(Object.values(OrderStatus));

function requireMeenAuth(request: NextRequest) {
  if (meenBasicAuthOk(request.headers.get('authorization'))) return null;
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const denied = requireMeenAuth(request);
  if (denied) return denied;

  const meenId = (request.nextUrl.searchParams.get('meen_id') || '').trim();

  if (!/^\d{1,8}$/.test(meenId)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_meen_id' },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    where: { meenOrderId: meenId },
    select: {
      id: true,
      internalOrderId: true,
      meenOrderId: true,
      status: true,
      carrier: true,
      trackingId: true,
    },
  });

  if (!order) {
    return NextResponse.json({ ok: true, found: false, meen_id: meenId });
  }

  return NextResponse.json({
    ok: true,
    found: true,
    meen_id: order.meenOrderId,
    order_id: order.id,
    internal_order_id: order.internalOrderId,
    status: order.status,
    tracking_id: order.trackingId,
    carrier: order.carrier,
  });
}

export async function POST(request: NextRequest) {
  const denied = requireMeenAuth(request);
  if (denied) return denied;

  let body: { meen_id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const meenId = String(body.meen_id ?? '').trim();
  const status = String(body.status ?? '').trim();

  if (!/^\d{1,8}$/.test(meenId)) {
    return NextResponse.json({ ok: false, error: 'invalid_meen_id' }, { status: 400 });
  }

  if (!ORDER_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: 'invalid_status' }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { meenOrderId: meenId },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, error: 'not_found', meen_id: meenId },
      { status: 404 }
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: status as OrderStatus },
    select: {
      id: true,
      internalOrderId: true,
      meenOrderId: true,
      status: true,
    },
  });

  return NextResponse.json({
    ok: true,
    found: true,
    meen_id: updated.meenOrderId,
    order_id: updated.id,
    internal_order_id: updated.internalOrderId,
    status: updated.status,
  });
}
