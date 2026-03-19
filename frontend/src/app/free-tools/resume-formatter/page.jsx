import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Resume Formatter Pro | ATS-Friendly Formatting | Atract',
  description: 'Format resumes to be ATS-friendly. Stand out to recruiters and hiring managers.',
  keywords: 'resume formatter, ATS resume, resume formatting, professional resume',
};

export default function ResumeFormatterPage() {
  redirect('/free-tools');
}
