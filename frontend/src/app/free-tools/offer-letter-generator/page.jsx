import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Offer Letter Generator | Professional Offer Letters | Atract',
  description: 'Create professional offer letters in minutes. Customizable templates for different roles.',
  keywords: 'offer letter generator, offer letter maker, employment offer, professional letter',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Offer Letter Generator',
  description: 'Professional offer letters in minutes',
  url: 'https://atract.in/free-tools/offer-letter-generator',
};

export default function OfferLetterGeneratorPage() {
  redirect('/free-tools');
}
