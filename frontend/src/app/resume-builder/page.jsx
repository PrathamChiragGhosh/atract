import ResumeBuilderPageClient from '@/app/jobseeker/(screens)/resume-builder/ResumeBuilderPageClient';

// SEO Metadata for Resume Builder
export const metadata = {
  title: 'Free Resume Builder | Create Professional Resumes | Atract',
  description: 'Create professional, ATS-friendly resumes with our free resume builder. Choose from 7+ templates, customize sections, and download in PDF format. Perfect for job seekers.',
  keywords: 'resume builder, free resume maker, professional resume, ATS resume, CV builder, job resume template, create resume online',
  openGraph: {
    title: 'Free Resume Builder | Atract',
    description: 'Create professional, ATS-friendly resumes with our free resume builder.',
    type: 'website',
    url: 'https://atract.in/resume-builder',
    siteName: 'Atract',
    locale: 'en_IN',
    alternateLocale: 'en_US',
    images: [
      {
        url: 'https://atract.in/og-resume-builder.jpg',
        width: 1200,
        height: 630,
        alt: 'Atract Resume Builder',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Resume Builder | Atract',
    description: 'Create professional, ATS-friendly resumes with our free resume builder.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://atract.in/resume-builder',
    languages: {
      'en-IN': 'https://atract.in/resume-builder',
      'en-US': 'https://atract.in/resume-builder',
    },
  },
};

// JSON-LD Schema for Resume Builder
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Atract Resume Builder',
  description: 'Create professional, ATS-friendly resumes with our free resume builder',
  url: 'https://atract.in/resume-builder',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  creator: {
    '@type': 'Organization',
    name: 'Atract',
    url: 'https://atract.in',
  },
  features: [
    '7+ Professional Templates',
    'ATS-Friendly Format',
    'PDF Download',
    'Easy Customization',
    'Real-time Preview',
  ],
};

export default function ResumeBuilderPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ResumeBuilderPageClient />
    </>
  );
}
