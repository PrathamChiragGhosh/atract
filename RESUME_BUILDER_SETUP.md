# Resume Builder Integration - Setup Guide

This document outlines the Resume Builder feature integration from `ai-resume-writer` into the `atract` platform.

## Overview

The Resume Builder allows job seekers to:
- Create resumes from scratch using AI
- Enhance existing resumes
- Download resumes in multiple templates
- Manage resume drafts locally

## Backend Setup

### 1. Routes Added

Routes are added to `atract/backend/src/routes/jobSeekerRoutes.js`:
- `GET /check-creations` - Check remaining resume creations
- `POST /generate-resume` - Generate a new resume from form data
- `GET /get-resume` - Get resume by ID
- `GET /check-downloads` - Check remaining downloads
- `POST /update-downloads` - Update download count after download
- `GET /check-enhancements` - Check remaining enhancements
- `POST /enhance-resume` - Enhance an existing resume

### 2. Controllers Added

Controllers are in `atract/backend/src/controllers/resumeBuilderController.js`:
- `checkCreations` - Check user's remaining resume creation credits
- `generateResume` - Generate resume using AI (Gemini) from form data
- `getResumeById` - Retrieve a specific resume
- `checkDownloads` - Check remaining download credits
- `updateDownloads` - Decrement download count
- `checkEnhancements` - Check remaining enhancement credits
- `enhanceResume` - Enhance an existing resume file

### 3. Plan Configuration

Plan configuration is in `atract/backend/src/config/resumeBuilderPlanConfig.js`:
- Defines plan prices (basic, premium, organization)
- Defines plan benefits (creations, enhancements, downloads)
- Similar structure to `smartSelectPlanConfig.js`

### 4. Database Integration

The implementation uses the existing `user_resume_plans` table:
- `creations_remaining` - Number of resumes user can create
- `enhancements_remaining` - Number of resumes user can enhance
- `downloads_remaining` - Number of downloads available
- `resumes` - JSONB array storing generated resumes

## Frontend Setup

### 1. Required Dependencies

Install the following packages in `atract/frontend`:

```bash
npm install jspdf html2canvas
```

**Note:** `html2pdf.js` is already installed but the ResumeTemplates component uses `jspdf` and `html2canvas` directly.

### 2. Hooks Created

Hooks are in `atract/frontend/src/hooks/useResumeBuilder.js`:
- `useResumeBuilderPlan` - Get user's resume builder plan
- `useResumeBuilderCreations` - Check remaining creations
- `useResumeBuilderDownloads` - Check remaining downloads
- `useResumeBuilderEnhancements` - Check remaining enhancements
- `useGenerateResume` - Generate resume mutation
- `useResumeById` - Get resume by ID
- `useUpdateDownloads` - Update downloads mutation

### 3. Components Created

#### Dashboard
- `atract/frontend/src/app/jobseeker/(screens)/resume-builder/page.jsx`
  - Main dashboard showing plan info, recent resumes, and quick actions

#### Create Resume
- `atract/frontend/src/app/jobseeker/(screens)/resume-builder/create/page.jsx`
  - Role selection
  - Form filling with sections
  - Draft management (localStorage)
  - Resume generation

#### Download Resume
- `atract/frontend/src/app/jobseeker/(screens)/resume-builder/download/page.jsx`
  - Display ATS score
  - Show plan info
  - Template selection

#### Resume Templates
- `atract/frontend/src/app/jobseeker/(screens)/resume-builder/download/ResumeTemplates.jsx`
  - Template selection
  - PDF generation
  - Download management

### 4. Shared Components

- `atract/frontend/src/components/sectionsAndFields.js`
  - Role-based form configurations
  - Section and field definitions
  - Copied from `ai-resume-writer/frontend/src/components/sectionsAndFields.js`

### 5. Sidebar Integration

The Resume Builder option is added to the job seeker sidebar:
- `atract/frontend/src/components/SideBar/JobSeekerSideBar.jsx`
- Route: `/jobseeker/resume-builder`
- Icon: Document/Resume icon

## Environment Variables

Ensure these are set in your backend `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:3010
```

## Authentication

The implementation uses:
- Job seeker token (`js_token` cookie) for authentication
- Backend middleware extracts `userId` from token
- Frontend decodes token to get `userId` for draft management

## Features

### Resume Creation
1. User selects functional category and role
2. Fills out form sections (Personal Info, Education, Experience, etc.)
3. Drafts are auto-saved to localStorage
4. On submit, AI generates ATS-optimized resume
5. Resume is saved to database with ATS score

### Resume Enhancement
1. User uploads existing resume (PDF/DOCX)
2. AI enhances resume while preserving factual data
3. Enhanced resume saved with new ATS score

### Resume Download
1. User selects from available templates
2. Resume is converted to PDF
3. Download count is decremented
4. Templates are locked based on plan tier

### Draft Management
- Drafts stored in localStorage with key: `resumebuilder_draft_resumes`
- Structure: `{ userId: { roleKey: { data, timestamp, mainRole, subRole } } }`
- Auto-save on form changes (debounced)
- Load draft when role is selected

## API Endpoints

All endpoints are prefixed with `/jobseeker/resume-builder`:

- `GET /check-creations` - Check creations remaining
- `POST /generate-resume` - Generate new resume
- `GET /get-resume?resumeId=xxx` - Get resume by ID
- `GET /check-downloads` - Check downloads remaining
- `POST /update-downloads` - Update download count
- `GET /check-enhancements` - Check enhancements remaining
- `POST /enhance-resume` - Enhance existing resume

## Testing Checklist

- [ ] Install `jspdf` and `html2canvas` packages
- [ ] Verify GEMINI_API_KEY is set
- [ ] Test resume creation flow
- [ ] Test draft saving/loading
- [ ] Test resume generation
- [ ] Test template download
- [ ] Test plan limits (creations, downloads, enhancements)
- [ ] Verify ATS score calculation
- [ ] Test error handling

## Notes

- The implementation follows the same patterns as the existing `ai-resume-writer` project
- All API calls use the job seeker authentication token
- Drafts are stored client-side in localStorage
- Resume data is stored in PostgreSQL JSONB format
- ATS scores are calculated using Gemini AI

## Future Enhancements

- Resume history/management page
- Resume editing after generation
- More template options
- Resume sharing features
- Integration with job applications

