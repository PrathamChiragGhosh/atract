const ServiceJob = require('../models/ServiceJob.js');
const Client = require('../models/Client.js');

// Create new service job
const createServiceJob = async (req, res) => {
    try {
        const {
            jobName,
            jobRequirements,
            clientId,
            gender,
            location,
            salary,
            shiftTimings,
            workingHours,
            shiftStartTime,
            shiftEndTime,
            numberOfPositions,
            status,
            priority,
            age,
            keySkills,
            workExperience,
            noticePeriod
        } = req.body;

        // Validation
        if (!jobName || !jobRequirements || !clientId || !gender) {
            return res.status(400).json({
                success: false,
                message: "Job name, job requirements, client, and gender are required"
            });
        }

        // Verify client exists
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        // Create service job
        const newServiceJob = await ServiceJob.create({
            jobName,
            jobRequirements,
            clientId,
            gender,
            location,
            salary,
            shiftTimings,
            workingHours: workingHours ? parseFloat(workingHours) : undefined,
            shiftStartTime,
            shiftEndTime,
            numberOfPositions: numberOfPositions || 1,
            status: status || 'open',
            priority: priority || 'medium',
            age,
            keySkills: Array.isArray(keySkills) ? keySkills : [],
            workExperience,
            noticePeriod,
            createdBy: req.userId
        });

        // Populate client details
        await newServiceJob.populate('clientId', 'name companyName email');

        return res.status(201).json({
            success: true,
            message: "Job added successfully",
            data: newServiceJob
        });

    } catch (err) {
        console.error("CREATE SERVICE JOB ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// Get all service jobs
const getAllServiceJobs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search = '',
            status,
            clientId
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query
        const query = {};

        if (search) {
            query.$or = [
                { jobName: { $regex: search, $options: 'i' } },
                { jobRequirements: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) {
            query.status = status;
        }

        if (clientId) {
            query.clientId = clientId;
        }

        // Get service jobs with client details
        const serviceJobs = await ServiceJob.find(query)
            .populate('clientId', 'name companyName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .select('-__v');

        // Get total count
        const total = await ServiceJob.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: serviceJobs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (err) {
        console.error("GET ALL SERVICE JOBS ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get service job by ID
const getServiceJobById = async (req, res) => {
    try {
        const { id } = req.params;

        const serviceJob = await ServiceJob.findById(id)
            .populate('clientId', 'name companyName email mobileNumber address city state')
            .select('-__v');

        if (!serviceJob) {
            return res.status(404).json({
                success: false,
                message: "Service job not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: serviceJob
        });

    } catch (err) {
        console.error("GET SERVICE JOB BY ID ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Update service job
const updateServiceJob = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // If clientId is being updated, verify it exists
        if (updateData.clientId) {
            const client = await Client.findById(updateData.clientId);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: "Client not found"
                });
            }
        }

        const serviceJob = await ServiceJob.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('clientId', 'name companyName email')
            .select('-__v');

        if (!serviceJob) {
            return res.status(404).json({
                success: false,
                message: "Service job not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service job updated successfully",
            data: serviceJob
        });

    } catch (err) {
        console.error("UPDATE SERVICE JOB ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Delete service job
const deleteServiceJob = async (req, res) => {
    try {
        const { id } = req.params;

        const serviceJob = await ServiceJob.findByIdAndDelete(id);

        if (!serviceJob) {
            return res.status(404).json({
                success: false,
                message: "Service job not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service job deleted successfully"
        });

    } catch (err) {
        console.error("DELETE SERVICE JOB ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get service jobs by client
const getServiceJobsByClient = async (req, res) => {
    try {
        const { clientId } = req.params;

        const serviceJobs = await ServiceJob.find({ clientId })
            .populate('clientId', 'name companyName email')
            .sort({ createdAt: -1 })
            .select('-__v');

        return res.status(200).json({
            success: true,
            data: serviceJobs
        });

    } catch (err) {
        console.error("GET SERVICE JOBS BY CLIENT ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    createServiceJob,
    getAllServiceJobs,
    getServiceJobById,
    updateServiceJob,
    deleteServiceJob,
    getServiceJobsByClient
};

