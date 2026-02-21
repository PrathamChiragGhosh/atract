# Resume AI environment variables

Add these to your backend `.env`:

- `RESUME_AI_PROVIDER` — `"together"`, `"gemini"`, or `"none"` (disables analysis).
- `RESUME_AI_MODEL` — model name for the selected provider (e.g. `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` or `gemini-1.5-flash`).
- `RESUME_EMBED_MODEL` — embedding model (e.g. `togethercomputer/m2-bert-80M-8k-retrieval` or `text-embedding-004`).

If using Together:
- `TOGETHER_API_KEY`
- `TOGETHER_BASE_URL` (default `https://api.together.xyz/v1`)
- `TOGETHER_MODEL` (fallback if `RESUME_AI_MODEL` is empty)
- `TOGETHER_EMBED_MODEL` (fallback if `RESUME_EMBED_MODEL` is empty)

If using Gemini:
- `GEMINI_API_KEY`

Notes:
- Set `RESUME_AI_PROVIDER=none` to skip analysis entirely.
- When switching providers, restart the backend so new env values load.

# Job Alert Matching environment variables

Add these to your backend `.env`:

- `JOB_ALERT_ENABLED` — Master switch to enable/disable scheduled job alert matching (daily cron). Default: `true` (enabled). Set to `false` to disable scheduled alerts. Accepts: `true`, `false`, `1`, `0`, `yes`, `no` (case-insensitive).
- `JOB_ALERT_INSTANT_ENABLED` — Switch to enable/disable instant alerts (sent immediately when jobs are posted). Default: `true` (enabled). Set to `false` to disable instant alerts. Accepts: `true`, `false`, `1`, `0`, `yes`, `no` (case-insensitive).
- `JOB_ALERT_MATCHING_TIME` — Time in IST (HH:MM format) when daily job matching runs. Default: `"09:00"`. Example: `"14:30"` for 2:30 PM IST.
- `JOB_MATCHING_THRESHOLD` — Cosine similarity threshold for job matching (0.0 to 1.0). Default: `"0.7"`. Only jobs with match score >= threshold will trigger alerts.
- `JOB_ALERT_INTERVALS` — Comma-separated list of days when alerts should be sent. Default: `"1,3"` (send on day 1, then day 3). Example: `"1,3,7"` for day 1, 3, and 7.
- `JOB_ALERT_JOB_BATCH_SIZE` — Number of jobs to process in each batch when matching against job seekers. Default: `1000`. All job seekers are matched against each batch of jobs. Increase for faster processing (if you have enough RAM), decrease if server is overloaded. This controls memory usage when processing large numbers of jobs.
- `JOB_ALERT_JOB_SEEKER_BATCH_SIZE` — Number of job seekers to process in each batch when matching against a batch of jobs. Default: `200`. For each job batch, job seekers are processed in batches to manage memory. Increase for faster processing (if you have enough RAM), decrease if server is overloaded.
- `JOB_ALERT_CONCURRENCY` — Number of job seekers to process concurrently within each job seeker batch. Default: `5`. Increase for faster processing, decrease to reduce server load.
- `JOB_ALERT_EMAIL_DELAY_MS` — Delay in milliseconds between sending emails (rate limiting). Default: `100`. Increase if SMTP server has rate limits.
- ~~`JOB_ALERT_MAX_JOBS`~~ — **REMOVED**: The system now checks ALL active jobs (no limit). Old/expired jobs are already set to `Inactive` or `Closed` status, so they're automatically excluded. The query only checks jobs with `status: 'Active'` and valid `applicationClosingDate`, ensuring efficient processing without missing any relevant jobs.

## Recommended Settings by Server Type

### KVM1 (1 vCPU, 4GB RAM) - Conservative Settings
**Recommended for servers with limited resources:**
```env
JOB_ALERT_JOB_BATCH_SIZE=500
JOB_ALERT_JOB_SEEKER_BATCH_SIZE=100
JOB_ALERT_CONCURRENCY=2
JOB_ALERT_EMAIL_DELAY_MS=250
```

**Why these settings:**
- **JOB_BATCH_SIZE=500**: Process 500 jobs at a time to reduce memory usage
- **JOB_SEEKER_BATCH_SIZE=100**: Process 100 job seekers at a time for each job batch
- **CONCURRENCY=2**: Low concurrency to avoid CPU overload with single core
- **EMAIL_DELAY_MS=250**: Higher delay to prevent SMTP rate limiting

**Expected performance:**
- All job seekers matched against all active jobs (processed in batches)
- ~240 emails per minute (with delays)
- Memory usage: ~500MB-1GB for job matching process
- CPU usage: ~60-80% during cron run

### KVM2 (2 vCPU, 8GB RAM) - Optimal Settings
**Recommended for servers with more resources:**
```env
JOB_ALERT_JOB_BATCH_SIZE=1000
JOB_ALERT_JOB_SEEKER_BATCH_SIZE=200
JOB_ALERT_CONCURRENCY=6
JOB_ALERT_EMAIL_DELAY_MS=150
```

**Why these settings:**
- **JOB_BATCH_SIZE=1000**: Process 1000 jobs at a time for better throughput
- **JOB_SEEKER_BATCH_SIZE=200**: Process 200 job seekers at a time for each job batch
- **CONCURRENCY=6**: Higher concurrency to utilize dual-core CPU
- **EMAIL_DELAY_MS=150**: Moderate delay for balanced rate limiting

**Expected performance:**
- All job seekers matched against all active jobs (processed in batches)
- ~400 emails per minute (with delays)
- Memory usage: ~1-2GB for job matching process
- CPU usage: ~70-90% during cron run

### KVM2 (2 vCPU, 8GB RAM) - Aggressive Settings (if needed)
**Use only if you have many job seekers and need faster processing:**
```env
JOB_ALERT_JOB_BATCH_SIZE=1500
JOB_ALERT_JOB_SEEKER_BATCH_SIZE=300
JOB_ALERT_CONCURRENCY=8
JOB_ALERT_EMAIL_DELAY_MS=100
```

**Warning:** Monitor server resources when using aggressive settings. Adjust if you see high CPU/memory usage.

Notes:
- Matching runs daily at the specified time for all job seekers with `jobAlertOnResumeMatch: true`.
- Instant alerts (for users with active instant alert plans) are sent immediately when a job is posted.
- After all intervals are exhausted, no more alerts are sent for that job-seeker combination.
- Alerts are not sent if the job seeker has already applied to the job.

