import { NextResponse } from 'next/server';
import { getClassificationJobsStore } from '@/lib/notifications/notifier';

export async function GET() {
  const jobs = getClassificationJobsStore();
  return NextResponse.json({ jobs });
}
