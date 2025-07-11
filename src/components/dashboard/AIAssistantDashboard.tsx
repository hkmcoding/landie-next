'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SuggestionCard } from './SuggestionCard';
import { AnalyticsOverview } from './AnalyticsOverview';
import { PerformanceMetrics } from './PerformanceMetrics';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AIErrorBoundary } from '@/components/ui/error-boundary';
import { 
  AISuggestion, 
  UserAnalyticsSummary, 
  SuggestionCard as SuggestionCardType,
  APIResponse 
} from '@/types/ai-assistant';
import { Sparkles, TrendingUp, Brain, RefreshCw } from 'lucide-react';

interface AIAssistantDashboardProps {
  landingPageId: string;
  userName: string;
}

export function AIAssistantDashboard({ landingPageId, userName }: AIAssistantDashboardProps) {
  const [suggestions, setSuggestions] = useState<SuggestionCardType[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<UserAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, [landingPageId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load suggestions and analytics in parallel
      const [suggestionsResponse, analyticsResponse] = await Promise.all([
        fetch(`/api/ai-assistant/suggestions?landing_page_id=${landingPageId}`),
        fetch(`/api/ai-assistant/analytics?landing_page_id=${landingPageId}&type=summary`)
      ]);

      if (!suggestionsResponse.ok || !analyticsResponse.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const suggestionsData: APIResponse<AISuggestion[]> = await suggestionsResponse.json();
      const analyticsData: APIResponse<UserAnalyticsSummary> = await analyticsResponse.json();

      if (!suggestionsData.success || !analyticsData.success) {
        throw new Error(suggestionsData.error || analyticsData.error || 'Failed to load data');
      }

      // Convert suggestions to suggestion cards
      const suggestionCards = await Promise.all(
        (suggestionsData.data || []).map(async (suggestion) => {
          // Get performance data for each suggestion if implemented
          let performance = undefined;
          if (suggestion.status === 'implemented') {
            try {
              const perfResponse = await fetch(`/api/ai-assistant/performance?suggestion_id=${suggestion.id}`);
              if (perfResponse.ok) {
                const perfData: APIResponse = await perfResponse.json();
                if (perfData.success) {
                  performance = perfData.data;
                }
              }
            } catch (e) {
              // Performance data is optional
            }
          }

          return {
            suggestion,
            performance
          } as SuggestionCardType;
        })
      );

      setSuggestions(suggestionCards);
      setAnalyticsSummary(analyticsData.data || null);

      // Check for recent analysis
      const recentSuggestion = suggestionsData.data?.find(s => 
        new Date(s.created_at).getTime() > Date.now() - 1000 * 60 * 60 // Within last hour
      );
      if (recentSuggestion) {
        setLastAnalysisTime(recentSuggestion.created_at);
      }

    } catch (error) {
      console.error('Dashboard loading error:', error);
      let errorMessage = 'Failed to load dashboard';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error: Please check your connection and try again';
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Authentication error: Please refresh the page and log in again';
        } else if (error.message.includes('403')) {
          errorMessage = 'Access denied: You may need to upgrade to Pro for full AI features';
        } else if (error.message.includes('429')) {
          errorMessage = 'Rate limit reached: Please wait a moment before trying again';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const runAIAnalysis = async (analysisType: 'full' | 'incremental' = 'full') => {
    try {
      setIsAnalyzing(true);
      setError(null);

      const response = await fetch('/api/ai-assistant/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landing_page_id: landingPageId,
          analysis_type: analysisType,
          trigger_event: 'manual_dashboard',
          force_refresh: true
        }),
      });

      const data: APIResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Reload dashboard data to show new suggestions
      await loadDashboardData();
      setLastAnalysisTime(new Date().toISOString());

    } catch (error) {
      console.error('AI analysis error:', error);
      let errorMessage = 'Analysis failed';
      
      if (error instanceof Error) {
        if (error.message.includes('Pro subscription required')) {
          errorMessage = 'Pro subscription required for AI analysis. Please upgrade to continue.';
        } else if (error.message.includes('AI usage limit reached')) {
          errorMessage = 'AI usage limit reached. Your limit will reset next month.';
        } else if (error.message.includes('Analysis was performed recently')) {
          errorMessage = 'Analysis was performed recently. Please wait before running another analysis.';
        } else if (error.message.includes('OpenAI')) {
          errorMessage = 'AI service temporarily unavailable. Please try again in a few minutes.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSuggestionAction = async (suggestionId: string, action: 'implement' | 'dismiss' | 'test', data?: any) => {
    try {
      const response = await fetch(`/api/ai-assistant/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...data
        }),
      });

      const result: APIResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Action failed');
      }

      // Reload suggestions to show updated status
      await loadDashboardData();

    } catch (error) {
      console.error('Suggestion action error:', error);
      setError(error instanceof Error ? error.message : 'Action failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const pendingSuggestions = suggestions.filter(s => s.suggestion.status === 'pending');
  const implementedSuggestions = suggestions.filter(s => s.suggestion.status === 'implemented');
  const totalSuggestions = suggestions.length;

  return (
    <AIErrorBoundary>
      <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-6 h-6 text-blue-600" />
              <h1 className="heading-2 text-blue-900">Welcome back, {userName}!</h1>
            </div>
            <p className="paragraph text-blue-700">
              Your AI Marketing Assistant is ready to help optimize your landing page performance.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => runAIAnalysis('full')}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
            {lastAnalysisTime && (
              <p className="caption text-blue-600">
                Last analysis: {new Date(lastAnalysisTime).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="paragraph text-red-700">{error}</p>
        </Card>
      )}

      {/* Analytics Overview */}
      {analyticsSummary && (
        <AnalyticsOverview 
          analytics={analyticsSummary} 
          landingPageId={landingPageId}
        />
      )}

      {/* Performance Metrics */}
      <PerformanceMetrics 
        totalSuggestions={totalSuggestions}
        implementedSuggestions={implementedSuggestions.length}
        pendingSuggestions={pendingSuggestions.length}
        landingPageId={landingPageId}
      />

      {/* AI Suggestions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="heading-3">AI Recommendations</h2>
          </div>
          {pendingSuggestions.length > 0 && (
            <Button
              variant="outline"
              onClick={() => runAIAnalysis('incremental')}
              disabled={isAnalyzing}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>

        {suggestions.length === 0 ? (
          <Card className="p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-500 opacity-50" />
            <h3 className="heading-4 mb-2">No suggestions yet</h3>
            <p className="paragraph text-gray-600 mb-4">
              Run an AI analysis to get personalized recommendations for your landing page.
            </p>
            <Button
              onClick={() => runAIAnalysis('full')}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get AI Suggestions
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {/* Pending Suggestions */}
            {pendingSuggestions.map((suggestionCard) => (
              <SuggestionCard
                key={suggestionCard.suggestion.id}
                suggestionCard={suggestionCard}
                onAction={handleSuggestionAction}
              />
            ))}

            {/* Implemented Suggestions */}
            {implementedSuggestions.length > 0 && (
              <div className="space-y-4">
                <h3 className="heading-4 text-gray-700 mt-6">Recently Implemented</h3>
                {implementedSuggestions.slice(0, 3).map((suggestionCard) => (
                  <SuggestionCard
                    key={suggestionCard.suggestion.id}
                    suggestionCard={suggestionCard}
                    onAction={handleSuggestionAction}
                    showPerformance
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </AIErrorBoundary>
  );
}