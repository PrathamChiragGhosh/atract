const PdfSubscription = require('../models/pdfSubscription');
const PdfUser = require('../models/pdfUser');
const userService = require('../services/pdfUserService');

class SubscriptionController {
  /**
   * Create a subscription (after payment)
   */
  async createSubscription(req, res) {
    try {
      const { planType, paymentData } = req.body;

      // Get user email from request
      let email;
      try {
        email = userService.getUserEmail(req);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Email is required to create subscription',
        });
      }

      // Validate payment data exists (even if dummy)
      if (!paymentData) {
        return res.status(400).json({
          success: false,
          message: 'Payment data is required',
        });
      }

      // Validate plan type
      const validPlans = ['daily', 'monthly', 'yearly'];
      if (!validPlans.includes(planType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan type',
        });
      }

      // Get or create user
      const user = await userService.getOrCreateUser(email);

      // Plan details
      const planDetails = {
        daily: {
          amount: 10,
          compressionsAllowed: 10,
          durationDays: 1,
        },
        monthly: {
          amount: 249,
          compressionsAllowed: 10 * 30, // 300
          durationDays: 30,
        },
        yearly: {
          amount: 2199,
          compressionsAllowed: 10 * 30 * 12, // 3600
          durationDays: 365,
        },
      };

      const plan = planDetails[planType];

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.durationDays);

      // Check if user has an active subscription
      const activeSubscription = user.activeSubscriptionId
        ? await PdfSubscription.findOne({ _id: user.activeSubscriptionId, status: 'active' })
        : null;

      let newStatus = 'active';

      if (activeSubscription) {
        // Queue the new subscription
        newStatus = 'pre-subscribed';
      }

      // Create subscription (payment already processed - dummy for now)
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // In a real system, you would verify payment here
      console.log('Processing payment:', {
        planType,
        amount: plan.amount,
        cardLast4: paymentData.cardNumber?.slice(-4) || '****',
        transactionId,
        status: newStatus
      });

      const subscription = new PdfSubscription({
        userId: user._id,
        planType,
        totalCompressionsAllowed: plan.compressionsAllowed,
        compressionsUsed: 0,
        amount: plan.amount,
        paymentStatus: 'completed', // Dummy payment - always succeeds
        transactionId,
        startDate: newStatus === 'active' ? startDate : undefined,
        endDate: newStatus === 'active' ? endDate : undefined, // Will be updated on activation
        status: newStatus,
      });

      await subscription.save();

      // Activate new subscription if it's the active one
      if (newStatus === 'active') {
        user.activeSubscriptionId = subscription._id;
        await user.save();
      }

      res.json({
        success: true,
        message: newStatus === 'active'
          ? 'Subscription activated successfully'
          : 'Subscription purchased and queued successfully',
        subscription: {
          id: subscription._id,
          planType: subscription.planType,
          totalAllowed: subscription.totalCompressionsAllowed,
          used: subscription.compressionsUsed,
          remaining: subscription.getRemainingCompressions(),
          amount: subscription.amount,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          transactionId: subscription.transactionId,
          status: subscription.status,
        },
      });
    } catch (error) {
      console.error('Subscription creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create subscription',
        error: error.message,
      });
    }
  }

  /**
   * Get user subscription and usage stats
   */
  async getUserStats(req, res) {
    try {
      let email;
      try {
        email = userService.getUserEmail(req);
      } catch (error) {
        // Email not provided - return error response instead of 500
        return res.status(400).json({
          success: false,
          message: 'Email is required to get user stats',
          error: error.message,
        });
      }

      const stats = await userService.getUserStats(email);

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user stats',
        error: error.message,
      });
    }
  }

  /**
   * Get subscription plans
   */
  async getPlans(req, res) {
    try {
      const plans = [
        {
          type: 'daily',
          name: 'Daily Pack',
          amount: 10,
          compressionsAllowed: 10,
          duration: '1 day',
          description: 'Compress 10 PDFs for 1 day',
        },
        {
          type: 'monthly',
          name: 'Monthly Subscription',
          amount: 249,
          compressionsAllowed: 300, // 10 * 30
          duration: '30 days',
          description: 'Compress 300 PDFs for 30 days',
        },
        {
          type: 'yearly',
          name: 'Yearly Subscription',
          amount: 2199,
          compressionsAllowed: 3600, // 10 * 30 * 12
          duration: '365 days',
          description: 'Compress 3600 PDFs for 365 days',
        },
      ];

      res.json({
        success: true,
        plans,
      });
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get plans',
        error: error.message,
      });
    }
  }
}

module.exports = new SubscriptionController();

