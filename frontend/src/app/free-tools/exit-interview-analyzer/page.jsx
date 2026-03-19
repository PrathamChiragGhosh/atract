import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Exit Interview Analyzer | Employee Feedback Analysis | Atract',
  description: 'Analyze exit feedback patterns from employees. Get insights to improve retention.',
  keywords: 'exit interview analyzer, employee feedback, retention analysis, exit survey',
};

export default function ExitInterviewAnalyzerPage() {
  redirect('/free-tools');
}
