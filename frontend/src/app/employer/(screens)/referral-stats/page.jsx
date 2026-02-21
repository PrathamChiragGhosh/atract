import { Suspense } from "react";
import { CircularProgress } from "@mui/material";
import ReferralStatsPageClient from "./ReferralStatsPageClient";

export const dynamic = 'force-dynamic';

function LoadingFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '400px',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <CircularProgress />
      <p>Loading referral stats...</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReferralStatsPageClient />
    </Suspense>
  );
}

