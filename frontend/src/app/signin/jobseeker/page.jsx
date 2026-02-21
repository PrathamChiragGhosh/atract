"use client";

import { Suspense } from "react";
import JobseekerSigninClient from "./JobseekerSigninClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JobseekerSigninClient />
    </Suspense>
  );
}
