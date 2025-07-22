/**
 * Web Vitals Monitoring for Performance Optimization Verification
 * 
 * This module tracks Core Web Vitals to verify our performance improvements:
 * - FCP (First Contentful Paint) - Target: < 3s
 * - LCP (Largest Contentful Paint) - Target: < 5s  
 * - TBT (Total Blocking Time) - Target: < 300ms
 * - CLS (Cumulative Layout Shift) - Target: 0
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Performance thresholds based on our optimization goals
const PERFORMANCE_THRESHOLDS = {
  FCP: 3000,  // 3 seconds
  LCP: 5000,  // 5 seconds
  TBT: 300,   // 300ms
  CLS: 0.1,   // 0.1
  TTFB: 600,  // 600ms
} as const;

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: number;
  improvement?: string;
}

let metrics: VitalMetric[] = [];

function sendToAnalytics(metric: any) {
  const vitalMetric: VitalMetric = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    threshold: PERFORMANCE_THRESHOLDS[metric.name as keyof typeof PERFORMANCE_THRESHOLDS] || 0,
  };

  // Add improvement context based on our optimizations
  switch (metric.name) {
    case 'FCP':
      vitalMetric.improvement = 'Optimized with server-side pre-rendering and image lazy loading';
      break;
    case 'LCP':
      vitalMetric.improvement = 'Reduced via single RPC query and deferred image loading';
      break;
    case 'CLS':
      vitalMetric.improvement = 'Maintained with proper image dimensions and lazy loading';
      break;
    case 'FID':
      vitalMetric.improvement = 'Improved with component memoization and reduced main thread blocking';
      break;
    case 'TTFB':
      vitalMetric.improvement = 'Enhanced with optimized database queries';
      break;
  }

  metrics.push(vitalMetric);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚀 Web Vital: ${metric.name}`);
    console.log(`Value: ${metric.value}ms`);
    console.log(`Rating: ${metric.rating}`);
    console.log(`Threshold: ${vitalMetric.threshold}ms`);
    console.log(`Status: ${metric.value <= vitalMetric.threshold ? '✅ PASS' : '❌ NEEDS WORK'}`);
    if (vitalMetric.improvement) {
      console.log(`Optimization: ${vitalMetric.improvement}`);
    }
    console.groupEnd();
  }

  // Send to analytics in production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // You can replace this with your analytics service
    // Examples: Google Analytics, Vercel Analytics, etc.
    
    // Example for Google Analytics 4
    if ('gtag' in window) {
      (window as any).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }

    // Example for Vercel Analytics
    if ('va' in window) {
      (window as any).va('track', 'Web Vital', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
      });
    }
  }
}

export function initWebVitals() {
  // Only run in browser
  if (typeof window === 'undefined') return;

  console.log('🔍 Initializing Web Vitals monitoring...');
  console.log('Performance targets:');
  console.log('- FCP < 3s (currently targeting 2.8s)');
  console.log('- LCP < 5s (currently targeting 4.2s)');
  console.log('- TBT < 300ms (currently targeting 290ms)');
  console.log('- CLS = 0 (maintained)');

  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}

export function getMetrics(): VitalMetric[] {
  return metrics;
}

export function getPerformanceReport() {
  const report = {
    timestamp: new Date().toISOString(),
    metrics: metrics,
    summary: {
      passed: metrics.filter(m => m.value <= m.threshold).length,
      total: metrics.length,
      score: metrics.length > 0 ? Math.round((metrics.filter(m => m.value <= m.threshold).length / metrics.length) * 100) : 0,
    },
    recommendations: [] as string[],
  };

  // Add recommendations based on failed metrics
  metrics.forEach(metric => {
    if (metric.value > metric.threshold) {
      switch (metric.name) {
        case 'FCP':
          report.recommendations.push('Consider further optimizing server response time and critical resource loading');
          break;
        case 'LCP':
          report.recommendations.push('Review largest image/element loading and consider further optimization');
          break;
        case 'TBT':
          report.recommendations.push('Add more component memoization or split heavy computations');
          break;
        case 'CLS':
          report.recommendations.push('Ensure all images have proper dimensions and avoid layout shifts');
          break;
      }
    }
  });

  return report;
}