/**
 * Admin Script: List All Invite Codes
 *
 * Usage:
 *   node scripts/list-invites.js        # List all codes
 *   node scripts/list-invites.js active # List only active codes
 */

const { InviteCodeService } = require('../dist/services/inviteCodeService.js');

const inviteCodeService = new InviteCodeService();

const args = process.argv.slice(2);
const filter = args[0] || 'all'; // 'all' or 'active'

console.log('\n🎫 Invite Codes\n');

const codes = filter === 'active'
  ? inviteCodeService.getActiveCodes()
  : inviteCodeService.getAllCodes();

if (codes.length === 0) {
  console.log('  No codes found.\n');
  process.exit(0);
}

// Sort by creation date (newest first)
codes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

// Display table
console.log('┌────────────────┬────────┬────────┬─────────────┬────────────────┬─────────────────────┬──────────────┐');
console.log('│ Code           │ Status │ Uses   │ Max Uses    │ Expires        │ Used By             │ Notes        │');
console.log('├────────────────┼────────┼────────┼─────────────┼────────────────┼─────────────────────┼──────────────┤');

codes.forEach(code => {
  const status = !code.isActive ? 'DISABLED'
    : code.currentUses >= code.maxUses ? 'USED'
    : code.expiresAt && new Date(code.expiresAt) < new Date() ? 'EXPIRED'
    : 'ACTIVE';

  const statusColor = status === 'ACTIVE' ? '\x1b[32m' : status === 'DISABLED' ? '\x1b[31m' : '\x1b[33m';
  const resetColor = '\x1b[0m';

  const usesDisplay = `${code.currentUses}/${code.maxUses}`;
  const expiresDisplay = code.expiresAt
    ? new Date(code.expiresAt).toISOString().split('T')[0]
    : 'Never';
  const usedByDisplay = code.usedBy || '-';
  const notesDisplay = code.notes || '-';

  console.log(`│ ${code.code.padEnd(14)} │ ${statusColor}${status.padEnd(6)}${resetColor} │ ${usesDisplay.padEnd(6)} │ ${code.maxUses.toString().padEnd(11)} │ ${expiresDisplay.padEnd(14)} │ ${usedByDisplay.padEnd(19)} │ ${notesDisplay.substring(0, 12).padEnd(12)} │`);
});

console.log('└────────────────┴────────┴────────┴─────────────┴────────────────┴─────────────────────┴──────────────┘');

// Display stats
const stats = inviteCodeService.getStats();
console.log('\n📊 Statistics:');
console.log(`  Total: ${stats.total} | Active: ${stats.active} | Used: ${stats.used} | Expired: ${stats.expired}`);
console.log('\n');
