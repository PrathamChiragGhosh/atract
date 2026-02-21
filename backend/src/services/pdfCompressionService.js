const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const { fromPath } = require('pdf2pic');
const { exec, execFile } = require('child_process');
const { promisify } = require('util');






const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Try to load advanced-pdf-compressor if available
let PDFCompressor = null;
let PDFCompressorAPI = null;
try {
  const compressorModule = require('advanced-pdf-compressor');
  // Try different possible exports
  PDFCompressor = compressorModule.PDFCompressor || compressorModule.default || compressorModule;
  
  // Check if it has a compress method directly (might be a function)
  if (typeof PDFCompressor === 'function') {
    // Check if it's a class or a function
    try {
      const testInstance = new PDFCompressor();
      if (typeof testInstance.compress === 'function') {
        PDFCompressorAPI = 'class';
      }
    } catch (e) {
      // Not a class, might be a function
      if (typeof PDFCompressor === 'function' && PDFCompressor.length > 0) {
        PDFCompressorAPI = 'function';
      }
    }
  }
} catch (e) {
  console.log('advanced-pdf-compressor not available, will use fallback methods');
}

class PdfCompressionService {
  constructor() {
    this.uploadPath = path.join(__dirname, '../../uploads/pdf', process.env.UPLOAD_PATH || '');
    this.compressedPath = path.join(__dirname, '../../compressed/pdf', process.env.COMPRESSED_PATH || '');
  }

  /**
   * Convert file size unit to bytes
   */
  convertToBytes(size, unit) {
    const units = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
    };
    return size * (units[unit] || 1);
  }

  /**
   * Convert bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file size in bytes
   */
  async getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Compress PDF by resolution/DPI with image-based compression for better results
   */
  async compressByResolution(inputPath, outputPath, targetDpi, targetPixels) {
    try {
      const existingPdfBytes = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pageCount = pdfDoc.getPageCount();

      console.log(`Processing PDF with ${pageCount} pages`);
      console.log(`Target DPI: ${targetDpi || 'N/A'}, Target Pixels: ${targetPixels || 'N/A'}`);

      // Try image-based compression first for better results
      try {
        // Calculate target size based on DPI/pixels
        let targetSizeBytes = existingPdfBytes.length * 0.5; // Default 50% target

        if (targetDpi && !isNaN(Number(targetDpi)) && Number(targetDpi) > 0) {
          const dpiValue = Number(targetDpi);
          // Lower DPI = smaller file
          if (dpiValue <= 72) targetSizeBytes = existingPdfBytes.length * 0.3;
          else if (dpiValue <= 100) targetSizeBytes = existingPdfBytes.length * 0.4;
          else if (dpiValue <= 150) targetSizeBytes = existingPdfBytes.length * 0.5;
          else targetSizeBytes = existingPdfBytes.length * 0.6;
        } else if (targetPixels && !isNaN(Number(targetPixels)) && Number(targetPixels) > 0) {
          const pixelValue = Number(targetPixels);
          // Lower pixels = smaller file
          if (pixelValue <= 800) targetSizeBytes = existingPdfBytes.length * 0.3;
          else if (pixelValue <= 1200) targetSizeBytes = existingPdfBytes.length * 0.4;
          else if (pixelValue <= 1600) targetSizeBytes = existingPdfBytes.length * 0.5;
          else targetSizeBytes = existingPdfBytes.length * 0.6;
        }

        const imgResult = await this.compressByImageExtraction(inputPath, outputPath, targetSizeBytes);
        if (imgResult.success && imgResult.size < existingPdfBytes.length) {
          return imgResult;
        }
      } catch (error) {
        console.log(`Image-based resolution compression failed, using scaling: ${error.message}`);
      }

      // Fallback to scaling method
      const newPdfDoc = await PDFDocument.create();

      // Calculate scale factor for compression
      let scaleFactor = 0.6; // Default: 40% reduction for better compression

      if (targetDpi && !isNaN(Number(targetDpi)) && Number(targetDpi) > 0) {
        const dpiValue = Number(targetDpi);
        const baseDpi = 72; // Standard PDF DPI
        // Scale factor is proportional to DPI ratio
        // Lower DPI = smaller scale factor = more compression
        if (dpiValue < baseDpi) {
          // More aggressive scaling for lower DPI
          scaleFactor = Math.max(0.2, (dpiValue / baseDpi) * 0.8);
        } else {
          scaleFactor = Math.min(0.85, Math.sqrt(dpiValue / baseDpi) * 0.7);
        }
        console.log(`DPI-based scale: ${dpiValue} DPI -> ${scaleFactor.toFixed(3)} scale factor`);
      } else if (targetPixels && !isNaN(Number(targetPixels)) && Number(targetPixels) > 0) {
        try {
          const firstPage = pdfDoc.getPage(0);
          const { width, height } = firstPage.getSize();
          const pixelValue = Number(targetPixels);

          if (width && height && !isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
            const maxDimension = Math.max(width, height);
            const pixelRatio = pixelValue / maxDimension;
            scaleFactor = Math.max(0.2, Math.min(0.85, pixelRatio * 0.85));
            console.log(`Pixel-based scale: ${pixelValue}px for max dimension ${maxDimension.toFixed(1)} -> ${scaleFactor.toFixed(3)} scale factor`);
          } else {
            console.warn('Invalid page dimensions, using default scale factor');
          }
        } catch (error) {
          console.warn('Error calculating scale from pixels:', error.message);
        }
      }

      // Ensure scaleFactor is valid
      if (isNaN(scaleFactor) || scaleFactor <= 0 || scaleFactor > 1) {
        console.warn('Invalid scale factor, using default 0.6');
        scaleFactor = 0.6;
      }

      console.log(`Compressing with scale factor: ${scaleFactor.toFixed(3)}`);

      // Process each page with compression
      for (let i = 0; i < pageCount; i++) {
        try {
          const originalPage = pdfDoc.getPage(i);
          const { width, height } = originalPage.getSize();

          if (!width || !height || isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
            throw new Error(`Invalid page dimensions: ${width}x${height}`);
          }

          // Calculate new dimensions based on scale factor
          const newWidth = Math.max(72, width * scaleFactor);
          const newHeight = Math.max(72, height * scaleFactor);

          // Embed this specific page
          const embeddedPages = await newPdfDoc.embedPdf(existingPdfBytes, [i]);

          if (!embeddedPages || embeddedPages.length === 0 || !embeddedPages[0]) {
            throw new Error(`Failed to embed page ${i + 1}`);
          }

          const embeddedPage = embeddedPages[0];

          // Create new page with scaled dimensions
          const newPage = newPdfDoc.addPage([newWidth, newHeight]);

          // Draw the embedded page scaled to new dimensions
          newPage.drawPage(embeddedPage, {
            x: 0,
            y: 0,
            width: newWidth,
            height: newHeight,
          });

        } catch (pageError) {
          console.error(`Error on page ${i + 1}:`, pageError.message);
          throw new Error(`Failed to compress page ${i + 1}: ${pageError.message}`);
        }
      }

      // Ensure we have at least one page
      if (newPdfDoc.getPageCount() === 0) {
        throw new Error('No pages were successfully processed');
      }

      // Save with compression options
      const pdfBytes = await newPdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
      });

      await fs.writeFile(outputPath, pdfBytes);

      const originalSize = existingPdfBytes.length;
      const compressedSize = pdfBytes.length;
      const reduction = ((originalSize - compressedSize) / originalSize) * 100;

      console.log(`Compression Results:`);
      console.log(`  Original: ${this.formatBytes(originalSize)}`);
      console.log(`  Compressed: ${this.formatBytes(compressedSize)}`);
      console.log(`  Reduction: ${reduction.toFixed(2)}%`);
      console.log(`  Scale factor used: ${scaleFactor.toFixed(3)}`);

      return { success: true, size: pdfBytes.length };
    } catch (error) {
      console.error('Error compressing PDF by resolution:', error);
      throw new Error(`Failed to compress PDF: ${error.message}`);
    }
  }

  /**
   * Method 1a: Image-based compression using pdf2pic + sharp (requires GraphicsMagick)
   */
  async compressByImageMethodPdf2Pic(inputPath, outputPath, targetSizeBytes, scaleFactor) {
    try {
      console.log('🖼️ Trying image-based compression (pdf2pic)...');
      const pdfDoc = await PDFDocument.load(await fs.readFile(inputPath));
      const pageCount = pdfDoc.getPageCount();
      const newPdfDoc = await PDFDocument.create();

      // Convert PDF to images using pdf2pic
      const tempDir = path.join(__dirname, '../../temp/pdf');
      await fs.mkdir(tempDir, { recursive: true });

      // Calculate DPI based on target size (lower DPI = smaller file)
      const targetRatio = targetSizeBytes / (await fs.stat(inputPath)).size;
      const baseDpi = 150;
      const dpi = Math.max(72, Math.min(300, baseDpi * Math.sqrt(targetRatio)));

      const options = {
        density: dpi,
        saveFilename: 'page',
        savePath: tempDir,
        format: 'png',
        width: null,
        height: null,
      };

      const convert = fromPath(inputPath, options);

      // Process each page
      for (let i = 0; i < pageCount; i++) {
        try {
          const result = await convert(i + 1, { responseType: 'image' });
          const imagePath = result.path || result.name;

          if (!imagePath) {
            throw new Error(`Failed to convert page ${i + 1} to image`);
          }

          // Read and compress image with sharp
          const imageBuffer = await fs.readFile(imagePath);

          // Calculate target dimensions based on scale
          const originalPage = pdfDoc.getPage(i);
          const { width: origWidth, height: origHeight } = originalPage.getSize();
          const targetWidth = Math.round(origWidth * scaleFactor);
          const targetHeight = Math.round(origHeight * scaleFactor);

          // Compress image - adjust quality based on target size
          const quality = Math.max(50, Math.min(85, 70 + (targetRatio * 15)));
          const compressedImage = await sharp(imageBuffer)
            .resize(targetWidth, targetHeight, {
              withoutEnlargement: true,
              fit: 'inside'
            })
            .jpeg({ quality: quality, mozjpeg: true })
            .toBuffer();

          // Embed compressed image in PDF
          const image = await newPdfDoc.embedJpg(compressedImage);
          const { width, height } = image.scale(1);
          const page = newPdfDoc.addPage([width, height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: width,
            height: height,
          });

          // Clean up temp file
          await fs.unlink(imagePath).catch(() => { });
        } catch (pageError) {
          console.error(`Error processing page ${i + 1} with image method:`, pageError.message);
          if (i === 0) throw pageError;
        }
      }

      const pdfBytes = await newPdfDoc.save();
      await fs.writeFile(outputPath, pdfBytes);

      // Clean up temp directory
      try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          if (file.startsWith('page')) {
            await fs.unlink(path.join(tempDir, file)).catch(() => { });
          }
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      return { success: true, size: pdfBytes.length, method: 'image-based-pdf2pic' };
    } catch (error) {
      console.error('Image-based compression (pdf2pic) failed:', error.message);
      throw error;
    }
  }

  /**
   * Method 1b: Pure JavaScript compression using pdf-lib with aggressive scaling
   * Works without external tools - embeds pages individually and scales them
   */
  async compressByImageMethodPureJS(inputPath, outputPath, targetSizeBytes, scaleFactor) {
    try {
      console.log('🖼️ Trying pure JavaScript compression (pdf-lib iterative)...');
      const existingPdfBytes = await fs.readFile(inputPath);
      const currentSize = existingPdfBytes.length;
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pageCount = pdfDoc.getPageCount();
      const newPdfDoc = await PDFDocument.create();

      const targetRatio = targetSizeBytes / currentSize;
      // Use aggressive scaling to try to reduce size
      const aggressiveScale = Math.max(0.2, Math.min(0.8, Math.sqrt(targetRatio) * 0.8));

      // Embed each page individually and scale it
      for (let i = 0; i < pageCount; i++) {
        try {
          // Embed this specific page to get PDFEmbeddedPage
          const embeddedPages = await newPdfDoc.embedPdf(existingPdfBytes, [i]);

          if (!embeddedPages || embeddedPages.length === 0 || !embeddedPages[0]) {
            throw new Error(`Failed to embed page ${i + 1}`);
          }

          const embeddedPage = embeddedPages[0];
          const originalPage = pdfDoc.getPage(i);
          const { width, height } = originalPage.getSize();

          // Calculate new dimensions with aggressive scaling
          const newWidth = Math.max(72, width * aggressiveScale);
          const newHeight = Math.max(72, height * aggressiveScale);

          // Create new page with scaled dimensions
          const newPage = newPdfDoc.addPage([newWidth, newHeight]);

          // Draw embedded page scaled
          newPage.drawPage(embeddedPage, {
            x: 0,
            y: 0,
            width: newWidth,
            height: newHeight,
          });
        } catch (pageError) {
          console.error(`Error processing page ${i + 1}:`, pageError.message);
          if (i === 0) throw pageError; // If first page fails, abort
        }
      }

      const pdfBytes = await newPdfDoc.save();
      const compressedSize = pdfBytes.length;

      await fs.writeFile(outputPath, pdfBytes);
      return { success: true, size: compressedSize, method: 'image-based-purejs' };
    } catch (error) {
      console.error('Pure JS compression failed:', error.message);
      throw error;
    }
  }

  /**
   * Method 1: Image-based compression - tries multiple approaches
   */
  async compressByImageMethod(inputPath, outputPath, targetSizeBytes, scaleFactor) {
    // Try pdf2pic first (requires GraphicsMagick)
    try {
      return await this.compressByImageMethodPdf2Pic(inputPath, outputPath, targetSizeBytes, scaleFactor);
    } catch (error) {
      console.log(`pdf2pic method failed: ${error.message}`);
      // Fallback to pure JS method
      return await this.compressByImageMethodPureJS(inputPath, outputPath, targetSizeBytes, scaleFactor);
    }
  }

  /**
   * Method 2a: Python/Ghostscript-based compression (if available) - Best compression method
   */
  async compressByPython(inputPath, outputPath, targetSizeBytes) {
    try {
      console.log('🐍 Trying Python/Ghostscript compression...');

      const pythonScript = path.join(__dirname, '../../python/compress_pdf.py');

      // Check if Python script exists
      try {
        await fs.access(pythonScript);
      } catch {
        throw new Error('Python compression script not found');
      }

      // Try python3 first (Linux/Mac), then python, then py (Windows launcher)
      let pythonCommand = 'python3';
      try {
        await execAsync('python3 --version');
      } catch {
        try {
          await execAsync('python --version');
          pythonCommand = 'python';
        } catch {
          try {
            // Try Windows Python launcher
            await execAsync('py --version');
            pythonCommand = 'py';
          } catch {
            throw new Error('Python not found. Please install Python 3 from https://www.python.org/downloads/');
          }
        }
      }

      // Calculate compression quality based on target size
      const currentSize = (await fs.stat(inputPath)).size;
      const compressionRatio = targetSizeBytes / currentSize;

      // Determine quality preset based on target ratio
      let quality = 'ebook'; // Default: medium quality, good compression
      if (compressionRatio < 0.3) {
        quality = 'screen'; // Most aggressive compression for very small targets
      } else if (compressionRatio < 0.5) {
        quality = 'screen'; // Aggressive compression
      } else if (compressionRatio < 0.7) {
        quality = 'ebook'; // Medium compression
      } else {
        quality = 'printer'; // Higher quality for less aggressive compression
      }

      console.log(`Using compression quality: ${quality} (target ratio: ${(compressionRatio * 100).toFixed(1)}%)`);

      // Execute Python script with quality parameter
      let stdout, stderr;
      try {
        const result = await execFileAsync(
          pythonCommand,
          [pythonScript, inputPath, outputPath, quality],
          { timeout: 300000 } // 5 minute timeout
        );
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (execError) {
        // Extract error message from stderr if available
        const errorMsg = execError.stderr || execError.message || 'Unknown error';

        // Check for specific error messages
        if (errorMsg.includes('Ghostscript not found') || errorMsg.includes('not found')) {
          throw new Error('Ghostscript not found. Please install Ghostscript from https://www.ghostscript.com/download/');
        }
        if (errorMsg.includes('Input file not found')) {
          throw new Error(`Input file not found: ${inputPath}`);
        }
        if (errorMsg.includes('Output file was not created')) {
          throw new Error('Compressed file was not created by Ghostscript');
        }

        throw new Error(`Python/Ghostscript compression failed: ${errorMsg}`);
      }

      // Check if output file was created
      try {
        await fs.access(outputPath);
        const fileStats = await fs.stat(outputPath);

        // Check if file is not empty
        if (fileStats.size === 0) {
          throw new Error('Compressed file is empty');
        }
      } catch (accessError) {
        throw new Error(`Compressed file was not created or is invalid: ${accessError.message}`);
      }

      const compressedSize = (await fs.stat(outputPath)).size;
      const reduction = ((currentSize - compressedSize) / currentSize) * 100;

      console.log(`Python/Ghostscript compression: ${this.formatBytes(compressedSize)} (${reduction.toFixed(2)}% reduction)`);

      // Return success even if size increased slightly (Ghostscript might optimize differently)
      // But prefer results that actually reduce size
      if (compressedSize < currentSize) {
        return { success: true, size: compressedSize, method: 'python-ghostscript' };
      } else if (compressedSize <= currentSize * 1.1) {
        // Allow up to 10% increase (might be due to optimization)
        console.warn(`Compression resulted in slightly larger file, but continuing...`);
        return { success: true, size: compressedSize, method: 'python-ghostscript' };
      } else {
        throw new Error(`Compression did not reduce size effectively: ${this.formatBytes(compressedSize)} >= ${this.formatBytes(currentSize)}`);
      }
    } catch (error) {
      console.error('Python/Ghostscript compression failed:', error.message);
      throw error;
    }
  }

  /**
   * Method 2b: Ghostscript-based compression (if available) - Best compression method
   */
  async compressByGhostscript(inputPath, outputPath, targetSizeBytes) {
    try {
      console.log('👻 Trying Ghostscript compression...');

      // Check if Ghostscript is available
      try {
        await execAsync('gs --version');
      } catch {
        throw new Error('Ghostscript not installed');
      }

      // Calculate compression level based on target size
      const currentSize = (await fs.stat(inputPath)).size;
      const compressionRatio = targetSizeBytes / currentSize;

      // Ghostscript compression settings - use more aggressive settings for better compression
      let pdfSettings = '/screen'; // Most aggressive compression
      let dpi = 72; // Lower DPI for smaller file size

      if (compressionRatio > 0.7) {
        pdfSettings = '/ebook'; // Medium compression
        dpi = 150;
      } else if (compressionRatio > 0.5) {
        pdfSettings = '/screen';
        dpi = 100;
      } else {
        pdfSettings = '/screen';
        dpi = 72; // Most aggressive
      }

      // Use Ghostscript to compress with aggressive settings
      // -dPDFSETTINGS controls compression: /screen (lowest quality, smallest) to /prepress (highest quality, largest)
      // -dCompatibilityLevel=1.4 for better compression
      // -dDetectDuplicateImages removes duplicate images
      // -dCompressFonts compresses embedded fonts
      // -dOptimize=true enables optimization
      const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${pdfSettings} -dNOPAUSE -dQUIET -dBATCH -dDetectDuplicateImages=true -dCompressFonts=true -dOptimize=true -dColorImageResolution=${dpi} -dGrayImageResolution=${dpi} -dMonoImageResolution=${dpi} -sOutputFile="${outputPath}" "${inputPath}"`;

      await execAsync(command);

      const compressedSize = (await fs.stat(outputPath)).size;

      // Verify compression actually happened
      if (compressedSize >= currentSize) {
        console.warn(`Ghostscript result is larger than original, trying more aggressive settings...`);
        // Try even more aggressive settings
        const aggressiveCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -dDetectDuplicateImages=true -dCompressFonts=true -dOptimize=true -dColorImageResolution=72 -dGrayImageResolution=72 -dMonoImageResolution=72 -dDownsampleColorImages=true -dDownsampleGrayImages=true -dDownsampleMonoImages=true -dColorImageDownsampleThreshold=1.0 -dGrayImageDownsampleThreshold=1.0 -dMonoImageDownsampleThreshold=1.0 -sOutputFile="${outputPath}" "${inputPath}"`;
        await execAsync(aggressiveCommand);
        const newCompressedSize = (await fs.stat(outputPath)).size;
        return { success: true, size: newCompressedSize, method: 'ghostscript-aggressive' };
      }

      return { success: true, size: compressedSize, method: 'ghostscript' };
    } catch (error) {
      console.error('Ghostscript compression failed:', error.message);
      throw error;
    }
  }

  /**
   * Method 3: pdf-lib based compression
   * Embeds pages individually and scales them
   * Note: pdf-lib has limitations - this provides minimal compression (10-30%)
   */
  async compressByPdfLib(inputPath, outputPath, scaleFactor) {
    try {
      console.log('📄 Trying pdf-lib compression (limited - pdf-lib cannot truly compress)...');
      const existingPdfBytes = await fs.readFile(inputPath);
      const currentSize = existingPdfBytes.length;
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pageCount = pdfDoc.getPageCount();
      const newPdfDoc = await PDFDocument.create();

      // Apply aggressive scaling to reduce size
      const aggressiveScale = Math.max(0.15, scaleFactor * 0.7);

      // Embed each page individually and scale it
      for (let i = 0; i < pageCount; i++) {
        try {
          // Embed this specific page to get PDFEmbeddedPage
          const embeddedPages = await newPdfDoc.embedPdf(existingPdfBytes, [i]);

          if (!embeddedPages || embeddedPages.length === 0 || !embeddedPages[0]) {
            throw new Error(`Failed to embed page ${i + 1}`);
          }

          const embeddedPage = embeddedPages[0];
          const originalPage = pdfDoc.getPage(i);
          const { width, height } = originalPage.getSize();

          // Calculate new dimensions with aggressive scaling
          const newWidth = Math.max(72, width * aggressiveScale);
          const newHeight = Math.max(72, height * aggressiveScale);

          // Create new page with scaled dimensions
          const newPage = newPdfDoc.addPage([newWidth, newHeight]);

          // Draw embedded page scaled
          newPage.drawPage(embeddedPage, {
            x: 0,
            y: 0,
            width: newWidth,
            height: newHeight,
          });
        } catch (pageError) {
          console.error(`Error processing page ${i + 1}:`, pageError.message);
          throw new Error(`Failed to compress page ${i + 1}: ${pageError.message}`);
        }
      }

      const pdfBytes = await newPdfDoc.save();
      const compressedSize = pdfBytes.length;

      await fs.writeFile(outputPath, pdfBytes);
      return { success: true, size: compressedSize, method: 'pdf-lib' };
    } catch (error) {
      console.error('pdf-lib compression failed:', error.message);
      throw error;
    }
  }

  /**
   * Advanced PDF compression using advanced-pdf-compressor library
   * This library can actually compress PDFs properly (50-80% reduction)
   */
  async compressWithAdvancedCompressor(inputPath, outputPath, targetSizeBytes) {
    if (!PDFCompressor) {
      throw new Error('advanced-pdf-compressor not installed');
    }

    try {
      const currentSize = (await fs.stat(inputPath)).size;
      const targetRatio = targetSizeBytes / currentSize;

      // Calculate compression level based on target (1-9, higher = more compression)
      let compressionLevel = 9; // Maximum compression
      let imageQuality = 50; // Lower quality for smaller size

      if (targetRatio > 0.7) {
        compressionLevel = 5;
        imageQuality = 70;
      } else if (targetRatio > 0.5) {
        compressionLevel = 7;
        imageQuality = 60;
      } else {
        compressionLevel = 9;
        imageQuality = 50;
      }

      console.log(`Using advanced-pdf-compressor with level ${compressionLevel}, image quality ${imageQuality}`);

      // Try different API patterns for advanced-pdf-compressor
      let success = false;
      let compressedSize = currentSize;
      
      // Pattern 1: Try as class with compress method
      try {
        const compressor = new PDFCompressor({
          optimizeImages: true,
          imageQuality: imageQuality,
          removeMetadata: true,
          compressionLevel: compressionLevel,
          grayscale: false
        });
        
        if (compressor && typeof compressor.compress === 'function') {
          await compressor.compress(inputPath, outputPath);
          compressedSize = (await fs.stat(outputPath)).size;
          success = true;
        }
      } catch (e1) {
        // Pattern 2: Try as function that returns promise
        try {
          if (typeof PDFCompressor === 'function') {
            await PDFCompressor(inputPath, outputPath, {
              optimizeImages: true,
              imageQuality: imageQuality,
              removeMetadata: true,
              compressionLevel: compressionLevel,
            });
            compressedSize = (await fs.stat(outputPath)).size;
            success = true;
          }
        } catch (e2) {
          // Pattern 3: Try static method
          try {
            if (PDFCompressor.compress && typeof PDFCompressor.compress === 'function') {
              await PDFCompressor.compress(inputPath, outputPath, {
                optimizeImages: true,
                imageQuality: imageQuality,
                removeMetadata: true,
                compressionLevel: compressionLevel,
              });
              compressedSize = (await fs.stat(outputPath)).size;
              success = true;
            }
          } catch (e3) {
            // All patterns failed
            throw new Error(`advanced-pdf-compressor API not recognized. Tried class, function, and static methods. Library may need update.`);
          }
        }
      }
      
      if (!success) {
        throw new Error('Failed to compress with advanced-pdf-compressor using any known API pattern');
      }

      if (success) {
        const reduction = ((currentSize - compressedSize) / currentSize) * 100;
        console.log(`Advanced compression: ${this.formatBytes(compressedSize)} (${reduction.toFixed(2)}% reduction)`);
        return { success: true, size: compressedSize, method: 'advanced-compressor' };
      } else {
        throw new Error('Compression completed but file was not created');
      }
    } catch (error) {
      console.error('Advanced compressor failed:', error.message);
      throw error;
    }
  }

  /**
   * Advanced image-based compression using pdf2pic + sharp (works without Ghostscript)
   * Can achieve 50-90% compression by converting pages to images and compressing them
   */
  async compressByImageExtraction(inputPath, outputPath, targetSizeBytes) {
    try {
      console.log('🖼️ Trying advanced image-based compression (pdf2pic + sharp)...');
      const existingPdfBytes = await fs.readFile(inputPath);
      const currentSize = existingPdfBytes.length;
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pageCount = pdfDoc.getPageCount();
      const newPdfDoc = await PDFDocument.create();

      const targetRatio = targetSizeBytes / currentSize;
      console.log(`Target ratio: ${(targetRatio * 100).toFixed(1)}%`);

      // Calculate aggressive compression settings based on target
      let imageQuality = 40; // Start with low quality for maximum compression
      let dpi = 72; // Low DPI for smaller images
      let maxDimension = 1200; // Max width/height in pixels

      if (targetRatio > 0.7) {
        imageQuality = 70;
        dpi = 150;
        maxDimension = 2000;
      } else if (targetRatio > 0.5) {
        imageQuality = 60;
        dpi = 120;
        maxDimension = 1600;
      } else if (targetRatio > 0.3) {
        imageQuality = 50;
        dpi = 100;
        maxDimension = 1400;
      } else {
        imageQuality = 40; // Very aggressive
        dpi = 72;
        maxDimension = 1000;
      }

      console.log(`Compression settings: quality=${imageQuality}, dpi=${dpi}, maxDim=${maxDimension}`);

      const tempDir = path.join(__dirname, '../../temp/pdf');
      await fs.mkdir(tempDir, { recursive: true });

      const options = {
        density: dpi,
        saveFilename: 'page',
        savePath: tempDir,
        format: 'png',
        width: maxDimension,
        height: maxDimension,
      };

      let convert;
      try {
        convert = fromPath(inputPath, options);
      } catch (convertError) {
        throw new Error(`pdf2pic initialization failed. GraphicsMagick or ImageMagick may not be installed: ${convertError.message}`);
      }

      // Process each page
      for (let i = 0; i < pageCount; i++) {
        try {
          const result = await convert(i + 1, { responseType: 'image' });
          const imagePath = result.path || result.name;

          if (!imagePath) {
            throw new Error(`No image path returned for page ${i + 1}`);
          }

          // Check if file exists
          try {
            await fs.access(imagePath);
          } catch {
            throw new Error(`Image file not found at path: ${imagePath}`);
          }

          // Read and aggressively compress image with sharp
          const imageBuffer = await fs.readFile(imagePath);

          // Get original page dimensions
          const originalPage = pdfDoc.getPage(i);
          const { width: origWidth, height: origHeight } = originalPage.getSize();

          // Calculate target dimensions - maintain aspect ratio
          let targetWidth = maxDimension;
          let targetHeight = maxDimension;
          const aspectRatio = origWidth / origHeight;

          if (aspectRatio > 1) {
            targetHeight = Math.round(maxDimension / aspectRatio);
          } else {
            targetWidth = Math.round(maxDimension * aspectRatio);
          }

          // Aggressively compress image - use JPEG with low quality
          const compressedImage = await sharp(imageBuffer)
            .resize(targetWidth, targetHeight, {
              withoutEnlargement: true,
              fit: 'inside',
              kernel: sharp.kernel.lanczos3
            })
            .jpeg({
              quality: imageQuality,
              mozjpeg: true,
              progressive: true,
              optimizeScans: true
            })
            .toBuffer();

          // Embed compressed image in PDF
          const image = await newPdfDoc.embedJpg(compressedImage);
          const { width, height } = image.scale(1);
          const page = newPdfDoc.addPage([width, height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: width,
            height: height,
          });

          // Clean up temp file
          await fs.unlink(imagePath).catch(() => { });
        } catch (pageError) {
          console.error(`Error processing page ${i + 1}:`, pageError.message);
          // If pdf2pic fails, fall back to scaling method for this page
          try {
            const embeddedPages = await newPdfDoc.embedPdf(existingPdfBytes, [i]);
            if (embeddedPages && embeddedPages.length > 0) {
              const embeddedPage = embeddedPages[0];
              const originalPage = pdfDoc.getPage(i);
              const { width, height } = originalPage.getSize();
              const scale = 0.6; // Aggressive scale
              const newPage = newPdfDoc.addPage([width * scale, height * scale]);
              newPage.drawPage(embeddedPage, {
                x: 0,
                y: 0,
                width: width * scale,
                height: height * scale,
              });
            }
          } catch (fallbackError) {
            console.error(`Fallback also failed for page ${i + 1}:`, fallbackError.message);
            if (i === 0) throw pageError; // If first page fails completely, throw
          }
        }
      }

      const pdfBytes = await newPdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
      });
      await fs.writeFile(outputPath, pdfBytes);

      // Clean up temp directory
      try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          if (file.startsWith('page')) {
            await fs.unlink(path.join(tempDir, file)).catch(() => { });
          }
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      const compressedSize = pdfBytes.length;
      const reduction = ((currentSize - compressedSize) / currentSize) * 100;

      console.log(`Image-based compression: ${this.formatBytes(compressedSize)} (${reduction.toFixed(2)}% reduction)`);

      return { success: true, size: compressedSize, method: 'image-extraction' };
    } catch (error) {
      console.error('Image extraction compression failed:', error.message);
      throw error;
    }
  }

  /**
   * Simple PDF compression: Try image extraction first, then Ghostscript, then advanced compressor, fallback to scaling
   */
  async compressByFileSize(inputPath, outputPath, targetSizeBytes) {
    try {
      const existingPdfBytes = await fs.readFile(inputPath);
      const currentSize = existingPdfBytes.length;

      console.log(`Target size: ${this.formatBytes(targetSizeBytes)}, Current size: ${this.formatBytes(currentSize)}`);

      if (currentSize <= targetSizeBytes) {
        console.log('File already smaller than target, copying as-is');
        await fs.writeFile(outputPath, existingPdfBytes);
        return { success: true, size: currentSize };
      }

      // Try image-based compression first (works without Ghostscript, 50-90% reduction)
      try {
        const imgResult = await this.compressByImageExtraction(inputPath, outputPath, targetSizeBytes);
        if (imgResult.success && imgResult.size < currentSize) {
          const reduction = ((currentSize - imgResult.size) / currentSize) * 100;
          // If result is smaller than target, it's successful! Also allow up to 20% over target
          const isWithinTarget = imgResult.size <= targetSizeBytes * 1.2;
          const isBetterThanTarget = imgResult.size <= targetSizeBytes;

          console.log(`\n🎯 Final Result (Image Extraction):`);
          console.log(`  Original: ${this.formatBytes(currentSize)}`);
          console.log(`  Compressed: ${this.formatBytes(imgResult.size)}`);
          console.log(`  Target: ${this.formatBytes(targetSizeBytes)}`);
          console.log(`  Reduction: ${reduction.toFixed(2)}%`);
          console.log(`  Within target range: ${isWithinTarget ? '✅ Yes' : '❌ No'}`);
          console.log(`  Better than target: ${isBetterThanTarget ? '✅ Yes (smaller!)' : '⚠️ Slightly larger'}`);

          // If result is good enough, return it
          if (imgResult.size <= targetSizeBytes * 1.2 || reduction > 30) {
            return imgResult;
          }
        }
      } catch (error) {
        console.log(`Image extraction compression failed: ${error.message}`);
      }

      // Try Python/Ghostscript compression (best compression - 70-90% reduction)
      try {
        const pythonResult = await this.compressByPython(inputPath, outputPath, targetSizeBytes);
        if (pythonResult.success && pythonResult.size < currentSize) {
          const reduction = ((currentSize - pythonResult.size) / currentSize) * 100;
          // If result is smaller than target, it's successful! Also allow up to 20% over target
          const isWithinTarget = pythonResult.size <= targetSizeBytes * 1.2;
          const isBetterThanTarget = pythonResult.size <= targetSizeBytes;

          console.log(`\n🎯 Final Result (Python/Ghostscript):`);
          console.log(`  Original: ${this.formatBytes(currentSize)}`);
          console.log(`  Compressed: ${this.formatBytes(pythonResult.size)}`);
          console.log(`  Target: ${this.formatBytes(targetSizeBytes)}`);
          console.log(`  Reduction: ${reduction.toFixed(2)}%`);
          console.log(`  Within target range: ${isWithinTarget ? '✅ Yes' : '❌ No'}`);
          console.log(`  Better than target: ${isBetterThanTarget ? '✅ Yes (smaller!)' : '⚠️ Slightly larger'}`);

          // If Python result is good enough, return it (smaller than target or within 20% over)
          if (pythonResult.size <= targetSizeBytes * 1.2 || reduction > 30) {
            return pythonResult;
          }
        }
      } catch (error) {
        console.log(`Python/Ghostscript compression failed: ${error.message}`);
      }

      // Try Ghostscript directly (if available - best compression - 70-90% reduction)
      try {
        const gsResult = await this.compressByGhostscript(inputPath, outputPath, targetSizeBytes);
        if (gsResult.success && gsResult.size < currentSize) {
          const reduction = ((currentSize - gsResult.size) / currentSize) * 100;
          const isWithinTarget = gsResult.size >= targetSizeBytes * 0.9 && gsResult.size <= targetSizeBytes * 1.1;

          console.log(`\n🎯 Final Result (Ghostscript):`);
          console.log(`  Original: ${this.formatBytes(currentSize)}`);
          console.log(`  Compressed: ${this.formatBytes(gsResult.size)}`);
          console.log(`  Target: ${this.formatBytes(targetSizeBytes)}`);
          console.log(`  Reduction: ${reduction.toFixed(2)}%`);
          console.log(`  Within target range: ${isWithinTarget ? '✅ Yes' : '❌ No'}`);

          // If Ghostscript result is good enough, return it
          if (gsResult.size <= targetSizeBytes * 1.2 || reduction > 30) {
            return gsResult;
          }
        }
      } catch (error) {
        console.log(`Ghostscript compression failed: ${error.message}`);
      }

      // Try advanced-pdf-compressor (if available)
      if (PDFCompressor) {
        try {
          const result = await this.compressWithAdvancedCompressor(inputPath, outputPath, targetSizeBytes);
          if (result.success && result.size < currentSize) {
            const reduction = ((currentSize - result.size) / currentSize) * 100;
            const isWithinTarget = result.size >= targetSizeBytes * 0.9 && result.size <= targetSizeBytes * 1.1;

            console.log(`\n🎯 Final Result (Advanced Compressor):`);
            console.log(`  Original: ${this.formatBytes(currentSize)}`);
            console.log(`  Compressed: ${this.formatBytes(result.size)}`);
            console.log(`  Target: ${this.formatBytes(targetSizeBytes)}`);
            console.log(`  Reduction: ${reduction.toFixed(2)}%`);
            console.log(`  Within target range: ${isWithinTarget ? '✅ Yes' : '❌ No'}`);

            return result;
          }
        } catch (error) {
          // Log the error but continue to fallback methods
          console.log(`Advanced compressor failed, using fallback: ${error.message}`);
          // Don't throw - let it fall through to other compression methods
        }
      }

      // Fallback to direct scaling method with more aggressive compression
      console.log(`Using fallback compression method (pdf-lib scaling)...`);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pageCount = pdfDoc.getPageCount();

      if (pageCount === 0) {
        throw new Error('PDF has no pages');
      }

      // Calculate initial scale factor based on target size - be more aggressive
      const sizeRatio = targetSizeBytes / currentSize;
      // Use more aggressive scaling - square root gives better compression
      let scaleFactor = Math.max(0.2, Math.min(0.85, Math.pow(sizeRatio, 0.6) * 0.9));

      const tolerance = 0.1; // 10% tolerance
      const maxIterations = 15;
      let iterations = 0;
      let bestResult = null;
      let bestSize = currentSize;
      let minScale = 0.15;
      let maxScale = 0.9;

      console.log(`Starting iterative compression to reach target size...`);

      // Iterative binary search to find optimal scale
      while (iterations < maxIterations) {
        iterations++;

        try {
          const newPdfDoc = await PDFDocument.create();

          // Embed and scale each page
          for (let i = 0; i < pageCount; i++) {
            // Embed this specific page
            const embeddedPages = await newPdfDoc.embedPdf(existingPdfBytes, [i]);

            if (!embeddedPages || embeddedPages.length === 0 || !embeddedPages[0]) {
              throw new Error(`Failed to embed page ${i + 1}`);
            }

            const embeddedPage = embeddedPages[0];
            const originalPage = pdfDoc.getPage(i);
            const { width, height } = originalPage.getSize();

            // Calculate new dimensions
            const newWidth = Math.max(72, width * scaleFactor);
            const newHeight = Math.max(72, height * scaleFactor);

            // Create new page with scaled dimensions
            const newPage = newPdfDoc.addPage([newWidth, newHeight]);

            // Draw embedded page scaled
            newPage.drawPage(embeddedPage, {
              x: 0,
              y: 0,
              width: newWidth,
              height: newHeight,
            });
          }

          // Save with compression options
          const testBytes = await newPdfDoc.save({
            useObjectStreams: false,
            addDefaultPage: false,
          });
          const testSize = testBytes.length;

          console.log(`Iteration ${iterations}: scale=${scaleFactor.toFixed(3)}, size=${this.formatBytes(testSize)}, target=${this.formatBytes(targetSizeBytes)}`);

          // Check if we're within target range
          const isWithinRange = testSize >= targetSizeBytes * (1 - tolerance) &&
            testSize <= targetSizeBytes * (1 + tolerance);

          // Track best result (closest to target)
          const distance = Math.abs(testSize - targetSizeBytes);
          if (bestResult === null || distance < Math.abs(bestSize - targetSizeBytes)) {
            bestResult = testBytes;
            bestSize = testSize;
          }

          // If we're within range, we're done
          if (isWithinRange) {
            console.log(`✅ Target achieved! Size: ${this.formatBytes(testSize)}`);
            await fs.writeFile(outputPath, testBytes);
            return { success: true, size: testSize, method: 'direct-compression' };
          }

          // Adjust scale factor based on result
          if (testSize > targetSizeBytes * (1 + tolerance)) {
            // Too large - reduce scale
            maxScale = scaleFactor;
            const overshootRatio = testSize / targetSizeBytes;
            if (overshootRatio > 2.0) {
              scaleFactor = scaleFactor * 0.7;
            } else if (overshootRatio > 1.5) {
              scaleFactor = scaleFactor * 0.8;
            } else {
              scaleFactor = (minScale + maxScale) / 2;
            }
            scaleFactor = Math.max(minScale, scaleFactor);
          } else if (testSize < targetSizeBytes * (1 - tolerance)) {
            // Too small - increase scale
            minScale = scaleFactor;
            const undershootRatio = targetSizeBytes / testSize;
            if (undershootRatio > 2.0) {
              scaleFactor = Math.min(maxScale, scaleFactor * 1.3);
            } else if (undershootRatio > 1.5) {
              scaleFactor = Math.min(maxScale, scaleFactor * 1.2);
            } else {
              scaleFactor = (minScale + maxScale) / 2;
            }
            scaleFactor = Math.min(maxScale, scaleFactor);
          }

          // Check if bounds converged
          if (maxScale - minScale < 0.01) {
            console.log('Scale bounds converged');
            break;
          }

        } catch (error) {
          console.error(`Error in iteration ${iterations}:`, error.message);
          // Try with a safer scale
          scaleFactor = (minScale + maxScale) / 2;
        }
      }

      // Use best result - but only if it actually reduces size
      if (bestResult) {
        // CRITICAL: Don't use result if it increases file size
        // CRITICAL: If compression increases file size, return original file instead of throwing error
        if (bestSize >= currentSize) {
          console.warn(`❌ pdf-lib scaling cannot compress this PDF effectively.`);
          console.warn(`   Original: ${this.formatBytes(currentSize)}`);
          console.warn(`   Result: ${this.formatBytes(bestSize)}`);
          console.warn(`   Reason: pdf-lib only scales pages, doesn't compress content`);
          console.warn(`   Action: Returning original file`);

          await fs.writeFile(outputPath, existingPdfBytes);
          return { success: true, size: currentSize, warning: 'Compression could not reduce file size (requires Ghostscript)' };
        }

        await fs.writeFile(outputPath, bestResult);

        const reduction = ((currentSize - bestSize) / currentSize) * 100;
        const isWithinTarget = bestSize >= targetSizeBytes * (1 - tolerance) &&
          bestSize <= targetSizeBytes * (1 + tolerance);

        console.log(`\n🎯 Final Result:`);
        console.log(`  Original: ${this.formatBytes(currentSize)}`);
        console.log(`  Compressed: ${this.formatBytes(bestSize)}`);
        console.log(`  Target: ${this.formatBytes(targetSizeBytes)}`);
        console.log(`  Reduction: ${reduction.toFixed(2)}%`);
        console.log(`  Within target range: ${isWithinTarget ? '✅ Yes' : '❌ No'}`);

        return { success: true, size: bestSize, method: 'direct-compression' };
      }

      throw new Error('Failed to compress PDF after all iterations');
    } catch (error) {
      console.error('Error compressing PDF by file size:', error);
      throw new Error(`Failed to compress PDF: ${error.message}`);
    }
  }

  /**
   * Main compression method
   */
  async compressPdf(inputPath, outputPath, compressionType, settings) {
    try {
      console.log('Compression request:', { compressionType, settings });

      if (compressionType === 'fileSize') {
        const { value, unit } = settings.targetSize || {};
        if (!value || isNaN(value) || value <= 0) {
          throw new Error('Invalid target file size value');
        }

        // Validate unit
        const validUnits = ['B', 'KB', 'MB', 'GB'];
        const targetUnit = unit || 'KB'; // Default to KB instead of MB for better UX
        if (!validUnits.includes(targetUnit)) {
          console.warn(`Invalid unit "${targetUnit}", defaulting to KB`);
        }

        const targetSizeBytes = this.convertToBytes(Number(value), validUnits.includes(targetUnit) ? targetUnit : 'KB');
        console.log(`Target size: ${value} ${targetUnit} = ${this.formatBytes(targetSizeBytes)}`);

        return await this.compressByFileSize(inputPath, outputPath, targetSizeBytes);
      } else {
        throw new Error('Invalid compression type. Only fileSize compression is supported.');
      }
    } catch (error) {
      console.error('Error in compressPdf:', error);
      throw error;
    }
  }
}

module.exports = new PdfCompressionService();
