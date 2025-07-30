import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(
  process.env.NODE_ENV === 'production' 
    ? process.env.STRIPE_SECRET_KEY! 
    : process.env.STRIPE_TEST_SECRET_KEY!, 
  {
    apiVersion: '2025-06-30.basil',
  }
);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.NODE_ENV === 'production' 
            ? process.env.STRIPE_PRICE_PRO_MONTHLY 
            : process.env.STRIPE_TEST_PRICE_PRO_MONTHLY,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/dashboard?upgrade=success`,
      cancel_url: `${request.nextUrl.origin}/?upgrade=cancelled`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}