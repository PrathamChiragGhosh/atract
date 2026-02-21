const mongoose = require("mongoose");

const viewerSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, lowercase: true, trim: true },
        viewedAt: { type: Date, default: Date.now },
        isLogin: { type: Boolean, default: false } // true if logged-in jobseeker, false if collected via email prompt
    },
    { _id: false }
);

const jobViewEmailSchema = new mongoose.Schema(
    {
        job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, unique: true },
        views: { type: [viewerSchema], default: [] }
    },
    { timestamps: true }
);

// Prevent duplicate emails per job
jobViewEmailSchema.index({ job: 1, "views.email": 1 }, { unique: true, sparse: true });

const JobViewEmail = mongoose.model("JobViewEmail", jobViewEmailSchema);

module.exports = JobViewEmail;

