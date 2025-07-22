import { createClient } from './client';
import { createClient as createServerClient } from './server';
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

export class DashboardService {
  private supabase;
  private isServer: boolean;

  constructor(isServer: boolean = false) {
    this.isServer = isServer;
    if (isServer) {
      // For server-side, we'll handle the async client creation in methods
      this.supabase = null;
    } else {
      this.supabase = createClient();
    }
  }

  private async getClient() {
    if (this.isServer) {
      return await createServerClient();
    }
    return this.supabase;
  }

  async getDashboardData(userId: string): Promise<DashboardData> {
    const supabase = await this.getClient();
    
    // Use optimized single RPC call instead of 6 separate queries
    const { data, error } = await supabase
      .rpc('get_dashboard_data_optimized', {
        p_user_id: userId
      });

    if (error) {
      console.error('Dashboard RPC error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from dashboard RPC');
    }

    return {
      landingPage: data.landing_page,
      services: data.services || [],
      highlights: data.highlights || [],
      testimonials: data.testimonials || [],
      userProStatus: data.user_pro_status || { user_id: userId, is_pro: false }
    };
  }


  // Landing Page methods
  async updateLandingPage(userId: string, input: UpdateLandingPageInput): Promise<LandingPage | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('landing_pages')
      .update(input)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createLandingPage(userId: string, input: Partial<LandingPage>): Promise<LandingPage | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('landing_pages')
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Service methods
  async createService(landingPageId: string, input: CreateServiceInput): Promise<Service | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('services')
      .insert({ ...input, landing_page_id: landingPageId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateService(id: string, input: UpdateServiceInput): Promise<Service | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('services')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteService(id: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getServices(landingPageId: string): Promise<Service[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('landing_page_id', landingPageId);

    if (error) throw error;
    return data || [];
  }

  // Highlight methods
  async createHighlight(landingPageId: string, input: CreateHighlightInput): Promise<Highlight | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('highlights')
      .insert({ ...input, landing_page_id: landingPageId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateHighlight(id: string, input: UpdateHighlightInput): Promise<Highlight | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('highlights')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteHighlight(id: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase
      .from('highlights')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getHighlights(landingPageId: string): Promise<Highlight[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('highlights')
      .select('*')
      .eq('landing_page_id', landingPageId);

    if (error) throw error;
    return data || [];
  }

  // Testimonial methods
  async createTestimonial(landingPageId: string, input: CreateTestimonialInput): Promise<Testimonial | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('testimonials')
      .insert({ ...input, landing_page_id: landingPageId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTestimonial(id: string, input: UpdateTestimonialInput): Promise<Testimonial | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('testimonials')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTestimonial(id: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getTestimonials(landingPageId: string): Promise<Testimonial[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('landing_page_id', landingPageId);

    if (error) throw error;
    return data || [];
  }

  // File upload methods
  async uploadImage(bucket: string, path: string, file: File): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  }

  async deleteImage(bucket: string, path: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }

  // Pro status methods
  async getUserProStatus(userId: string): Promise<UserProStatus | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('user_pro_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateUserProStatus(userId: string, isPro: boolean): Promise<UserProStatus | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('user_pro_status')
      .upsert({ user_id: userId, is_pro: isPro })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}