import { Suspense } from "react";
import { CircularProgress } from "@mui/material";
import EmployerProfileScreen from "./ProfilePageClient";

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
                <p>Loading profile...</p>
            </div>
        );
    }

export default function Page() {
    return (
    <Suspense fallback={<LoadingFallback />}>
      <EmployerProfileScreen />
    </Suspense>
  );
}
