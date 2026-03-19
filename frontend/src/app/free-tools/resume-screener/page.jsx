import { redirect } from 'next/navigation';

// SEO Metadata
export const metadata = {
  title: 'Resume Screener Lite | AI-Powered Candidate Screening | Atract',
  description: 'Quickly match resumes against job descriptions using AI. Get instant insights on candidate suitability. Free tool for recruiters and HR.',
  keywords: 'resume screener, AI resume screening, candidate matching, JD vs resume, HR tool, recruitment',
  openGraph: {
    title: 'Resume Screener Lite | Atract',
    description: 'Quickly match resumes against job descriptions using AI.',
    type: 'website',
    url: 'https://atract.in/free-tools/resume-screener',
  },
};

// JSON-LD Schema
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Resume Screener Lite',
  description: 'JD vs Resume quick match in seconds',
  url: 'https://atract.in/free-tools/resume-screener',
  applicationCategory: 'BusinessApplication',
  offers: {
    '@type': 'Offer',
    price: '499',
    priceCurrency: 'INR',
  },
};

// Coming soon - redirect to free tools for now
// The actual tool will be implemented from AtractDashboard
export default function ResumeScreenerPage() {
  redirect('/free-tools');
}
