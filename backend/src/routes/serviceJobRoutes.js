const express = require("express");
const serviceJobController = require("../controllers/serviceJobController.js");
const verifyAdminToken = require("../middleware/adminAuthMiddleware.js");

const router = express.Router();

// All routes protected with admin authentication
router.post("/", verifyAdminToken, serviceJobController.createServiceJob);
router.get("/", verifyAdminToken, serviceJobController.getAllServiceJobs);
router.get("/:id", verifyAdminToken, serviceJobController.getServiceJobById);
router.put("/:id", verifyAdminToken, serviceJobController.updateServiceJob);
router.delete("/:id", verifyAdminToken, serviceJobController.deleteServiceJob);
router.get("/client/:clientId", verifyAdminToken, serviceJobController.getServiceJobsByClient);

module.exports = router;

