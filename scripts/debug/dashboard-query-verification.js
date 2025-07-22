/**
 * Dashboard Query Verification Script
 * 
 * This script helps verify that only ONE Supabase query fires on dashboard mount
 * Run this in browser console after opening the dashboard
 */

// Monitor console for our dashboard query logs
console.log('🔍 DASHBOARD VERIFICATION: Monitoring for query execution...');
console.log('Expected: 1 query with message "🚀 DASHBOARD: Executing single optimized RPC query"');
console.log('Look for completion message: "✅ DASHBOARD: Single RPC query completed"');
console.log('');

// Override console.log to count dashboard queries
let queryCount = 0;
const originalLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  
  if (message.includes('🚀 DASHBOARD: Executing single optimized RPC query')) {
    queryCount++;
    originalLog(`📊 QUERY #${queryCount}:`, ...args);
    
    if (queryCount > 1) {
      originalLog('❌ WARNING: Multiple queries detected! This should only happen once.');
    }
  } else if (message.includes('✅ DASHBOARD: Single RPC query completed')) {
    originalLog('✅ QUERY COMPLETED:', ...args);
  } else if (message.includes('📊 DASHBOARD: Data loaded')) {
    originalLog('📊 DATA SUMMARY:', ...args);
  } else {
    originalLog(...args);
  }
};

// Summary function
window.verifyDashboardQueries = function() {
  console.log('');
  console.log('=== DASHBOARD QUERY VERIFICATION RESULTS ===');
  console.log(`Total queries executed: ${queryCount}`);
  console.log(`Expected: 1`);
  console.log(`Status: ${queryCount === 1 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (queryCount === 0) {
    console.log('💡 No queries detected. Make sure you\'re on the dashboard page and the RPC function is working.');
  } else if (queryCount > 1) {
    console.log('⚠️  Multiple queries detected. Check for:');
    console.log('   - useEffect dependency issues');
    console.log('   - Component re-mounting');
    console.log('   - State updates causing re-renders');
  } else {
    console.log('🎉 Optimization successful! Only 1 query executed.');
  }
  console.log('');
  return queryCount;
};

console.log('📝 After dashboard loads, run: verifyDashboardQueries()');
console.log('');