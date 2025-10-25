# Admin Scripts

These scripts help you manage invite codes and monitor API usage for your Stock Advisor platform.

## Prerequisites

Make sure the backend is built before running these scripts:

```bash
cd backend
npm run build
```

## Invite Code Management

### Generate Invite Codes

Generate new invite codes for beta testers:

```bash
# Generate 1 code (1 use, never expires)
node scripts/generate-invite.js

# Generate 5 codes (1 use each)
node scripts/generate-invite.js 5

# Generate 3 codes (5 uses each)
node scripts/generate-invite.js 3 5

# Generate 1 code that expires in 30 days
node scripts/generate-invite.js 1 1 30

# Generate 1 code with custom note
node scripts/generate-invite.js 1 1 7 "For John Doe"
```

### List Invite Codes

View all invite codes and their status:

```bash
# List all codes
node scripts/list-invites.js

# List only active codes
node scripts/list-invites.js active
```

## Usage Monitoring

### View API Usage

Monitor how much your users are using the API:

```bash
# View all users' usage overview
node scripts/view-usage.js

# View detailed usage for specific user
node scripts/view-usage.js briculinos
```

## Rate Limiting Configuration

**Default Settings:**
- **Daily Limit:** 10 API calls per day per user
- **Protected Endpoints:**
  - `/api/stock/analyze` - Stock analysis
  - `/api/stock/elliott-wave/:symbol` - Elliott Wave analysis
  - `/api/stock/enhanced-insights` - Enhanced insights
  - `/api/stock/moonshots` - Moonshot candidates

**To change a user's rate limit**, you can modify the `rateLimitService` in the code or manually edit the `data/usage-tracking.json` file.

## How It Works

### Invite Codes
- Users need an invite code to register (unless their email is whitelisted)
- Codes can be single-use or multi-use
- Codes can have expiration dates
- Used codes are tracked with username and timestamp

### Rate Limiting
- Each user has a daily API call limit (default: 10)
- Limits reset at midnight UTC
- Usage is tracked per endpoint
- All usage history is stored for monitoring

## Data Files

All data is stored in the `backend/data/` directory:

- `invite-codes.json` - Invite code database
- `usage-tracking.json` - API usage tracking
- `users.json` - User accounts
- `auth-logs.json` - Authentication logs

## Example Workflow

1. **Generate invite code for a tester:**
   ```bash
   node scripts/generate-invite.js 1 1 30 "Beta tester - Alice"
   ```

2. **Share the code with the tester** (e.g., `BETA-ABC123`)

3. **Monitor their usage:**
   ```bash
   node scripts/view-usage.js alice
   ```

4. **List all active codes:**
   ```bash
   node scripts/list-invites.js active
   ```

## Security Notes

- Keep invite codes private
- Monitor usage regularly to detect abuse
- Rotate codes periodically
- Use short expiration times for testing periods
- Review the `auth-logs.json` for suspicious activity
