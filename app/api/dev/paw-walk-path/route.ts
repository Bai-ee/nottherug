import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

/**
 * Dev-only: writes a route dragged in the path editor straight into
 * lib/marketing/paw-walk-path.ts, so an edit survives more than the browser's
 * localStorage. Disabled outside development — it edits source files.
 */
const SOURCE = path.join(process.cwd(), 'lib', 'marketing', 'paw-walk-path.ts');
const CONSTANT = /export const HOME_PAW_WALK_PATH =\n {2}'[^']*';/;

/** Only an SVG path of the commands the editor emits; keeps arbitrary text out of source. */
const SAFE_PATH = /^[MmCcLlSsQqTtAaHhVvZz0-9,.\-\s]+$/;

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not available in production' }, { status: 404 });
  }

  let d: unknown;
  try {
    ({ d } = await request.json());
  } catch {
    return NextResponse.json({ error: 'expected JSON body' }, { status: 400 });
  }

  if (typeof d !== 'string' || !d.trim() || !SAFE_PATH.test(d)) {
    return NextResponse.json({ error: 'expected an SVG path string in `d`' }, { status: 400 });
  }

  const source = await fs.readFile(SOURCE, 'utf8');
  if (!CONSTANT.test(source)) {
    return NextResponse.json(
      { error: 'HOME_PAW_WALK_PATH not found in its expected shape; paste it by hand' },
      { status: 500 }
    );
  }

  const next = source.replace(CONSTANT, `export const HOME_PAW_WALK_PATH =\n  '${d.trim()}';`);
  await fs.writeFile(SOURCE, next, 'utf8');
  return NextResponse.json({ ok: true, chars: d.trim().length });
}
