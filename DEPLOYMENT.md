# Stock Advisor - Deployment Guide

## Prerequisites
- GitHub account with access to the repository
- Vercel account (free): https://vercel.com
- Railway account (free): https://railway.app

## Backend Deployment (Railway)

### 1. Deploy Backend to Railway

1. Go to https://railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select the `stock-advisor` repository
4. Railway will detect it's a Node.js project
5. Set the root directory to `/backend`

### 2. Configure Environment Variables

In Railway project settings, add these environment variables:

```
NODE_ENV=production
PORT=3001
ANTHROPIC_API_KEY=your_anthropic_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_api_key
JWT_SECRET=your_secure_random_string_here
```

**Important**: Generate a secure JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Deploy

- Railway will automatically deploy your backend
- Note the deployed URL (e.g., `https://your-app.railway.app`)

## Frontend Deployment (Vercel)

### 1. Update Frontend API URL

Before deploying, you need to update the API URL in the frontend:

1. Create a `.env.production` file in the `frontend` directory:
```
REACT_APP_API_URL=https://your-backend-url.railway.app
```

Replace `your-backend-url.railway.app` with your actual Railway backend URL.

### 2. Deploy to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "New Project"
3. Import the `stock-advisor` repository
4. Configure project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. Add environment variable:
   - Key: `REACT_APP_API_URL`
   - Value: Your Railway backend URL (e.g., `https://your-app.railway.app`)

6. Click "Deploy"

### 3. Configure CORS

After deploying, update your backend's CORS settings in `backend/src/server.ts`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app'  // Add your Vercel URL
  ],
  credentials: true
}));
```

Commit and push this change - Railway will auto-deploy.

## Post-Deployment

### Test the Application

1. Visit your Vercel URL
2. Register a new user account
3. Login and test the stock analysis features

### Monitor Logs

- **Backend logs**: Railway dashboard → Your project → Deployments → View logs
- **Frontend logs**: Vercel dashboard → Your project → Deployments → View logs

## Troubleshooting

### Backend Issues

1. **Port binding error**:
   - Ensure `PORT` environment variable is set in Railway
   - Railway automatically assigns a port, make sure your code uses `process.env.PORT`

2. **Authentication failing**:
   - Check JWT_SECRET is set in Railway
   - Verify CORS settings include your Vercel URL

3. **API calls failing**:
   - Verify ANTHROPIC_API_KEY and BRAVE_SEARCH_API_KEY are set
   - Check Railway logs for specific errors

### Frontend Issues

1. **Cannot connect to backend**:
   - Verify REACT_APP_API_URL is set correctly
   - Check browser console for CORS errors
   - Ensure backend CORS allows your Vercel domain

2. **Build fails**:
   - Check build logs in Vercel dashboard
   - Verify all dependencies are in package.json

## Alternative: Deploy Both on Railway

You can also deploy both frontend and backend on Railway:

1. Create two separate Railway services
2. Backend: Same as above
3. Frontend:
   - Set root directory to `/frontend`
   - Add build command: `npm run build`
   - Add start command: `npx serve -s build -p $PORT`
   - Add environment variable: `REACT_APP_API_URL=your-backend-url`

## Security Considerations

1. **JWT_SECRET**: Use a strong, randomly generated secret
2. **API Keys**: Never commit API keys to git
3. **Environment Variables**: Always use environment variables for sensitive data
4. **HTTPS**: Both Vercel and Railway provide HTTPS by default
5. **User Data**: The current implementation stores users in JSON files - consider migrating to a database for production

## Scaling

For production use, consider:
- Migrating from JSON file storage to a database (PostgreSQL, MongoDB)
- Implementing rate limiting
- Adding Redis for session management
- Setting up monitoring (Sentry, LogRocket)
- Implementing automated backups

## Cost

- **Vercel**: Free tier includes 100GB bandwidth/month
- **Railway**: Free tier includes $5 credit/month (enough for small apps)
- **APIs**:
  - Anthropic: Pay per token usage
  - Brave Search: Free tier available

---

**Repository**: https://github.com/briculinos/stock-advisor

For issues or questions, open an issue on GitHub.
