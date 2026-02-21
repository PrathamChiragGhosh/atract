const express = require("express");
const clientController = require("../controllers/clientController.js");
const verifyAdminToken = require("../middleware/adminAuthMiddleware.js");

const router = express.Router();

// All routes protected with admin authentication
router.post("/", verifyAdminToken, clientController.createClient);
router.get("/", verifyAdminToken, clientController.getAllClients);
router.get("/:id", verifyAdminToken, clientController.getClientById);
router.put("/:id", verifyAdminToken, clientController.updateClient);
router.delete("/:id", verifyAdminToken, clientController.deleteClient);

module.exports = router;

