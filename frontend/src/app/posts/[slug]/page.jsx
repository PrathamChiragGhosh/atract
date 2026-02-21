import { Suspense } from "react";
import Link from "next/link";
import { CircularProgress } from "@mui/material";
import PostDetailPageClient from "./PostDetailPageClient";

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
      <p>Loading blog...</p>
    </div>
  );
}

export default async function Page({ params }) {
  // Handle params - it might be a Promise or a direct object
  let resolvedParams;
  if (params && typeof params.then === 'function') {
    resolvedParams = await params;
  } else {
    resolvedParams = params;
  }
  
  const slug = resolvedParams?.slug;
  
  if (!slug) {
    return (
      <div className="blogview-container">
        <div className="blogview-error">Invalid blog URL</div>
        <Link href="/posts" className="blogview-backLink">
          ← Back to Blogs
        </Link>
      </div>
    );
  }
  
  // Ensure slug is a string
  const slugStr = String(slug).trim();
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PostDetailPageClient slug={slugStr} />
    </Suspense>
  );
}

