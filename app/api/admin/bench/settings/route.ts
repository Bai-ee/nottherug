import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse, ServiceError } from '@/lib/server/errors';
import { getBenchSettings, saveBenchSettings } from '@/lib/server/bench';
import { parseSettings } from '@/lib/bench/validation';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }
  try {
    return NextResponse.json({ settings: await getBenchSettings() });
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'Settings load failed'));
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  let adminEmail: string;
  try {
    adminEmail = await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseSettings(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.errors[0]?.message ?? 'Invalid settings', details: parsed.errors }, { status: 400 });
  }

  try {
    return NextResponse.json({ settings: await saveBenchSettings(parsed.data, adminEmail) });
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'Settings save failed'));
  }
}
