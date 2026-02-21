"use client";

import { Suspense } from "react";
import EmployerSigninClient from "./EmployerSigninClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmployerSigninClient />
    </Suspense>
  );
}
