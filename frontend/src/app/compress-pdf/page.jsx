import CompressPdfPageClient from './CompressPdfPageClient';

// SEO Metadata for PDF Compressor
export const metadata = {
  title: 'Free PDF Compressor | Reduce PDF Size Online | Atract',
  description: 'Compress PDF files online for free. Reduce PDF size without losing quality. Fast, secure, and easy to use. Perfect for email attachments and uploads.',
  keywords: 'pdf compressor, compress pdf, reduce pdf size, pdf optimization, free pdf compressor, shrink pdf, pdf file size reduction',
  openGraph: {
    title: 'Free PDF Compressor | Atract',
    description: 'Compress PDF files online for free. Reduce PDF size without losing quality.',
    type: 'website',
    url: 'https://atract.in/compress-pdf',
    siteName: 'Atract',
    locale: 'en_IN',
    alternateLocale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free PDF Compressor | Atract',
    description: 'Compress PDF files online for free. Reduce PDF size without losing quality.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://atract.in/compress-pdf',
    languages: {
      'en-IN': 'https://atract.in/compress-pdf',
      'en-US': 'https://atract.in/compress-pdf',
    },
  },
};

// JSON-LD Schema for PDF Compressor
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Atract PDF Compressor',
  description: 'Compress PDF files online for free. Reduce PDF size without losing quality.',
  url: 'https://atract.in/compress-pdf',
  applicationCategory: 'UtilityApplication',
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
  featureList: [
    'Free PDF compression',
    'No quality loss',
    'Fast processing',
    'Secure & private',
    'Batch processing',
  ],
};

export default function CompressPdfPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompressPdfPageClient />
    </>
  );
}
