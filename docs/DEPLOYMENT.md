# Deployment Guide

This guide covers deploying Lexa DB to production.

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the easiest option since Next.js is built by Vercel.

#### Steps:

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/lexa-db.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure project:
     - Framework Preset: Next.js
     - Root Directory: ./
   - Add environment variables (same as `.env.local`)
   - Click "Deploy"

3. **Configure Custom Domain** (optional)
   - In Vercel project settings, go to "Domains"
   - Add your custom domain
   - Update DNS records as instructed

### Option 2: Docker + Cloud Platform

Deploy using Docker to any cloud platform (AWS, GCP, Azure, DigitalOcean, etc.)

#### Create Dockerfile:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Build and run:

```bash
docker build -t lexa-db .
docker run -p 3000:3000 --env-file .env.local lexa-db
```

### Option 3: Traditional VPS

Deploy to a VPS like DigitalOcean Droplet or AWS EC2.

#### Steps:

1. **Set up server** (Ubuntu 22.04 recommended)
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   ```

2. **Deploy application**
   ```bash
   # Clone repository
   git clone https://github.com/yourusername/lexa-db.git
   cd lexa-db
   
   # Install dependencies
   npm install
   
   # Create .env.local
   nano .env.local
   # (paste your environment variables)
   
   # Build application
   npm run build
   
   # Start with PM2
   pm2 start npm --name "lexa-db" -- start
   pm2 save
   pm2 startup
   ```

3. **Set up Nginx reverse proxy**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/lexa-db
   ```
   
   Add configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/lexa-db /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Production Checklist

### Security

- [ ] All environment variables are set correctly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is kept secret (never in client code)
- [ ] HTTPS is enabled
- [ ] Supabase RLS policies are tested and verified
- [ ] Rate limiting is configured on API routes
- [ ] CORS is properly configured

### Performance

- [ ] Next.js is built in production mode (`npm run build`)
- [ ] Database indexes are in place (already in schema.sql)
- [ ] Images are optimized
- [ ] CDN is configured for static assets (automatic with Vercel)
- [ ] Database connection pooling is enabled in Supabase

### Monitoring

- [ ] Error tracking is set up (e.g., Sentry)
- [ ] Application logs are being collected
- [ ] Uptime monitoring is configured
- [ ] Supabase monitoring is enabled
- [ ] OpenAI usage is being tracked

### Backup

- [ ] Supabase automatic backups are enabled
- [ ] Database backup strategy is documented
- [ ] Document storage backup is configured
- [ ] Recovery procedures are tested

## Environment Variables for Production

Make sure all these are set in your production environment:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# OpenAI
OPENAI_API_KEY=your_production_openai_key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

## Scaling Considerations

### Database

- Use Supabase Pro plan for better performance
- Consider read replicas for heavy read operations
- Monitor query performance and add indexes as needed

### API

- Implement rate limiting on API routes
- Use caching where appropriate
- Consider a CDN for static assets

### AI/LLM

- Monitor OpenAI usage and costs
- Implement request queuing for high load
- Consider caching common queries
- Set up fallback strategies for API failures

## Monitoring and Maintenance

### Health Checks

Create a health check endpoint:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

### Log Monitoring

- Use Vercel logs if deployed on Vercel
- For other platforms, set up log aggregation (e.g., CloudWatch, Datadog)
- Monitor for errors and performance issues

### Database Maintenance

- Regularly review and optimize slow queries
- Monitor database size and plan for scaling
- Keep Supabase updated to the latest version

## Rollback Procedures

### Vercel

- Vercel keeps previous deployments
- Can rollback instantly from the dashboard
- Keep previous environment variable versions

### Docker/VPS

- Use git tags for releases
- Keep previous builds available
- Document rollback commands:
  ```bash
  git checkout v1.0.0
  npm install
  npm run build
  pm2 restart lexa-db
  ```

## Cost Estimates

### Minimal Setup (Development/Small Team)
- Supabase Free Tier: $0/month
- OpenAI API: ~$10-50/month (depending on usage)
- Vercel Free Tier: $0/month
- **Total: $10-50/month**

### Production Setup (Small Organization)
- Supabase Pro: $25/month
- OpenAI API: ~$100-300/month
- Vercel Pro: $20/month
- **Total: $145-345/month**

### Enterprise Setup (Large Organization)
- Supabase Enterprise: Custom pricing
- OpenAI API: $500+/month
- Vercel Enterprise or dedicated hosting: $500+/month
- **Total: $1000+/month**
