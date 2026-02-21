const express = require("express");
const genieController = require("../controllers/genieController.js");

const router = express.Router();

// Public routes (no auth required)
router.get("/greeting", genieController.getGreeting);
router.post("/message", genieController.processMessage);

module.exports = router;

