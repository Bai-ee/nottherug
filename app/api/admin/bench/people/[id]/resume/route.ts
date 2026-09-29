import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { errorResponse, ServiceError } from '@/lib/server/errors';
import { storageDownload } from '@/lib/server/firebaseStorage';
import { getBenchPerson, isBenchPersonId } from '@/lib/server/bench';
import { RESUME_TYPES } from '@/lib/bench/contract';

export const runtime = 'nodejs';

/**
 * Streams an applicant's resume to a verified admin. Stands in for the plan's
 * short-lived signed URL: the file never gets a public token, and every read
 * is checked against the admin whitelist at the moment it happens.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    await verifyAdmin(req);
  } catch (err) {
    return errorResponse(err);
  }

  const { id } = await ctx.params;
  if (!isBenchPersonId(id)) return NextResponse.json({ error: 'Unknown person' }, { status: 404 });

  try {
    const person = await getBenchPerson(id);
    if (!person?.resumePath || !person.resumeKind) {
      return NextResponse.json({ error: 'No resume on file' }, { status: 404 });
    }
    const file = await storageDownload(person.resumePath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': RESUME_TYPES[person.resumeKind],
        'Content-Disposition': `inline; filename="resume-${person.fullName.replace(/[^a-z0-9]/gi, '') || 'applicant'}.${person.resumeKind}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return errorResponse(new ServiceError(err instanceof Error ? err.message : 'Resume load failed'));
  }
}
