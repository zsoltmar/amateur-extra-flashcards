import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const jsonPath = join(process.cwd(), 'public', 'extra.json');
    const questionsData = JSON.parse(readFileSync(jsonPath, 'utf8'));
    return NextResponse.json(questionsData);
  } catch {
    return NextResponse.json(
      { error: 'Failed to load questions' },
      { status: 500 }
    );
  }
}
