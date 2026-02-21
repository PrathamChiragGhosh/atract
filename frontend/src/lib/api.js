/**
 * Job API base URL. Uses explicit backend URL (no proxy).
 */
export function getJobApiBaseUrl() {
  return process.env.NEXT_PUBLIC_JOB_URL || "http://localhost:5001/job";
}
