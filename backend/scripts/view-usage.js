/**
 * Admin Script: View User API Usage Statistics
 *
 * Usage:
 *   node scripts/view-usage.js           # View all users' usage
 *   node scripts/view-usage.js username  # View specific user's detailed usage
 */

const { RateLimitService } = require('../dist/services/rateLimitService.js');

const rateLimitService = new RateLimitService();

const args = process.argv.slice(2);
const username = args[0];

console.log('\n📊 API Usage Statistics\n');

if (username) {
  // Show detailed usage for specific user
  const userStats = rateLimitService.getUserStats(username);

  if (!userStats) {
    console.log(`  User "${username}" not found.\n`);
    process.exit(1);
  }

  console.log(`User: ${userStats.username}`);
  console.log(`Daily Limit: ${userStats.dailyLimit} requests/day`);
  console.log(`Total API Calls: ${userStats.totalApiCalls}`);
  console.log(`\nUsage History (last 30 days):\n`);

  if (userStats.usageHistory.length === 0) {
    console.log('  No usage history.\n');
  } else {
    console.log('┌────────────┬────────┬─────────────────────────────────────────┐');
    console.log('│ Date       │ Count  │ Endpoints                               │');
    console.log('├────────────┼────────┼─────────────────────────────────────────┤');

    userStats.usageHistory.slice(-30).forEach(day => {
      const endpoints = Object.entries(day.endpoints)
        .map(([ep, count]) => `${ep}(${count})`)
        .join(', ')
        .substring(0, 40);

      console.log(`│ ${day.date.padEnd(10)} │ ${day.count.toString().padEnd(6)} │ ${endpoints.padEnd(41)} │`);
    });

    console.log('└────────────┴────────┴─────────────────────────────────────────┘');
  }

  console.log('\n');
} else {
  // Show overview of all users
  const allStats = rateLimitService.getAllStats();

  if (allStats.length === 0) {
    console.log('  No usage data found.\n');
    process.exit(0);
  }

  // Sort by total API calls (descending)
  allStats.sort((a, b) => b.totalApiCalls - a.totalApiCalls);

  console.log('┌────────────────────────┬──────────────┬──────────────────┬─────────────────┐');
  console.log('│ Username               │ Daily Limit  │ Today\'s Usage    │ Total API Calls │');
  console.log('├────────────────────────┼──────────────┼──────────────────┼─────────────────┤');

  const today = new Date().toISOString().split('T')[0];

  allStats.forEach(user => {
    const todayUsage = user.usageHistory.find(h => h.date === today);
    const todayCount = todayUsage ? todayUsage.count : 0;
    const percentage = ((todayCount / user.dailyLimit) * 100).toFixed(0);

    console.log(`│ ${user.username.padEnd(22)} │ ${user.dailyLimit.toString().padEnd(12)} │ ${`${todayCount}/${user.dailyLimit} (${percentage}%)`.padEnd(16)} │ ${user.totalApiCalls.toString().padEnd(15)} │`);
  });

  console.log('└────────────────────────┴──────────────┴──────────────────┴─────────────────┘');

  console.log(`\nTotal Users: ${allStats.length}`);
  console.log(`Total API Calls (All Time): ${allStats.reduce((sum, u) => sum + u.totalApiCalls, 0)}`);
  console.log(`\nTip: Run "node scripts/view-usage.js <username>" for detailed user stats\n`);
}
