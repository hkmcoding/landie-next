import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    }

    // Manually set user to Pro for testing
    const { data, error } = await supabase.rpc('update_stripe_subscription', {
      p_user_id: user.id,
      p_stripe_customer_id: 'test_customer_id',
      p_is_active: true,
      p_current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days from now
    });

    if (error) {
      console.error('Error updating pro status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}