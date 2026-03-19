import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Attendance Exception Tracker | Track Employee Attendance | Atract',
  description: 'Track late arrivals, early departures, and absences. Identify patterns in employee attendance.',
  keywords: 'attendance tracker, attendance exception, employee attendance, attendance patterns',
};

export default function AttendanceTrackerPage() {
  redirect('/free-tools');
}
