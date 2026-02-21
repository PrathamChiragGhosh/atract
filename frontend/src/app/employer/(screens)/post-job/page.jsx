import { Suspense } from "react";
import { CircularProgress } from "@mui/material";
import PostJobScreen from "./PostJobPageClient";

export const dynamic = 'force-dynamic';

// Re-export for components that import from this file
export { PostJobScreen };

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
      <p>Loading...</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PostJobScreen />
    </Suspense>
  );
}
