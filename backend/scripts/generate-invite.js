/**
 * Admin Script: Generate Invite Codes
 *
 * Usage:
 *   node scripts/generate-invite.js                    # Generate 1 code, 1 use, no expiration
 *   node scripts/generate-invite.js 5                  # Generate 5 codes, 1 use each
 *   node scripts/generate-invite.js 3 5                # Generate 3 codes, 5 uses each
 *   node scripts/generate-invite.js 1 1 30             # Generate 1 code, 1 use, expires in 30 days
 *   node scripts/generate-invite.js 1 1 7 "Test user" # With custom note
 */

// CommonJS require
const { InviteCodeService } = require('../dist/services/inviteCodeService.js');

const inviteCodeService = new InviteCodeService();

// Parse command line arguments
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 1;
const maxUses = parseInt(args[1]) || 1;
const expiresInDays = args[2] ? parseInt(args[2]) : undefined;
const notes = args[3] || undefined;

console.log('\n🎫 Generating Invite Codes\n');
console.log('Configuration:');
console.log(`  Count: ${count}`);
console.log(`  Max uses per code: ${maxUses}`);
console.log(`  Expires in: ${expiresInDays ? `${expiresInDays} days` : 'never'}`);
if (notes) console.log(`  Notes: ${notes}`);
console.log('\n');

// Generate the codes
const generatedCodes = [];

for (let i = 0; i < count; i++) {
  const code = inviteCodeService.generateCode('admin', maxUses, expiresInDays, notes);
  generatedCodes.push(code.code);
}

// Display results
console.log('✅ Generated Invite Codes:\n');
generatedCodes.forEach((code, index) => {
  console.log(`  ${index + 1}. ${code}`);
});

// Display stats
const stats = inviteCodeService.getStats();
console.log('\n📊 Invite Code Statistics:');
console.log(`  Total codes: ${stats.total}`);
console.log(`  Active codes: ${stats.active}`);
console.log(`  Used codes: ${stats.used}`);
console.log(`  Expired codes: ${stats.expired}`);

console.log('\n');
