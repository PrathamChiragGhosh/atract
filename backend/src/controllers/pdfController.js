const pdfCompressionService = require('../services/pdfCompressionService');
const PdfCompression = require('../models/pdfCompression');
const userService = require('../services/pdfUserService');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class PdfController {
  /**
   * Upload PDF file
   */
  async uploadPdf(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No PDF file uploaded',
        });
      }

      const fileInfo = {
        originalFilename: req.file.originalname,
        originalPath: req.file.path,
        originalSize: req.file.size,
        mimetype: req.file.mimetype,
      };

      res.json({
        success: true,
        message: 'PDF uploaded successfully',
        file: fileInfo,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload PDF',
        error: error.message,
      });
    }
  }

  /**
   * Compress PDF
   */
  async compressPdf(req, res) {
    try {
      const { fileId, compressionType, settings } = req.body;

      if (!fileId || !compressionType || !settings) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: fileId, compressionType, and settings are required',
        });
      }

      // Check if compression type is valid (only fileSize allowed now)
      if (compressionType !== 'fileSize') {
        return res.status(400).json({
          success: false,
          message: 'Invalid compression type. Only fileSize compression is supported.',
        });
      }

      // Check user compression limits
      let email;
      try {
        email = userService.getUserEmail(req);
        console.log('Email extracted from request:', email);
        console.log('Request headers:', req.headers['x-user-email']);
        console.log('Request body email:', req.body.email);
      } catch (error) {
        console.error('Error getting email:', error);
        return res.status(400).json({
          success: false,
          message: 'Email is required to compress PDF',
          error: error.message,
        });
      }
      
      const canCompress = await userService.canUserCompress(email);
      console.log('Can compress check result:', canCompress);
      
      if (!canCompress.canCompress) {
        return res.status(403).json({
          success: false,
          message: canCompress.isFree 
            ? 'Daily limit reached. You can compress 1 PDF per day for free. Please subscribe to compress more.'
            : 'Compression limit reached. Please upgrade your subscription.',
          remaining: canCompress.remaining,
          isFree: canCompress.isFree,
        });
      }

      // Get the file path from request body
      // The filePath should be the full path returned from upload endpoint
      let inputPath = req.body.filePath;
      
      // If filePath is not provided, try to reconstruct it
      if (!inputPath) {
        // Try with fileId as filename
        inputPath = path.join(__dirname, '../../uploads/pdf', fileId);
      }
      
      // Normalize the path (handle both forward and backslashes)
      inputPath = path.normalize(inputPath);

      // Check if file exists
      try {
        await fs.access(inputPath);
      } catch (err) {
        console.error('File not found:', inputPath);
        return res.status(404).json({
          success: false,
          message: `File not found at path: ${inputPath}`,
          providedPath: req.body.filePath,
          fileId: fileId,
        });
      }

      // Generate output filename
      const outputFilename = `compressed_${uuidv4()}.pdf`;
      const outputPath = path.join(__dirname, '../../compressed/pdf', outputFilename);

      // Create compression record (optional - MongoDB may not be connected)
      // Use Promise.race with timeout to prevent blocking
      let compressionRecord = null;
      try {
        const savePromise = (async () => {
          compressionRecord = new PdfCompression({
            originalFilename: req.body.originalFilename || 'unknown.pdf',
            originalPath: inputPath,
            originalSize: req.body.originalSize || 0,
            compressionType,
            compressionSettings: settings,
            status: 'processing',
          });
          await compressionRecord.save();
        })();
        
        // Set 5 second timeout for MongoDB operations
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MongoDB operation timeout')), 5000)
        );
        
        await Promise.race([savePromise, timeoutPromise]);
      } catch (dbError) {
        console.warn('MongoDB save failed (continuing without DB):', dbError.message);
        compressionRecord = null; // Reset to null if save failed
        // Continue without database - compression will still work
      }

      // Compress the PDF
      const result = await pdfCompressionService.compressPdf(
        inputPath,
        outputPath,
        compressionType,
        settings
      );

      // Record compression usage
      await userService.recordCompression(email);

      // Get file sizes
      const originalSize = compressionRecord?.originalSize || req.body.originalSize || await pdfCompressionService.getFileSize(inputPath);
      const compressedSize = result.size;
      const compressionRatio = originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;

      // Update compression record if it exists (with timeout)
      if (compressionRecord) {
        try {
          const updatePromise = (async () => {
            compressionRecord.compressedFilename = outputFilename;
            compressionRecord.compressedPath = outputPath;
            compressionRecord.compressedSize = compressedSize;
            compressionRecord.compressionRatio = compressionRatio;
            compressionRecord.status = 'completed';
            await compressionRecord.save();
          })();
          
          // Set 5 second timeout for MongoDB operations
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('MongoDB update timeout')), 5000)
          );
          
          await Promise.race([updatePromise, timeoutPromise]);
        } catch (dbError) {
          console.warn('MongoDB update failed:', dbError.message);
          // Continue - compression was successful
        }
      }

      res.json({
        success: true,
        message: 'PDF compressed successfully',
        compression: {
          id: compressionRecord?._id || uuidv4(),
          originalSize: originalSize,
          compressedSize: compressedSize,
          compressionRatio: compressionRatio.toFixed(2),
          downloadUrl: compressionRecord ? `/api/pdf/download/${compressionRecord._id}` : null,
          filename: outputFilename,
          filePath: outputPath,
        },
      });
    } catch (error) {
      console.error('Compression error:', error);
      console.error('Error stack:', error.stack);

      // Update compression record if it exists
      if (req.body.compressionId) {
        try {
          const compressionRecord = await PdfCompression.findById(req.body.compressionId);
          if (compressionRecord) {
            compressionRecord.status = 'failed';
            compressionRecord.error = error.message;
            await compressionRecord.save();
          }
        } catch (updateError) {
          console.error('Error updating compression record:', updateError);
        }
      }

      // Format comprehensive error response with user-friendly message
      let userMessage = error.message || 'Failed to compress PDF';
      let needsInstallation = false;
      let statusCode = 500; // Default to 500 for server errors
      
      // Check if error is about missing tools or compression limitations
      if (error.message && (
        error.message.includes('Ghostscript') || 
        error.message.includes('Python') ||
        error.message.includes('not installed') ||
        error.message.includes('not found') ||
        error.message.includes('increases file size') ||
        error.message.includes('Cannot compress PDF')
      )) {
        needsInstallation = true;
        statusCode = 400; // Client error - tools not available
        // Create a shorter, more user-friendly message
        if (error.message.includes('pdf-lib scaling increases file size')) {
          userMessage = 'PDF compression failed: Advanced compression tools (Ghostscript/Python) are required. The basic compression method cannot reduce this file size effectively.';
        } else if (error.message.includes('Ghostscript not installed')) {
          userMessage = 'PDF compression failed: Ghostscript is not installed. Please install Ghostscript to enable compression.';
        } else if (error.message.includes('Python')) {
          userMessage = 'PDF compression failed: Python is not installed or not available. Please install Python to enable compression.';
        } else {
          userMessage = 'PDF compression failed: Required compression tools (Ghostscript/Python) are not available.';
        }
      }
      
      const errorResponse = {
        success: false,
        message: userMessage,
        error: error.message, // Full error message for debugging
        needsInstallation: needsInstallation,
        installationLinks: needsInstallation ? {
          ghostscript: 'https://www.ghostscript.com/download/gsdnld.html',
          python: 'https://www.python.org/downloads/'
        } : undefined
      };

      // Add stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.details = error.stack;
      }

      // Log the exact error message that will be sent to frontend
      console.error('❌ ERROR - This message will be shown in frontend:', userMessage);
      console.error('Full error:', error);
      console.error('Sending error response to frontend:', JSON.stringify(errorResponse, null, 2));

      res.status(statusCode).json(errorResponse);
    }
  }

  /**
   * Download compressed PDF
   */
  async downloadPdf(req, res) {
    try {
      const { id } = req.params;

      const compressionRecord = await PdfCompression.findById(id);
      if (!compressionRecord) {
        return res.status(404).json({
          success: false,
          message: 'Compression record not found',
        });
      }

      if (compressionRecord.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'PDF compression is not completed',
        });
      }

      const filePath = compressionRecord.compressedPath;
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Compressed file not found',
        });
      }

      res.download(filePath, compressionRecord.compressedFilename, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download file',
          });
        }
      });
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download PDF',
        error: error.message,
      });
    }
  }

  /**
   * Get compression history
   */
  async getCompressionHistory(req, res) {
    try {
      const compressions = await PdfCompression.find()
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({
        success: true,
        compressions: compressions.map(comp => ({
          id: comp._id,
          originalFilename: comp.originalFilename,
          originalSize: comp.originalSize,
          compressedSize: comp.compressedSize,
          compressionRatio: comp.compressionRatio,
          status: comp.status,
          createdAt: comp.createdAt,
        })),
      });
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get compression history',
        error: error.message,
      });
    }
  }
}

module.exports = new PdfController();

