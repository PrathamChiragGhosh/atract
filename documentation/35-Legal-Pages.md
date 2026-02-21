# Feature: Legal Pages

## Overview

**Purpose**: Legal Pages provide comprehensive legal documentation for the Atract platform, including Privacy Policy, Terms & Conditions (separate for Employers and Job Seekers), Cancellation Policy, and Shipping Policy. These pages serve as static informational content that outlines user rights, platform policies, data handling practices, payment terms, and service conditions. They are accessible to all users and linked from the footer navigation.

**User Story**: As a user of Atract, I want to understand the platform's legal terms, privacy practices, cancellation policies, and shipping information so I can make informed decisions about using the platform and its services. As a platform, we need to provide transparent legal documentation to ensure compliance, protect user rights, and establish clear terms of service.

**Key Functionality**:
- Privacy Policy: Comprehensive data collection, usage, and protection policies
- Terms & Conditions: Separate terms for employers and job seekers
- Cancellation Policy: Refund and cancellation terms for paid services
- Shipping Policy: Delivery and shipping terms for marketplace products
- Static content pages with consistent styling
- Footer navigation links
- Responsive design
- Last updated date tracking

**Access Level**: Public (No authentication required)

**URL Paths**: 
- `/privacy-policy`
- `/employer/terms`
- `/jobseeker/terms`
- `/cancellation-policy`
- `/shipping-policy`

**Authentication Required**: No

---

## User Flow

### Accessing Legal Pages

1. **Navigation**:
   - User clicks on legal page link in footer
   - Footer contains links to:
     - Privacy Policy
     - Shipping Policy
     - Cancellation Policy
     - Terms & Conditions (links to employer terms)
   - User navigates to selected legal page
2. **Page Display**:
   - Legal page loads with hero section (badge, title, last updated date, lead paragraph)
   - Content sections displayed in card layout
   - User scrolls through content sections
   - User reads policy/terms information
3. **Navigation Away**:
   - User clicks browser back button
   - Or clicks footer link to another page
   - Or navigates using browser navigation

---

## Frontend Implementation

### Screen Structure

**Privacy Policy Page**:
- File: `frontend/src/app/privacy-policy/page.jsx`
- CSS: `frontend/src/app/privacy-policy/privacy-policy.css`
- Type: Server Component
- Lines: ~214 lines

**Cancellation Policy Page**:
- File: `frontend/src/app/cancellation-policy/page.jsx`
- CSS: `frontend/src/app/cancellation-policy/cancellation-policy.css`
- Type: Server Component
- Lines: ~68 lines

**Shipping Policy Page**:
- File: `frontend/src/app/shipping-policy/page.jsx`
- CSS: `frontend/src/app/shipping-policy/shipping-policy.css`
- Type: Server Component
- Lines: ~72 lines

**Employer Terms Page**:
- File: `frontend/src/app/employer/terms/page.jsx`
- CSS: `frontend/src/app/employer/terms/page.css`
- Type: Client Component
- Lines: ~88 lines

**Job Seeker Terms Page**:
- File: `frontend/src/app/jobseeker/terms/page.jsx`
- CSS: `frontend/src/app/jobseeker/terms/page.css`
- Type: Client Component
- Lines: ~138 lines

### Component Hierarchy

```
PrivacyPolicyPage
  └── div.pp-wrapper
      ├── div.pp-hero
      │   ├── div.pp-badge ("Privacy Policy")
      │   ├── h1 (Title)
      │   ├── p.pp-updated (Last Updated date)
      │   └── p.pp-lead (Lead paragraphs)
      └── Multiple div.pp-section
          ├── h2 (Section headings)
          ├── h3 (Subsection headings)
          ├── p (Paragraphs)
          └── ul (Lists)

CancellationPolicyPage
  └── div.pp-wrapper (same structure as Privacy Policy)

ShippingPolicyPage
  └── div.pp-wrapper (same structure as Privacy Policy)

EmployerTermsPage
  └── div.terms-wrapper
      ├── div.terms-hero
      │   ├── div.terms-badge ("Employer Terms")
      │   ├── h1 (Title)
      │   ├── p.terms-updated (Last Updated date)
      │   └── p.terms-lead (Lead paragraph)
      └── Multiple div.terms-section
          ├── h2 (Section headings)
          ├── h3 (Subsection headings)
          ├── p (Paragraphs)
          └── ul (Lists)
      └── div.terms-footer (Footer note)

JobSeekerTermsPage
  └── div.terms-wrapper (same structure as Employer Terms)
```

### State Management

**All Legal Pages**:
- No state management required (static content)
- Pure presentational components
- No user interactions beyond navigation

### Content Structure

**Privacy Policy Content Sections**:
1. Information We Collect
   - Personal Information (Candidates)
   - Personal Information (Employers/Agencies)
   - Technical & Usage Information
   - Financial/Payment Information
2. How We Use The Information
   - Recruitment & Job Platform Services
   - AI-Based Services
   - Communication
   - Platform Improvement
   - Legal & Compliance
3. Sharing of Information
   - Employers & Recruiters
   - Service Providers
   - Legal Disclosure
4. Data Retention
5. Security
6. Your Rights
7. Cookies
8. Links to Third-Party Sites
9. Changes to Policy
10. Contact

**Cancellation Policy Content Sections**:
1. General Rule — Digital Services Are Non-Refundable
2. Cancellation Before Delivery
3. No Refund for Wrong Information Provided
4. No Guarantee of Hiring or Shortlisting
5. Marketplace Orders (Products)
6. Refund Method
7. Contact

**Shipping Policy Content Sections**:
1. Dispatch & Delivery Timelines (Physical Goods)
2. Shipping Charges
3. Product Tracking
4. Returns & Replacements
5. Digital Product Delivery
6. Partner Responsibility
7. Contact

**Employer Terms Content Sections**:
1. Commercial Terms
   - Fee Structure (by management level)
   - GST
   - Payment Terms
   - Replacement Policy
   - Payment Obligation
   - Independence of Clauses
   - Trial Employment
   - Resume Confidentiality
   - Deferred Joining or Hire
2. Platform & Compliance
   - Account Responsibility
   - Job Posting Guidelines
   - Candidate Information
   - Service Availability
   - Limitation of Liability
   - Modifications to Terms
   - Governing Law

**Job Seeker Terms Content Sections**:
1. Account & Registration
   - Account Creation
   - Account Security
   - Profile Information
2. Job Applications
   - Application Process
   - Assessments & Testing
   - Application Withdrawal
3. Resume & Profile
   - Resume Upload
   - Profile Visibility
   - Data Accuracy
4. Communication & Notifications
   - Email/Platform Notifications
   - Employer Communications
5. Platform Usage
   - Acceptable Use
   - Platform Availability
   - Intellectual Property
6. Privacy & Data Protection
   - Data Collection
   - Data Sharing with Employers
7. Limitation of Liability
   - No Guarantee of Employment
   - Third-Party Content
   - Liability Limit
8. Account Termination
   - Termination by You
   - Termination by Us
9. General
   - Modifications
   - Governing Law
   - Contact

### UI Components

**Hero Section** (Policy Pages):
- Badge: Colored badge with policy name
- Title: Main heading (H1)
- Last Updated: Date of last update
- Lead Paragraph: Introduction/summary text

**Hero Section** (Terms Pages):
- Badge: Colored badge with "Employer Terms" or "Job Seeker Terms"
- Title: Main heading (H1)
- Last Updated: Date of last update
- Lead Paragraph: Introduction text

**Content Sections**:
- Card-style sections with white background
- Section headings (H2)
- Subsection headings (H3)
- Paragraphs
- Unordered lists (bulleted)
- Strong text for emphasis

**Footer** (Terms Pages):
- Additional note or acknowledgment text

### Styling Details

**Policy Pages Styling** (`.pp-wrapper`, `.pp-hero`, `.pp-section`):
- Max-width: 1100px
- Centered layout
- Gradient hero background (blue, green, purple tones)
- White section cards with subtle borders
- Box shadows for depth
- Rounded corners (14-16px)
- Consistent spacing and typography
- Responsive design (mobile-friendly)
- Inter font family

**Terms Pages Styling** (`.terms-wrapper`, `.terms-hero`, `.terms-section`):
- Same structure as policy pages
- Slightly different gradient (blue and purple tones)
- Same card-based layout
- Footer section with additional styling
- Responsive design

**Typography**:
- H1: 32px, font-weight: 800
- H2: 22px
- H3: 18px
- Body: Standard font size, line-height: 1.65-1.7
- Color scheme: Dark text (#0f172a, #1f2937) on light backgrounds

**Responsive Design**:
- Mobile breakpoint: max-width 768px
- Reduced padding on mobile
- Adjusted font sizes for mobile
- Maintained readability

---

## Backend Implementation

**No Backend Required**:
- Legal pages are static content
- No API endpoints
- No database interactions
- No server-side processing
- Content is hardcoded in React components

---

## Data Flow

**Static Content Flow**:
```
User clicks footer link
  ↓
Frontend router navigates to legal page route
  ↓
Next.js renders page component
  ↓
Page component returns JSX with static content
  ↓
Browser renders formatted legal page
  ↓
User reads content
```

---

## Configuration

**No Configuration Required**:
- Legal pages are static content
- No environment variables
- No external dependencies
- Content updated directly in component files

**Last Updated Dates**:
- Hardcoded in component files
- Format: "Last Updated: 12-06-2025"
- Should be updated when content changes

---

## Error Handling

**No Error Handling Required**:
- Static content pages
- No API calls
- No user interactions
- No state management

**Potential Issues**:
- Broken links: Handled by Next.js routing
- Missing CSS: Styling may not load (handled by Next.js)
- Content not displaying: Browser rendering issue

---

## Security Features

**No Security Concerns**:
- Static content pages
- Public access intended
- No authentication required
- No sensitive data
- No user input

---

## UI/UX Details

### Layout Structure

**Page Layout**:
- Full-width container
- Max-width: 1100px (centered)
- Padding: 64px 24px 96px (desktop)
- Padding: 48px 16px 72px (mobile)

**Hero Section**:
- Gradient background
- Border and shadow for depth
- Badge, title, date, and lead text
- Padding: 32px (desktop), 24px (mobile)

**Content Sections**:
- White card backgrounds
- Subtle borders
- Box shadows
- Rounded corners
- Spacing: 20px margin-bottom between sections

### Visual Design

**Color Scheme**:
- Primary text: #0f172a (very dark blue)
- Secondary text: #1f2937 (dark gray)
- Muted text: #475569 (medium gray)
- Badge background: rgba(37, 99, 235, 0.12) (light blue)
- Badge text: #1d4ed8 (blue)
- Gradient backgrounds: Blue, green, purple tones
- White section cards

**Typography**:
- Font family: Inter, system-ui, -apple-system, sans-serif
- Line height: 1.65-1.7 for readability
- Font weights: 600 (updated date), 700 (badge, strong), 800 (H1)
- Consistent spacing between elements

**Interactive Elements**:
- Links in footer (navigation)
- Hover effects on footer links (inherited from footer styles)
- No interactive elements within legal page content

**Mobile Optimization**:
- Reduced padding on mobile
- Adjusted font sizes
- Maintained readability
- Responsive card layout

---

## Testing Considerations

### Test Scenarios

**Page Access**:
1. Click Privacy Policy link in footer → Navigate to `/privacy-policy` → Page loads correctly
2. Click Shipping Policy link → Navigate to `/shipping-policy` → Page loads correctly
3. Click Cancellation Policy link → Navigate to `/cancellation-policy` → Page loads correctly
4. Click Terms & Conditions link → Navigate to `/employer/terms` → Page loads correctly
5. Direct URL access → All pages accessible via direct URLs

**Content Display**:
1. All sections display correctly
2. Typography is readable
3. Lists format correctly
4. Headings hierarchy is clear
5. Spacing is consistent

**Responsive Design**:
1. Mobile view: Content displays correctly
2. Tablet view: Content displays correctly
3. Desktop view: Content displays correctly
4. Text is readable at all sizes
5. Layout adapts appropriately

**Navigation**:
1. Footer links work correctly
2. Browser back button works
3. Direct URL navigation works
4. No broken links

---

## Related Features

- **Footer Component** (`frontend/src/components/footer/Footer.jsx`): Contains links to legal pages
- **Navigation System**: Next.js routing handles page navigation
- **Layout Components**: Legal pages use standard page layout

---

## Additional Notes

**Content Management**:
- Content is hardcoded in React components
- Updates require code changes
- Last updated dates should be maintained
- Consider content management system for easier updates

**SEO Considerations**:
- Legal pages are important for SEO
- Server-side rendering (SSR) helps with SEO
- Semantic HTML structure
- Proper heading hierarchy
- Meta tags should be added (via Next.js metadata API)

**Accessibility**:
- Semantic HTML structure
- Proper heading hierarchy (H1, H2, H3)
- Readable font sizes and line heights
- High contrast text
- No interactive elements that require keyboard navigation

**Content Updates**:
- Update content directly in component files
- Update "Last Updated" date when content changes
- Test formatting after updates
- Ensure consistency across all legal pages

**Known Limitations**:
- Content is hardcoded (not dynamic)
- No version history
- No content management interface
- Manual updates required
- No multi-language support

**Future Enhancements**:
1. Content management system (CMS) integration
2. Version history for policy changes
3. Multi-language support
4. Search functionality within legal pages
5. Print-friendly stylesheets
6. PDF download option
7. Table of contents with anchor links
8. Email notifications for policy updates
9. User acceptance tracking
10. Analytics for page views

**Legal Compliance**:
- Privacy Policy must comply with data protection laws (GDPR, etc.)
- Terms & Conditions must be legally reviewed
- Cancellation Policy must comply with consumer protection laws
- Shipping Policy must comply with e-commerce regulations
- Regular legal review recommended

---

## Code References

### Frontend Files

**Privacy Policy**:
- `frontend/src/app/privacy-policy/page.jsx` - Privacy Policy page component (~214 lines)
- `frontend/src/app/privacy-policy/privacy-policy.css` - Privacy Policy styling

**Cancellation Policy**:
- `frontend/src/app/cancellation-policy/page.jsx` - Cancellation Policy page component (~68 lines)
- `frontend/src/app/cancellation-policy/cancellation-policy.css` - Cancellation Policy styling

**Shipping Policy**:
- `frontend/src/app/shipping-policy/page.jsx` - Shipping Policy page component (~72 lines)
- `frontend/src/app/shipping-policy/shipping-policy.css` - Shipping Policy styling

**Employer Terms**:
- `frontend/src/app/employer/terms/page.jsx` - Employer Terms page component (~88 lines)
- `frontend/src/app/employer/terms/page.css` - Employer Terms styling

**Job Seeker Terms**:
- `frontend/src/app/jobseeker/terms/page.jsx` - Job Seeker Terms page component (~138 lines)
- `frontend/src/app/jobseeker/terms/page.css` - Job Seeker Terms styling

**Footer Component** (contains links):
- `frontend/src/components/footer/Footer.jsx` - Footer component with legal page links (lines 81-116)

### Styling Classes

**Policy Pages** (`.pp-*`):
- `.pp-wrapper` - Main container
- `.pp-hero` - Hero section
- `.pp-badge` - Badge styling
- `.pp-updated` - Last updated date
- `.pp-lead` - Lead paragraph
- `.pp-section` - Content section
- `.pp-strong` - Strong text

**Terms Pages** (`.terms-*`):
- `.terms-wrapper` - Main container
- `.terms-hero` - Hero section
- `.terms-badge` - Badge styling
- `.terms-updated` - Last updated date
- `.terms-lead` - Lead paragraph
- `.terms-section` - Content section
- `.terms-footer` - Footer section

---

*Last Updated: [Current Date]*
*Documented By: TSD Documentation System*

