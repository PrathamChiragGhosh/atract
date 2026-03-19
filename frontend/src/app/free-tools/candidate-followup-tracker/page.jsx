import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Candidate Follow-up Tracker | Never Miss a Follow-up | Atract',
  description: 'Never forget candidate follow-ups. Track all your candidate communications in one place.',
  keywords: 'candidate follow up, recruitment tracker, candidate CRM, interview follow up',
};

export default function CandidateFollowupTrackerPage() {
  redirect('/free-tools');
}
