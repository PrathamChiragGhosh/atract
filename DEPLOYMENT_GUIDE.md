# Atract Platform - Deployment Guide

## Overview

This document outlines the complete deployment architecture and steps for the Atract platform with subdomain-based micro-apps structure.

---

## Architecture Overview

### Domain Structure
- **Main Domain**: `atract.in`
- **Tools Hub**: `tools.atract.in` → `/free-tools`
- **Resume Builder**: `resume.atract.in` → `/jobseeker/resume-builder`
- **JD Generator**: `jd.atract.in` → `/free-tools/jd-generator`
- **PDF Compressor**: `pdf.atract.in` → `/compress-pdf`
- **Interview Questions**: `interview.atract.in` → `/free-tools/interview-questions-generator`
- **Smart Filter**: `filter.atract.in` → `/employer/smart-filter`
- **Smart Select**: `select.atract.in` → `/employer/smart-select`
- **Voice Agent**: `voice.atract.in` → `/employer/voice-agent`
- **Jobs Portal**: `jobs.atract.in` → `/jobs`
- **Blog**: `blog.atract.in` → `/blogs`
- **Employer Portal**: `hiring.atract.in` → `/employer`

---

## Phase 1: DNS Configuration (Required)

### Set up CNAME records with your DNS provider:

```
tools.atract.in        CNAME   your-frontend-project.up.railway.app
resume.atract.in       CNAME   your-frontend-project.up.railway.app
jd.atract.in           CNAME   your-frontend-project.up.railway.app
pdf.atract.in          CNAME   your-frontend-project.up.railway.app
interview.atract.in    CNAME   your-frontend-project.up.railway.app
filter.atract.in       CNAME   your-frontend-project.up.railway.app
select.atract.in       CNAME   your-frontend-project.up.railway.app
voice.atract.in       CNAME   your-frontend-project.up.railway.app
jobs.atract.in         CNAME   your-frontend-project.up.railway.app
blog.atract.in         CNAME   your-frontend-project.up.railway.app
hiring.atract.in       CNAME   your-frontend-project.up.railway.app
```

---

## Phase 2: MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a free cluster (M0)

### Step 2: Configure Network Access
1. Go to Network Access
2. Add IP Whitelist: `0.0.0.0/0` (for Railway) or specific Railway IP

### Step 3: Create Database User
1. Database Access → Add New User
2. Username: `atract_admin`
3. Password: Generate strong password
4. privileges: Read and Write to any database

### Step 4: Get Connection String
1. Database → Connect → Connect your application
2. Copy the connection string:
```
mongodb+srv://<username>:<password>@cluster.mongodb.net/atract?retryWrites=true&w=majority
```

---

## Phase 3: Railway Deployment

### Backend Deployment

1. **Create Railway Account**
   - Go to [Railway](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - New Project → Deploy from GitHub repo
   - Select your repository
   - Select the `backend` folder

3. **Configure Environment Variables**
   - Go to Variables tab
   - Add all variables from `backend/.env.railway`
   - Update with actual values:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `JWT_SECRET`: Generate a secure random string
     - `EMAIL_*`: Your email configuration
     - `RAZORPAY_*`: Your Razorpay keys
     - `STRIPE_*`: Your Stripe keys
     - `OPENAI_API_KEY`: Your OpenAI key (optional)
     - `GEMINI_API_KEY`: Your Gemini key (optional)

4. **Deploy**
   - Click Deploy
   - Wait for build to complete
   - Note the generated URL

### Frontend Deployment

1. **Create New Project**
   - New Project → Deploy from GitHub repo
   - Select your repository
   - Select the `frontend` folder

2. **Configure Environment Variables**
   - Add all variables from `frontend/.env.production`
   - Update:
     - `NEXT_PUBLIC_BACKEND_URL`: Your Railway backend URL
     - `NEXT_PUBLIC_FRONTEND_URL`: Your Railway frontend URL

3. **Deploy**
   - Click Deploy
   - Wait for build to complete

---

## Phase 4: Cross-Linking & Internal Traffic

The following cross-linking features are implemented:

### Tools Hub (`/free-tools`)
- Lists all available tools with CTAs
- Each tool links to other related tools
- "Explore more tools" sections

### Lead Capture
- Component created at: `frontend/src/components/leadCapture/LeadCapture.jsx`
- Usage: Import and add to any tool page
- Features:
  - Registration/Login modal
  - Guest skip option
  - Benefits list for conversion

### Integration Example:
```jsx
import LeadCapture from '@/components/leadCapture/LeadCapture';

function ToolPage() {
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  
  // Show after user completes action
  const handleSave = () => {
    setShowLeadCapture(true);
  };
  
  return (
    <>
      {/* Tool content */}
      {showLeadCapture && (
        <LeadCapture 
          title="Save Your Results"
          subtitle="Register to save and access later"
          source="pdf-compressor"
        />
      )}
    </>
  );
}
```

---

## Phase 5: SEO Optimization

### Implemented SEO Features:

1. **Meta Tags**: Each tool page has:
   - Title
   - Description
   - Keywords
   - OpenGraph tags
   - Twitter Card tags
   - Canonical URLs

2. **JSON-LD Schema**: Structured data for:
   - WebApplication (tools)
   - CollectionPage (tools hub)
   - Organization

3. **Sitemap**: Already configured at `/sitemap.xml`

4. **Robots.txt**: Already configured

### SEO Pages Created:
- `/free-tools` - Tools Hub
- `/resume-builder` - Resume Builder
- `/compress-pdf` - PDF Compressor
- `/free-tools/jd-generator` - JD Generator (redirects to hub)

---

## Phase 6: Authentication & User Flow

### Current Authentication System:
- JWT-based authentication
- Separate portals for:
  - Job Seekers: `/jobseeker`
  - Employers: `/employer`
  - Admin: `/admin`

### Lead Capture Integration:
The `LeadCapture` component handles:
- Job seeker registration
- Employer registration  
- Login for existing users

---

## Files Created/Modified

### Frontend:
1. `frontend/next.config.mjs` - Subdomain routing & configuration
2. `frontend/railway.json` - Railway deployment config
3. `frontend/.env.production` - Production environment variables
4. `frontend/src/app/free-tools/page.jsx` - SEO metadata added
5. `frontend/src/app/resume-builder/page.jsx` - New SEO page
6. `frontend/src/app/compress-pdf/page.jsx` - SEO metadata added
7. `frontend/src/app/free-tools/jd-generator/page.jsx` - New SEO page
8. `frontend/src/components/leadCapture/LeadCapture.jsx` - Lead capture component

### Backend:
1. `backend/railway.json` - Railway deployment config
2. `backend/.env.railway` - Railway environment variables template

---

## Post-Deployment Checklist

- [ ] Verify all subdomains resolve correctly
- [ ] Test backend API endpoints
- [ ] Test user registration/login
- [ ] Verify job posting flow
- [ ] Test resume builder
- [ ] Test PDF compression
- [ ] Configure custom domain SSL
- [ ] Set up monitoring (optional)
- [ ] Configure email sending

---

## Support

For issues or questions:
- Check Railway logs in dashboard
- Verify environment variables
- Test API endpoints with Postman
- Check MongoDB Atlas metrics

---

## Notes

1. **Subdomains**: Require DNS configuration - cannot be automated
2. **SSL**: Railway provides automatic SSL for custom domains
3. **Pricing**: Free tier suitable for MVP; upgrade for production
4. **Monitoring**: Consider adding Railway metrics for production
