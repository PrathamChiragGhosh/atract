const crypto = require("crypto");
const JobSeeker = require("../models/jobSeeker");
const JobSeekerInstantAlertPlan = require("../models/jobSeekerInstantAlertPlan");
const JobSeekerInstantAlertPayment = require("../models/jobSeekerInstantAlertPayment");
const Razorpay = require("razorpay");

let razorpayInstance = null;
const getRazorpayInstance = () => {
    if (razorpayInstance) return razorpayInstance;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
    });
    return razorpayInstance;
};

const ALERT_PRICE = Number(process.env.INSTANT_ALERT_PRICE || 200);
const ALERT_CURRENCY = (process.env.INSTANT_ALERT_CURRENCY || "inr").toLowerCase();
const ALERT_DURATION_DAYS = Number(process.env.INSTANT_ALERT_DURATION_DAYS || 30);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

exports.createInstantAlertCheckoutSession = async (req, res) => {
    try {
        const razorpayInstance = getRazorpayInstance();
        if (!razorpayInstance) {
            return res.status(503).json({
                success: false,
                message: "Payments are temporarily unavailable. Please try again later."
            });
        }

        const jobSeekerId = req.userId;
        const { currency = ALERT_CURRENCY } = req.body;

        const jobSeeker = await JobSeeker.findById(jobSeekerId);
        if (!jobSeeker) {
            return res.status(404).json({ success: false, message: "Job seeker not found" });
        }

        const amount = ALERT_PRICE * 100; // Razorpay expects amount in paisa
        const receipt = `instant_alerts_${jobSeekerId.slice(-8)}_${Date.now().toString().slice(-6)}`;

        const options = {
            amount: amount,
            currency: currency.toUpperCase(),
            receipt: receipt,
            notes: {
                jobSeekerId: jobSeekerId.toString(),
                productType: "instant_alerts"
            }
        };

        const order = await razorpayInstance.orders.create(options);

        return res.json({
            success: true,
            orderId: order.id,
            amount: amount,
            currency: currency.toUpperCase(),
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Instant alerts checkout error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to start payment right now. Please try again later."
        });
    }
};

exports.verifyInstantAlertPayment = async (req, res) => {
    try {
        const razorpayInstance = getRazorpayInstance();
        if (!razorpayInstance) {
            return res.status(503).json({
                success: false,
                message: "Payments are temporarily unavailable. Please try again later."
            });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Missing required payment verification parameters"
            });
        }

        // Verify payment signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed"
            });
        }

        // Get payment details from Razorpay
        const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);

        if (payment.status !== "captured") {
            return res.status(400).json({
                success: false,
                message: "Payment not captured"
            });
        }

        // Extract jobSeekerId from order notes
        const order = await razorpayInstance.orders.fetch(razorpay_order_id);
        const notes = order.notes || {};
        const jobSeekerId = notes.jobSeekerId;

        if (!jobSeekerId) {
            return res.status(400).json({
                success: false,
                message: "Missing jobSeekerId in order metadata"
            });
        }

        // Check if payment already exists
        const existingPayment = await JobSeekerInstantAlertPayment.findOne({
            $or: [
                { sessionId: razorpay_order_id },
                { paymentIntentId: razorpay_payment_id }
            ]
        });

        const paymentRecord = {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            amount: payment.amount / 100
        };

        if (existingPayment) {
            return res.json({
                success: true,
                message: "Transaction already recorded",
                payment: paymentRecord
            });
        }

        // Create payment record
        const paymentDoc = await JobSeekerInstantAlertPayment.create({
            jobSeekerId,
            sessionId: razorpay_order_id,
            paymentIntentId: razorpay_payment_id,
            amount: payment.amount / 100,
            currency: payment.currency,
            status: "paid",
            provider: "razorpay",
            receiptUrl: null // Razorpay doesn't provide receipt URLs like Stripe
        });

        // Create or update plan
        const startDate = new Date();
        const endDate = addDays(startDate, ALERT_DURATION_DAYS);
        const plan = await JobSeekerInstantAlertPlan.create({
            jobSeekerId,
            startDate,
            endDate,
            paymentDate: new Date(),
            sessionId: razorpay_order_id,
            status: "active",
            amount: payment.amount / 100,
            currency: payment.currency,
            paymentId: paymentDoc._id
        });

        // Enable alerts on profile
        await JobSeeker.findByIdAndUpdate(jobSeekerId, { jobAlertOnResumeMatch: true });

        return res.json({
            success: true,
            message: "Instant alerts activated",
            payment: paymentRecord,
            plan: {
                startDate,
                endDate,
                status: plan.status
            }
        });
    } catch (error) {
        console.error("Verify instant alerts payment error:", error);
        return res.status(500).json({
            success: false,
            message: "We could not verify this payment right now. Please contact support if this persists."
        });
    }
};

exports.getInstantAlertPlan = async (req, res) => {
    try {
        const jobSeekerId = req.userId;
        const plan = await JobSeekerInstantAlertPlan.findOne({ jobSeekerId, status: "active" }).sort({ createdAt: -1 });
        if (!plan) {
            return res.json({ success: true, hasPlan: false, plan: null });
        }
        const now = new Date();
        const remainingMs = new Date(plan.endDate) - now;
        const remainingDays = remainingMs > 0 ? Math.ceil(remainingMs / (1000 * 60 * 60 * 24)) : 0;
        return res.json({
            success: true,
            hasPlan: true,
            plan: {
                startDate: plan.startDate,
                endDate: plan.endDate,
                status: plan.status,
                remainingDays,
                amount: plan.amount,
                currency: plan.currency
            }
        });
    } catch (error) {
        console.error("Get instant alert plan error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch instant alert plan"
        });
    }
};

