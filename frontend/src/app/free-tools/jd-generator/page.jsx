import { redirect } from 'next/navigation';

// SEO Metadata for JD Generator
export const metadata = {
  title: 'Job Description Generator | Create Professional JDs Free | Atract',
  description: 'Generate professional job descriptions instantly with AI. Free JD generator for employers. Create detailed, clear job postings that attract the right candidates.',
  keywords: 'job description generator, JD maker, job posting template, create job description, free JD generator, hiring description, job requirements maker',
  openGraph: {
    title: 'Job Description Generator | Atract',
    description: 'Generate professional job descriptions instantly with AI.',
    type: 'website',
    url: 'https://atract.in/free-tools/jd-generator',
    siteName: 'Atract',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job Description Generator | Atract',
    description: 'Generate professional job descriptions instantly with AI.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://atract.in/free-tools/jd-generator',
  },
};

// JSON-LD Schema
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Atract Job Description Generator',
  description: 'Generate professional job descriptions instantly with AI',
  url: 'https://atract.in/free-tools/jd-generator',
  applicationCategory: 'BusinessApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
};

// This page redirects to the main free-tools page for now
// The actual JD Generator will be implemented as a separate tool
export default function JDGeneratorPage() {
  // For now, redirect to the free tools hub
  // In production, this will render the actual JD Generator
  redirect('/free-tools');
}
