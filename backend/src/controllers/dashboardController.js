const Job = require('../models/job.js');
const ServiceJob = require('../models/ServiceJob.js');
const Employer = require('../models/employer.js');
const JobSeeker = require('../models/jobSeeker.js');
const Client = require('../models/Client.js');
const JobApplication = require('../models/jobApplication.js');
const JobAnalysis = require('../models/jobAnalysis.js');
const SmartPostJob = require('../models/smartPostJob.js');
const Payment = require('../models/payment.js');
const mongoose = require('mongoose');

/**
 * Helper function to get trends data for different time periods
 */
const getTrends = async (model, period = 'yearly', offset = 0) => {
    const trends = [];
    const now = new Date();

    let intervals, dateFormat, labelFormat;

    switch (period) {
        case 'daily':
            intervals = 7; // Last 7 days
            dateFormat = { weekday: 'short' };
            labelFormat = (date) => date.toLocaleDateString('en-US', { weekday: 'short' });
            break;
        case 'weekly':
            intervals = 4; // Last 4 weeks
            dateFormat = { month: 'short', day: 'numeric' };
            labelFormat = (date) => `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            break;
        case 'halfyearly':
            intervals = 6; // Last 6 months
            dateFormat = { month: 'short', year: 'numeric' };
            labelFormat = (date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            break;
        case 'yearly':
        default:
            intervals = 12; // Last 12 months
            dateFormat = { month: 'short', year: 'numeric' };
            labelFormat = (date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            break;
    }

    for (let i = intervals - 1; i >= 0; i--) {
        let startDate, endDate;

        if (period === 'daily') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - i - (offset * intervals));
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'weekly') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - (i * 7) - (offset * intervals * 7) - now.getDay());
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else {
            // monthly for halfyearly and yearly
            startDate = new Date(now.getFullYear(), now.getMonth() - i - (offset * intervals), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() - i - (offset * intervals) + 1, 0, 23, 59, 59);
        }

        const count = await model.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        trends.push({
            label: labelFormat(startDate),
            count: count,
            timestamp: startDate
        });
    }
    return trends;
};

/**
 * Get comprehensive dashboard statistics
 * Includes all modules: Clients, Employers, Job Seekers, Jobs, Applications, etc.
 */
const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // ============================================
        // CLIENTS STATISTICS
        // ============================================
        const totalClients = await Client.countDocuments();
        const activeClients = await Client.countDocuments({ status: 'active' });
        const inactiveClients = await Client.countDocuments({ status: 'inactive' });
        const clientsThisMonth = await Client.countDocuments({ createdAt: { $gte: startOfMonth } });
        const clientsThisWeek = await Client.countDocuments({ createdAt: { $gte: startOfWeek } });
        const clientsToday = await Client.countDocuments({ createdAt: { $gte: startOfToday } });

        // Recent clients
        const recentClients = await Client.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('name companyName email mobileNumber status createdAt')
            .lean();

        // ============================================
        // EMPLOYERS STATISTICS
        // ============================================
        const totalEmployers = await Employer.countDocuments();
        const employersThisMonth = await Employer.countDocuments({ createdAt: { $gte: startOfMonth } });
        const employersThisWeek = await Employer.countDocuments({ createdAt: { $gte: startOfWeek } });
        const employersToday = await Employer.countDocuments({ createdAt: { $gte: startOfToday } });

        // Top employers by job count
        const topEmployers = await Job.aggregate([
            {
                $group: {
                    _id: '$employerId',
                    jobCount: { $sum: 1 },
                    totalApplications: { $sum: '$applicationsCount' },
                    totalViews: { $sum: '$views' }
                }
            },
            { $sort: { jobCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'employers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'employer'
                }
            },
            { $unwind: { path: '$employer', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    employerId: '$_id',
                    companyName: '$employer.companyName',
                    email: '$employer.email',
                    jobCount: 1,
                    totalApplications: 1,
                    totalViews: 1
                }
            }
        ]);

        // Recent employers
        const recentEmployers = await Employer.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('fullName companyName email mobileNumber companySize industryType createdAt')
            .lean();

        // ============================================
        // JOB SEEKERS STATISTICS
        // ============================================
        const totalJobSeekers = await JobSeeker.countDocuments();
        const jobSeekersThisMonth = await JobSeeker.countDocuments({ createdAt: { $gte: startOfMonth } });
        const jobSeekersThisWeek = await JobSeeker.countDocuments({ createdAt: { $gte: startOfWeek } });
        const jobSeekersToday = await JobSeeker.countDocuments({ createdAt: { $gte: startOfToday } });

        // Job seekers with resumes
        const jobSeekersWithResume = await JobSeeker.countDocuments({ resume: { $ne: null, $exists: true } });
        const jobSeekersWithCompleteProfile = await JobSeeker.countDocuments({
            resume: { $ne: null, $exists: true },
            skills: { $exists: true, $ne: [] },
            experienceInYears: { $exists: true, $ne: null }
        });

        // Recent job seekers
        const recentJobSeekers = await JobSeeker.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('fullName email mobileNumber experienceInYears highestQualification createdAt')
            .lean();

        // ============================================
        // JOBS STATISTICS (Regular Jobs)
        // ============================================
        const totalJobs = await Job.countDocuments();
        const activeJobs = await Job.countDocuments({ status: 'Active' });
        const draftJobs = await Job.countDocuments({ status: 'Draft' });
        const inactiveJobs = await Job.countDocuments({ status: 'Inactive' });
        const closedJobs = await Job.countDocuments({ status: 'Closed' });

        const jobsThisMonth = await Job.countDocuments({ createdAt: { $gte: startOfMonth } });
        const jobsThisWeek = await Job.countDocuments({ createdAt: { $gte: startOfWeek } });
        const jobsToday = await Job.countDocuments({ createdAt: { $gte: startOfToday } });

        // Jobs by type
        const jobsByType = await Job.aggregate([
            {
                $group: {
                    _id: '$jobType',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Jobs by work mode
        const jobsByWorkMode = await Job.aggregate([
            {
                $group: {
                    _id: '$workMode',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Top jobs by applications
        const topJobsByApplications = await Job.find()
            .sort({ applicationsCount: -1 })
            .limit(10)
            .select('jobTitle companyName location jobType status applicationsCount views createdAt')
            .populate('employerId', 'companyName email')
            .lean();

        // Top jobs by views
        const topJobsByViews = await Job.find()
            .sort({ views: -1 })
            .limit(10)
            .select('jobTitle companyName location jobType status applicationsCount views createdAt')
            .populate('employerId', 'companyName email')
            .lean();

        // Recent jobs
        const recentJobs = await Job.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('jobTitle companyName location jobType status applicationsCount views createdAt')
            .populate('employerId', 'companyName email')
            .lean();

        // ============================================
        // SERVICE JOBS STATISTICS (Client Jobs)
        // ============================================
        const totalServiceJobs = await ServiceJob.countDocuments();
        const openServiceJobs = await ServiceJob.countDocuments({ status: 'open' });
        const filledServiceJobs = await ServiceJob.countDocuments({ status: 'filled' });
        const closedServiceJobs = await ServiceJob.countDocuments({ status: 'closed' });

        const serviceJobsThisMonth = await ServiceJob.countDocuments({ createdAt: { $gte: startOfMonth } });
        const serviceJobsThisWeek = await ServiceJob.countDocuments({ createdAt: { $gte: startOfWeek } });
        const serviceJobsToday = await ServiceJob.countDocuments({ createdAt: { $gte: startOfToday } });

        // Service jobs by priority
        const serviceJobsByPriority = await ServiceJob.aggregate([
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Recent service jobs
        const recentServiceJobs = await ServiceJob.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('jobName location salary status priority numberOfPositions createdAt')
            .populate('clientId', 'name companyName email')
            .lean();

        // ============================================
        // JOB APPLICATIONS STATISTICS
        // ============================================
        const totalApplications = await JobApplication.aggregate([
            { $unwind: '$applicants' },
            { $count: 'total' }
        ]);
        const totalApplicationsCount = totalApplications[0]?.total || 0;

        const applicationsThisMonth = await JobApplication.aggregate([
            { $unwind: '$applicants' },
            { $match: { 'applicants.appliedAt': { $gte: startOfMonth } } },
            { $count: 'total' }
        ]);
        const applicationsThisMonthCount = applicationsThisMonth[0]?.total || 0;

        const applicationsThisWeek = await JobApplication.aggregate([
            { $unwind: '$applicants' },
            { $match: { 'applicants.appliedAt': { $gte: startOfWeek } } },
            { $count: 'total' }
        ]);
        const applicationsThisWeekCount = applicationsThisWeek[0]?.total || 0;

        const applicationsToday = await JobApplication.aggregate([
            { $unwind: '$applicants' },
            { $match: { 'applicants.appliedAt': { $gte: startOfToday } } },
            { $count: 'total' }
        ]);
        const applicationsTodayCount = applicationsToday[0]?.total || 0;

        // Applications by status
        const applicationsByStatus = await JobApplication.aggregate([
            { $unwind: '$applicants' },
            {
                $group: {
                    _id: '$applicants.status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Applications by submission type
        const applicationsBySubmissionType = await JobApplication.aggregate([
            { $unwind: '$applicants' },
            {
                $group: {
                    _id: '$applicants.submissionType',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Recent applications
        const recentApplications = await JobApplication.aggregate([
            { $unwind: '$applicants' },
            { $sort: { 'applicants.appliedAt': -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'jobs',
                    localField: 'job',
                    foreignField: '_id',
                    as: 'jobData'
                }
            },
            { $unwind: { path: '$jobData', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'jobseekers',
                    localField: 'applicants.jobSeeker',
                    foreignField: '_id',
                    as: 'jobSeekerData'
                }
            },
            { $unwind: { path: '$jobSeekerData', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    applicationId: '$applicants._id',
                    jobTitle: '$jobData.jobTitle',
                    companyName: '$jobData.companyName',
                    candidateName: '$jobSeekerData.fullName',
                    candidateEmail: '$jobSeekerData.email',
                    status: '$applicants.status',
                    submissionType: '$applicants.submissionType',
                    appliedAt: '$applicants.appliedAt'
                }
            }
        ]);

        // ============================================
        // INTERVIEW STATISTICS (if interview model exists)
        // ============================================
        // Note: Interview model not found, but keeping structure for future use
        const interviewStats = {
            total: 0,
            scheduled: 0,
            completed: 0,
            cancelled: 0,
            thisMonth: 0,
            thisWeek: 0,
            today: 0
        };

        // ============================================
        // SMART POST STATISTICS
        // ============================================
        const totalSmartPosts = await SmartPostJob.countDocuments();
        const smartPostsProcessing = await SmartPostJob.countDocuments({ status: 'processing' });
        const smartPostsCompleted = await SmartPostJob.countDocuments({ status: 'completed' });
        const smartPostsPosted = await SmartPostJob.countDocuments({ status: 'posted' });
        const smartPostsFailed = await SmartPostJob.countDocuments({ status: 'failed' });

        const smartPostsThisMonth = await SmartPostJob.countDocuments({ createdAt: { $gte: startOfMonth } });
        const smartPostsThisWeek = await SmartPostJob.countDocuments({ createdAt: { $gte: startOfWeek } });
        const smartPostsToday = await SmartPostJob.countDocuments({ createdAt: { $gte: startOfToday } });

        // ============================================
        // JOB ANALYSIS STATISTICS
        // ============================================
        const totalJobAnalyses = await JobAnalysis.countDocuments();
        const jobAnalysesCompleted = await JobAnalysis.countDocuments({ status: 'completed' });
        const jobAnalysesProcessing = await JobAnalysis.countDocuments({ status: 'processing' });
        const jobAnalysesFailed = await JobAnalysis.countDocuments({ status: 'failed' });

        // ============================================
        // PAYMENT STATISTICS
        // ============================================
        const totalPayments = await Payment.countDocuments();
        const paymentsThisMonth = await Payment.countDocuments({ createdAt: { $gte: startOfMonth } });
        const paymentsThisWeek = await Payment.countDocuments({ createdAt: { $gte: startOfWeek } });
        const paymentsToday = await Payment.countDocuments({ createdAt: { $gte: startOfToday } });

        const totalRevenue = await Payment.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        const totalRevenueAmount = totalRevenue[0]?.total || 0;

        const revenueThisMonth = await Payment.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        const revenueThisMonthAmount = revenueThisMonth[0]?.total || 0;

        // ============================================
        // ACTIVITY TIMELINE (Recent Activities)
        // ============================================
        const activities = [];

        // Recent job creations
        const recentJobCreations = await Job.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('jobTitle companyName createdAt')
            .populate('employerId', 'companyName')
            .lean();
        recentJobCreations.forEach(job => {
            activities.push({
                type: 'job_created',
                title: `New job posted: ${job.jobTitle}`,
                description: `Company: ${job.companyName || job.employerId?.companyName}`,
                timestamp: job.createdAt,
                module: 'jobs'
            });
        });

        // Recent applications
        const recentAppActivities = await JobApplication.aggregate([
            { $unwind: '$applicants' },
            { $sort: { 'applicants.appliedAt': -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'jobs',
                    localField: 'job',
                    foreignField: '_id',
                    as: 'jobData'
                }
            },
            { $unwind: { path: '$jobData', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'jobseekers',
                    localField: 'applicants.jobSeeker',
                    foreignField: '_id',
                    as: 'jobSeekerData'
                }
            },
            { $unwind: { path: '$jobSeekerData', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    jobTitle: '$jobData.jobTitle',
                    candidateName: '$jobSeekerData.fullName',
                    appliedAt: '$applicants.appliedAt'
                }
            }
        ]);
        recentAppActivities.forEach(app => {
            activities.push({
                type: 'application_submitted',
                title: `New application: ${app.candidateName}`,
                description: `Applied for: ${app.jobTitle}`,
                timestamp: app.appliedAt,
                module: 'applications'
            });
        });

        // Recent client creations
        const recentClientCreations = await Client.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name companyName createdAt')
            .lean();
        recentClientCreations.forEach(client => {
            activities.push({
                type: 'client_created',
                title: `New client added: ${client.companyName}`,
                description: `Contact: ${client.name}`,
                timestamp: client.createdAt,
                module: 'clients'
            });
        });

        // Sort activities by timestamp
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // ============================================
        // GROWTH METRICS
        // ============================================
        const growthMetrics = {
            clients: {
                thisMonth: clientsThisMonth,
                thisWeek: clientsThisWeek,
                today: clientsToday
            },
            employers: {
                thisMonth: employersThisMonth,
                thisWeek: employersThisWeek,
                today: employersToday
            },
            jobSeekers: {
                thisMonth: jobSeekersThisMonth,
                thisWeek: jobSeekersThisWeek,
                today: jobSeekersToday
            },
            jobs: {
                thisMonth: jobsThisMonth,
                thisWeek: jobsThisWeek,
                today: jobsToday
            },
            serviceJobs: {
                thisMonth: serviceJobsThisMonth,
                thisWeek: serviceJobsThisWeek,
                today: serviceJobsToday
            },
            applications: {
                thisMonth: applicationsThisMonthCount,
                thisWeek: applicationsThisWeekCount,
                today: applicationsTodayCount
            }
        };

        // ============================================
        // TIME SERIES DATA FOR CHARTS
        // ============================================

        // Get time series data for all entities (default to yearly)
        const [clientTrends, employerTrends, jobSeekerTrends, jobTrends, serviceJobTrends, applicationTrends] = await Promise.all([
            getTrends(Client, 'yearly'),
            getTrends(Employer, 'yearly'),
            getTrends(JobSeeker, 'yearly'),
            getTrends(Job, 'yearly'),
            getTrends(ServiceJob, 'yearly'),
            getTrends(JobApplication, 'yearly')
        ]);

        // ============================================
        // CHART DATA PREPARATION
        // ============================================
        const chartData = {
            clients: {
                growth: {
                    labels: clientTrends.map(t => t.month),
                    datasets: [{
                        label: 'New Clients',
                        data: clientTrends.map(t => t.count)
                    }]
                },
                status: {
                    labels: ['Active', 'Inactive'],
                    datasets: [{
                        label: 'Client Status',
                        data: [activeClients, inactiveClients]
                    }]
                }
            },
            employers: {
                growth: {
                    labels: employerTrends.map(t => t.month),
                    datasets: [{
                        label: 'New Employers',
                        data: employerTrends.map(t => t.count)
                    }]
                },
                // Note: No status breakdown for employers currently
                status: {
                    labels: ['Total Employers'],
                    datasets: [{
                        label: 'Employers',
                        data: [totalEmployers]
                    }]
                }
            },
            jobSeekers: {
                growth: {
                    labels: jobSeekerTrends.map(t => t.month),
                    datasets: [{
                        label: 'New Job Seekers',
                        data: jobSeekerTrends.map(t => t.count)
                    }]
                },
                profileCompletion: {
                    labels: ['Complete Profile', 'Has Resume Only', 'Basic Profile'],
                    datasets: [{
                        label: 'Profile Status',
                        data: [
                            jobSeekersWithCompleteProfile,
                            jobSeekersWithResume - jobSeekersWithCompleteProfile,
                            totalJobSeekers - jobSeekersWithResume
                        ]
                    }]
                }
            },
            jobs: {
                growth: {
                    labels: jobTrends.map(t => t.month),
                    datasets: [{
                        label: 'New Jobs',
                        data: jobTrends.map(t => t.count)
                    }]
                },
                status: {
                    labels: ['Active', 'Draft', 'Closed', 'Inactive'],
                    datasets: [{
                        label: 'Job Status',
                        data: [activeJobs, draftJobs, closedJobs, inactiveJobs]
                    }]
                }
            },
            serviceJobs: {
                growth: {
                    labels: serviceJobTrends.map(t => t.month),
                    datasets: [{
                        label: 'New Service Jobs',
                        data: serviceJobTrends.map(t => t.count)
                    }]
                },
                status: {
                    labels: ['Open', 'Filled', 'Closed'],
                    datasets: [{
                        label: 'Service Job Status',
                        data: [openServiceJobs, filledServiceJobs, closedServiceJobs]
                    }]
                }
            },
            applications: {
                growth: {
                    labels: applicationTrends.map(t => t.month),
                    datasets: [{
                        label: 'New Applications',
                        data: applicationTrends.map(t => t.count)
                    }]
                }
            }
        };

        // ============================================
        // RETURN COMPREHENSIVE DASHBOARD DATA
        // ============================================
        return res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalClients,
                    totalEmployers,
                    totalJobSeekers,
                    totalJobs,
                    totalServiceJobs,
                    totalApplications: totalApplicationsCount,
                    totalRevenue: totalRevenueAmount
                },
                clients: {
                    total: totalClients,
                    active: activeClients,
                    inactive: inactiveClients,
                    thisMonth: clientsThisMonth,
                    thisWeek: clientsThisWeek,
                    today: clientsToday,
                    recent: recentClients
                },
                employers: {
                    total: totalEmployers,
                    thisMonth: employersThisMonth,
                    thisWeek: employersThisWeek,
                    today: employersToday,
                    topEmployers,
                    recent: recentEmployers
                },
                jobSeekers: {
                    total: totalJobSeekers,
                    withResume: jobSeekersWithResume,
                    withCompleteProfile: jobSeekersWithCompleteProfile,
                    thisMonth: jobSeekersThisMonth,
                    thisWeek: jobSeekersThisWeek,
                    today: jobSeekersToday,
                    recent: recentJobSeekers
                },
                jobs: {
                    total: totalJobs,
                    active: activeJobs,
                    draft: draftJobs,
                    inactive: inactiveJobs,
                    closed: closedJobs,
                    thisMonth: jobsThisMonth,
                    thisWeek: jobsThisWeek,
                    today: jobsToday,
                    byType: jobsByType,
                    byWorkMode: jobsByWorkMode,
                    topByApplications: topJobsByApplications,
                    topByViews: topJobsByViews,
                    recent: recentJobs
                },
                serviceJobs: {
                    total: totalServiceJobs,
                    open: openServiceJobs,
                    filled: filledServiceJobs,
                    closed: closedServiceJobs,
                    thisMonth: serviceJobsThisMonth,
                    thisWeek: serviceJobsThisWeek,
                    today: serviceJobsToday,
                    byPriority: serviceJobsByPriority,
                    recent: recentServiceJobs
                },
                applications: {
                    total: totalApplicationsCount,
                    thisMonth: applicationsThisMonthCount,
                    thisWeek: applicationsThisWeekCount,
                    today: applicationsTodayCount,
                    byStatus: applicationsByStatus,
                    bySubmissionType: applicationsBySubmissionType,
                    recent: recentApplications
                },
                interviews: interviewStats,
                smartPosts: {
                    total: totalSmartPosts,
                    processing: smartPostsProcessing,
                    completed: smartPostsCompleted,
                    posted: smartPostsPosted,
                    failed: smartPostsFailed,
                    thisMonth: smartPostsThisMonth,
                    thisWeek: smartPostsThisWeek,
                    today: smartPostsToday
                },
                jobAnalyses: {
                    total: totalJobAnalyses,
                    completed: jobAnalysesCompleted,
                    processing: jobAnalysesProcessing,
                    failed: jobAnalysesFailed
                },
                payments: {
                    total: totalPayments,
                    totalRevenue: totalRevenueAmount,
                    revenueThisMonth: revenueThisMonthAmount,
                    thisMonth: paymentsThisMonth,
                    thisWeek: paymentsThisWeek,
                    today: paymentsToday
                },
                activities: activities.slice(0, 20), // Last 20 activities
                growthMetrics,
                chartData // Time series and distribution data for charts
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: error.message
        });
    }
};

/**
 * Get detailed statistics for a specific module
 */
const getModuleStats = async (req, res) => {
    try {
        const { module } = req.params;
        const { startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        switch (module.toLowerCase()) {
            case 'clients':
                const clients = await Client.find(dateFilter)
                    .sort({ createdAt: -1 })
                    .populate('createdBy', 'name email')
                    .lean();
                return res.status(200).json({ success: true, data: clients });

            case 'employers':
                const employers = await Employer.find(dateFilter)
                    .sort({ createdAt: -1 })
                    .lean();
                return res.status(200).json({ success: true, data: employers });

            case 'jobseekers':
                const jobSeekers = await JobSeeker.find(dateFilter)
                    .sort({ createdAt: -1 })
                    .lean();
                return res.status(200).json({ success: true, data: jobSeekers });

            case 'jobs':
                const jobs = await Job.find(dateFilter)
                    .sort({ createdAt: -1 })
                    .populate('employerId', 'companyName email')
                    .lean();
                return res.status(200).json({ success: true, data: jobs });

            case 'servicejobs':
                const serviceJobs = await ServiceJob.find(dateFilter)
                    .sort({ createdAt: -1 })
                    .populate('clientId', 'name companyName email')
                    .populate('createdBy', 'name email')
                    .lean();
                return res.status(200).json({ success: true, data: serviceJobs });

            case 'applications':
                const applications = await JobApplication.find(dateFilter)
                    .populate('job', 'jobTitle companyName')
                    .populate('employer', 'companyName email')
                    .populate('applicants.jobSeeker', 'fullName email mobileNumber')
                    .sort({ createdAt: -1 })
                    .lean();
                return res.status(200).json({ success: true, data: applications });

            default:
                return res.status(400).json({
                    success: false,
                    message: `Invalid module: ${module}. Valid modules: clients, employers, jobseekers, jobs, servicejobs, applications`
                });
        }
    } catch (error) {
        console.error('Module stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch module statistics',
            error: error.message
        });
    }
};

/**
 * Get analysis data with time period filtering
 */
const getAnalysisData = async (req, res) => {
    try {
        const { period = 'yearly', dataSource, offset = 0 } = req.query;

        // Validate period
        const validPeriods = ['daily', 'weekly', 'halfyearly', 'yearly'];
        if (!validPeriods.includes(period)) {
            return res.status(400).json({
                success: false,
                message: `Invalid period. Valid options: ${validPeriods.join(', ')}`
            });
        }

        let trendsData = {};

        // Get data based on requested data source or all sources
        if (dataSource) {
            const validSources = ['clients', 'employers', 'jobSeekers', 'jobs'];
            if (!validSources.includes(dataSource)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid data source. Valid options: ${validSources.join(', ')}`
                });
            }

            const modelMap = {
                clients: Client,
                employers: Employer,
                jobSeekers: JobSeeker,
                jobs: Job
            };

            const trends = await getTrends(modelMap[dataSource], period, parseInt(offset));

            // Get status data for the specific data source
            let statusData = null;
            if (dataSource === 'clients') {
                const [active, inactive] = await Promise.all([
                    Client.countDocuments({ status: 'active' }),
                    Client.countDocuments({ status: 'inactive' })
                ]);
                statusData = {
                    labels: ['Active Clients', 'Inactive Clients'],
                    datasets: [{
                        data: [active, inactive],
                        backgroundColor: ['#10b981', '#ef4444'],
                        borderColor: ['#059669', '#dc2626'],
                        borderWidth: 2
                    }]
                };
            } else if (dataSource === 'employers') {
                const total = await Employer.countDocuments();
                statusData = {
                    labels: ['Employers'],
                    datasets: [{
                        data: [total],
                        backgroundColor: ['#3b82f6'],
                        borderColor: ['#2563eb'],
                        borderWidth: 2
                    }]
                };
            } else if (dataSource === 'jobSeekers') {
                const [complete, hasResume, basic] = await Promise.all([
                    JobSeeker.countDocuments({
                        resume: { $ne: null, $exists: true },
                        skills: { $exists: true, $ne: [] },
                        experienceInYears: { $exists: true, $ne: null }
                    }),
                    JobSeeker.countDocuments({
                        resume: { $ne: null, $exists: true },
                        $or: [
                            { skills: { $exists: false } },
                            { skills: { $size: 0 } },
                            { experienceInYears: { $exists: false } }
                        ]
                    }),
                    JobSeeker.countDocuments({
                        $or: [
                            { resume: { $exists: false } },
                            { resume: null }
                        ]
                    })
                ]);
                statusData = {
                    labels: ['Complete Profile', 'Has Resume Only', 'Basic Profile'],
                    datasets: [{
                        data: [complete, hasResume, basic],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderColor: ['#059669', '#d97706', '#dc2626'],
                        borderWidth: 2
                    }]
                };
            } else if (dataSource === 'jobs') {
                const [active, draft, closed, inactive] = await Promise.all([
                    Job.countDocuments({ status: 'Active' }),
                    Job.countDocuments({ status: 'Draft' }),
                    Job.countDocuments({ status: 'Closed' }),
                    Job.countDocuments({ status: 'Inactive' })
                ]);
                statusData = {
                    labels: ['Active Jobs', 'Draft Jobs', 'Closed Jobs', 'Inactive Jobs'],
                    datasets: [{
                        data: [active, draft, closed, inactive],
                        backgroundColor: ['#10b981', '#f59e0b', '#6b7280', '#ef4444'],
                        borderColor: ['#059669', '#d97706', '#4b5563', '#dc2626'],
                        borderWidth: 2
                    }]
                };
            }

            trendsData[dataSource] = {
                growth: {
                    labels: trends.map(t => t.label),
                    datasets: [{
                        label: `New ${dataSource.charAt(0).toUpperCase() + dataSource.slice(1)}`,
                        data: trends.map(t => t.count)
                    }]
                },
                ...(statusData && dataSource === 'clients' && { status: statusData }),
                ...(statusData && dataSource === 'employers' && { status: statusData }),
                ...(statusData && dataSource === 'jobSeekers' && { profileCompletion: statusData }),
                ...(statusData && dataSource === 'jobs' && { status: statusData })
            };
        } else {
            // Get all data sources
            // Get current status counts for pie charts
            const [clientStats, employerStats, jobSeekerStats, jobStats] = await Promise.all([
                // Client status counts
                Promise.all([
                    Client.countDocuments({ status: 'active' }),
                    Client.countDocuments({ status: 'inactive' })
                ]),
                // Employer total (no status field typically)
                Employer.countDocuments(),
                // Job seeker profile completion
                Promise.all([
                    JobSeeker.countDocuments({
                        resume: { $ne: null, $exists: true },
                        skills: { $exists: true, $ne: [] },
                        experienceInYears: { $exists: true, $ne: null }
                    }),
                    JobSeeker.countDocuments({
                        resume: { $ne: null, $exists: true },
                        $or: [
                            { skills: { $exists: false } },
                            { skills: { $size: 0 } },
                            { experienceInYears: { $exists: false } }
                        ]
                    }),
                    JobSeeker.countDocuments({
                        $or: [
                            { resume: { $exists: false } },
                            { resume: null }
                        ]
                    })
                ]),
                // Job status counts
                Promise.all([
                    Job.countDocuments({ status: 'Active' }),
                    Job.countDocuments({ status: 'Draft' }),
                    Job.countDocuments({ status: 'Closed' }),
                    Job.countDocuments({ status: 'Inactive' })
                ])
            ]);

            const [clientTrends, employerTrends, jobSeekerTrends, jobTrends] = await Promise.all([
                getTrends(Client, period, parseInt(offset)),
                getTrends(Employer, period, parseInt(offset)),
                getTrends(JobSeeker, period, parseInt(offset)),
                getTrends(Job, period, parseInt(offset))
            ]);

            trendsData = {
                clients: {
                    growth: {
                        labels: clientTrends.map(t => t.label),
                        datasets: [{
                            label: 'New Clients',
                            data: clientTrends.map(t => t.count)
                        }]
                    },
                    status: {
                        labels: ['Active Clients', 'Inactive Clients'],
                        datasets: [{
                            data: clientStats,
                            backgroundColor: ['#10b981', '#ef4444'],
                            borderColor: ['#059669', '#dc2626'],
                            borderWidth: 2
                        }]
                    }
                },
                employers: {
                    growth: {
                        labels: employerTrends.map(t => t.label),
                        datasets: [{
                            label: 'New Employers',
                            data: employerTrends.map(t => t.count)
                        }]
                    },
                    status: {
                        labels: ['Employers'],
                        datasets: [{
                            data: [employerStats],
                            backgroundColor: ['#3b82f6'],
                            borderColor: ['#2563eb'],
                            borderWidth: 2
                        }]
                    }
                },
                jobSeekers: {
                    growth: {
                        labels: jobSeekerTrends.map(t => t.label),
                        datasets: [{
                            label: 'New Job Seekers',
                            data: jobSeekerTrends.map(t => t.count)
                        }]
                    },
                    profileCompletion: {
                        labels: ['Complete Profile', 'Has Resume Only', 'Basic Profile'],
                        datasets: [{
                            data: jobSeekerStats,
                            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                            borderColor: ['#059669', '#d97706', '#dc2626'],
                            borderWidth: 2
                        }]
                    }
                },
                jobs: {
                    growth: {
                        labels: jobTrends.map(t => t.label),
                        datasets: [{
                            label: 'New Jobs',
                            data: jobTrends.map(t => t.count)
                        }]
                    },
                    status: {
                        labels: ['Active Jobs', 'Draft Jobs', 'Closed Jobs', 'Inactive Jobs'],
                        datasets: [{
                            data: jobStats,
                            backgroundColor: ['#10b981', '#f59e0b', '#6b7280', '#ef4444'],
                            borderColor: ['#059669', '#d97706', '#4b5563', '#dc2626'],
                            borderWidth: 2
                        }]
                    }
                }
            };
        }

        return res.status(200).json({
            success: true,
            data: {
                period,
                dataSource,
                chartData: trendsData
            }
        });

    } catch (error) {
        console.error('Analysis data error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch analysis data',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats,
    getModuleStats,
    getAnalysisData
};

