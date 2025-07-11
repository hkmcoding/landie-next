export interface AISuggestion {
  id: string;
  user_id: string;
  landing_page_id: string;
  
  // Suggestion details
  suggestion_type: 'performance' | 'content' | 'conversion' | 'engagement' | 'seo';
  title: string;
  description: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  
  // Implementation tracking
  status: 'pending' | 'implemented' | 'dismissed' | 'testing';
  implemented_at?: string;
  dismissed_at?: string;
  
  // Analytics context
  analytics_context?: AnalyticsContext;
  target_section?: string;
  original_content?: string;
  suggested_content?: string;
  
  // AI metadata
  ai_model: string;
  ai_prompt_version: string;
  confidence_score?: number;
  
  created_at: string;
  updated_at: string;
}

export interface SuggestionImplementation {
  id: string;
  suggestion_id: string;
  user_id: string;
  
  // Implementation details
  implemented_content: string;
  implementation_notes?: string;
  partial_implementation: boolean;
  
  // Before/after tracking
  before_analytics?: AnalyticsSnapshot;
  after_analytics?: AnalyticsSnapshot;
  impact_measured_at?: string;
  
  created_at: string;
}

export interface AIAnalysisSession {
  id: string;
  user_id: string;
  landing_page_id: string;
  
  // Analysis details
  analysis_type: 'full' | 'incremental' | 'performance' | 'content';
  trigger_event?: string;
  
  // Analytics snapshot
  analytics_snapshot: AnalyticsSnapshot;
  suggestions_generated: number;
  
  // AI metadata
  ai_model: string;
  processing_time_ms?: number;
  tokens_used?: number;
  
  created_at: string;
}

export interface SuggestionFeedback {
  id: string;
  suggestion_id: string;
  user_id: string;
  
  // Feedback details
  rating?: number; // 1-5
  feedback_text?: string;
  is_helpful?: boolean;
  
  created_at: string;
}

export interface AnalyticsContext {
  page_views: number;
  unique_visitors: number;
  cta_clicks: number;
  conversion_rate: number;
  avg_session_duration: number;
  recent_page_views: number;
  recent_cta_clicks: number;
  content_changes_last_7_days: number;
  generated_at: string;
}

export interface AnalyticsSnapshot {
  page_views: number;
  unique_visitors: number;
  cta_clicks: number;
  conversion_rate: number;
  avg_session_duration: number;
  timestamp: string;
}

export interface UserAnalyticsSummary {
  analytics: {
    total_page_views: number;
    unique_visitors: number;
    total_cta_clicks: number;
    avg_session_duration: number;
    recent_page_views: number;
    recent_cta_clicks: number;
    conversion_rate: number;
  };
  content: {
    name: string;
    bio: string;
    bio_word_count: number;
    services_count: number;
    highlights_count: number;
    testimonials_count: number;
    onboarding_data?: any;
  };
  recent_activity: {
    content_changes_last_7_days: number;
    last_content_change?: string;
  };
  generated_at: string;
}

export interface SuggestionPerformance {
  suggestion_id: string;
  user_id: string;
  landing_page_id: string;
  suggestion_type: string;
  priority: string;
  status: string;
  created_at: string;
  implemented_at?: string;
  
  // Implementation metrics
  was_implemented: boolean;
  partial_implementation?: boolean;
  days_to_implement?: number;
  
  // Feedback metrics
  user_rating?: number;
  is_helpful?: boolean;
  
  // Analytics impact
  before_page_views?: number;
  after_page_views?: number;
  before_cta_clicks?: number;
  after_cta_clicks?: number;
}

// AI Service interfaces
export interface AIAnalysisRequest {
  user_id: string;
  landing_page_id: string;
  analysis_type: 'full' | 'incremental' | 'performance' | 'content';
  trigger_event?: string;
  force_refresh?: boolean;
}

export interface AIAnalysisResponse {
  session_id: string;
  suggestions: AISuggestion[];
  analytics_summary: UserAnalyticsSummary;
  processing_time_ms: number;
  tokens_used: number;
}

export interface SuggestionActionRequest {
  suggestion_id: string;
  action: 'implement' | 'dismiss' | 'test';
  implementation_content?: string;
  implementation_notes?: string;
  partial_implementation?: boolean;
}

export interface SuggestionActionResponse {
  success: boolean;
  implementation_id?: string;
  message: string;
}

// Dashboard display interfaces
export interface SuggestionCard {
  suggestion: AISuggestion;
  implementation?: SuggestionImplementation;
  feedback?: SuggestionFeedback;
  performance?: {
    impact_percentage?: number;
    confidence_level: 'high' | 'medium' | 'low';
    estimated_improvement?: string;
  };
}

export interface AIAssistantDashboard {
  user_name: string;
  analytics_summary: UserAnalyticsSummary;
  suggestions: SuggestionCard[];
  recent_implementations: SuggestionImplementation[];
  performance_overview: {
    total_suggestions: number;
    implemented_suggestions: number;
    dismissed_suggestions: number;
    avg_implementation_time_days: number;
    overall_improvement_rate: number;
  };
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}