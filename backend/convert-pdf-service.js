const fs = require('fs');
const path = require('path');

// Read the original file
const originalPath = path.join(__dirname, '../../pdfModule/backend/services/pdfCompressionService.js');
const content = fs.readFileSync(originalPath, 'utf8');

// Convert ES modules to CommonJS
let converted = content
  .replace(/import fs from 'fs\/promises';/g, "const fs = require('fs').promises;")
  .replace(/import path from 'path';/g, "const path = require('path');")
  .replace(/import \{ PDFDocument \} from 'pdf-lib';/g, "const { PDFDocument } = require('pdf-lib');")
  .replace(/import sharp from 'sharp';/g, "const sharp = require('sharp');")
  .replace(/import \{ fromPath \} from 'pdf2pic';/g, "const { fromPath } = require('pdf2pic');")
  .replace(/import \{ exec, execFile \} from 'child_process';/g, "const { exec, execFile } = require('child_process');")
  .replace(/import \{ promisify \} from 'util';/g, "const { promisify } = require('util');")
  .replace(/import \{ createRequire \} from 'module';/g, '')
  .replace(/import \{ fileURLToPath \} from 'url';/g, '')
  .replace(/const require = createRequire\(import\.meta\.url\);/g, '')
  .replace(/const __filename = fileURLToPath\(import\.meta\.url\);/g, '')
  .replace(/const __dirname = path\.dirname\(__filename\);/g, '')
  .replace(/export default new PdfCompressionService\(\);/g, 'module.exports = new PdfCompressionService();');

// Write converted file
const outputPath = path.join(__dirname, 'src/services/pdfCompressionService.js');
fs.writeFileSync(outputPath, converted);
console.log('✅ Converted pdfCompressionService.js');

