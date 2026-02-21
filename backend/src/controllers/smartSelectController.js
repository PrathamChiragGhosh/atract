const Employer = require('../models/employer');
const Payment = require('../models/payment');
const UserResumeAnalyzePlan = require('../models/userResumeAnalyzePlan');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const pdfParse = require('@cyber2024/pdf-parse-fixed');
const mammoth = require('mammoth');
require('dotenv').config(); // Load dotenv in controller

// Import plan configuration
const {
    planPrices,
    planBenefits,
    planPriority,
    hasFeature,
    getResumeLimit,
    getAnalyzeCount,
    getAllPlanConfigs,
    getFeatureDefinitions
} = require('../config/smartSelectPlanConfig');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Use plan prices from config
const plans = planPrices;

// Create Razorpay order
const createCheckoutSession = async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({
                success: false,
                message: "Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.",
            });
        }

        const { planType, currency = "INR" } = req.body;
        const employerId = req.userId; // From auth middleware

        if (!planType) {
            return res.status(400).json({
                success: false,
                message: "planType is required",
            });
        }

        // Fetch employer details
        const employer = await Employer.findById(employerId);
        if (!employer) {
            return res.status(404).json({
                success: false,
                message: "Employer not found",
            });
        }

        const selectedPlan = plans[planType];
        if (!selectedPlan) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan type",
            });
        }

        // Check if user already has this plan type (prevent duplicate plan purchases)
        const userPlan = await UserResumeAnalyzePlan.findOne({ employerId });

        if (userPlan && userPlan.planCounts && userPlan.planCounts.has(planType)) {
            return res.status(400).json({
                success: false,
                message: `You already have the ${planType} plan. You cannot purchase the same plan again.`
            });
        }

        // Check if payment already exists for this employer and plan type (recent)
        const existingPayment = await Payment.findOne({
            employerId,
            planType,
            orderId: { $exists: true },
            createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Within last 10 minutes
        });

        if (existingPayment) {
            // Return existing order details instead of creating duplicate
            return res.json({
                success: true,
                orderId: existingPayment.orderId,
                amount: existingPayment.amount,
                currency: existingPayment.currency.toUpperCase(),
                keyId: process.env.RAZORPAY_KEY_ID,
                name: employer.fullName || employer.companyName,
                email: employer.email,
                contact: employer.mobileNumber || '',
                description: `Smart Select - ${selectedPlan.name} Plan`,
                prefill: {
                    name: employer.fullName || employer.companyName,
                    email: employer.email,
                    contact: employer.mobileNumber || ''
                },
                notes: {
                    employerId: employerId.toString(),
                    planType: planType
                },
                theme: {
                    color: "#2563eb"
                }
            });
        }

        // Convert amount to paise (smallest currency unit for INR)
        const amount = Math.round(selectedPlan.amount * 100);

        // Create Razorpay Order
        const options = {
            amount: amount, // Amount in paise
            currency: currency.toUpperCase(),
            receipt: `ss-${planType.slice(0,1)}${employerId.slice(-6)}-${Date.now().toString().slice(-8)}`,
            notes: {
                employerId: employerId.toString(),
                employerName: employer.fullName || employer.companyName,
                employerEmail: employer.email,
                planType: planType,
                productType: 'resume_analyzer'
            }
        };

        const order = await razorpay.orders.create(options);

        // Store order in Payment table with pending status
        const paymentData = {
            employerId,
            planType,
            orderId: order.id,
            amount: selectedPlan.amount,
            currency: currency.toUpperCase(),
            status: 'pending',
            productType: 'resume_analyzer'
        };

        // Razorpay payments only
        const payment = new Payment(paymentData);
        await payment.save();

        res.json({
            success: true,
            orderId: order.id,
            amount: amount,
            currency: currency.toUpperCase(),
            keyId: process.env.RAZORPAY_KEY_ID,
            name: employer.fullName || employer.companyName,
            email: employer.email,
            contact: employer.mobileNumber || '',
            description: `Smart Select - ${selectedPlan.name} Plan`,
            prefill: {
                name: employer.fullName || employer.companyName,
                email: employer.email,
                contact: employer.mobileNumber || ''
            },
            notes: {
                employerId: employerId.toString(),
                planType: planType
            },
            theme: {
                color: "#2563eb"
            }
        });
    } catch (error) {
        console.error("Razorpay order creation error:", error);
        
        let errorMessage = "Failed to create Razorpay order";
        if (error.error) {
            errorMessage = error.error.description || error.error.reason || errorMessage;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
        });
    }
};

// Verify Razorpay payment
// This endpoint verifies payment using Razorpay signature
const verifyCheckoutSession = async (req, res) => {
    try {
        console.log('🔄 Payment verification started:', { razorpay_order_id: req.body?.razorpay_order_id });

        if (!process.env.RAZORPAY_KEY_SECRET) {
            console.log('❌ Razorpay secret key not configured');
            return res.status(500).json({
                success: false,
                message: "Razorpay is not configured. Please set RAZORPAY_KEY_SECRET in environment variables.",
            });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Check if this is a POST request with signature (primary verification)
        if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
            console.log('Verifying signature for payment:', razorpay_payment_id);

            // Verify signature
            const text = `${razorpay_order_id}|${razorpay_payment_id}`;
            const generatedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(text)
                .digest('hex');

            if (generatedSignature !== razorpay_signature) {
                console.log('❌ Invalid payment signature');
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment signature"
                });
            }

            console.log('✅ Payment signature verified');

            console.log('About to fetch Razorpay payment details...');

            // Fetch payment details from Razorpay
            console.log('Fetching payment details from Razorpay...');

            // Fetch payment details from Razorpay
            console.log('🔍 About to call razorpay.payments.fetch with ID:', razorpay_payment_id);
            const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
            console.log('✅ Razorpay payment details:', {
                id: razorpayPayment.id,
                status: razorpayPayment.status,
                amount: razorpayPayment.amount,
                currency: razorpayPayment.currency,
                order_id: razorpayPayment.order_id
            });

            // Check if payment is actually captured
            if (razorpayPayment.status !== 'captured') {
                console.log('❌ Payment not captured. Status:', razorpayPayment.status);
                return res.status(400).json({
                    success: false,
                    message: `Payment not completed. Status: ${razorpayPayment.status}`
                });
            }

            console.log('✅ Payment is captured, proceeding with database updates...');
            console.log('🔍 About to check for existing payment records...');

        // Find existing payment record by orderId
        console.log('Checking for existing payment record...');
        const existingPayment = await Payment.findOne({ orderId: razorpay_order_id });
        console.log('Existing payment found:', !!existingPayment);

        if (existingPayment) {
            console.log('Existing payment details:', {
                id: existingPayment._id,
                status: existingPayment.status,
                paymentId: existingPayment.paymentId
            });
        }
        } else {
            console.log('No signature provided, checking query params');

            // Fallback: Check query parameters for GET requests (payment success page)
            const { order_id, payment_id } = req.query;

            if (!order_id || !payment_id) {
                return res.status(400).json({
                    success: false,
                    message: "Missing order_id or payment_id parameters"
                });
            }

            console.log('Checking existing payment:', { order_id, payment_id });

            // For GET requests, just check if payment exists and is paid
            const existingPayment = await Payment.findOne({
                orderId: order_id,
                paymentId: payment_id,
                status: 'paid'
            });

            if (existingPayment) {
                console.log('✅ Payment found and verified');
                return res.json({
                    success: true,
                    message: "Payment verified successfully",
                    payment: {
                        orderId: existingPayment.orderId,
                        paymentId: existingPayment.paymentId,
                        amount: existingPayment.amount,
                        status: existingPayment.status
                    }
                });
            } else {
                console.log('❌ Payment not found or not completed');
                return res.status(400).json({
                    success: false,
                    message: "Payment not found or not completed"
                });
            }
        }

        // Fetch payment details from Razorpay
        const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
        
        // Find existing payment record by orderId
        const existingPayment = await Payment.findOne({ orderId: razorpay_order_id });
        
        // Create or update payment record
        if (existingPayment) {
            // If already processed, check if plan exists for this payment
            if (existingPayment.status === 'paid') {
                console.log('Payment already verified, checking if plan exists for this payment...');

                // Check if user has a plan for this specific payment
                const existingPlanForPayment = await UserResumeAnalyzePlan.findOne({
                    employerId: existingPayment.employerId,
                    paymentIds: existingPayment._id
                });

                if (existingPlanForPayment) {
                    console.log('Plan already exists for this payment');
                    return res.json({
                        success: true,
                        message: "Payment already verified",
                        payment: {
                            orderId: existingPayment.orderId,
                            paymentId: existingPayment.paymentId,
                            amount: existingPayment.amount,
                            status: existingPayment.status
                        }
                    });
                } else {
                    console.log('Payment verified but plan missing, will create plan...');
                    console.log('Using existing payment:', {
                        id: existingPayment._id,
                        employerId: existingPayment.employerId,
                        planType: existingPayment.planType
                    });
                    // Continue to plan creation below
                    payment = existingPayment; // Use existing payment
                }
            } else {
                // Existing payment but not paid - update it
                payment = existingPayment;
                payment.paymentId = razorpay_payment_id;
                payment.razorpaySignature = razorpay_signature;
                payment.status = razorpayPayment.status === 'captured' ? 'paid' : 'pending';
            }
        } else {
            // No existing payment - create new one
            const order = await razorpay.orders.fetch(razorpay_order_id);
            payment = new Payment({
                employerId: order.notes?.employerId,
                planType: order.notes?.planType || 'basic',
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                amount: razorpayPayment.amount / 100, // Convert from paise
                currency: razorpayPayment.currency,
                status: razorpayPayment.status === 'captured' ? 'paid' : 'pending',
                productType: 'resume_analyzer'
            });
        }
        console.log('Saving payment record to database...');
        console.log('Payment data to save:', {
            employerId: payment.employerId,
            planType: payment.planType,
            orderId: payment.orderId,
            paymentId: payment.paymentId,
            amount: payment.amount,
            status: payment.status
        });

        await payment.save();
        console.log('✅ Payment record saved with ID:', payment._id);

        // Extract employerId from JWT token (same as other employer functions)
        console.log('🔍 Extracting employerId from JWT token...');
        let employerId = null;
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            console.log('🔍 Token present:', !!token);
            if (token) {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
                employerId = decoded.userId;
                console.log('✅ Payment verified successfully for employer', employerId, 'updating plan...');
            } else {
                console.error('❌ No authorization token provided');
                return res.status(401).json({
                    success: false,
                    message: 'Authorization token required'
                });
            }
        } catch (error) {
            console.error('❌ JWT verification failed:', error.message);
            return res.status(401).json({
                success: false,
                message: 'Invalid authorization token'
            });
        }

        if (!employerId) {
            console.error('❌ employerId is still null after JWT extraction');
            return res.status(401).json({
                success: false,
                message: 'Could not extract employer ID from token'
            });
        }

        // Get planType from payment record
        const planType = payment.planType || 'basic';
        console.log('Processing plan update for planType:', planType);

        // Double-check: If this payment was already processed but plan creation failed,
        // we should still create the plan
        const existingPlanCheck = await UserResumeAnalyzePlan.findOne({
            employerId,
            paymentIds: payment._id
        });

        if (existingPlanCheck) {
            console.log('Plan already exists for this payment, skipping creation');
            return res.json({
                success: true,
                message: "Payment verified and plan updated successfully",
                payment: {
                    orderId: payment.orderId,
                    paymentId: payment.paymentId,
                    amount: payment.amount,
                    status: payment.status
                }
            });
        }

        // Only proceed with plan update if payment is successful
        if (payment.status !== 'paid') {
            return res.json({ 
                success: false, 
                message: "Payment not completed", 
                payment: {
                    orderId: payment.orderId,
                    paymentId: payment.paymentId,
                    status: payment.status
                }
            });
        }

        // Get planType from payment record
        console.log('Processing plan update for planType:', planType);

        // SAFEGUARD: If this is a paid payment that doesn't have a plan yet, ensure we create one
        if (payment.status === 'paid') {
            const existingPlanForThisPayment = await UserResumeAnalyzePlan.findOne({
                employerId,
                paymentIds: payment._id
            });
            if (!existingPlanForThisPayment) {
                console.log('SAFEGUARD: Paid payment found without plan, forcing plan creation...');
                // Continue to plan creation
            } else {
                console.log('SAFEGUARD: Plan already exists for this paid payment');
                return res.json({
                    success: true,
                    message: "Payment verified and plan updated successfully",
                    payment: {
                        orderId: payment.orderId,
                        paymentId: payment.paymentId,
                        amount: payment.amount,
                        status: payment.status
                    }
                });
            }
        }

        // Check if user already has a plan
        console.log('Checking for existing user plan...');
        const existingPlan = await UserResumeAnalyzePlan.findOne({ employerId });
        console.log('Existing plan found:', !!existingPlan);

        if (existingPlan) {
            console.log('Existing plan details:', {
                planType: existingPlan.planType,
                analyzeRemaining: existingPlan.analyzeRemaining,
                planCounts: existingPlan.planCounts ? Object.fromEntries(existingPlan.planCounts) : null
            });
        }

        if (existingPlan) {
            const currentType = existingPlan.planType;

            // Keep the higher plan tier
            const finalPlanType = 
                planPriority[planType] > planPriority[currentType] ? planType : currentType;

            // Get the new benefits for the purchased plan
            const addBenefits = planBenefits[planType];

            // Sum existing + new (use analyzeCount from config)
            const newAnalyzeCount = getAnalyzeCount(planType);
            const updatedAnalyze = existingPlan.analyzeRemaining + newAnalyzeCount;

            // Initialize planCounts if it doesn't exist
            console.log('Initializing planCounts...');
            if (!existingPlan.planCounts) {
                existingPlan.planCounts = new Map();
                console.log('Created new planCounts Map');
            }

            // Ensure planCounts is a Map (convert from plain object if needed)
            if (!(existingPlan.planCounts instanceof Map)) {
                console.log('Converting planCounts from object to Map...');
                const countsObj = existingPlan.planCounts || {};
                existingPlan.planCounts = new Map();
                Object.keys(countsObj).forEach(key => {
                    existingPlan.planCounts.set(key, countsObj[key]);
                });
                console.log('Converted planCounts:', Object.fromEntries(existingPlan.planCounts));
            }

            // Add counts to the specific plan bucket
            const currentCountForPlan = existingPlan.planCounts.get(planType) || 0;
            existingPlan.planCounts.set(planType, currentCountForPlan + newAnalyzeCount);
            console.log(`Updated planCounts for ${planType}:`, currentCountForPlan, '->', currentCountForPlan + newAnalyzeCount);

            // Update user plan
            existingPlan.planType = finalPlanType;
            existingPlan.paymentIds.push(payment._id);
            existingPlan.analyzeRemaining = updatedAnalyze;
            await existingPlan.save();
        } else {
            // New record for first-time buyer
            const newAnalyzeCount = getAnalyzeCount(planType);
            const planCounts = new Map();
            planCounts.set(planType, newAnalyzeCount);
            
            const newPlan = new UserResumeAnalyzePlan({
                employerId,
                planType: planType,
                paymentIds: [payment._id],
                analyzeRemaining: newAnalyzeCount,
                planCounts: planCounts
            });
            await newPlan.save();
        }

                console.log(`✅ Verified plan for employer ${employerId} (${planType})`);

        // Get the final plan (either updated existing or newly created)
        const finalPlan = await UserResumeAnalyzePlan.findOne({ employerId });
        console.log(`Plan updated:`, {
            planType: finalPlan?.planType,
            analyzeRemaining: finalPlan?.analyzeRemaining,
            planCounts: finalPlan?.planCounts ? Object.fromEntries(finalPlan.planCounts) : null
        });

        // Verify database was actually updated
        const verifyPlan = await UserResumeAnalyzePlan.findOne({ employerId });
        console.log('Database verification - current plan:', {
            exists: !!verifyPlan,
            planType: verifyPlan?.planType,
            analyzeRemaining: verifyPlan?.analyzeRemaining,
            planCounts: verifyPlan?.planCounts ? Object.fromEntries(verifyPlan.planCounts) : null
        });

        console.log('🎉 PAYMENT PROCESS COMPLETED SUCCESSFULLY');

        res.json({
            success: true,
            message: "Payment verified and plan updated successfully",
            payment: {
                orderId: payment.orderId,
                paymentId: payment.paymentId,
                amount: payment.amount,
                status: payment.status
            }
        });

    } catch (error) {
        console.error("❌ Payment verification error:", error);
        console.error("Error details:", error.stack);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);

        // Check if it's a MongoDB error
        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            console.error("MongoDB error code:", error.code);
            console.error("MongoDB error message:", error.message);
        }

        // Check if it's a validation error
        if (error.name === 'ValidationError') {
            console.error("Validation error:", error.errors);
        }

        res.status(500).json({
            success: false,
            message: error.message || "Payment verification failed"
        });
    }
};

// Get employer's plan
const getEmployerPlan = async (req, res) => {
    try {
        const employerId = req.userId;

        const plan = await UserResumeAnalyzePlan.findOne({ employerId })
            .populate('paymentIds');

        if (!plan) {
            return res.json({
                success: true,
                hasPlan: false,
                plan: null
            });
        }

        res.json({
            success: true,
            hasPlan: true,
            plan: {
                planType: plan.planType,
                analyzeRemaining: plan.analyzeRemaining,
                createdAt: plan.createdAt,
                updatedAt: plan.updatedAt
            },
            user: { email: employer?.email }
        });
    } catch (error) {
        console.error("Get plan error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get payment history
const getPaymentHistory = async (req, res) => {
    try {
        const employerId = req.userId;

        const payments = await Payment.find({ employerId })
            .sort({ createdAt: -1 })
            .select('planType amount currency status createdAt orderId paymentId');

        // Format payments for frontend
        const formattedPayments = payments.map(payment => ({
            planType: payment.planType,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            createdAt: payment.createdAt,
            transactionId: payment.orderId || payment.paymentId,
            paymentMethod: 'razorpay'
        }));

        res.json({
            success: true,
            payments: formattedPayments
        });
    } catch (error) {
        console.error("Get payments error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get analysis history
const getAnalysisHistory = async (req, res) => {
    try {
        const employerId = req.userId;

        const ResumeAnalysisHistory = require('../models/resumeAnalysisHistory');
        
        const history = await ResumeAnalysisHistory.find({ employerId })
            .sort({ createdAt: -1 })
            .lean();

        // Format the response to match the expected structure
        const formattedHistory = history.map(row => {
            const rawAnalyses = row.analysesData;
            const analysesItems = Array.isArray(rawAnalyses)
                ? rawAnalyses
                : (rawAnalyses?.items || []);
            const metadata = Array.isArray(rawAnalyses)
                ? {}
                : (rawAnalyses?.meta || {});

            return {
                analysisId: row.analysisId,
                jobDescription: row.jobDescription,
                topN: row.topN,
                totalResumes: row.totalResumes,
                analyses: analysesItems,
                metadata,
                companyType: metadata.companyType || null,
                companyFitSummary: metadata.companyFitSummary || null,
                salaryContext: metadata.salaryContext || null,
                salarySummary: metadata.salarySummary || null,
                topResumes: row.topResumesData || [],
                analyzeRemaining: row.analyzeRemaining,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            };
        });

        res.json({
            success: true,
            data: formattedHistory,
            count: formattedHistory.length,
        });
    } catch (error) {
        console.error("Get analysis history error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve analysis history",
        });
    }
};

// Get a specific analysis by analysisId
const getAnalysisById = async (req, res) => {
    try {
        const { analysisId } = req.params;
        const employerId = req.userId;

        if (!analysisId) {
            return res.status(400).json({
                success: false,
                message: "analysisId is required",
            });
        }

        const ResumeAnalysisHistory = require('../models/resumeAnalysisHistory');

        // Find analysis by analysisId and verify it belongs to the employer
        const analysisRecord = await ResumeAnalysisHistory.findOne({
            analysisId: analysisId,
            employerId: employerId
        }).lean();

        if (!analysisRecord) {
            return res.status(404).json({
                success: false,
                message: "Analysis not found",
            });
        }

        // Parse and format the data to match expected structure
        const rawAnalyses = analysisRecord.analysesData;
        const analysesItems = Array.isArray(rawAnalyses)
            ? rawAnalyses
            : (rawAnalyses?.items || []);
        const metadata = Array.isArray(rawAnalyses)
            ? {}
            : (rawAnalyses?.meta || {});

        const analysis = {
            _id: analysisRecord._id,
            analysisId: analysisRecord.analysisId,
            jobDescription: analysisRecord.jobDescription,
            topN: analysisRecord.topN,
            totalResumes: analysisRecord.totalResumes,
            analysesData: analysesItems,
            topResumesData: analysisRecord.topResumesData || [],
            analyzeRemaining: analysisRecord.analyzeRemaining,
            companyType: metadata.companyType || null,
            companyFitSummary: metadata.companyFitSummary || null,
            salaryContext: metadata.salaryContext || null,
            salarySummary: metadata.salarySummary || null,
            metadata: metadata,
            createdAt: analysisRecord.createdAt,
            updatedAt: analysisRecord.updatedAt,
        };

        res.json({
            success: true,
            data: analysis,
        });
    } catch (error) {
        console.error("Get Analysis By ID Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve analysis",
        });
    }
};

// Check analyzes remaining
const checkAnalyzes = async (req, res) => {
    try {
        const employerId = req.userId;

        if (!employerId) {
            return res.status(400).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Internal override: allow Smart Select for core.tarun@gmail.com
        const employer = await Employer.findById(employerId);
        const isInternalUser = employer?.email === 'core.tarun@gmail.com';

        if (isInternalUser) {
            return res.json({
                success: true,
                analyzeRemaining: 999, // Unlimited for internal user
                hasPlan: true,
                internalOverride: true, // Flag for frontend awareness
            });
        }

        const plan = await UserResumeAnalyzePlan.findOne({ employerId });

        if (!plan) {
            return res.json({
                success: false,
                message: "No analyzer plan found",
                analyzeRemaining: 0,
                hasPlan: false,
            });
        }

        res.json({
            success: true,
            analyzeRemaining: plan.analyzeRemaining,
            hasPlan: true,
        });
    } catch (error) {
        console.error("Check Analyzes Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
};

// Analyze multiple resumes
const analyzeMultipleResumes = async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    const { analyzeResumeComprehensive } = require('../services/smartSelectAIService');
    const ResumeAnalysisHistory = require('../models/resumeAnalysisHistory');

    try {

        const { jobDescription, topN, companyType: companyTypeRaw, salaryBenchmarkEnabled: salaryEnabledRaw } = req.body;
        const employerId = req.userId;

        if (!employerId) {
            return res.status(400).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Normalize company type
        const normalizedCompanyType = typeof companyTypeRaw === "string" ? companyTypeRaw.trim().toLowerCase() : "";
        const companyTypeMap = {
            startup: "Startup",
            "start-up": "Startup",
            "mid": "Mid-size",
            "mid-size": "Mid-size",
            midsize: "Mid-size",
            "mid size": "Mid-size",
            enterprise: "Enterprise",
            corporates: "Enterprise"
        };
        const companyTypeLabel = companyTypeMap[normalizedCompanyType] || "";
        const companyAnalysisEnabled = Boolean(companyTypeLabel);
        const salaryBenchmarkEnabled = String(salaryEnabledRaw).toLowerCase() === "true";
        const salaryUseJobDescription = String(req.body.salaryUseJobDescription).toLowerCase() === "true";
        const salaryRole = typeof req.body.salaryBenchmarkRole === "string" ? req.body.salaryBenchmarkRole.trim() : "";
        const salaryLocation = typeof req.body.salaryBenchmarkLocation === "string" ? req.body.salaryBenchmarkLocation.trim() : "";
        const salaryExperienceRaw = typeof req.body.salaryBenchmarkExperience === "string" ? req.body.salaryBenchmarkExperience.trim() : "";
        const parsedExperience = salaryExperienceRaw !== "" && !isNaN(parseFloat(salaryExperienceRaw))
            ? parseFloat(salaryExperienceRaw)
            : null;
        const salaryContext = salaryBenchmarkEnabled
            ? {
                role: salaryUseJobDescription ? null : (salaryRole || null),
                location: salaryUseJobDescription ? null : (salaryLocation || null),
                experienceYears: salaryUseJobDescription ? null : parsedExperience,
                currency: "INR",
                unit: "LPA",
                useJobDescription: salaryUseJobDescription,
            }
            : null;

        // Handle files from upload.fields()
        const allFiles = req.files || {};
        const resumeFilesArray = allFiles.resumes || [];
        const jdFileArray = allFiles.jdFile || [];
        const jdFile = jdFileArray.length > 0 ? jdFileArray[0] : null;

        // Extract job description from file if provided
        let extractedJobDescription = jobDescription || "";
        if (jdFile) {
            try {
                const ext = path.extname(jdFile.originalname).toLowerCase();
                if (ext === ".pdf") {
                    const dataBuffer = fs.readFileSync(jdFile.path);
                    const data = await pdfParse(dataBuffer);
                    extractedJobDescription = data.text.trim();
                } else if (ext === ".docx") {
                    const result = await mammoth.extractRawText({ path: jdFile.path });
                    extractedJobDescription = result.value.trim();
                } else if (ext === ".doc") {
                    await fs.promises.unlink(jdFile.path);
                    return res.status(400).json({
                        success: false,
                        message: ".doc files are not supported for job description. Please use PDF or DOCX format."
                    });
                } else {
                    await fs.promises.unlink(jdFile.path);
                    return res.status(400).json({
                        success: false,
                        message: "Unsupported file type for job description. Please upload PDF, DOC, or DOCX."
                    });
                }

                // Clean up JD file after extraction
                await fs.promises.unlink(jdFile.path);

                if (!extractedJobDescription || extractedJobDescription.length < 10) {
                    return res.status(400).json({
                        success: false,
                        message: "Could not extract meaningful text from the job description file."
                    });
                }
            } catch (error) {
                console.error("Error extracting job description from file:", error);
                if (jdFile && jdFile.path && fs.existsSync(jdFile.path)) {
                    await fs.promises.unlink(jdFile.path);
                }
                return res.status(500).json({
                    success: false,
                    message: "Failed to extract job description from file: " + error.message
                });
            }
        }

        // Validate inputs
        if (!resumeFilesArray || resumeFilesArray.length === 0) {
            if (jdFile && jdFile.path && fs.existsSync(jdFile.path)) {
                await fs.promises.unlink(jdFile.path);
            }
            return res.status(400).json({
                success: false,
                message: "At least one resume file is required"
            });
        }

        // Internal override: allow Smart Select for core.tarun@gmail.com
        const employer = await Employer.findById(employerId);
        const isInternalUser = employer?.email === 'core.tarun@gmail.com';

        let plan = null;
        if (!isInternalUser) {
            plan = await UserResumeAnalyzePlan.findOne({ employerId });
        }

        if (!isInternalUser && !plan) {
            // Clean up uploaded files
            resumeFilesArray.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            return res.status(200).json({
                success: false,
                message: "No analyzer plan found. Please purchase a plan to analyze resumes.",
                noCredits: true,
                hasPlan: false,
                analyzeRemaining: 0,
            });
        }

        const analyzeRemaining = isInternalUser ? 999 : plan.analyzeRemaining;
        if (!isInternalUser && analyzeRemaining <= 0) {
            // Clean up uploaded files
            resumeFilesArray.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            return res.status(200).json({
                success: false,
                message: "No analyses remaining. Please upgrade your plan to continue analyzing resumes.",
                noCredits: true,
                analyzeRemaining: 0,
            });
        }

        // Helper function to safely get value from planCounts (handles both Map and plain object)
        const getPlanCount = (planCounts, planType) => {
            if (!planCounts) return 0;
            if (planCounts instanceof Map || typeof planCounts.get === 'function') {
                return planCounts.get(planType) || 0;
            }
            // It's a plain object
            return planCounts[planType] || 0;
        };
        
        // Helper function to check if planCounts has data
        const hasPlanCounts = (planCounts) => {
            if (!planCounts) return false;
            if (planCounts instanceof Map || typeof planCounts.get === 'function') {
                return planCounts.size > 0;
            }
            // It's a plain object
            return Object.keys(planCounts).length > 0;
        };
        
        // Initialize planCounts if it doesn't exist (for backward compatibility)
        if (!plan.planCounts || !hasPlanCounts(plan.planCounts)) {
            // Migrate existing counts to planCounts
            plan.planCounts = new Map();
            plan.planCounts.set(plan.planType, plan.analyzeRemaining);
            await plan.save();
        }

        // Get active plan type from database (user's selected active plan)
        const activePlanType = plan.activePlanType;
        
        // Determine which plan bucket to use based on features being used or active plan
        // If using organization-only features (like salary benchmarking), must use organization counts
        const requiresOrganizationPlan = salaryBenchmarkEnabled && hasFeature('organization', 'smart-select-004') && !hasFeature('premium', 'smart-select-004');

        // Find which plan bucket to use
        let planBucketToUse = null;
        let planTypeToUse = null;

        // If user has an active plan set, try to use that (if counts are available and supports features)
        if (activePlanType && ['basic', 'premium', 'organization'].includes(activePlanType)) {
            const activeCount = getPlanCount(plan.planCounts, activePlanType);
            if (activeCount > 0) {
                // Validate that active plan supports the requested features
                if (requiresOrganizationPlan && activePlanType !== 'organization') {
                    // Clean up uploaded files
                    resumeFilesArray.forEach(file => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                    if (jdFile && jdFile.path && fs.existsSync(jdFile.path)) {
                        await fs.promises.unlink(jdFile.path);
                    }
                    return res.status(400).json({
                        success: false,
                        message: "Salary benchmarking requires Organization plan counts. Please switch to Organization plan in dashboard or disable salary benchmarking.",
                        featureNotAvailable: true,
                        featureCode: 'smart-select-004',
                        requiresOrganizationCounts: true
                    });
                }
                planBucketToUse = activePlanType;
                planTypeToUse = activePlanType;
            } else {
                // Active plan has no counts, fall back to FIFO
                const planOrder = ['basic', 'premium', 'organization'];
                for (const planType of planOrder) {
                    const count = getPlanCount(plan.planCounts, planType);
                    if (count > 0) {
                        planBucketToUse = planType;
                        planTypeToUse = planType;
                        break;
                    }
                }
            }
        } else if (requiresOrganizationPlan) {
            // Must use organization counts
            const orgCount = getPlanCount(plan.planCounts, 'organization');
            if (orgCount > 0) {
                planBucketToUse = 'organization';
                planTypeToUse = 'organization';
            } else {
                // Clean up uploaded files
                resumeFilesArray.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
                if (jdFile && jdFile.path && fs.existsSync(jdFile.path)) {
                    await fs.promises.unlink(jdFile.path);
                }
                return res.status(400).json({
                    success: false,
                    message: "Salary benchmarking requires Organization plan counts. You don't have any Organization plan analyses remaining. Please upgrade your plan.",
                    featureNotAvailable: true,
                    featureCode: 'smart-select-004',
                    requiresOrganizationCounts: true
                });
            }
        } else {
            // Use FIFO - try to use counts in order: basic, premium, organization
            const planOrder = ['basic', 'premium', 'organization'];
            for (const planType of planOrder) {
                const count = getPlanCount(plan.planCounts, planType);
                if (count > 0) {
                    planBucketToUse = planType;
                    planTypeToUse = planType;
                    break;
                }
            }
        }

        if (!planBucketToUse) {
            // Clean up uploaded files
            resumeFilesArray.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            if (jdFile && jdFile.path && fs.existsSync(jdFile.path)) {
                await fs.promises.unlink(jdFile.path);
            }
            return res.status(200).json({
                success: false,
                message: "No analyses remaining. Please upgrade your plan to continue analyzing resumes.",
                noCredits: true,
                analyzeRemaining: 0,
            });
        }

        // Check resume count limit for the plan being used
        const resumeLimit = getResumeLimit(planTypeToUse);
        if (resumeFilesArray.length > resumeLimit) {
            // Clean up uploaded files
            resumeFilesArray.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            if (jdFile && jdFile.path && fs.existsSync(jdFile.path)) {
                await fs.promises.unlink(jdFile.path);
            }
            return res.status(400).json({
                success: false,
                message: `Your ${planTypeToUse} plan allows a maximum of ${resumeLimit} resumes per analysis. You have uploaded ${resumeFilesArray.length} resumes. Please upgrade your plan or reduce the number of resumes.`,
                resumeLimitExceeded: true,
                resumeLimit: resumeLimit,
                uploadedCount: resumeFilesArray.length
            });
        }

        // Check feature availability based on the plan bucket being used
        // Check if JD file upload is allowed
        if (jdFile && !hasFeature(planTypeToUse, 'smart-select-002')) {
            // Clean up uploaded files
            resumeFilesArray.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            if (jdFile.path && fs.existsSync(jdFile.path)) {
                await fs.promises.unlink(jdFile.path);
            }
            return res.status(400).json({
                success: false,
                message: `JD document upload is not available with your ${planTypeToUse} plan counts. This feature requires Premium or Organization plan counts.`,
                featureNotAvailable: true,
                featureCode: 'smart-select-002',
                planTypeUsed: planTypeToUse
            });
        }

        // Check if company trajectory analysis is allowed
        if (companyAnalysisEnabled && !hasFeature(planTypeToUse, 'smart-select-001')) {
            // Clean up uploaded files
            resumeFilesArray.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            if (jdFile && jdFile.path && fs.existsSync(jdFile.path)) {
                await fs.promises.unlink(jdFile.path);
            }
            return res.status(400).json({
                success: false,
                message: `Company trajectory analysis is not available with your ${planTypeToUse} plan counts. This feature requires Premium or Organization plan counts.`,
                featureNotAvailable: true,
                featureCode: 'smart-select-001',
                planTypeUsed: planTypeToUse
            });
        }

        // Check if salary benchmarking is allowed (should already be checked above, but double-check)
        if (salaryBenchmarkEnabled && !hasFeature(planTypeToUse, 'smart-select-004')) {
            // Clean up uploaded files
            resumeFilesArray.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            if (jdFile && jdFile.path && fs.existsSync(jdFile.path)) {
                await fs.promises.unlink(jdFile.path);
            }
            return res.status(400).json({
                success: false,
                message: `Salary benchmarking is not available with your ${planTypeToUse} plan counts. This feature requires Organization plan counts.`,
                featureNotAvailable: true,
                featureCode: 'smart-select-004',
                planTypeUsed: planTypeToUse
            });
        }

        // Create storage directory for this analysis session
        const analysisId = uuidv4();
        const storageDir = path.join(__dirname, `../../uploads/smart-select/analyze/${analysisId}`);
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        const analyses = [];
        const filePaths = [];

        // Process each resume file
        for (const file of resumeFilesArray) {
            try {
                const ext = path.extname(file.originalname).toLowerCase();
                let resumeText = "";

                // Extract text based on file type
                if (ext === ".pdf") {
                    const dataBuffer = fs.readFileSync(file.path);
                    const data = await pdfParse(dataBuffer);
                    resumeText = data.text.trim();
                } else if (ext === ".docx") {
                    const result = await mammoth.extractRawText({ path: file.path });
                    resumeText = result.value.trim();
                } else if (ext === ".doc") {
                    console.warn(`.doc files are not fully supported. Skipping ${file.originalname}`);
                    continue;
                } else {
                    console.warn(`Unsupported file type: ${ext}. Skipping ${file.originalname}`);
                    continue;
                }

                if (!resumeText || resumeText.length < 50) {
                    console.warn(`Empty or too short resume text for ${file.originalname}`);
                    continue;
                }

                // Move file to storage directory
                const newFilePath = path.join(storageDir, file.originalname);
                fs.renameSync(file.path, newFilePath);
                filePaths.push(newFilePath);

                // Analyze resume with AI
                console.log(`Analyzing resume: ${file.originalname}`);
                const analysis = await analyzeResumeComprehensive(
                    resumeText,
                    extractedJobDescription || "",
                    file.originalname,
                    companyAnalysisEnabled ? companyTypeLabel : "",
                    salaryContext
                );

                analyses.push({
                    ...analysis,
                    filePath: newFilePath,
                    originalFileName: file.originalname,
                });
            } catch (err) {
                console.error(`Error processing file ${file.originalname}:`, err);
                // Clean up file
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        if (analyses.length === 0) {
            // Clean up storage directory
            if (fs.existsSync(storageDir)) {
                fs.rmSync(storageDir, { recursive: true, force: true });
            }
            return res.status(400).json({
                success: false,
                message: "No valid resumes could be processed",
            });
        }

        // Sort analyses by fitScore (if JD provided) or atsScore
        analyses.sort((a, b) => {
            const scoreA = extractedJobDescription ? (a.fitScore || 0) : (a.atsScore || 0);
            const scoreB = extractedJobDescription ? (b.fitScore || 0) : (b.atsScore || 0);
            return scoreB - scoreA;
        });

        // Get top N resumes
        const topNCount = topN && !isNaN(parseInt(topN)) ? parseInt(topN) : analyses.length;
        const topResumes = analyses.slice(0, Math.min(topNCount, analyses.length));

        // Only decrement for non-internal users
        if (!isInternalUser) {
            // Decrement count from the specific plan bucket
            const currentBucketCount = getPlanCount(plan.planCounts, planBucketToUse);
            const newBucketCount = Math.max(0, currentBucketCount - 1);
            plan.planCounts.set(planBucketToUse, newBucketCount);

            // Update total analyzeRemaining
            const newAnalyzeRemaining = Math.max(0, analyzeRemaining - 1);
            plan.analyzeRemaining = newAnalyzeRemaining;
            await plan.save();
        }

        // Prepare data for response
        const topResumesData = topResumes.map(r => {
            const entry = {
                fileName: r.originalFileName,
                candidateName: r.candidateName,
                email: r.email,
                phone: r.phone,
                atsScore: r.atsScore,
                fitScore: r.fitScore,
                scoreLevel: r.scoreLevel,
                experienceYears: r.experienceYears,
                currentRole: r.currentRole,
                location: r.location,
                recommendation: r.recommendation,
                summary: r.summary,
            };

            if (companyAnalysisEnabled && typeof r.companyContextFitScore === "number") {
                entry.companyContextFitScore = r.companyContextFitScore;
            }
            if (companyAnalysisEnabled && r.companyTrajectoryMatch) {
                entry.companyTrajectoryMatch = r.companyTrajectoryMatch;
            }
            if (companyAnalysisEnabled && r.companyTypeAlignment) {
                entry.companyTypeAlignment = r.companyTypeAlignment;
            }
            if (companyAnalysisEnabled && r.companyTypeEvaluated) {
                entry.companyTypeEvaluated = r.companyTypeEvaluated;
            }
            if (salaryBenchmarkEnabled && r.salaryEstimate) {
                entry.salaryEstimate = r.salaryEstimate;
            }
            return entry;
        });

        const allAnalysesData = analyses.map(r => {
            const entry = {
                fileName: r.originalFileName,
                candidateName: r.candidateName,
                email: r.email,
                phone: r.phone,
                atsScore: r.atsScore,
                fitScore: r.fitScore,
                scoreLevel: r.scoreLevel,
                experienceYears: r.experienceYears,
                currentRole: r.currentRole,
                location: r.location,
                education: r.education,
                pros: r.pros,
                cons: r.cons,
                matchedKeywords: r.matchedKeywords,
                missingKeywords: r.missingKeywords,
                issues: r.issues,
                skills: r.skills,
                summary: r.summary,
                recommendation: r.recommendation,
                filePath: r.filePath,
            };

            if (companyAnalysisEnabled && typeof r.companyContextFitScore === "number") {
                entry.companyContextFitScore = r.companyContextFitScore;
            }
            if (companyAnalysisEnabled && r.companyTrajectoryMatch) {
                entry.companyTrajectoryMatch = r.companyTrajectoryMatch;
            }
            if (companyAnalysisEnabled && r.companyTypeAlignment) {
                entry.companyTypeAlignment = r.companyTypeAlignment;
            }
            if (companyAnalysisEnabled && r.companyTypeEvaluated) {
                entry.companyTypeEvaluated = r.companyTypeEvaluated;
            }
            if (companyAnalysisEnabled && Array.isArray(r.companyHistory)) {
                entry.companyHistory = r.companyHistory;
            }
            if (salaryBenchmarkEnabled && r.salaryEstimate) {
                entry.salaryEstimate = r.salaryEstimate;
            }

            return entry;
        });

        let companyFitSummary = null;
        if (companyAnalysisEnabled) {
            const companyFitScores = analyses
                .map(r => (typeof r.companyContextFitScore === "number" ? r.companyContextFitScore : null))
                .filter(score => score !== null);
            const averageCompanyFitScore = companyFitScores.length
                ? Math.round(
                    companyFitScores.reduce((sum, score) => sum + score, 0) / companyFitScores.length
                )
                : null;
            const strongestFitCandidate = analyses.reduce((best, current) => {
                if (!current || typeof current.companyContextFitScore !== "number") return best;
                if (!best || current.companyContextFitScore > best.companyContextFitScore) {
                    return current;
                }
                return best;
            }, null);

            companyFitSummary = {
                targetCompanyType: companyTypeLabel || "Unspecified",
                averageFitScore: averageCompanyFitScore,
                strongestCandidate: strongestFitCandidate?.candidateName || null,
                strongestCandidateScore: strongestFitCandidate?.companyContextFitScore || null,
                strongestInsight: strongestFitCandidate?.companyTrajectoryMatch || null,
            };
        }

        let salarySummary = null;
        if (salaryBenchmarkEnabled) {
            const salaryData = analyses
                .map(r => r.salaryEstimate)
                .filter(est => est && est.estimatedRange);

            const medianValues = salaryData
                .map(est => typeof est.marketMedian === "number" ? est.marketMedian : null)
                .filter(v => v !== null);
            const minValues = salaryData
                .map(est => {
                    const range = est.estimatedRange || {};
                    return typeof range.min === "number" ? range.min : null;
                })
                .filter(v => v !== null);
            const maxValues = salaryData
                .map(est => {
                    const range = est.estimatedRange || {};
                    return typeof range.max === "number" ? range.max : null;
                })
                .filter(v => v !== null);

            const avg = arr => arr.length ? Math.round((arr.reduce((sum, val) => sum + val, 0) / arr.length) * 100) / 100 : null;

            salarySummary = {
                role: salaryRole || null,
                location: salaryLocation || null,
                experienceYears: parsedExperience,
                currency: (salaryData[0]?.estimatedRange?.currency) || "INR",
                unit: (salaryData[0]?.estimatedRange?.unit) || "LPA",
                averageMedian: avg(medianValues),
                averageMin: avg(minValues),
                averageMax: avg(maxValues),
                sampleCount: salaryData.length,
            };
        }

        const analysesMeta = {};
        if (companyAnalysisEnabled) {
            analysesMeta.companyType = companyTypeLabel;
            analysesMeta.companyTypeKey = normalizedCompanyType || "";
            analysesMeta.companyFitSummary = companyFitSummary;
        }
        if (salaryBenchmarkEnabled) {
            analysesMeta.salarySummary = salarySummary;
            analysesMeta.salaryContext = {
                role: salaryUseJobDescription ? null : (salaryRole || null),
                location: salaryUseJobDescription ? null : (salaryLocation || null),
                experienceYears: salaryUseJobDescription ? null : parsedExperience,
                currency: salaryContext?.currency || "INR",
                unit: salaryContext?.unit || "LPA",
                useJobDescription: salaryUseJobDescription,
            };
        }

        const analysesPayload = Object.keys(analysesMeta).length > 0
            ? {
                meta: analysesMeta,
                items: allAnalysesData,
            }
            : allAnalysesData;

        // Store analysis history in MongoDB
        try {
            await ResumeAnalysisHistory.create({
                analysisId,
                employerId,
                jobDescription: extractedJobDescription || null,
                topN: topN && !isNaN(parseInt(topN)) ? parseInt(topN) : null,
                totalResumes: analyses.length,
                analysesData: analysesPayload,
                topResumesData: topResumesData,
                analyzeRemaining: newAnalyzeRemaining,
            });
            console.log(`✅ Analysis history saved for analysis_id: ${analysisId}`);
        } catch (dbError) {
            console.error("❌ Error saving analysis history:", dbError);
            // Don't fail the request if history save fails, just log it
        }

        // Return results
        const responseData = {
            totalResumes: analyses.length,
            topResumes: topResumesData,
            allAnalyses: allAnalysesData,
            analyzeRemaining: isInternalUser ? 999 : newAnalyzeRemaining,
            analysisId: analysisId,
            planTypeUsed: planTypeToUse, // Return which plan type was used for this analysis
            internalOverride: isInternalUser, // Flag for frontend awareness
        };

        if (companyAnalysisEnabled) {
            responseData.companyType = companyTypeLabel || "";
            responseData.companyFitSummary = companyFitSummary;
        }
        if (salaryBenchmarkEnabled) {
            responseData.salarySummary = salarySummary;
            responseData.salaryContext = {
                useJobDescription: salaryUseJobDescription,
                role: salaryUseJobDescription ? null : (salaryRole || null),
                location: salaryUseJobDescription ? null : (salaryLocation || null),
                experienceYears: salaryUseJobDescription ? null : parsedExperience,
            };
        }

        res.json({
            success: true,
            data: responseData,
        });

    } catch (error) {
        console.error("Analyze Multiple Resumes Error:", error);

        // Clean up uploaded files
        if (req.files) {
            const allFiles = req.files;
            const resumeFiles = allFiles.resumes || [];
            const jdFiles = allFiles.jdFile || [];
            [...resumeFiles, ...jdFiles].forEach(file => {
                if (file && file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || "Failed to analyze resumes",
        });
    }
};

// Download analyzed resume file
const downloadAnalyzedResume = async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const { analysisId, fileName } = req.params;
        const employerId = req.userId; // From auth middleware

        if (!analysisId || !fileName) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters",
            });
        }

        // Decode the fileName in case it was encoded
        const decodedFileName = decodeURIComponent(fileName);

        // Verify that the employer has access to this analysis
        // Check if analysisId belongs to this employer
        const ResumeAnalysisHistory = require('../models/resumeAnalysisHistory');
        const mongoose = require('mongoose');
        
        // Convert employerId to ObjectId if it's a string
        let employerObjectId;
        try {
            employerObjectId = mongoose.Types.ObjectId.isValid(employerId) 
                ? new mongoose.Types.ObjectId(employerId) 
                : employerId;
        } catch (e) {
            employerObjectId = employerId;
        }
        
        // Try finding by analysisId first
        let analysis = await ResumeAnalysisHistory.findOne({ 
            analysisId: analysisId,
            employerId: employerObjectId
        });
        
        // If not found and analysisId looks like ObjectId, try finding by _id
        if (!analysis && mongoose.Types.ObjectId.isValid(analysisId)) {
            analysis = await ResumeAnalysisHistory.findOne({ 
                _id: new mongoose.Types.ObjectId(analysisId),
                employerId: employerObjectId
            });
        }
        
        if (!analysis) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to download this file. Analysis not found or does not belong to this employer.",
            });
        }
        
        // Use the actual analysisId from the database record (in case we found by _id)
        const actualAnalysisId = analysis.analysisId || analysisId;

        // Construct file path using the actual analysisId from the database
        const filePath = path.join(__dirname, `../../uploads/smart-select/analyze/${actualAnalysisId}/${decodedFileName}`);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error(`File not found at path: ${filePath}`);
            return res.status(404).json({
                success: false,
                message: "File not found",
            });
        }

        // Send file
        res.download(filePath, decodedFileName, (err) => {
            if (err) {
                console.error("Download error:", err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: "Failed to download file",
                    });
                }
            }
        });
    } catch (error) {
        console.error("Download Analyzed Resume Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to download resume",
        });
    }
};

// Get plan configuration for frontend
const getPlanConfiguration = async (req, res) => {
    try {
        const employerId = req.userId;
        
        // Get user's current plan if exists
        let userPlan = null;
        if (employerId) {
            userPlan = await UserResumeAnalyzePlan.findOne({ employerId });
        }

        // Get all plan configurations
        const allPlans = getAllPlanConfigs();
        const featureDefinitions = getFeatureDefinitions();

        // Get user's plan features if they have a plan
        let userPlanFeatures = [];
        let userResumeLimit = 0;
        let planCountsBreakdown = {};
        
        if (userPlan) {
            const planConfig = allPlans[userPlan.planType];
            userPlanFeatures = planConfig?.features || [];
            userResumeLimit = getResumeLimit(userPlan.planType);
            
            // Convert planCounts Map to object for JSON response
            // Handle both Map and plain object (MongoDB stores Maps as objects)
            if (userPlan.planCounts) {
                // Check if it's a Map (has .get method) or a plain object
                const isMap = userPlan.planCounts instanceof Map || (typeof userPlan.planCounts.get === 'function');
                
                if (isMap) {
                    // It's a Map, use .get() method
                    const mapSize = userPlan.planCounts.size || 0;
                    if (mapSize > 0) {
                        planCountsBreakdown = {
                            basic: userPlan.planCounts.get('basic') || 0,
                            premium: userPlan.planCounts.get('premium') || 0,
                            organization: userPlan.planCounts.get('organization') || 0
                        };
                    } else {
                        // Empty Map, use backward compatibility
                        planCountsBreakdown = {
                            basic: userPlan.planType === 'basic' ? userPlan.analyzeRemaining : 0,
                            premium: userPlan.planType === 'premium' ? userPlan.analyzeRemaining : 0,
                            organization: userPlan.planType === 'organization' ? userPlan.analyzeRemaining : 0
                        };
                    }
                } else {
                    // It's a plain object (MongoDB stores Maps as objects)
                    // Access properties directly
                    planCountsBreakdown = {
                        basic: userPlan.planCounts.basic || 0,
                        premium: userPlan.planCounts.premium || 0,
                        organization: userPlan.planCounts.organization || 0
                    };
                    
                    // If all counts are 0, use backward compatibility
                    if (planCountsBreakdown.basic === 0 && planCountsBreakdown.premium === 0 && planCountsBreakdown.organization === 0) {
                        planCountsBreakdown = {
                            basic: userPlan.planType === 'basic' ? userPlan.analyzeRemaining : 0,
                            premium: userPlan.planType === 'premium' ? userPlan.analyzeRemaining : 0,
                            organization: userPlan.planType === 'organization' ? userPlan.analyzeRemaining : 0
                        };
                    }
                }
            } else {
                // For backward compatibility, if no planCounts, assume all counts are from current planType
                planCountsBreakdown = {
                    basic: userPlan.planType === 'basic' ? userPlan.analyzeRemaining : 0,
                    premium: userPlan.planType === 'premium' ? userPlan.analyzeRemaining : 0,
                    organization: userPlan.planType === 'organization' ? userPlan.analyzeRemaining : 0
                };
            }
        }

        // Determine active plan type (user-selected or default to highest available)
        let activePlanType = null;
        if (userPlan) {
            // If user has set an activePlanType, use it (if it has counts)
            if (userPlan.activePlanType) {
                const activeCount = planCountsBreakdown[userPlan.activePlanType] || 0;
                if (activeCount > 0) {
                    activePlanType = userPlan.activePlanType;
                }
            }
            
            // If no active plan set or active plan has no counts, default to highest available
            if (!activePlanType) {
                if (planCountsBreakdown.organization > 0) {
                    activePlanType = 'organization';
                } else if (planCountsBreakdown.premium > 0) {
                    activePlanType = 'premium';
                } else if (planCountsBreakdown.basic > 0) {
                    activePlanType = 'basic';
                } else {
                    activePlanType = userPlan.planType; // Fallback to planType
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                plans: allPlans,
                features: featureDefinitions,
                userPlan: userPlan ? {
                    planType: userPlan.planType,
                    activePlanType: activePlanType,
                    analyzeRemaining: userPlan.analyzeRemaining,
                    features: userPlanFeatures,
                    resumeLimit: userResumeLimit,
                    planCounts: planCountsBreakdown
                } : null
            }
        });
    } catch (error) {
        console.error("Get Plan Configuration Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Update active plan type
const updateActivePlan = async (req, res) => {
    try {
        const employerId = req.userId;
        const { activePlanType } = req.body;

        if (!activePlanType || !['basic', 'premium', 'organization'].includes(activePlanType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan type. Must be one of: basic, premium, organization"
            });
        }

        const plan = await UserResumeAnalyzePlan.findOne({ employerId });
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "No plan found for this employer"
            });
        }

        // Verify that the selected plan has counts available
        const getPlanCount = (planCounts, planType) => {
            if (!planCounts) return 0;
            if (planCounts instanceof Map || typeof planCounts.get === 'function') {
                return planCounts.get(planType) || 0;
            }
            return planCounts[planType] || 0;
        };

        const selectedCount = getPlanCount(plan.planCounts, activePlanType);
        
        if (selectedCount <= 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot set active plan to ${activePlanType}. No analyses remaining for this plan type.`
            });
        }

        // Update active plan type
        plan.activePlanType = activePlanType;
        await plan.save();

        return res.status(200).json({
            success: true,
            message: "Active plan updated successfully",
            data: {
                activePlanType: plan.activePlanType
            }
        });
    } catch (error) {
        console.error("Update Active Plan Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Razorpay webhook handler for payment status updates
const razorpayWebhook = async (req, res) => {
    try {
        console.log('🔄 Webhook received:', new Date().toISOString());

        const webhookSignature = req.headers['x-razorpay-signature'];

        // Parse raw body (it comes as Buffer from express.raw middleware)
        let webhookBody;
        let webhookData;
        if (Buffer.isBuffer(req.body)) {
            webhookBody = req.body.toString('utf8');
            webhookData = JSON.parse(webhookBody);
        } else {
            webhookBody = JSON.stringify(req.body);
            webhookData = req.body;
        }

        console.log('Webhook data:', {
            event: webhookData.event,
            paymentId: webhookData.payload?.payment?.entity?.id,
            orderId: webhookData.payload?.payment?.entity?.order_id,
            status: webhookData.payload?.payment?.entity?.status
        });

        if (!webhookSignature) {
            console.log('❌ Missing webhook signature');
            return res.status(400).json({
                success: false,
                message: "Missing webhook signature"
            });
        }

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(webhookBody)
            .digest('hex');

        if (webhookSignature !== expectedSignature) {
            console.log('❌ Invalid webhook signature');
            return res.status(400).json({
                success: false,
                message: "Invalid webhook signature"
            });
        }

        console.log('✅ Webhook signature verified');

        const event = webhookData.event;
        const paymentEntity = webhookData.payload?.payment?.entity;

        if (event === 'payment.captured' && paymentEntity) {
            const paymentId = paymentEntity.id;
            const orderId = paymentEntity.order_id;

            // Find payment record
            const payment = await Payment.findOne({ 
                $or: [
                    { orderId: orderId },
                    { paymentId: paymentId }
                ]
            });

            if (payment && payment.status !== 'paid') {
                payment.paymentId = paymentId;
                payment.status = 'paid';
                await payment.save();

                // Update user plan if not already updated
                const employerId = payment.employerId;
                const planType = payment.planType || 'basic';
                
                const existingPlan = await UserResumeAnalyzePlan.findOne({ employerId });
                
                if (existingPlan) {
                    const newAnalyzeCount = getAnalyzeCount(planType);
                    const updatedAnalyze = existingPlan.analyzeRemaining + newAnalyzeCount;
                    
                    if (!existingPlan.planCounts) {
                        existingPlan.planCounts = new Map();
                    }
                    
                    if (!(existingPlan.planCounts instanceof Map)) {
                        const countsObj = existingPlan.planCounts || {};
                        existingPlan.planCounts = new Map();
                        Object.keys(countsObj).forEach(key => {
                            existingPlan.planCounts.set(key, countsObj[key]);
                        });
                    }
                    
                    const currentCountForPlan = existingPlan.planCounts.get(planType) || 0;
                    existingPlan.planCounts.set(planType, currentCountForPlan + newAnalyzeCount);
                    
                    const currentType = existingPlan.planType;
                    const finalPlanType = 
                        planPriority[planType] > planPriority[currentType] ? planType : currentType;
                    
                    existingPlan.planType = finalPlanType;
                    existingPlan.analyzeRemaining = updatedAnalyze;
                    
                    if (!existingPlan.paymentIds.includes(payment._id)) {
                        existingPlan.paymentIds.push(payment._id);
                    }
                    
                    await existingPlan.save();
                } else {
                    const newAnalyzeCount = getAnalyzeCount(planType);
                    const planCounts = new Map();
                    planCounts.set(planType, newAnalyzeCount);
                    
                    const newPlan = new UserResumeAnalyzePlan({
                        employerId,
                        planType: planType,
                        paymentIds: [payment._id],
                        analyzeRemaining: newAnalyzeCount,
                        planCounts: planCounts
                    });
                    await newPlan.save();
                }

                        console.log(`✅ Webhook: Payment captured and plan updated for employer ${employerId}`);
                console.log(`Plan updated:`, {
                    planType: existingPlan.planType,
                    analyzeRemaining: existingPlan.analyzeRemaining,
                    planCounts: existingPlan.planCounts ? Object.fromEntries(existingPlan.planCounts) : null
                });

                // Verify database was actually updated
                const verifyPlan = await UserResumeAnalyzePlan.findOne({ employerId });
                console.log('Database verification - current plan:', {
                    exists: !!verifyPlan,
                    planType: verifyPlan?.planType,
                    analyzeRemaining: verifyPlan?.analyzeRemaining,
                    planCounts: verifyPlan?.planCounts ? Object.fromEntries(verifyPlan.planCounts) : null
                });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error("❌ Razorpay webhook error:", error);
        console.error("Webhook error details:", error.stack);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createCheckoutSession,
    verifyCheckoutSession,
    getEmployerPlan,
    getPaymentHistory,
    getAnalysisHistory,
    getAnalysisById,
    checkAnalyzes,
    analyzeMultipleResumes,
    downloadAnalyzedResume,
    getPlanConfiguration,
    updateActivePlan,
    razorpayWebhook
};

