# Deployment Guide

## Quick Start

1. **Development Server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:5173`

2. **Production Build**
   ```bash
   npm run build
   ```
   Output will be in the `dist/` folder

## Before Deploying

### 1. Update Contact Information

**Files to update:**
- `src/components/Footer.jsx` - Email, LinkedIn
- `src/pages/Contact.jsx` - Contact details, WhatsApp

### 2. Update Calendly Links

Replace `https://calendly.com` with your actual Calendly URL in:
- `src/components/Navbar.jsx`
- `src/pages/Home.jsx`
- `src/pages/Services.jsx`
- `src/pages/CaseStudies.jsx`
- `src/pages/Contact.jsx`

### 3. Add Case Studies PDF

1. Create a PDF file with your case studies
2. Place it in `public/case-studies.pdf`
3. Links are already configured in the code

### 4. Update Atract Tools URLs

In `src/pages/Tools.jsx`, update the URLs:
- Resume Parser URL
- JD Structuring Tool URL
- Resume Matching Tool URL

### 5. Update Notion Link

In `src/pages/CaseStudies.jsx`, replace the Notion link with your actual public Notion page URL.

### 6. Configure Contact Form

The contact form in `src/pages/Contact.jsx` currently logs to console. To integrate:

**Option A: EmailJS**
1. Sign up at emailjs.com
2. Get your service ID and template ID
3. Install: `npm install @emailjs/browser`
4. Update the form submission handler

**Option B: Backend API**
1. Create an API endpoint
2. Update `handleSubmit` to POST to your API
3. Handle success/error states

## Deployment Options

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Vercel will auto-detect Vite
4. Deploy!

### Netlify

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Deploy!

### Custom Server

1. Run `npm run build`
2. Upload `dist/` folder to your web server
3. Configure server to serve `index.html` for all routes (SPA routing)

### Subdomain Setup

To deploy at `prompt.atract.com` or `atract.com/prompt`:

**For subdomain:**
- Point DNS to your hosting provider
- Deploy normally

**For subdirectory:**
- Update `vite.config.js`:
  ```js
  export default {
    base: '/prompt/',
    // ...
  }
  ```
- Rebuild and deploy

## Environment Variables (if needed)

Create a `.env` file for:
- EmailJS keys
- API endpoints
- Other sensitive data

Add to `.gitignore`:
```
.env
.env.local
```

## Post-Deployment Checklist

- [ ] All links work correctly
- [ ] Contact form is functional
- [ ] Case studies PDF is accessible
- [ ] Mobile responsive design works
- [ ] SEO meta tags are correct
- [ ] Analytics is set up (if needed)
- [ ] SSL certificate is active

## Support

For issues or questions, refer to the main README.md file.
