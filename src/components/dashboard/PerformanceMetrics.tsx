'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { APIResponse } from '@/types/ai-assistant';
import { 
  Target, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Award,
  BarChart
} from 'lucide-react';

interface PerformanceMetricsProps {
  totalSuggestions: number;
  implementedSuggestions: number;
  pendingSuggestions: number;
  landingPageId: string;
}

export function PerformanceMetrics({ 
  totalSuggestions, 
  implementedSuggestions, 
  pendingSuggestions,
  landingPageId 
}: PerformanceMetricsProps) {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, [landingPageId]);

  const loadPerformanceData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai-assistant/performance?landing_page_id=${landingPageId}`);
      const data: APIResponse = await response.json();
      
      if (data.success) {
        setPerformanceData(data.data);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const implementationRate = totalSuggestions > 0 
    ? (implementedSuggestions / totalSuggestions) * 100 
    : 0;

  const dismissedSuggestions = totalSuggestions - implementedSuggestions - pendingSuggestions;

  const getImplementationRateColor = () => {
    if (implementationRate >= 75) return 'text-green-600';
    if (implementationRate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImplementationRateBadge = () => {
    if (implementationRate >= 75) return 'Excellent';
    if (implementationRate >= 50) return 'Good';
    if (implementationRate >= 25) return 'Fair';
    return 'Needs Improvement';
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Performance Metrics */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="subtitle-2 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-blue-600" />
            Performance Overview
          </h3>
          {implementationRate > 0 && (
            <Badge variant="outline" className={getImplementationRateColor()}>
              {getImplementationRateBadge()}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="heading-3">{totalSuggestions}</p>
            <p className="caption text-blue-700">Total Suggestions</p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="heading-3">{implementedSuggestions}</p>
            <p className="caption text-green-700">Implemented</p>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="heading-3">{pendingSuggestions}</p>
            <p className="caption text-yellow-700">Pending</p>
          </div>
        </div>

        {totalSuggestions > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="paragraph">Implementation Rate</span>
              <span className={`subtitle-3 ${getImplementationRateColor()}`}>
                {implementationRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${implementationRate}%` }}
              ></div>
            </div>
          </div>
        )}
      </Card>

      {/* Detailed Performance Data */}
      {performanceData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Implementation Stats */}
          <Card className="p-4">
            <h4 className="subtitle-3 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Implementation Impact
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="paragraph">Average Implementation Time</span>
                <span className="subtitle-4">
                  {performanceData.performance_overview.avg_implementation_time_days.toFixed(1)} days
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="paragraph">Overall Improvement Rate</span>
                <span className="subtitle-4 text-green-600">
                  {performanceData.performance_overview.overall_improvement_rate.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="paragraph">Dismissed Suggestions</span>
                <span className="subtitle-4 text-red-600">
                  {performanceData.performance_overview.dismissed_suggestions}
                </span>
              </div>
            </div>
          </Card>

          {/* Top Performing Suggestions */}
          <Card className="p-4">
            <h4 className="subtitle-3 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-600" />
              Recent Success
            </h4>
            
            {performanceData.recent_implementations?.length > 0 ? (
              <div className="space-y-2">
                {performanceData.recent_implementations.slice(0, 3).map((impl: any, index: number) => (
                  <div key={index} className="p-2 bg-gray-50 rounded border">
                    <p className="paragraph font-medium line-clamp-1">{impl.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="caption text-gray-600">
                        {new Date(impl.implemented_at).toLocaleDateString()}
                      </span>
                      {impl.user_rating && (
                        <Badge variant="outline" className="text-xs">
                          {impl.user_rating}/5 ⭐
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="caption text-gray-600">
                No implemented suggestions yet. Start implementing AI recommendations to see impact metrics!
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Getting Started Hint */}
      {totalSuggestions === 0 && (
        <Card className="p-6 text-center border-2 border-dashed border-gray-300">
          <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="heading-4 mb-2">Ready to optimize your landing page?</h3>
          <p className="paragraph text-gray-600 mb-4">
            Get personalized AI recommendations to improve your conversion rate and user engagement.
          </p>
          <p className="caption text-gray-500">
            Performance metrics will appear here once you start implementing suggestions.
          </p>
        </Card>
      )}
    </div>
  );
}