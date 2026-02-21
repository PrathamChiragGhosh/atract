# Server Configuration Guide for Job Alert System

## Server Specifications

### KVM1 (Current)
- **CPU**: 1 vCPU core
- **RAM**: 4 GB
- **Storage**: 50 GB NVMe
- **Bandwidth**: 4 TB

### KVM2 (Future)
- **CPU**: 2 vCPU cores
- **RAM**: 8 GB
- **Storage**: 100 GB NVMe
- **Bandwidth**: 8 TB

**Note**: Both backend (Node.js) and frontend (Next.js) run on the same server.

---

## Recommended Settings

### KVM1 (1 vCPU, 4GB RAM) - Conservative Settings

**Use these settings for your current KVM1 server:**

```env
# Job Alert System - KVM1 Configuration
JOB_ALERT_MATCHING_TIME=09:00
JOB_MATCHING_THRESHOLD=0.7
JOB_ALERT_INTERVALS=1,3

# Performance Settings (Conservative for 1 vCPU, 4GB RAM)
JOB_ALERT_JOB_BATCH_SIZE=500
JOB_ALERT_JOB_SEEKER_BATCH_SIZE=100
JOB_ALERT_CONCURRENCY=2
JOB_ALERT_EMAIL_DELAY_MS=250
```

**Why these settings:**
- **JOB_BATCH_SIZE=500**: Process 500 jobs at a time to reduce memory usage
- **JOB_SEEKER_BATCH_SIZE=100**: Process 100 job seekers at a time for each job batch
- **CONCURRENCY=2**: Low concurrency to avoid CPU overload with single core
- **EMAIL_DELAY_MS=250**: Higher delay to prevent SMTP rate limiting and reduce CPU spikes
- **Note**: The system checks ALL active jobs (no limit). Both jobs and job seekers are processed in batches to ensure every job seeker matches every job while managing memory efficiently. Old/expired jobs are automatically excluded via `status: 'Active'` filter.

**Expected Performance:**
- Processing speed: ~50-75 job seekers per minute
- Email sending: ~240 emails per minute (with 250ms delays)
- Memory usage: ~500MB-1GB during cron run
- CPU usage: ~60-80% during cron run
- Total time for 1000 job seekers: ~15-20 minutes

**Resource Allocation:**
- MongoDB: ~1-1.5GB RAM
- Node.js Backend: ~500MB-1GB RAM (normal), ~1.5GB during cron
- Next.js Frontend: ~300-500MB RAM
- OS & Buffer: ~1GB RAM
- **Total**: ~3.5-4GB (fits in 4GB with buffer)

---

### KVM2 (2 vCPU, 8GB RAM) - Optimal Settings

**Use these settings when you upgrade to KVM2:**

```env
# Job Alert System - KVM2 Configuration
JOB_ALERT_MATCHING_TIME=09:00
JOB_MATCHING_THRESHOLD=0.7
JOB_ALERT_INTERVALS=1,3

# Performance Settings (Optimal for 2 vCPU, 8GB RAM)
JOB_ALERT_JOB_BATCH_SIZE=1000
JOB_ALERT_JOB_SEEKER_BATCH_SIZE=200
JOB_ALERT_CONCURRENCY=6
JOB_ALERT_EMAIL_DELAY_MS=150
```

**Why these settings:**
- **JOB_BATCH_SIZE=1000**: Process 1000 jobs at a time for better throughput with more RAM available
- **JOB_SEEKER_BATCH_SIZE=200**: Process 200 job seekers at a time for each job batch
- **CONCURRENCY=6**: Higher concurrency to utilize dual-core CPU effectively
- **EMAIL_DELAY_MS=150**: Moderate delay for balanced rate limiting
- **Note**: The system checks ALL active jobs (no limit). Both jobs and job seekers are processed in batches to ensure every job seeker matches every job while managing memory efficiently. Old/expired jobs are automatically excluded via `status: 'Active'` filter.

**Expected Performance:**
- Processing speed: ~150-200 job seekers per minute
- Email sending: ~400 emails per minute (with 150ms delays)
- Memory usage: ~1-2GB during cron run
- CPU usage: ~70-90% during cron run
- Total time for 1000 job seekers: ~5-7 minutes

**Resource Allocation:**
- MongoDB: ~2-3GB RAM
- Node.js Backend: ~1-1.5GB RAM (normal), ~2-2.5GB during cron
- Next.js Frontend: ~500MB-1GB RAM
- OS & Buffer: ~2GB RAM
- **Total**: ~6.5-8GB (fits in 8GB with buffer)

---

### KVM2 (2 vCPU, 8GB RAM) - Aggressive Settings

**Use only if you have many job seekers (>5000) and need maximum throughput:**

```env
# Job Alert System - KVM2 Aggressive Configuration
JOB_ALERT_MATCHING_TIME=09:00
JOB_MATCHING_THRESHOLD=0.7
JOB_ALERT_INTERVALS=1,3

# Performance Settings (Aggressive - Monitor Resources!)
JOB_ALERT_JOB_BATCH_SIZE=1500
JOB_ALERT_JOB_SEEKER_BATCH_SIZE=300
JOB_ALERT_CONCURRENCY=8
JOB_ALERT_EMAIL_DELAY_MS=100
```

**⚠️ Warning**: Monitor server resources when using aggressive settings. Watch for:
- High CPU usage (>90%)
- High memory usage (>7GB)
- Slow response times
- Database connection issues

**Expected Performance:**
- Processing speed: ~200-300 job seekers per minute
- Email sending: ~600 emails per minute (with 100ms delays)
- Memory usage: ~2-3GB during cron run
- CPU usage: ~85-95% during cron run
- Total time for 1000 job seekers: ~3-5 minutes

---

## Monitoring & Tuning

### How to Monitor Performance

1. **Check CPU Usage:**
   ```bash
   top
   # or
   htop
   ```

2. **Check Memory Usage:**
   ```bash
   free -h
   ```

3. **Check Node.js Process:**
   ```bash
   ps aux | grep node
   ```

4. **Monitor MongoDB:**
   ```bash
   mongosh
   db.serverStatus().mem
   ```

### When to Adjust Settings

**Increase settings if:**
- CPU usage consistently <50% during cron
- Memory usage <60% of total RAM
- Cron takes too long to complete
- You have many job seekers (>5000)

**Decrease settings if:**
- CPU usage >90% during cron
- Memory usage >85% of total RAM
- Server becomes unresponsive
- Database queries are slow
- Frontend becomes slow during cron runs

### Recommended Adjustments

**If cron is too slow:**
- Increase `JOB_ALERT_BATCH_SIZE` by 10-20
- Increase `JOB_ALERT_CONCURRENCY` by 1-2
- Decrease `JOB_ALERT_EMAIL_DELAY_MS` by 50ms

**If server is overloaded:**
- Decrease `JOB_ALERT_BATCH_SIZE` by 10-20
- Decrease `JOB_ALERT_CONCURRENCY` by 1-2
- Increase `JOB_ALERT_EMAIL_DELAY_MS` by 50-100ms

---

## Database Indexing (Important for Performance)

Ensure these indexes exist for optimal performance:

```javascript
// JobSeeker collection
db.jobseekers.createIndex({ jobAlertOnResumeMatch: 1 });

// JobSeekerResumeAnalysis collection
db.jobseekersresumeanalyses.createIndex({ 
  jobSeekerId: 1, 
  status: 1, 
  embedding: 1 
});
db.jobseekersresumeanalyses.createIndex({ createdAt: -1 });

// Job collection
db.jobs.createIndex({ status: 1, applicationClosingDate: 1 });
db.jobs.createIndex({ createdAt: -1 });

// JobAnalysis collection
db.jobanalyses.createIndex({ 
  jobId: 1, 
  status: 1, 
  embedding: 1 
});

// JobSeekerJobAlert collection
db.jobseekersjobalerts.createIndex({ 
  jobSeekerId: 1, 
  jobId: 1, 
  intervalDay: 1 
});
db.jobseekersjobalerts.createIndex({ sentAt: 1 });

// JobApplication collection
db.jobapplications.createIndex({ 
  job: 1, 
  "applicants.jobSeeker": 1 
});
```

---

## Best Practices

1. **Run cron during low-traffic hours** (e.g., 2-4 AM IST)
2. **Monitor the first few runs** after changing settings
3. **Use conservative settings initially**, then tune up
4. **Set up alerts** for high CPU/memory usage
5. **Consider splitting** frontend/backend to separate servers if scaling further

---

## Migration from KVM1 to KVM2

When upgrading:

1. **Update `.env` file** with KVM2 settings
2. **Restart the server** to apply new settings
3. **Monitor first cron run** to ensure performance
4. **Gradually increase** settings if needed
5. **Keep monitoring** for a few days

---

## Troubleshooting

**Issue: Cron takes too long**
- Solution: Increase `BATCH_SIZE` and `CONCURRENCY`

**Issue: Server becomes slow during cron**
- Solution: Decrease `CONCURRENCY` and increase `EMAIL_DELAY_MS`

**Issue: Out of memory errors**
- Solution: Decrease `BATCH_SIZE` and `CONCURRENCY`

**Issue: SMTP rate limiting**
- Solution: Increase `EMAIL_DELAY_MS` to 300-500ms

**Issue: Database connection timeouts**
- Solution: Decrease `CONCURRENCY` and check MongoDB connection pool settings

