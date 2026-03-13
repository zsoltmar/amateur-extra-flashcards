import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const HINTS_PATH = path.join(process.cwd(), 'public', 'hints.json');

export async function GET() {
  try {
    const data = await fs.readFile(HINTS_PATH, 'utf8').catch(() => '{}');
    const json = JSON.parse(data || '{}');
    return NextResponse.json(json, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read hints' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Editing disabled in production' }, { status: 403 });
    }
    const body = await req.json();
    const hints = body?.hints ?? {};
    if (typeof hints !== 'object' || Array.isArray(hints)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    await fs.writeFile(HINTS_PATH, JSON.stringify(hints, null, 2), 'utf8');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save hints' }, { status: 500 });
  }
}
