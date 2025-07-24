import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const landingPageId = searchParams.get('landing_page_id');

  if (!landingPageId) {
    return NextResponse.json({ success: false, error: 'landing_page_id is required' }, { status: 400 });
  }

  // Query the materialized view
  const { data, error } = await supabase
    .schema('analytics')
    .from('section_dropoff_mv')
    .select('*')
    .eq('landing_page_id', landingPageId)
    .order('section_order', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
} 