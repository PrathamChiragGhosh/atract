const cron = require('node-cron');
const Blog = require('../models/Blog.js');
const AutoPublishSetting = require('../models/AutoPublishSetting.js');
const { generateBlogWithAI } = require('./aiClient.js');
const { sendAlertEmail } = require('./emailService.js');
const { selectTopics } = require('../utils/topicSelector.js');

const DEFAULT_TIME = '09:00';
const BLOGS_PER_RUN = 10;
const RETRY_DELAY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RETRIES = 3;
const MAX_BATCH_SIZE = 5; // Safety cap for hourly publishing to protect API
const DRY_RUN_MODE = process.env.BLOG_PUBLISH_DRY_RUN === 'true';

let currentTask = null; // Daily cron task (legacy mode)
let currentHourlyTask = null; // Hourly cron task (incremental mode)
let currentDailyCalcTask = null; // Daily calculation cron task (incremental mode)
let recentTopics = [];

const ensureSettings = async () => {
  const existing = await AutoPublishSetting.findOne();
  if (existing) {
    // Initialize new fields if missing (backward compatibility)
    if (existing.baseDailyCount === undefined) existing.baseDailyCount = 10;
    if (existing.dailyIncrement === undefined) existing.dailyIncrement = 5;
    if (existing.dailyTarget === undefined) existing.dailyTarget = 10;
    if (existing.publishedToday === undefined) existing.publishedToday = 0;
    if (existing.incrementalMode === undefined) existing.incrementalMode = false;
    await existing.save();
    return existing;
  }
  return AutoPublishSetting.create({
    enabled: false,
    time: DEFAULT_TIME,
    extraKeywords: [],
    baseDailyCount: 10,
    dailyIncrement: 5,
    dailyTarget: 10,
    publishedToday: 0,
    incrementalMode: false,
  });
};

// Convert local time (IST - UTC+5:30) to UTC
const convertLocalTimeToUTC = (localTime) => {
  if (!localTime || !/^\d{2}:\d{2}$/.test(localTime)) {
    return localTime;
  }
  
  const [hours, minutes] = localTime.split(':');
  const h = Number(hours);
  const m = Number(minutes);
  
  if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) {
    return localTime;
  }
  
  // IST is UTC+5:30, so subtract 5 hours and 30 minutes
  let utcHours = h - 5;
  let utcMinutes = m - 30;
  
  // Handle minute underflow
  if (utcMinutes < 0) {
    utcMinutes += 60;
    utcHours -= 1;
  }
  
  // Handle hour underflow (previous day)
  if (utcHours < 0) {
    utcHours += 24;
  }
  
  // Format as HH:mm
  return `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
};

const buildCronExpression = (time) => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return '0 9 * * *'; // 09:00 default
  }
  
  // Convert local time to UTC
  const utcTime = convertLocalTimeToUTC(time);
  const [hours, minutes] = utcTime.split(':');
  const h = Number(hours);
  const m = Number(minutes);
  
  if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) {
    return '0 9 * * *';
  }
  return `${m} ${h} * * *`;
};

const generateSlug = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const createBlogWithUniqueSlug = async (blogData, index) => {
  let slug = blogData.slug || generateSlug(blogData.title || `blog-${Date.now()}`);
  let attempt = 0;
  let exists = true;

  while (exists && attempt < 10) {
    const found = await Blog.findOne({ slug });
    if (!found) {
      exists = false;
      break;
    }
    attempt += 1;
    slug = `${blogData.slug || generateSlug(blogData.title)}-${Date.now()}-${index}-${attempt}`;
  }

  return Blog.create({
    ...blogData,
    slug,
    status: 'published',
  });
};

const runAutoPublishJob = async () => {
  console.log('[Auto-Publish] Cron triggered.');
  const settings = await ensureSettings();
  if (!settings.enabled) {
    console.log('Auto-publish is disabled. Skipping job.');
    return { success: true, generated: 0 };
  }

  const { selectedTopics, updatedRecent } = selectTopics(
    BLOGS_PER_RUN,
    settings.extraKeywords,
    recentTopics
  );
  recentTopics = updatedRecent;

  const generated = [];
  const errors = [];

  for (let i = 0; i < selectedTopics.length; i += 1) {
    const topic = selectedTopics[i];
    try {
      const blogData = await generateBlogWithAI(topic);
      const blog = await createBlogWithUniqueSlug(blogData, i);
      generated.push(blog);
    } catch (error) {
      console.log(`Auto-publish: failed to create blog for topic "${topic}":`, error.message);
      errors.push({ topic, error: error.message });
      // Continue generating remaining blogs
    }
  }

  // Send email notification based on results
  const { getBlogPublisherEmails } = require('./emailService.js');
  const allowedEmails = getBlogPublisherEmails();
  
  if (generated.length === 0) {
    // No blogs generated - send failure email
    const errorMessage = errors.length > 0 
      ? `Failed to generate any blogs. Errors: ${errors.map(e => `${e.topic}: ${e.error}`).join('; ')}`
      : 'Failed to generate any blogs. No errors recorded.';
    
    await sendAlertEmail({
      subject: 'Blog Auto-Publish Failed: No Blogs Generated',
      text: `The automatic blog publishing job failed to generate any blogs.\n\n${errorMessage}\n\nPlease check the blog publisher settings and try again.`,
      html: `
        <h2>Blog Auto-Publish Failed</h2>
        <p>The automatic blog publishing job failed to generate any blogs.</p>
        <p><strong>Error Details:</strong></p>
        <p>${errorMessage}</p>
        <p>Please check the blog publisher settings and try again.</p>
      `,
      toEmails: allowedEmails.length > 0 ? allowedEmails : null,
    });
    
    throw new Error('Auto-publish failed: no blogs were generated');
  }

  // Blogs generated - send success email
  const successMessage = generated.length === BLOGS_PER_RUN
    ? `Successfully generated all ${generated.length} blogs.`
    : `Generated ${generated.length} out of ${BLOGS_PER_RUN} blogs.`;
  
  const errorDetails = errors.length > 0
    ? `\n\nFailed topics:\n${errors.map(e => `- ${e.topic}: ${e.error}`).join('\n')}`
    : '';
  
  const blogTitles = generated.map((blog, idx) => `${idx + 1}. ${blog.title}`).join('\n');
  
  await sendAlertEmail({
    subject: `Blog Auto-Publish Complete: ${generated.length} Blog(s) Generated`,
    text: `${successMessage}${errorDetails}\n\nGenerated Blogs:\n${blogTitles}`,
    html: `
      <h2>Blog Auto-Publish Complete</h2>
      <p><strong>${successMessage}</strong></p>
      ${errors.length > 0 ? `
        <h3>Failed Topics:</h3>
        <ul>
          ${errors.map(e => `<li><strong>${e.topic}:</strong> ${e.error}</li>`).join('')}
        </ul>
      ` : ''}
      <h3>Generated Blogs:</h3>
      <ol>
        ${generated.map(blog => `<li>${blog.title}</li>`).join('')}
      </ol>
    `,
    toEmails: allowedEmails.length > 0 ? allowedEmails : null,
  });

  console.log(`Auto-publish complete. Generated ${generated.length} blog(s).`);
  return { success: true, generated: generated.length, errors };
};

const runWithRetries = async (attempt = 1) => {
  try {
    return await runAutoPublishJob();
  } catch (error) {
    console.log(`Auto-publish attempt ${attempt} failed:`, error.message);
    if (attempt < MAX_RETRIES) {
      setTimeout(() => runWithRetries(attempt + 1), RETRY_DELAY_MS);
      return { success: false, retryScheduled: true };
    }

    // Final failure: send alert to allowed emails
    const { getBlogPublisherEmails } = require('./emailService.js');
    const allowedEmails = getBlogPublisherEmails();
    await sendAlertEmail({
      subject: 'Auto-publish failed after retries',
      text: `Auto blog publishing failed after ${MAX_RETRIES} attempts. Error: ${error.message}`,
      toEmails: allowedEmails.length > 0 ? allowedEmails : null,
    });

    return { success: false, retryScheduled: false };
  }
};

/**
 * Get IST calendar date (YYYY-MM-DD) from a UTC timestamp.
 * Uses UTC-only math so result is independent of server timezone.
 */
const getISTDateString = (utcMs) => {
  const istMs = utcMs + (5.5 * 3600000);
  const d = new Date(istMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Calculate and update daily target for incremental publishing
 * Runs once per day to set today's target based on yesterday's target + increment
 * Idempotent: safe to run multiple times per day (only updates once).
 * Fix: Compare IST dates using UTC-only math so server timezone cannot cause
 * "already ran today" to be true when we have not run for the current IST day.
 */
const calculateDailyTarget = async () => {
  try {
    const settings = await ensureSettings();
    
    if (!settings.enabled || !settings.incrementalMode) {
      return; // Only run in incremental mode
    }

    const now = Date.now();
    const todayIST = getISTDateString(now);

    // Check if we already calculated for this IST date (timezone-safe)
    if (settings.lastRunDate) {
      const lastRunIST = getISTDateString(new Date(settings.lastRunDate).getTime());
      if (lastRunIST === todayIST) {
        // Already calculated for this IST day - skip
        return;
      }
    }

    // Calculate new daily target
    const baseCount = settings.baseDailyCount || 10;
    const increment = settings.dailyIncrement || 5;
    const previousTarget = settings.dailyTarget || baseCount;
    
    // If lastRunDate exists, increment from previous target
    // Otherwise, start with baseDailyCount
    const newTarget = settings.lastRunDate 
      ? previousTarget + increment 
      : baseCount;

    // Update settings
    settings.dailyTarget = newTarget;
    settings.publishedToday = 0; // Reset daily counter
    settings.lastRunDate = new Date(now);
    await settings.save();

    console.log(`[Incremental Publishing] Daily target calculated: ${newTarget} blogs (increment: +${increment})`);
  } catch (error) {
    console.error('Error calculating daily target:', error.message);
  }
};

/**
 * Hourly publishing job for incremental mode
 * Distributes daily target across hours to reduce load
 * Only publishes if quota remains and calculates batch size based on remaining hours
 */
const runHourlyPublishJob = async () => {
  try {
    // IDEMPOTENCY PROTECTION: Re-fetch latest settings from DB before processing
    const settings = await AutoPublishSetting.findOne();
    if (!settings) {
      console.log('[Incremental Publishing] No settings found. Skipping hourly publish.');
      return { success: true, generated: 0, reason: 'no_settings' };
    }
    
    if (!settings.enabled || !settings.incrementalMode) {
      return { success: true, generated: 0, reason: 'incremental_mode_disabled' };
    }

    // Re-calculate remaining quota from fresh DB state (idempotency protection)
    const remaining = (settings.dailyTarget || 0) - (settings.publishedToday || 0);
    if (remaining <= 0) {
      console.log(`[Incremental Publishing] Daily quota completed (${settings.publishedToday}/${settings.dailyTarget}). Skipping hourly publish.`);
      return { success: true, generated: 0, reason: 'quota_completed' };
    }

    // Calculate remaining hours in day (IST)
    const now = new Date();
    const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTimestamp + (5.5 * 3600000));
    const currentHour = istTime.getHours();
    const remainingHours = Math.max(1, 24 - currentHour); // At least 1 hour remaining

    // Calculate batch size: distribute remaining blogs across remaining hours
    // Minimum 1 blog per batch, maximum based on remaining quota
    const batchSize = Math.max(1, Math.ceil(remaining / remainingHours));
    let actualBatchSize = Math.min(batchSize, remaining); // Don't exceed remaining

    // SAFETY GUARD: Hard cap to protect API from overload
    if (actualBatchSize > MAX_BATCH_SIZE) {
      console.warn(`[Incremental Publishing] SAFETY CAP APPLIED: Batch size ${actualBatchSize} exceeds maximum ${MAX_BATCH_SIZE}. Capping to ${MAX_BATCH_SIZE} to protect API.`);
      actualBatchSize = MAX_BATCH_SIZE;
    }

    // DRY-RUN MODE: Log only, do not generate blogs
    if (DRY_RUN_MODE) {
      const nextHour = (currentHour + 1) % 24;
      console.log('[Incremental Publishing] DRY-RUN MODE (BLOG_PUBLISH_DRY_RUN=true):');
      console.log(`  - Target: ${settings.dailyTarget} blogs`);
      console.log(`  - Published today: ${settings.publishedToday}/${settings.dailyTarget}`);
      console.log(`  - Remaining: ${remaining} blogs`);
      console.log(`  - Batch size: ${actualBatchSize} blogs`);
      console.log(`  - Hours remaining: ${remainingHours}`);
      console.log(`  - Current time: ${String(currentHour).padStart(2, '0')}:00 IST`);
      console.log(`  - Next run: ${String(nextHour).padStart(2, '0')}:00 IST`);
      console.log('  - NO BLOGS WILL BE GENERATED (dry-run mode)');
      return { success: true, generated: 0, reason: 'dry_run', dryRun: true };
    }

    console.log(`[Incremental Publishing] Hourly batch: ${actualBatchSize} blogs (remaining: ${remaining}/${settings.dailyTarget}, hours left: ${remainingHours})`);

    // Select topics for this batch
    const { selectedTopics, updatedRecent } = selectTopics(
      actualBatchSize,
      settings.extraKeywords,
      recentTopics
    );
    recentTopics = updatedRecent;

    const generated = [];
    const errors = [];

    // Generate blogs for this batch
    for (let i = 0; i < selectedTopics.length; i += 1) {
      const topic = selectedTopics[i];
      try {
        const blogData = await generateBlogWithAI(topic);
        const blog = await createBlogWithUniqueSlug(blogData, i);
        generated.push(blog);
      } catch (error) {
        console.log(`[Incremental Publishing] Failed to create blog for topic "${topic}":`, error.message);
        errors.push({ topic, error: error.message });
        // Continue generating remaining blogs
      }
    }

    // Update published count (only count successfully generated blogs)
    if (generated.length > 0) {
      // Re-fetch settings before updating (idempotency protection)
      const freshSettings = await AutoPublishSetting.findOne();
      if (freshSettings) {
        freshSettings.publishedToday = (freshSettings.publishedToday || 0) + generated.length;
        await freshSettings.save();
        
        const newRemaining = freshSettings.dailyTarget - freshSettings.publishedToday;
        console.log(`[Incremental Publishing] Published ${generated.length} blog(s). Remaining today: ${newRemaining}/${freshSettings.dailyTarget}`);
      }
    }

    // Send email notification if this is the last batch or if errors occurred
    const finalSettings = await AutoPublishSetting.findOne();
    if (finalSettings && (errors.length > 0 || (finalSettings.publishedToday >= finalSettings.dailyTarget))) {
      const { getBlogPublisherEmails } = require('./emailService.js');
      const allowedEmails = getBlogPublisherEmails();
      
      const statusMessage = finalSettings.publishedToday >= finalSettings.dailyTarget
        ? `Daily quota completed: ${finalSettings.publishedToday}/${finalSettings.dailyTarget} blogs published.`
        : `Hourly batch complete: ${generated.length} blog(s) published. Remaining: ${finalSettings.dailyTarget - finalSettings.publishedToday}`;
      
      await sendAlertEmail({
        subject: `[Incremental Publishing] Hourly Batch: ${generated.length} Blog(s) Published`,
        text: `${statusMessage}\n\n${errors.length > 0 ? `Errors:\n${errors.map(e => `- ${e.topic}: ${e.error}`).join('\n')}` : ''}`,
        html: `
          <h2>Incremental Publishing - Hourly Batch</h2>
          <p><strong>${statusMessage}</strong></p>
          ${errors.length > 0 ? `
            <h3>Errors:</h3>
            <ul>
              ${errors.map(e => `<li><strong>${e.topic}:</strong> ${e.error}</li>`).join('')}
            </ul>
          ` : ''}
        `,
        toEmails: allowedEmails.length > 0 ? allowedEmails : null,
      });
    }

    // CONCISE EXECUTION SUMMARY LOG
    const nextHour = (currentHour + 1) % 24;
    const finalRemaining = finalSettings ? (finalSettings.dailyTarget - finalSettings.publishedToday) : remaining;
    console.log(`[Incremental Publishing] Hourly summary → generated: ${generated.length} | publishedToday: ${finalSettings?.publishedToday || settings.publishedToday}/${settings.dailyTarget} | nextRun: ${String(nextHour).padStart(2, '0')}:00 IST`);

    return { success: true, generated: generated.length, errors, remaining: finalRemaining };
  } catch (error) {
    console.error('[Incremental Publishing] Hourly job error:', error.message);
    return { success: false, generated: 0, error: error.message };
  }
};

const scheduleJob = async () => {
  const settings = await ensureSettings();

  // Stop all existing cron tasks
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
  if (currentHourlyTask) {
    currentHourlyTask.stop();
    currentHourlyTask = null;
  }
  if (currentDailyCalcTask) {
    currentDailyCalcTask.stop();
    currentDailyCalcTask = null;
  }

  if (!settings.enabled) {
    console.log('Auto-publish disabled. Cron not scheduled.');
    return;
  }

  // INCREMENTAL MODE: Hourly publishing with daily target calculation
  if (settings.incrementalMode) {
    // Schedule daily calculation at midnight IST (00:00 IST = 18:30 previous day UTC)
    // Cron: "30 18 * * *" runs at 18:30 UTC = 00:00 IST next day
    currentDailyCalcTask = cron.schedule('30 18 * * *', () => {
      calculateDailyTarget();
    });
    
    // Schedule hourly publishing (every hour at minute 0)
    // Cron: "0 * * * *" runs at the start of every hour
    currentHourlyTask = cron.schedule('0 * * * *', () => {
      runHourlyPublishJob().catch(err => {
        console.error('[Incremental Publishing] Hourly job error:', err.message);
      });
    });

    // Run daily calculation immediately if not done today
    calculateDailyTarget().catch(err => {
      console.error('[Incremental Publishing] Daily calculation error:', err.message);
    });

    // Run hourly job immediately if quota remains (for immediate publishing)
    runHourlyPublishJob().catch(err => {
      console.error('[Incremental Publishing] Initial hourly job error:', err.message);
    });

    // STARTUP VERIFICATION LOGS
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[Incremental Publishing] STARTUP VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  incrementalMode: ${settings.incrementalMode}`);
    console.log(`  baseDailyCount: ${settings.baseDailyCount || 10}`);
    console.log(`  dailyIncrement: ${settings.dailyIncrement || 5}`);
    console.log(`  dailyTarget: ${settings.dailyTarget || 10}`);
    console.log(`  publishedToday: ${settings.publishedToday || 0}`);
    console.log(`  Active Cron Schedules:`);
    console.log(`    - Daily target calculation: 00:00 IST (18:30 UTC) [cron: 30 18 * * *]`);
    console.log(`    - Hourly publishing: Every hour at :00 [cron: 0 * * * *]`);
    if (DRY_RUN_MODE) {
      console.log(`  ⚠️  DRY-RUN MODE ENABLED (BLOG_PUBLISH_DRY_RUN=true) - No blogs will be generated`);
    }
    console.log('═══════════════════════════════════════════════════════════════');
    return;
  }

  // LEGACY MODE: Single daily publish at scheduled time (backward compatible)
  const cronExp = buildCronExpression(settings.time);
  const utcTime = convertLocalTimeToUTC(settings.time);
  
  // Check if scheduled time has already passed today - if so, run immediately
  // Get current time in IST (UTC+5:30)
  const now = new Date();
  const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utcTimestamp + (5.5 * 3600000)); // IST is UTC+5:30
  
  const [hours, minutes] = settings.time.split(':');
  const scheduledHour = parseInt(hours, 10);
  const scheduledMinute = parseInt(minutes, 10);
  const currentHour = istTime.getHours();
  const currentMinute = istTime.getMinutes();
  
  // If scheduled time has passed today, run immediately
  const timeHasPassed = currentHour > scheduledHour || 
    (currentHour === scheduledHour && currentMinute >= scheduledMinute);
  
  if (timeHasPassed) {
    console.log(`Scheduled time ${settings.time} IST has passed (current: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} IST). Running auto-publish immediately...`);
    runWithRetries();
  }
  
  currentTask = cron.schedule(cronExp, () => {
    runWithRetries();
  });

  // STARTUP VERIFICATION LOGS (Legacy Mode)
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[Legacy Mode] STARTUP VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  incrementalMode: ${settings.incrementalMode || false}`);
  console.log(`  baseDailyCount: ${settings.baseDailyCount || 10}`);
  console.log(`  dailyIncrement: ${settings.dailyIncrement || 5}`);
  console.log(`  dailyTarget: ${settings.dailyTarget || 10}`);
  console.log(`  publishedToday: ${settings.publishedToday || 0}`);
  console.log(`  Active Cron Schedule:`);
  console.log(`    - Daily publish: ${settings.time} IST (${utcTime} UTC) [cron: ${cronExp}]`);
  console.log('═══════════════════════════════════════════════════════════════');
};

const initAutoPublishCron = async () => {
  try {
    const settings = await ensureSettings();
    await scheduleJob();
    
    // Additional startup log for overall status
    if (settings.enabled) {
      console.log(`[Auto-Publish] System initialized successfully. Mode: ${settings.incrementalMode ? 'INCREMENTAL' : 'LEGACY'}`);
    } else {
      console.log('[Auto-Publish] System initialized but DISABLED.');
    }
  } catch (error) {
    console.log('Failed to initialize auto-publish cron:', error.message);
  }
};

const refreshAutoPublishCron = async () => {
  await scheduleJob();
};

const runAutoPublishJobManually = async () => {
  return runWithRetries();
};

module.exports = {
  initAutoPublishCron,
  refreshAutoPublishCron,
  runAutoPublishJobManually,
};

