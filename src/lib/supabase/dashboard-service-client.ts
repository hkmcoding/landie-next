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
    try {
      const landingPageId = await this.getLandingPageId(userId);
      
      const [landingPageResult, servicesResult, highlightsResult, testimonialsResult, userProStatusResult] = await Promise.all([
        this.supabase
          .from('landing_pages')
          .select('*')
          .eq('user_id', userId)
          .single(),
        this.supabase
          .from('services')
          .select('*')
          .eq('landing_page_id', landingPageId)
          .order('order_index', { ascending: true }),
        this.supabase
          .from('highlights')
          .select('*')
          .eq('landing_page_id', landingPageId)
          .order('order_index', { ascending: true }),
        this.supabase
          .from('testimonials')
          .select('*')
          .eq('landing_page_id', landingPageId)
          .order('order_index', { ascending: true }),
        this.supabase
          .from('user_pro_status')
          .select('*')
          .eq('user_id', userId)
          .single()
      ]);

      // Check for errors but don't throw for missing user_pro_status
      if (landingPageResult.error) {
        console.error('Landing page error:', landingPageResult.error);
        // Don't throw here - let it continue with null data
      }
      if (servicesResult.error) {
        console.error('Services error:', servicesResult.error);
        console.error('Services error details:', JSON.stringify(servicesResult.error, null, 2));
      }
      if (highlightsResult.error) {
        console.error('Highlights error:', highlightsResult.error);
      }
      if (testimonialsResult.error) {
        console.error('Testimonials error:', testimonialsResult.error);
      }
      if (userProStatusResult.error && userProStatusResult.error.code !== 'PGRST116') {
        console.error('User pro status error:', userProStatusResult.error);
      }

      return {
        landingPage: landingPageResult.data,
        services: servicesResult.data || [],
        highlights: highlightsResult.data || [],
        testimonials: testimonialsResult.data || [],
        userProStatus: userProStatusResult.data || { user_id: userId, is_pro: false }
      };
    } catch (error) {
      console.error('Dashboard data error:', error);
      throw new Error(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getLandingPageId(userId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('landing_pages')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error getting landing page ID:', error);
      return '';
    }
    
    return data?.id || '';
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