export interface AiSuggestion {
  id: string;
  user_id: string;
  type: 'bio' | 'services' | 'highlights';
  suggestion: string | Array<{ title: string; description: string }>;
  created_at: string;
  updated_at: string;
}

export interface LandingPage {
  id: string;
  user_id: string;
  username: string | null;
  headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
  cta_url: string | null;
  bio: string | null;
  profile_image_url: string | null;
  theme_side: string | null;
  name: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  contact_email: string | null;
  show_contact_form: boolean | null;
  onboarding_data: Record<string, unknown>;
  ai_uses: number;
  created_at: string | null;
}

export interface Service {
  id: string;
  landing_page_id: string;
  title: string | null;
  description: string | null;
  price: string | null;
  button_text: string | null;
  button_url: string | null;
  image_urls: string[];
  youtube_url: string | null;
  ai_uses: number;
}

export interface Highlight {
  id: string;
  landing_page_id: string;
  header: string;
  content: string | null;
  ai_uses: number;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  landing_page_id: string;
  quote: string | null;
  author_name: string | null;
  description: string | null;
  image_urls: string[];
  youtube_url: string | null;
}

export interface UserProStatus {
  user_id: string;
  is_pro: boolean;
  updated_at: string;
}

export interface DashboardData {
  landingPage: LandingPage | null;
  services: Service[];
  highlights: Highlight[];
  testimonials: Testimonial[];
  userProStatus: UserProStatus | null;
}

export interface CreateServiceInput {
  title: string;
  description: string;
  price?: string;
  button_text: string;
  button_url: string;
  image_urls: string[];
  youtube_url: string;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  id: string;
}

export interface CreateHighlightInput {
  header: string;
  content: string;
}

export interface UpdateHighlightInput extends Partial<CreateHighlightInput> {
  id: string;
}

export interface CreateTestimonialInput {
  quote: string;
  author_name: string;
  description: string;
  image_urls: string[];
  youtube_url: string;
}

export interface UpdateTestimonialInput extends Partial<CreateTestimonialInput> {
  id: string;
}

export interface UpdateLandingPageInput {
  username?: string;
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  cta_url?: string;
  bio?: string;
  profile_image_url?: string;
  theme_side?: string;
  name?: string;
  instagram_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  contact_email?: string;
  show_contact_form?: boolean;
}

export type DashboardSection = 'profile' | 'services' | 'highlights' | 'testimonials' | 'social' | 'cta' | 'about' | 'analytics';

export interface ContentChange {
  id: string;
  user_id: string;
  landing_page_id: string;
  section: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_type: 'create' | 'update' | 'delete';
  created_at: string;
}

export interface CtaClick {
  id: string;
  user_id: string;
  landing_page_id: string;
  button_text: string | null;
  button_url: string | null;
  visitor_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  created_at: string;
}

export interface PageSession {
  id: string;
  user_id: string;
  landing_page_id: string;
  visitor_id: string;
  session_start: string;
  session_end: string | null;
  duration_seconds: number | null;
  page_views: number;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  created_at: string;
}

export interface PageView {
  id: string;
  user_id: string;
  landing_page_id: string;
  visitor_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  created_at: string;
}

export interface SectionViewEvent {
  id: string;
  user_id: string;
  landing_page_id: string;
  visitor_id: string;
  section_name: string;
  view_duration_ms: number;
  scroll_depth_percent: number;
  created_at: string;
}

export interface UniqueVisitor {
  id: string;
  user_id: string;
  landing_page_id: string;
  visitor_id: string;
  first_visit: string;
  last_visit: string;
  total_visits: number;
  total_page_views: number;
  total_session_duration: number;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  created_at: string;
  updated_at: string;
}

export interface CtaClicksHourlyMV {
  user_id: string;
  landing_page_id: string;
  hour_bucket: string;
  total_clicks: number;
  unique_visitors: number;
}

export interface PageTimeMV {
  user_id: string;
  landing_page_id: string;
  avg_session_duration: number;
  total_sessions: number;
  total_page_views: number;
}

export interface PageViewsHourlyMV {
  user_id: string;
  landing_page_id: string;
  hour_bucket: string;
  total_views: number;
  unique_visitors: number;
}

export interface SectionDropoffMV {
  landing_page_id: string;
  section_order: number;
  section_slug: string;
  views: number;
  dropoffs: number;
  dropoff_rate: number;
}

export interface SectionToCtaMV {
  user_id: string;
  landing_page_id: string;
  section_name: string;
  section_views: number;
  cta_clicks: number;
  conversion_rate: number;
}

export interface AnalyticsData {
  ctaClicks: CtaClick[];
  averagePageSession: PageTimeMV | null;
  uniqueVisits: UniqueVisitor[];
  pageViews: PageView[];
  // Aggregated totals for consistency with pro analytics
  totalPageViews?: number;
  totalCtaClicks?: number;
  totalUniqueVisitors?: number;
  viewsOverTime?: PageViewsHourlyMV[];
  ctaClicksOverTime?: CtaClicksHourlyMV[];
  sectionDropoff?: SectionDropoffMV[];
  sectionToCtaConversion?: SectionToCtaMV[];
  contentChanges?: ContentChange[];
  sectionViewEvents?: SectionViewEvent[];
}