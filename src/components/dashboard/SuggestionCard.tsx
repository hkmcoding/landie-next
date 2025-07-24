'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
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
  Star,
  ExternalLink
} from 'lucide-react';

interface SuggestionCardProps {
  suggestionCard: SuggestionCardType;
  onAction: (suggestionId: string, action: 'implement' | 'dismiss' | 'auto_apply', data?: any) => Promise<void>;
  showPerformance?: boolean;
}

export function SuggestionCard({ suggestionCard, onAction, showPerformance = false }: SuggestionCardProps) {
  const { suggestion, performance } = suggestionCard;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [isAutoApplying, setIsAutoApplying] = useState(false);
  const [implementationContent, setImplementationContent] = useState('');
  const [showImplementForm, setShowImplementForm] = useState(false);
  const [showDismissDialog, setShowDismissDialog] = useState(false);

  // Determine if this suggestion can be auto-applied
  const canAutoApply = () => {
    if (!suggestion.target_section || !suggestion.suggested_content) {
      return false;
    }

    // Determine if this is a simple change that can be auto-applied
    const targetSection = suggestion.target_section.toLowerCase();
    
    // Simple text field updates that can be auto-applied
    const simpleTextUpdates = [
      'bio',
      'headline', 
      'subheadline',
      'cta_text',
      'cta',        // Maps to cta_text
      'cta_url',
      'contact_email'
    ];

    // Check if it's a simple text update
    if (simpleTextUpdates.includes(targetSection)) {
      return true;
    }

    // Only allow auto-apply for TRUE reordering (JSON array format with existing IDs)
    // NOT for content replacement disguised as "reorganizing"
    const looksLikeReordering = suggestion.suggested_content.trim().startsWith('[') && 
                               suggestion.suggested_content.trim().endsWith(']');

    if (looksLikeReordering && ['highlights', 'services', 'testimonials'].includes(targetSection)) {
      return true;
    }

    return false;
  };

  const handleAutoApply = async () => {
    setIsAutoApplying(true);
    try {
      await onAction(suggestion.id, 'auto_apply', {
        target_section: suggestion.target_section,
        suggested_content: suggestion.suggested_content,
        implementation_content: suggestion.suggested_content,
        implementation_notes: `Auto-applied AI suggestion for ${suggestion.target_section} on ${new Date().toLocaleDateString()}`
      });
    } catch (error) {
      console.error('Auto-apply error:', error);
    } finally {
      setIsAutoApplying(false);
    }
  };

  const getDashboardTabUrl = () => {
    const targetSection = suggestion.target_section?.toLowerCase();
    
    // Map target sections to correct dashboard sections
    const sectionToTab: { [key: string]: string } = {
      'highlights': '/dashboard?section=highlights',
      'services': '/dashboard?section=services', 
      'testimonials': '/dashboard?section=testimonials',
      'bio': '/dashboard?section=about',  // Bio is in the About section
      'headline': '/dashboard?section=profile',
      'subheadline': '/dashboard?section=profile',
      'cta': '/dashboard?section=cta',
      'cta_text': '/dashboard?section=cta',
      'cta_url': '/dashboard?section=cta',
      'contact_email': '/dashboard?section=profile'
    };

    return sectionToTab[targetSection] || '/dashboard';
  };

  const getPriorityVariant = (priority: string): 'danger' | 'warning' | 'success' | 'default' => {
    switch (priority) {
      case 'high': return 'danger';     // Red for high priority
      case 'medium': return 'warning';  // Yellow for medium priority  
      case 'low': return 'success';     // Green for low priority
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'dismissed': return <XCircle className="w-4 h-4 text-red-600" />;
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
    await onAction(suggestion.id, 'dismiss');
    setShowDismissDialog(false);
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
          <span className="body-small font-medium">Performance Impact</span>
          <Badge variant={confidence === 'high' ? 'default' : 'outline'}>
            {confidence} confidence
          </Badge>
        </div>
        
        {keyMetrics.length > 0 && (
          <div className="space-y-1">
            {keyMetrics.map((metric, index) => (
              <p key={index} className="body-small text-gray-700">• {metric}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      {/* Header with title and status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {getTypeIcon(suggestion.suggestion_type)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="body-large font-semibold">{suggestion.title}</h3>
              {getStatusIcon(suggestion.status)}
            </div>
            <p className="body-medium text-gray-700">{suggestion.description}</p>
          </div>
        </div>
        
        {/* Badges - desktop on right, mobile below */}
        <div className="hidden sm:flex flex-col items-end gap-2 flex-shrink-0">
          <Badge variant={getPriorityVariant(suggestion.priority)}>
            {suggestion.priority}
          </Badge>
          {suggestion.confidence_score && (
            <Badge variant="outline" className="text-xs">
              {Math.round(suggestion.confidence_score * 100)}% confident
            </Badge>
          )}
        </div>
      </div>
      
      {/* Mobile badges - show below content on mobile */}
      <div className="flex flex-wrap items-center gap-2 mb-3 sm:hidden">
        <Badge variant={getPriorityVariant(suggestion.priority)}>
          {suggestion.priority}
        </Badge>
        {suggestion.confidence_score && (
          <Badge variant="outline" className="text-xs">
            {Math.round(suggestion.confidence_score * 100)}% confident
          </Badge>
        )}
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
            <p className="body-medium text-blue-800">{suggestion.reasoning}</p>
            {suggestion.target_section && (
              <p className="body-small text-blue-600 mt-2">
                Target section: <span className="font-medium">{suggestion.target_section}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Suggested Content */}
      {suggestion.suggested_content && (
        <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
          <p className="body-small text-green-700 font-medium mb-1">Suggested content:</p>
          <p className="body-medium text-green-800">{suggestion.suggested_content}</p>
        </div>
      )}

      {/* Performance Metrics */}
      {renderPerformanceMetrics()}

      {/* Action Buttons */}
      {suggestion.status === 'pending' && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center mt-4">
          {!showImplementForm ? (
            <>
              {canAutoApply() ? (
                <Button
                  onClick={handleAutoApply}
                  disabled={isAutoApplying}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {isAutoApplying ? 'Applying...' : 'Apply Now'}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => window.open(getDashboardTabUrl(), '_blank')}
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Go to Section
                  </Button>
                  <Button
                    onClick={() => onAction(suggestion.id, 'implement', { implementation_content: 'Completed', implementation_notes: 'Marked as completed by user' })}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Mark Completed
                  </Button>
                </>
              )}
              <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Dismiss
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dismiss Suggestion</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to dismiss this suggestion? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDismissDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDismiss}>
                      Dismiss
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
          <p className="body-small text-green-700">
            ✅ Implemented on {new Date(suggestion.implemented_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {suggestion.status === 'dismissed' && suggestion.dismissed_at && (
        <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="body-small text-gray-700">
            ❌ Dismissed on {new Date(suggestion.dismissed_at).toLocaleDateString()}
          </p>
        </div>
      )}


      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
        <p className="body-small text-gray-500">
          {new Date(suggestion.created_at).toLocaleDateString()}
        </p>
        <p className="body-small text-gray-500">
          AI Generated
        </p>
      </div>
    </Card>
  );
}