# PDF Compression Setup Guide

## System Dependencies Required

The PDF compression service requires system-level dependencies for optimal compression. Here's how to install them:

### macOS (using Homebrew)

```bash
# Install Ghostscript (best compression - 70-90% reduction)
brew install ghostscript

# Install GraphicsMagick (for image-based compression - 50-90% reduction)
brew install graphicsmagick

# Or install ImageMagick (alternative to GraphicsMagick)
brew install imagemagick
```

### Linux (Ubuntu/Debian)

```bash
# Install Ghostscript
sudo apt-get update
sudo apt-get install -y ghostscript

# Install GraphicsMagick
sudo apt-get install -y graphicsmagick

# Or install ImageMagick
sudo apt-get install -y imagemagick
```

### Linux (CentOS/RHEL)

```bash
# Install Ghostscript
sudo yum install -y ghostscript

# Install GraphicsMagick
sudo yum install -y GraphicsMagick

# Or install ImageMagick
sudo yum install -y ImageMagick
```

### Windows

1. **Install Ghostscript:**
   - Download from: https://www.ghostscript.com/download/gsdnld.html
   - Install the executable
   - Add to PATH or the service will auto-detect common locations

2. **Install GraphicsMagick:**
   - Download from: http://www.graphicsmagick.org/download.html
   - Install and add to PATH

## Verify Installation

After installing, verify the tools are available:

```bash
# Check Ghostscript
gs --version

# Check GraphicsMagick
gm version

# Check ImageMagick (if installed instead)
convert --version
```

## Compression Methods Available

The service tries multiple compression methods in order:

1. **Image-based compression (pdf2pic + sharp)** - Requires GraphicsMagick/ImageMagick
   - Reduction: 50-90%
   - Works without Ghostscript

2. **Python/Ghostscript compression** - Requires Ghostscript
   - Reduction: 70-90%
   - Best compression quality

3. **Direct Ghostscript compression** - Requires Ghostscript
   - Reduction: 70-90%
   - Fast and reliable

4. **Advanced PDF Compressor** - Node.js library
   - Reduction: 30-60%
   - Works without system dependencies

5. **PDF-lib scaling (fallback)** - No dependencies
   - Reduction: Limited (only scales pages)
   - Last resort method

## Without System Dependencies

If you can't install Ghostscript or GraphicsMagick, the service will:
- Use advanced-pdf-compressor library (if properly installed)
- Fall back to PDF-lib scaling (limited effectiveness)
- Return original file if compression fails

**Note:** Compression quality will be significantly reduced without Ghostscript.

## Troubleshooting

### Error: "GraphicsMagick/ImageMagick binaries can't be found"

**Solution:**
- Install GraphicsMagick or ImageMagick (see above)
- Make sure it's in your system PATH
- Restart the backend server after installation

### Error: "Ghostscript not found"

**Solution:**
- Install Ghostscript (see above)
- Verify with `gs --version`
- Restart the backend server

### Error: "compressor.compress is not a function"

**Solution:**
- The advanced-pdf-compressor library may have API changes
- Try reinstalling: `npm install advanced-pdf-compressor`
- Or the service will automatically fall back to other methods

### Compression not working / returning original file

**Possible causes:**
1. No system dependencies installed
2. PDF is already highly compressed
3. PDF contains only text (no images to compress)
4. Target size is too small (unrealistic)

**Solutions:**
- Install Ghostscript for best results
- Try a larger target size
- Check if PDF has compressible content (images)

## Recommended Setup

For best compression results, install both:
1. **Ghostscript** - For best compression (70-90% reduction)
2. **GraphicsMagick** - For image-based compression fallback

## Quick Install (macOS)

```bash
# Install both dependencies
brew install ghostscript graphicsmagick

# Verify installation
gs --version
gm version

# Restart backend
cd atract/backend
npm start
```

## Quick Install (Linux)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y ghostscript graphicsmagick

# Verify
gs --version
gm version

# Restart backend
cd atract/backend
npm start
```

