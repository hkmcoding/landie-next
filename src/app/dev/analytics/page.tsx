import DevAnalytics from './DevAnalytics';

export default async function DevAnalyticsPage() {
  // For dev purposes, always show the analytics without auth requirement
  return <DevAnalytics />;
}