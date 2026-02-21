"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReferralStats } from '@/hooks/useReferralStats';
import { CircularProgress } from '@mui/material';
import './page.css';

export default function ReferralStatsPageClient() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useReferralStats();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check access - if API returns 403, redirect
  useEffect(() => {
    if (isError && error?.response?.status === 403) {
      router.push('/employer/home');
    }
  }, [isError, error, router]);

  if (!mounted || isLoading) {
    return (
      <div className="referral-stats-container">
        <div className="referral-stats-loading">
          <CircularProgress />
          <p>Loading referral statistics...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="referral-stats-container">
        <div className="referral-stats-error">
          <p>Error loading referral statistics. Please try again later.</p>
        </div>
      </div>
    );
  }

  const stats = data?.summary || {};
  const byRedirect = data?.byRedirect || [];
  const individualStats = data?.individualStats || [];

  return (
    <div className="referral-stats-container">
      <div className="referral-stats-header">
        <h1>Referral Statistics</h1>
        <p>Track job seeker referrals and profile completion rates</p>
      </div>

      {/* Summary Cards */}
      <div className="referral-stats-summary">
        <div className="stat-card">
          <div className="stat-value">{stats.totalReferrals || 0}</div>
          <div className="stat-label">Total Referrals</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.newUsers || 0}</div>
          <div className="stat-label">New Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.existingUsers || 0}</div>
          <div className="stat-label">Existing Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.withResume || 0}</div>
          <div className="stat-label">With Resume</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.withOtherDetails || 0}</div>
          <div className="stat-label">With Other Details</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">{stats.completedProfiles || 0}</div>
          <div className="stat-label">Completed Profiles</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">{stats.completionRate || 0}%</div>
          <div className="stat-label">Completion Rate</div>
        </div>
      </div>

      {/* By Redirect To */}
      {byRedirect.length > 0 && (
        <div className="referral-stats-section">
          <h2>Statistics by Redirect URL</h2>
          <div className="referral-stats-table">
            <table>
              <thead>
                <tr>
                  <th>Redirect URL</th>
                  <th>Total</th>
                  <th>New Users</th>
                  <th>Existing Users</th>
                  <th>With Resume</th>
                  <th>With Details</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {byRedirect.map((group, idx) => (
                  <tr key={idx}>
                    <td>{group.redirectTo}</td>
                    <td>{group.count}</td>
                    <td>{group.newUsers}</td>
                    <td>{group.existingUsers}</td>
                    <td>{group.withResume}</td>
                    <td>{group.withOtherDetails}</td>
                    <td>{group.completedProfiles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Individual Stats */}
      {individualStats.length > 0 && (
        <div className="referral-stats-section">
          <h2>Individual Referral Records</h2>
          <div className="referral-stats-table">
            <table>
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>User Email</th>
                  <th>Redirect To</th>
                  <th>Account Type</th>
                  <th>Resume Saved</th>
                  <th>Details Filled</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {individualStats.map((stat) => (
                  <tr key={stat._id}>
                    <td>{stat.userName}</td>
                    <td>{stat.userEmail}</td>
                    <td>{stat.redirectTo}</td>
                    <td>
                      <span className={`badge ${stat.alreadyHadAccount ? 'badge-existing' : 'badge-new'}`}>
                        {stat.alreadyHadAccount ? 'Existing' : 'New'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${stat.isResumeSaved ? 'badge-yes' : 'badge-no'}`}>
                        {stat.isResumeSaved ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${stat.isOtherDetailsFilled ? 'badge-yes' : 'badge-no'}`}>
                        {stat.isOtherDetailsFilled ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{new Date(stat.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {individualStats.length === 0 && (
        <div className="referral-stats-empty">
          <p>No referral statistics available yet.</p>
        </div>
      )}
    </div>
  );
}

