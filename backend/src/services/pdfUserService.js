const PdfUser = require('../models/pdfUser');
const PdfSubscription = require('../models/pdfSubscription');

class UserService {
  /**
   * Get or create user by email address
   */
  async getOrCreateUser(email) {
    try {
      if (!email) {
        throw new Error('Email is required to identify user');
      }

      // Normalize email (lowercase, trim)
      const normalizedEmail = email.toLowerCase().trim();

      let user = await PdfUser.findOne({ email: normalizedEmail });

      if (!user) {
        try {
          user = new PdfUser({
            email: normalizedEmail,
            dailyCompressionCount: 0,
            lastCompressionDate: new Date(),
          });
          await user.save();
        } catch (saveError) {
          // Handle duplicate key error
          if (saveError.code === 11000) {
            // Try to find user again (might have been created by another request)
            user = await PdfUser.findOne({ email: normalizedEmail });
            if (!user) {
              throw saveError;
            }
          } else {
            throw saveError;
          }
        }
      }

      return user;
    } catch (error) {
      console.error('Error getting/creating user:', error);
      throw error;
    }
  }

  /**
   * Get user email from request (sent from frontend)
   */
  getUserEmail(req) {
    // Get email from header, body, or query (sent from frontend)
    const email = req.headers['x-user-email'] || req.body.email || req.query.email;

    if (!email || email === 'undefined' || email === 'null' || email.trim() === '') {
      throw new Error('Email is required to identify user');
    }

    // Normalize email (lowercase, trim)
    return email.toLowerCase().trim();
  }

  /**
   * Helper to check active subscription and activate next if needed
   */
  async checkAndActivateNextSubscription(user) {
    if (user.activeSubscriptionId) {
      const subscription = await PdfSubscription.findById(user.activeSubscriptionId);

      if (subscription) {
        // Check if exhausted (limit reached OR expired)
        const now = new Date();
        const isExpired = now > subscription.endDate;
        const isLimitReached = subscription.compressionsUsed >= subscription.totalCompressionsAllowed;

        if (isExpired || isLimitReached || subscription.status !== 'active') {
          // Mark as completed/expired if not already
          if (subscription.status === 'active') { // Only change if it was active
            subscription.status = isLimitReached ? 'completed' : 'expired';
            await subscription.save();
          }
          user.activeSubscriptionId = null;
        } else {
          return subscription; // Still active and valid
        }
      } else {
        user.activeSubscriptionId = null;
      }
    }

    // If we are here, user has no active subscription (or we just expired it)
    // Find next queued subscription
    const nextSubscription = await PdfSubscription.findOne({
      userId: user._id,
      status: 'pre-subscribed',
      paymentStatus: 'completed' // enhance safety
    }).sort({ createdAt: 1 }); // FIFO

    if (nextSubscription) {
      // Activate it
      const now = new Date();

      // Calculate duration based on plan type (or existing logic if we stored duration)
      // Since we didn't store duration explicitly in model, we can derive or it should have been set tentatively.
      // But wait, in createSubscription we set startDate/endDate to null for queued.
      // We need to recalculate endDate.

      const planDetails = {
        daily: 1,
        monthly: 30,
        yearly: 365
      };
      const durationDays = planDetails[nextSubscription.planType] || 30; // fallback

      const startDate = now;
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + durationDays);

      nextSubscription.startDate = startDate;
      nextSubscription.endDate = endDate;
      nextSubscription.status = 'active';
      await nextSubscription.save();

      user.activeSubscriptionId = nextSubscription._id;
      await user.save();

      return nextSubscription;
    }

    await user.save(); // save activeSubscriptionId = null change if any
    return null;
  }

  /**
   * Check if user can compress a PDF
   */
  async canUserCompress(email) {
    try {
      const user = await this.getOrCreateUser(email);

      // Reset daily count if needed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = new Date(user.lastCompressionDate);
      lastDate.setHours(0, 0, 0, 0);

      if (lastDate.getTime() !== today.getTime()) {
        user.dailyCompressionCount = 0;
        user.lastCompressionDate = new Date();
        await user.save();
      }

      // Check and auto-activate subscription if needed
      const subscription = await this.checkAndActivateNextSubscription(user);

      if (subscription) {
        // Subscription is active, check compression limits (should be valid returned by helper, but verify limit)
        const canCompress = subscription.compressionsUsed < subscription.totalCompressionsAllowed;
        const remaining = subscription.getRemainingCompressions();

        return {
          canCompress,
          remaining,
          isFree: false,
          subscription: {
            planType: subscription.planType,
            totalAllowed: subscription.totalCompressionsAllowed,
            used: subscription.compressionsUsed,
            endDate: subscription.endDate,
          },
        };
      }

      // Free tier: 1 compression per day (when no active subscription)
      return {
        canCompress: user.dailyCompressionCount < 1,
        remaining: Math.max(0, 1 - user.dailyCompressionCount),
        isFree: true,
      };
    } catch (error) {
      console.error('Error checking compression limit:', error);
      // On error, allow compression (fail open)
      return {
        canCompress: true,
        remaining: 1,
        isFree: true,
      };
    }
  }

  /**
   * Record a compression
   */
  async recordCompression(email) {
    try {
      const user = await this.getOrCreateUser(email);

      // Reset daily count if needed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = new Date(user.lastCompressionDate);
      lastDate.setHours(0, 0, 0, 0);

      if (lastDate.getTime() !== today.getTime()) {
        user.dailyCompressionCount = 0;
        user.lastCompressionDate = new Date();
      }

      // Check and update subscription
      // We call checkAndActivateNextSubscription to ensure we have the correct active sub
      const subscription = await this.checkAndActivateNextSubscription(user);

      let subscriptionUsed = false;
      if (subscription) {
        // Increment subscription compression count
        // Double check limit just in case
        if (subscription.compressionsUsed < subscription.totalCompressionsAllowed) {
          subscription.incrementCompression();
          // Check if limit reached after increment
          if (subscription.compressionsUsed >= subscription.totalCompressionsAllowed) {
            // We don't auto-switch HERE immediately, we let it stay 'limit reached' until next check
            // or we could status='completed' now.
            // Let's leave it, next check will mark it completed and switch.
          }
          await subscription.save();
          subscriptionUsed = true;
        }
      }

      // Always increment user's daily and total counts
      user.dailyCompressionCount += 1;
      user.totalCompressionsUsed += 1;

      await user.save();
    } catch (error) {
      console.error('Error recording compression:', error);
      // Don't throw - compression was successful
    }
  }

  /**
   * Get user usage statistics
   */
  async getUserStats(email) {
    try {
      const user = await this.getOrCreateUser(email);

      // Reset daily count if needed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = new Date(user.lastCompressionDate);
      lastDate.setHours(0, 0, 0, 0);

      if (lastDate.getTime() !== today.getTime()) {
        user.dailyCompressionCount = 0;
        user.lastCompressionDate = new Date();
        await user.save();
      }

      // Update subscriptions status (handle expiry/activation)
      const activeSubscription = await this.checkAndActivateNextSubscription(user);

      // Get all subscriptions for history/queue
      const allSubscriptions = await PdfSubscription.find({ userId: user._id }).sort({ createdAt: -1 });

      // Calculate remaining compressions
      let dailyCompressionsRemaining;
      if (activeSubscription) {
        // User has active subscription - use subscription limits
        dailyCompressionsRemaining = activeSubscription.getRemainingCompressions();
      } else {
        // Free tier - 1 compression per day
        dailyCompressionsRemaining = Math.max(0, 1 - user.dailyCompressionCount);
      }

      return {
        dailyCompressionsUsed: user.dailyCompressionCount,
        dailyCompressionsRemaining: dailyCompressionsRemaining,
        totalCompressionsUsed: user.totalCompressionsUsed,
        isFree: !activeSubscription,
        subscription: activeSubscription ? {
          planType: activeSubscription.planType,
          totalAllowed: activeSubscription.totalCompressionsAllowed,
          used: activeSubscription.compressionsUsed,
          remaining: activeSubscription.getRemainingCompressions(),
          startDate: activeSubscription.startDate,
          endDate: activeSubscription.endDate,
          status: activeSubscription.status,
          amount: activeSubscription.amount, // Added amount
        } : null,
        allSubscriptions: allSubscriptions.map(sub => ({
          id: sub._id,
          planType: sub.planType,
          totalAllowed: sub.totalCompressionsAllowed,
          compressionsAllowed: sub.totalCompressionsAllowed, // specific for frontend compatibility if needed
          used: sub.compressionsUsed,
          remaining: sub.getRemainingCompressions(),
          startDate: sub.startDate,
          endDate: sub.endDate,
          status: sub.status,
          amount: sub.amount,
        })),
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = new UserService();

