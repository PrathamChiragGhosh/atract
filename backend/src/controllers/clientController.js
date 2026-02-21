const Client = require('../models/Client.js');

// Create new client
const createClient = async (req, res) => {
    try {
        const {
            name,
            companyName,
            email,
            mobileNumber,
            address,
            city,
            state,
            pincode,
            status,
            notes
        } = req.body;

        // Validation
        if (!name || !companyName || !email) {
            return res.status(400).json({
                success: false,
                message: "Name, company name, and email are required"
            });
        }

        // Check if email already exists
        const existingClientByEmail = await Client.findOne({ email: email.toLowerCase() });
        if (existingClientByEmail) {
            return res.status(400).json({
                success: false,
                message: "Client with this email already exists"
            });
        }

        // Check if mobile number already exists (if provided)
        if (mobileNumber && mobileNumber.trim()) {
            const existingClientByMobile = await Client.findOne({ mobileNumber: mobileNumber.trim() });
            if (existingClientByMobile) {
                return res.status(400).json({
                    success: false,
                    message: "Client with this mobile number already exists"
                });
            }
        }

        // Create client
        const newClient = await Client.create({
            name,
            companyName,
            email: email.toLowerCase(),
            mobileNumber,
            address,
            city,
            state,
            pincode,
            status: status || 'active',
            notes,
            createdBy: req.userId
        });

        return res.status(201).json({
            success: true,
            message: "Client added successfully",
            data: newClient
        });

    } catch (err) {
        console.error("CREATE CLIENT ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// Get all clients
const getAllClients = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search = '',
            status
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query
        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { mobileNumber: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) {
            query.status = status;
        }

        // Get clients
        const clients = await Client.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .select('-__v');

        // Get total count
        const total = await Client.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: clients,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (err) {
        console.error("GET ALL CLIENTS ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get client by ID
const getClientById = async (req, res) => {
    try {
        const { id } = req.params;

        const client = await Client.findById(id).select('-__v');

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: client
        });

    } catch (err) {
        console.error("GET CLIENT BY ID ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Update client
const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // If email is being updated, check for duplicates
        if (updateData.email) {
            const existingClientByEmail = await Client.findOne({
                email: updateData.email.toLowerCase(),
                _id: { $ne: id }
            });

            if (existingClientByEmail) {
                return res.status(400).json({
                    success: false,
                    message: "Client with this email already exists"
                });
            }

            updateData.email = updateData.email.toLowerCase();
        }

        // If mobile number is being updated, check for duplicates
        if (updateData.mobileNumber && updateData.mobileNumber.trim()) {
            const existingClientByMobile = await Client.findOne({
                mobileNumber: updateData.mobileNumber.trim(),
                _id: { $ne: id }
            });

            if (existingClientByMobile) {
                return res.status(400).json({
                    success: false,
                    message: "Client with this mobile number already exists"
                });
            }
        }

        const client = await Client.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-__v');

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Client updated successfully",
            data: client
        });

    } catch (err) {
        console.error("UPDATE CLIENT ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Delete client
const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;

        const client = await Client.findByIdAndDelete(id);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Client deleted successfully"
        });

    } catch (err) {
        console.error("DELETE CLIENT ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    createClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient
};

