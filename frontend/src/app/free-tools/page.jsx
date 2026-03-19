import FreeToolsPageClient from './FreeToolsPageClient';

// SEO Metadata for Tools Hub
export const metadata = {
  title: 'Free Tools Hub | Atract - Professional HR & Recruitment Tools',
  description: 'Access our collection of free professional tools for job seekers and employers. PDF compressor, resume builder, interview questions generator, and more.',
  keywords: 'free HR tools, resume builder, PDF compressor, interview questions generator, job description maker, recruitment tools, hiring tools',
  openGraph: {
    title: 'Free Tools Hub | Atract',
    description: 'Access our collection of free professional tools for job seekers and employers.',
    type: 'website',
    url: 'https://atract.in/free-tools',
    siteName: 'Atract',
    locale: 'en_IN',
    alternateLocale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Tools Hub | Atract',
    description: 'Access our collection of free professional tools for job seekers and employers.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://atract.in/free-tools',
    languages: {
      'en-IN': 'https://atract.in/free-tools',
      'en-US': 'https://atract.in/free-tools',
    },
  },
};

// JSON-LD Schema for Tools Hub
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Atract Free Tools Hub',
  description: 'A collection of free professional HR and recruitment tools',
  url: 'https://atract.in/free-tools',
  publisher: {
    '@type': 'Organization',
    name: 'Atract',
    logo: {
      '@type': 'ImageObject',
      url: 'https://atract.in/icon.png',
    },
  },
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'PDF Compressor',
        url: 'https://atract.in/compress-pdf',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Interview Questions Generator',
        url: 'https://atract.in/free-tools/interview-questions-generator',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Resume Builder',
        url: 'https://atract.in/jobseeker/resume-builder',
      },
    ],
  },
};

export default function FreeToolsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FreeToolsPageClient />
    </>
  );
}
