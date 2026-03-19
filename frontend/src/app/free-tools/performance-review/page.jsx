import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Performance Review Helper | Streamline Reviews | Atract',
  description: 'Generate self and manager review drafts. Streamline your performance review process.',
  keywords: 'performance review, review generator, employee review, performance appraisal',
};

export default function PerformanceReviewPage() {
  redirect('/free-tools');
}
