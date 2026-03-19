import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Salary Benchmark Tool | Check Fair Salary | Atract',
  description: 'Check if a salary is fair based on industry standards. Get comprehensive salary reports.',
  keywords: 'salary benchmark, fair salary, salary report, compensation analysis',
};

export default function SalaryBenchmarkPage() {
  redirect('/free-tools');
}
