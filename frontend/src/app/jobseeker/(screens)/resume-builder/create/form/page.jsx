"use client";

import { Suspense } from "react";
import { CircularProgress } from "@mui/material";
import CreateResumeFormPageClient from "./CreateResumeFormPageClient";

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
      <p>Loading...</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreateResumeFormPageClient />
    </Suspense>
  );
}
