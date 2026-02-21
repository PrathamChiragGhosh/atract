# Atract Platform - Technical Specification Documentation (TSD)

## Overview

This documentation provides comprehensive technical specifications for the Atract platform, covering features from frontend to backend, screen by screen and feature by feature.

## Documentation Structure

### Organization

The documentation is organized into phases, with each feature documented individually. Features are numbered sequentially following the implementation plan.

### Current Status

✅ **Phase 1: Core User Authentication & Onboarding** - *In Progress*

- [x] 01. Home/Landing Page (`01-Home-Landing-Page.md`)
- [x] 02. Job Seeker Sign In (`02-Job-Seeker-Sign-In.md`)
- [x] 03. Employer Sign In (`03-Employer-Sign-In.md`)
- [x] 04. Admin Sign In (`04-Admin-Sign-In.md`)
- [x] 05. Job Seeker Registration (`05-Job-Seeker-Registration.md`)
- [x] 06. Employer Registration (`06-Employer-Registration.md`)

✅ **Phase 2: Job Seeker Core Features** - *Completed*

- [x] 07. Job Seeker Home Dashboard (`07-Job-Seeker-Home-Dashboard.md`)
- [x] 08. Job Seeker Profile (`08-Job-Seeker-Profile.md`)
- [x] 09. Job Search & Browsing (`09-Job-Search-Browsing.md`)
- [x] 10. Job Applications (`10-Job-Applications.md`)
- [x] 11. Saved Jobs (`11-Saved-Jobs.md`)
- [x] 12. Job Seeker Settings (`12-Job-Seeker-Settings.md`)

### Planned Features

#### Phase 1: Core User Authentication & Onboarding
- [ ] 02. Job Seeker Sign In
- [ ] 03. Employer Sign In
- [ ] 04. Admin Sign In
- [ ] 05. User Registration (Job Seeker)
- [ ] 06. User Registration (Employer)

#### Phase 2: Job Seeker Core Features
- [ ] 07. Job Seeker Home Dashboard
- [ ] 08. Job Seeker Profile
- [ ] 09. Job Search & Browsing
- [ ] 10. Job Applications
- [ ] 11. Saved Jobs
- [ ] 12. Job Seeker Settings

#### Phase 3: Employer Core Features
- [x] 13. Employer Home Dashboard (`13-Employer-Home-Dashboard.md`)
- [x] 14. Employer Profile (`14-Employer-Profile.md`)
- [x] 15. Job Posting (`15-Post-Job.md`)
- [x] 16. Job Management (`16-Job-Management.md`)
- [x] 17. Application Management (`17-Application-Management.md`)
- [x] 18. Employer Settings (`18-Employer-Settings.md`)

#### Phase 4: Premium Features - Job Seeker
- [x] 19. Resume Builder (`19-Resume-Builder.md`)
- [x] 20. Free Tools (`20-Free-Tools.md`)
- [x] 21. PDF Compressor (`21-PDF-Compressor.md`)

#### Phase 5: Premium Features - Employer
- [x] 22. Smart Select (`22-Smart-Select.md`)
- [x] 23. Smart Post (`23-Smart-Post.md`)
- [x] 24. Voice Agent (`24-Voice-Agent.md`)
- [x] 25. Instant Job Alerts - Employer (`25-Instant-Job-Alerts-Employer.md`)
- [x] 26. Blog Agent (`26-Blog-Agent.md`)
- [x] 27. Referral Stats (`27-Referral-Stats.md`)

#### Phase 6: Admin Features
- [x] 28. Admin Dashboard (`28-Admin-Dashboard.md`)
- [x] 29. Admin Smart Filter (`29-Admin-Smart-Filter.md`)

#### Phase 7: Additional Features
- [x] 30. Genie (`30-Genie.md`)
- [x] 31. Blogs (`31-Blogs.md`)
- [x] 32. Posts (`32-Posts.md`)
- [x] 33. Video Proctoring (`33-Video-Proctoring.md`)
- [x] 34. Payment Flows (`34-Payment-Flows.md`)
- [x] 35. Legal Pages (`35-Legal-Pages.md`)

## How to Use This Documentation

### For New Developers

1. Start with the **Home/Landing Page** document to understand the documentation format
2. Read features in order (numbered sequence)
3. Each document follows a consistent structure:
   - Overview & Purpose
   - User Flow
   - Frontend Implementation
   - Backend Implementation
   - Data Flow
   - Error Handling
   - Testing Considerations

### For Understanding Features

1. Navigate to the specific feature document
2. Review the "Overview" section for quick understanding
3. Check "User Flow" for how users interact with the feature
4. Review "Frontend Implementation" and "Backend Implementation" for technical details
5. Check "Data Flow" for API request/response details

### For Implementation

1. Follow the code references at the end of each document
2. Review the data flow diagrams
3. Check API endpoints and request/response formats
4. Review error handling patterns
5. Check testing considerations for edge cases

## Documentation Template

Each feature follows the standardized template defined in `TSD_FEATURE_TEMPLATE.md` (located in the project root).

## Related Documents

- **TSD_PLAN.md**: Overall documentation strategy and plan
- **TSD_FEATURE_TEMPLATE.md**: Template used for each feature documentation
- **backend/JOB_ALERT_SYSTEM_SUMMARY.md**: Detailed documentation for job alert system
- **RESUME_BUILDER_SETUP.md**: Resume builder setup guide

## Contributing

When adding new documentation:

1. Follow the `TSD_FEATURE_TEMPLATE.md` structure
2. Number documents sequentially
3. Use descriptive file names: `##-Feature-Name.md`
4. Include all sections of the template
5. Add code references with file paths and line numbers where helpful
6. Update this README with the new feature

## Maintenance

- Documentation should be updated when features change
- Keep code references accurate (file paths, line numbers)
- Update "Last Updated" dates
- Review documentation periodically for accuracy

---

*Last Updated: [Current Date]*

