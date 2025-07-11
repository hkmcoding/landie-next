'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { SuggestionCard as SuggestionCardType } from '@/types/ai-assistant';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Lightbulb,
  Target,
  BarChart,
  MessageSquare,
  Star
} from 'lucide-react';

interface SuggestionCardProps {
  suggestionCard: SuggestionCardType;
  onAction: (suggestionId: string, action: 'implement' | 'dismiss' | 'test', data?: any) => Promise<void>;
  showPerformance?: boolean;
}

export function SuggestionCard({ suggestionCard, onAction, showPerformance = false }: SuggestionCardProps) {
  const { suggestion, performance } = suggestionCard;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [implementationContent, setImplementationContent] = useState('');
  const [showImplementForm, setShowImplementForm] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'dismissed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'testing': return <Clock className="w-4 h-4 text-blue-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return <BarChart className="w-5 h-5 text-blue-600" />;
      case 'content': return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'conversion': return <Target className="w-5 h-5 text-green-600" />;
      case 'engagement': return <Star className="w-5 h-5 text-orange-600" />;
      case 'seo': return <TrendingUp className="w-5 h-5 text-indigo-600" />;
      default: return <Lightbulb className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleImplement = async () => {
    if (!implementationContent.trim()) {
      alert('Please describe what you implemented');
      return;
    }

    setIsImplementing(true);
    try {
      await onAction(suggestion.id, 'implement', {
        implementation_content: implementationContent,
        implementation_notes: `Implemented via AI Assistant Dashboard on ${new Date().toLocaleDateString()}`
      });
      setShowImplementForm(false);
      setImplementationContent('');
    } catch (error) {
      console.error('Implementation error:', error);
    } finally {
      setIsImplementing(false);
    }
  };

  const handleDismiss = async () => {
    if (confirm('Are you sure you want to dismiss this suggestion?')) {
      await onAction(suggestion.id, 'dismiss');
    }
  };

  const renderPerformanceMetrics = () => {
    if (!performance?.insights || !showPerformance) return null;

    const { impact, confidence, keyMetrics } = performance.insights;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2 mb-3">
          {impact === 'positive' ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : impact === 'negative' ? (
            <TrendingDown className="w-4 h-4 text-red-600" />
          ) : (
            <BarChart className="w-4 h-4 text-gray-600" />
          )}
          <span className="subtitle-3">Performance Impact</span>
          <Badge variant="outline" className={`text-xs ${
            confidence === 'high' ? 'border-green-200 text-green-700' :
            confidence === 'medium' ? 'border-yellow-200 text-yellow-700' :
            'border-gray-200 text-gray-700'
          }`}>
            {confidence} confidence
          </Badge>
        </div>
        
        {keyMetrics.length > 0 && (
          <div className="space-y-1">
            {keyMetrics.map((metric, index) => (
              <p key={index} className="caption text-gray-700">• {metric}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {getTypeIcon(suggestion.suggestion_type)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="subtitle-2">{suggestion.title}</h3>
              {getStatusIcon(suggestion.status)}
            </div>
            <p className="paragraph text-gray-700">{suggestion.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Badge className={getPriorityColor(suggestion.priority)}>
            {suggestion.priority}
          </Badge>
          {suggestion.confidence_score && (
            <Badge variant="outline" className="text-xs">
              {Math.round(suggestion.confidence_score * 100)}% confident
            </Badge>
          )}
        </div>
      </div>

      {/* Reasoning (expandable) */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0 h-auto text-blue-600 hover:text-blue-700"
        >
          {isExpanded ? 'Hide' : 'Show'} reasoning
        </Button>
        
        {isExpanded && (
          <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="paragraph text-blue-800">{suggestion.reasoning}</p>
            {suggestion.target_section && (
              <p className="caption text-blue-600 mt-2">
                Target section: <span className="font-medium">{suggestion.target_section}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Suggested Content */}
      {suggestion.suggested_content && (
        <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
          <p className="caption text-green-700 font-medium mb-1">Suggested content:</p>
          <p className="paragraph text-green-800">{suggestion.suggested_content}</p>
        </div>
      )}

      {/* Performance Metrics */}
      {renderPerformanceMetrics()}

      {/* Action Buttons */}
      {suggestion.status === 'pending' && (
        <div className="flex items-center gap-2 mt-4">
          {!showImplementForm ? (
            <>
              <Button
                onClick={() => setShowImplementForm(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Implement
              </Button>
              <Button
                onClick={() => onAction(suggestion.id, 'test')}
                variant="outline"
                size="sm"
              >
                <Clock className="w-4 h-4 mr-1" />
                Test First
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:border-red-300"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Dismiss
              </Button>
            </>
          ) : (
            <div className="w-full space-y-3">
              <Textarea
                placeholder="Describe what you implemented or how you applied this suggestion..."
                value={implementationContent}
                onChange={(e) => setImplementationContent(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleImplement}
                  disabled={isImplementing || !implementationContent.trim()}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isImplementing ? 'Saving...' : 'Mark as Implemented'}
                </Button>
                <Button
                  onClick={() => {
                    setShowImplementForm(false);
                    setImplementationContent('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Implementation Status */}
      {suggestion.status === 'implemented' && suggestion.implemented_at && (
        <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
          <p className="caption text-green-700">
            ✅ Implemented on {new Date(suggestion.implemented_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {suggestion.status === 'dismissed' && suggestion.dismissed_at && (
        <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="caption text-gray-700">
            ❌ Dismissed on {new Date(suggestion.dismissed_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {suggestion.status === 'testing' && (
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="caption text-blue-700">
            🔬 Currently testing this suggestion
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
        <p className="caption text-gray-500">
          {new Date(suggestion.created_at).toLocaleDateString()}
        </p>
        <p className="caption text-gray-500">
          {suggestion.ai_model} • {suggestion.ai_prompt_version}
        </p>
      </div>
    </Card>
  );
}