import { redirect } from 'next/navigation';

export const metadata = {
  title: 'HR Policy Builder | Company Policy Generator | Atract',
  description: 'Create company policies that comply with labor laws. Professional drafts for your organization.',
  keywords: 'HR policy builder, company policy, policy generator, labor law compliance',
};

export default function HRPolicyBuilderPage() {
  redirect('/free-tools');
}
