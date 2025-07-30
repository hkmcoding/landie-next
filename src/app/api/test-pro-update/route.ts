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

    console.log('Testing pro update for user:', user.id);

    // Test the database function directly
    const { data, error } = await supabase.rpc('update_stripe_subscription', {
      p_user_id: user.id,
      p_stripe_customer_id: 'test_customer_123',
      p_is_active: true,
      p_current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days from now
    });

    if (error) {
      console.error('Error calling update_stripe_subscription:', error);
      return NextResponse.json({ 
        error: error.message, 
        details: error,
        user_id: user.id 
      }, { status: 500 });
    }

    // Also check the current status
    const { data: currentStatus, error: statusError } = await supabase
      .from('user_pro_status')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statusError) {
      console.error('Error fetching current status:', statusError);
    }

    return NextResponse.json({ 
      success: true, 
      data,
      user_id: user.id,
      current_status: currentStatus
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}