import { createClient } from './client';
import { 
  LandingPage, 
  Service, 
  Highlight, 
  Testimonial, 
  UserProStatus,
  DashboardData,
  CreateServiceInput,
  UpdateServiceInput,
  CreateHighlightInput,
  UpdateHighlightInput,
  CreateTestimonialInput,
  UpdateTestimonialInput,
  UpdateLandingPageInput
} from '@/types/dashboard';

export class DashboardServiceClient {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  async getDashboardData(userId: string): Promise<DashboardData> {
    console.log('🚀 DASHBOARD: Executing single optimized RPC query for user:', userId);
    console.log('🔥 DEBUG TEST - THIS SHOULD ALWAYS SHOW');
    const startTime = performance.now();
    
    try {
      // Use optimized single RPC call instead of 6 separate queries
      const { data, error } = await this.supabase
        .rpc('get_dashboard_data_optimized', {
          p_user_id: userId
        });

      const queryTime = performance.now() - startTime;
      console.log(`✅ DASHBOARD: Single RPC query completed in ${queryTime.toFixed(2)}ms`);

      if (error) {
        console.error('Dashboard RPC error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from dashboard RPC');
      }

      // Debug what RPC is returning
      console.log('🔍 RAW RPC DATA FOR USER:', userId);
      console.log('🔍 FULL RPC RESPONSE:', JSON.stringify(data, null, 2));
      console.log('🔍 PRO STATUS FIELD:', {
        user_pro_status: data.user_pro_status,
        user_pro_status_type: typeof data.user_pro_status,
        user_pro_status_stringified: JSON.stringify(data.user_pro_status),
        is_pro_value: data.user_pro_status?.is_pro,
        is_pro_type: typeof data.user_pro_status?.is_pro
      });

      const result = {
        landingPage: data.landing_page,
        services: data.services || [],
        highlights: data.highlights || [],
        testimonials: data.testimonials || [],
        userProStatus: data.user_pro_status || { user_id: userId, is_pro: false }
      };

      console.log('📊 DASHBOARD: Data loaded:', {
        landingPage: !!result.landingPage,
        services: result.services.length,
        highlights: result.highlights.length,
        testimonials: result.testimonials.length,
        userProStatus: result.userProStatus,
        isPro: result.userProStatus?.is_pro
      });

      return result;
    } catch (error) {
      console.error('❌ DASHBOARD: Query failed:', error);
      throw new Error(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  // Landing Page methods
  async updateLandingPage(userId: string, input: UpdateLandingPageInput): Promise<LandingPage | null> {
    const { data, error } = await this.supabase
      .from('landing_pages')
      .update(input)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createLandingPage(userId: string, input: Partial<LandingPage>): Promise<LandingPage | null> {
    const { data, error } = await this.supabase
      .from('landing_pages')
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Service methods
  async createService(landingPageId: string, input: CreateServiceInput): Promise<Service | null> {
    const { data, error } = await this.supabase
      .from('services')
      .insert({ ...input, landing_page_id: landingPageId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateService(id: string, input: UpdateServiceInput): Promise<Service | null> {
    const { data, error } = await this.supabase
      .from('services')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteService(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateServicesOrder(services: Service[]): Promise<void> {
    const updates = services.map((service, index) => ({
      id: service.id,
      order_index: index
    }));

    for (const update of updates) {
      const { error } = await this.supabase
        .from('services')
        .update({ order_index: update.order_index })
        .eq('id', update.id);

      if (error) throw error;
    }
  }

  async getServices(landingPageId: string): Promise<Service[]> {
    const { data, error } = await this.supabase
      .from('services')
      .select('*')
      .eq('landing_page_id', landingPageId);

    if (error) throw error;
    return data || [];
  }

  // Highlight methods
  async createHighlight(landingPageId: string, input: CreateHighlightInput): Promise<Highlight | null> {
    const { data, error } = await this.supabase
      .from('highlights')
      .insert({ ...input, landing_page_id: landingPageId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateHighlight(id: string, input: UpdateHighlightInput): Promise<Highlight | null> {
    const { data, error } = await this.supabase
      .from('highlights')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteHighlight(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('highlights')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateHighlightsOrder(highlights: Highlight[]): Promise<void> {
    const updates = highlights.map((highlight, index) => ({
      id: highlight.id,
      order_index: index
    }));

    for (const update of updates) {
      const { error } = await this.supabase
        .from('highlights')
        .update({ order_index: update.order_index })
        .eq('id', update.id);

      if (error) throw error;
    }
  }

  async getHighlights(landingPageId: string): Promise<Highlight[]> {
    const { data, error } = await this.supabase
      .from('highlights')
      .select('*')
      .eq('landing_page_id', landingPageId);

    if (error) throw error;
    return data || [];
  }

  // Testimonial methods
  async createTestimonial(landingPageId: string, input: CreateTestimonialInput): Promise<Testimonial | null> {
    const { data, error } = await this.supabase
      .from('testimonials')
      .insert({ ...input, landing_page_id: landingPageId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTestimonial(id: string, input: UpdateTestimonialInput): Promise<Testimonial | null> {
    const { data, error } = await this.supabase
      .from('testimonials')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTestimonial(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('testimonials')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateTestimonialsOrder(testimonials: Testimonial[]): Promise<void> {
    const updates = testimonials.map((testimonial, index) => ({
      id: testimonial.id,
      order_index: index
    }));

    for (const update of updates) {
      const { error } = await this.supabase
        .from('testimonials')
        .update({ order_index: update.order_index })
        .eq('id', update.id);

      if (error) throw error;
    }
  }

  async getTestimonials(landingPageId: string): Promise<Testimonial[]> {
    const { data, error } = await this.supabase
      .from('testimonials')
      .select('*')
      .eq('landing_page_id', landingPageId);

    if (error) throw error;
    return data || [];
  }

  // File upload methods
  async uploadImage(bucket: string, path: string, file: File): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  }

  async deleteImage(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }

  // Pro status methods
  async getUserProStatus(userId: string): Promise<UserProStatus | null> {
    const { data, error } = await this.supabase
      .from('user_pro_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateUserProStatus(userId: string, isPro: boolean): Promise<UserProStatus | null> {
    const { data, error } = await this.supabase
      .from('user_pro_status')
      .upsert({ user_id: userId, is_pro: isPro })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}