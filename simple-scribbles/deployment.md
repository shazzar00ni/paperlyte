# Paperlyte Deployment Guide

## Netlify (Recommended)

1. Connect your GitHub repository.
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy and enable branch deploys.

## Vercel

```bash
npm install -g vercel
vercel --prod
```

## Traditional Hosting

```bash
npm run build
# Upload dist/ to your web server
```

## Environment Variables

- `VITE_API_BASE_URL` (for API integration)
- `VITE_SUPABASE_URL` (if using Supabase)
- `VITE_SUPABASE_ANON_KEY` (if using Supabase)

---
