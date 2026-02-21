"use client";

import { Suspense } from "react";
import AdminSigninClient from "./AdminSigninClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminSigninClient />
    </Suspense>
  );
}

