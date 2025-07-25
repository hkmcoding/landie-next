import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      customer: string;
      status: string;
      current_period_end?: number;
      metadata?: {
        user_id?: string;
      };
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get webhook signature and payload
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Missing stripe-signature header', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return new Response('Webhook secret not configured', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Verify webhook signature using Web Crypto API
    const isValidSignature = await verifyStripeSignature(
      body,
      signature,
      webhookSecret
    );

    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return new Response('Invalid signature', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Parse the webhook event
    const event: StripeWebhookEvent = JSON.parse(body);
    console.log(`Processing Stripe webhook: ${event.type}`);

    // Handle subscription events
    if (event.type.startsWith('customer.subscription.')) {
      await handleSubscriptionEvent(event);
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response('ok', { headers: corsHeaders });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(`Webhook error: ${error.message}`, {
      status: 400,
      headers: corsHeaders,
    });
  }
});

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Parse signature header (format: "t=timestamp,v1=signature")
    const elements = signature.split(',');
    let timestamp = '';
    let v1Signature = '';
    
    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') v1Signature = value;
    }

    if (!timestamp || !v1Signature) {
      return false;
    }

    // Create signed payload: timestamp + '.' + payload
    const signedPayload = timestamp + '.' + payload;
    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );

    // Convert to hex string for comparison
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedHex === v1Signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

async function handleSubscriptionEvent(event: StripeWebhookEvent) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const subscription = event.data.object;
  const customerId = subscription.customer;
  
  // Get user_id from subscription metadata or customer lookup
  let userId = subscription.metadata?.user_id;
  
  if (!userId) {
    // Look up user by stripe_customer_id
    const { data: proStatusRecord } = await supabase
      .from('pro_status')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    userId = proStatusRecord?.id;
  }

  if (!userId) {
    console.error(`Could not find user for Stripe customer: ${customerId}`);
    return;
  }

  // Map Stripe status to Pro status
  const isActive = ['active', 'trialing'].includes(subscription.status);
  const currentPeriodEnd = subscription.current_period_end || null;

  console.log(`Updating user ${userId}: isActive=${isActive}, status=${subscription.status}`);

  // Use the database function to update Pro status
  const { error } = await supabase.rpc('update_stripe_subscription', {
    p_user_id: userId,
    p_stripe_customer_id: customerId,
    p_is_active: isActive,
    p_current_period_end: currentPeriodEnd
  });

  if (error) {
    console.error('Error updating Pro status:', error);
    throw error;
  }

  console.log(`Successfully updated Pro status for user ${userId}`);
}