import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/supabase/auth-provider';
import { createClient } from '@/lib/supabase/client';

export type PlanType = 'pro' | 'trial' | 'free';

export interface ProStatus {
  isPro: boolean;
  isLoading: boolean;
  expiresAt: string | null;
  daysRemaining: number | null;
  isOverride: boolean;
  stripeCustomerId: string | null;
  notes: string | null;
  plan: PlanType;
}

export function useProStatus(): ProStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<ProStatus>({
    isPro: false,
    isLoading: true,
    expiresAt: null,
    daysRemaining: null,
    isOverride: false,
    stripeCustomerId: null,
    notes: null,
    plan: 'free',
  });

  useEffect(() => {
    if (!user) {
      setStatus({ 
        isPro: false, 
        isLoading: false, 
        expiresAt: null, 
        daysRemaining: null,
        isOverride: false,
        stripeCustomerId: null,
        notes: null,
        plan: 'free',
      });
      return;
    }

    const fetchProStatus = async () => {
      const supabase = createClient();
      
      // Fetch user_pro_status record (try enhanced columns first, fallback to basic)
      let { data, error } = await supabase
        .from('user_pro_status')
        .select('is_pro, pro_expires_at, override_pro, stripe_customer_id, notes')
        .eq('user_id', user.id)
        .maybeSingle();

      // If enhanced columns don't exist yet, fallback to basic columns
      if (error && error.code === '42703') {
        const { data: basicData, error: basicError } = await supabase
          .from('user_pro_status')
          .select('is_pro')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (basicError) {
          console.error('Error fetching basic pro status:', basicError);
          setStatus({ 
            isPro: false, 
            isLoading: false, 
            expiresAt: null, 
            daysRemaining: null,
            isOverride: false,
            stripeCustomerId: null,
            notes: null,
            plan: 'free',
          });
          return;
        }

        // Convert basic data to enhanced format
        data = basicData ? {
          is_pro: basicData.is_pro,
          pro_expires_at: null,
          override_pro: false,
          stripe_customer_id: null,
          notes: null
        } : null;
        error = null;
      }

      if (error) {
        console.error('Error fetching pro status:', error);
        setStatus({ 
          isPro: false, 
          isLoading: false, 
          expiresAt: null, 
          daysRemaining: null,
          isOverride: false,
          stripeCustomerId: null,
          notes: null,
          plan: 'free',
        });
        return;
      }

      // If no pro_status record exists, user is on free plan
      if (!data) {
        setStatus({
          isPro: false,
          isLoading: false,
          expiresAt: null,
          daysRemaining: null,
          isOverride: false,
          stripeCustomerId: null,
          notes: null,
          plan: 'free',
        });
        return;
      }

      // Calculate days remaining
      let daysRemaining: number | null = null;
      if (data.pro_expires_at) {
        const expirationDate = new Date(data.pro_expires_at);
        const now = new Date();
        const diffTime = expirationDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Determine effective Pro status using the same logic as DB function
      const effectiveProStatus = data.is_pro && (
        data.override_pro || 
        data.pro_expires_at === null || 
        (data.pro_expires_at && new Date(data.pro_expires_at) > new Date())
      );

      // Determine plan type
      const isTrial = !effectiveProStatus && 
                     data.pro_expires_at && 
                     new Date(data.pro_expires_at) > new Date();
      
      const plan: PlanType = effectiveProStatus ? 'pro' : isTrial ? 'trial' : 'free';

      setStatus({
        isPro: effectiveProStatus,
        isLoading: false,
        expiresAt: data.pro_expires_at,
        daysRemaining,
        isOverride: data.override_pro,
        stripeCustomerId: data.stripe_customer_id,
        notes: data.notes,
        plan,
      });
    };

    fetchProStatus();
  }, [user]);

  return status;
}