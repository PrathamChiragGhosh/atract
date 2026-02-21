const express = require('express');
const router = express.Router();
const candidateFilterController = require('../controllers/candidateFilterController');
const { upload } = require('../middleware/uploadCandidateFiles');

/**
 * @route   POST /api/candidates/filter
 * @desc    Upload and filter candidate files based on job requirements
 * @access  Public (can be protected with auth middleware)
 * @body    {
 *            job: { jobTitle, location, experience, skills, etc. },
 *            filterPercentage: 50.0,
 *            useLLM: true,
 *            outputFormat: 'xlsx'
 *          }
 */
router.post('/filter', upload.array('files', 50), candidateFilterController.filterCandidates);

/**
 * @route   GET /api/candidates/filter/download/:filename
 * @desc    Download filtered candidate file
 * @access  Public
 */
router.get('/filter/download/:filename', candidateFilterController.downloadFilteredFile);

/**
 * @route   GET /api/candidates/filter/files
 * @desc    List all filtered files
 * @access  Public
 */
router.get('/filter/files', candidateFilterController.listFilteredFiles);

/**
 * @route   GET /api/candidates/filter/status
 * @desc    Check Python document service status
 * @access  Public
 */
router.get('/filter/status', candidateFilterController.checkServiceStatus);

module.exports = router;

