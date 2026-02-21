import { Suspense } from "react";
import { CircularProgress } from "@mui/material";
import BlogAgentPageClient from "./BlogAgentPageClient";

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
      <p>Loading blog agent...</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BlogAgentPageClient />
    </Suspense>
  );
}

