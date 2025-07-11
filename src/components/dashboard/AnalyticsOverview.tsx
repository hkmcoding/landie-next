'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAnalyticsSummary, APIResponse } from '@/types/ai-assistant';
import { 
  Eye, 
  Users, 
  MousePointer, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface AnalyticsOverviewProps {
  analytics: UserAnalyticsSummary;
  landingPageId: string;
}

export function AnalyticsOverview({ analytics, landingPageId }: AnalyticsOverviewProps) {
  const [trends, setTrends] = useState<any>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  const loadTrends = async () => {
    try {
      setIsLoadingTrends(true);
      const response = await fetch(`/api/ai-assistant/analytics?landing_page_id=${landingPageId}&type=trends&days=7`);
      const data: APIResponse = await response.json();
      
      if (data.success) {
        setTrends(data.data);
      }
    } catch (error) {
      console.error('Failed to load trends:', error);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  useEffect(() => {
    loadTrends();
  }, [landingPageId]);

  const { analytics: stats, content, recent_activity } = analytics;

  // Calculate key insights
  const conversionRate = stats.conversion_rate;
  const hasLowTraffic = stats.total_page_views < 100;
  const hasLowConversion = conversionRate < 2;
  const hasNoClicks = stats.total_cta_clicks === 0;
  const isRecentlyActive = recent_activity.content_changes_last_7_days > 0;

  const getInsightColor = (type: 'good' | 'warning' | 'critical') => {
    switch (type) {
      case 'good': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'critical': return 'border-red-200 bg-red-50';
    }
  };

  const getInsightIcon = (type: 'good' | 'warning' | 'critical') => {
    switch (type) {
      case 'good': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'warning': return <Activity className="w-4 h-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
  };

  const insights = [
    ...(hasNoClicks ? [{
      type: 'critical' as const,
      title: 'No CTA clicks detected',
      description: 'Your call-to-action buttons haven\'t received any clicks yet. This is critical for conversions.'
    }] : []),
    ...(hasLowConversion && !hasNoClicks ? [{
      type: 'warning' as const,
      title: 'Low conversion rate',
      description: `${conversionRate.toFixed(1)}% conversion rate is below average. Consider optimizing your CTAs.`
    }] : []),
    ...(hasLowTraffic ? [{
      type: 'warning' as const,
      title: 'Low traffic volume',
      description: 'Limited page views may affect the reliability of conversion metrics.'
    }] : []),
    ...(conversionRate > 5 ? [{
      type: 'good' as const,
      title: 'Strong conversion rate',
      description: `${conversionRate.toFixed(1)}% conversion rate is performing well!`
    }] : []),
    ...(isRecentlyActive ? [{
      type: 'good' as const,
      title: 'Recent content updates',
      description: `${recent_activity.content_changes_last_7_days} changes made in the last 7 days.`
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Main Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="caption text-gray-600">Page Views</p>
              <p className="heading-3">{stats.total_page_views.toLocaleString()}</p>
              <p className="caption text-gray-500">
                {stats.recent_page_views} in last 7 days
              </p>
            </div>
            <Eye className="w-8 h-8 text-blue-600 opacity-70" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="caption text-gray-600">Unique Visitors</p>
              <p className="heading-3">{stats.unique_visitors.toLocaleString()}</p>
              <p className="caption text-gray-500">
                {stats.unique_visitors > 0 ? (stats.total_page_views / stats.unique_visitors).toFixed(1) : '0'} views per visitor
              </p>
            </div>
            <Users className="w-8 h-8 text-green-600 opacity-70" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="caption text-gray-600">CTA Clicks</p>
              <p className="heading-3">{stats.total_cta_clicks.toLocaleString()}</p>
              <p className="caption text-gray-500">
                {stats.recent_cta_clicks} in last 7 days
              </p>
            </div>
            <MousePointer className="w-8 h-8 text-purple-600 opacity-70" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="caption text-gray-600">Conversion Rate</p>
              <p className="heading-3">{conversionRate.toFixed(1)}%</p>
              <p className="caption text-gray-500">
                {stats.avg_session_duration.toFixed(0)}s avg session
              </p>
            </div>
            <div className="flex items-center">
              {conversionRate > 3 ? (
                <TrendingUp className="w-8 h-8 text-green-600 opacity-70" />
              ) : conversionRate > 1 ? (
                <Activity className="w-8 h-8 text-yellow-600 opacity-70" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600 opacity-70" />
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Content Overview */}
      <Card className="p-4">
        <h3 className="subtitle-2 mb-3">Content Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="heading-4">{content.bio_word_count}</p>
            <p className="caption text-gray-600">Bio words</p>
          </div>
          <div>
            <p className="heading-4">{content.services_count}</p>
            <p className="caption text-gray-600">Services</p>
          </div>
          <div>
            <p className="heading-4">{content.highlights_count}</p>
            <p className="caption text-gray-600">Highlights</p>
          </div>
          <div>
            <p className="heading-4">{content.testimonials_count}</p>
            <p className="caption text-gray-600">Testimonials</p>
          </div>
        </div>
      </Card>

      {/* Key Insights */}
      {insights.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="subtitle-2">Key Insights</h3>
            {trends && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadTrends}
                disabled={isLoadingTrends}
              >
                {isLoadingTrends ? 'Loading...' : 'Refresh'}
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div>
                    <p className="subtitle-3 mb-1">{insight.title}</p>
                    <p className="caption text-gray-700">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trends Summary */}
      {trends && (
        <Card className="p-4">
          <h3 className="subtitle-2 mb-3">7-Day Trends</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="paragraph">Overall trend:</span>
              <div className="flex items-center gap-2">
                {trends.insights.trendDirection === 'improving' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : trends.insights.trendDirection === 'declining' ? (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                ) : (
                  <Activity className="w-4 h-4 text-gray-600" />
                )}
                <span className="caption font-medium">
                  {trends.insights.trendDirection}
                </span>
              </div>
            </div>
            
            {trends.insights.keyChanges.map((change: string, index: number) => (
              <p key={index} className="caption text-gray-600">• {change}</p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}