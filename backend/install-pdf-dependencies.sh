#!/bin/bash

# PDF Compression Dependencies Installation Script
# This script installs Ghostscript and GraphicsMagick for optimal PDF compression

echo "🔧 Installing PDF Compression Dependencies..."
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Detected: macOS"
    echo ""
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew is not installed."
        echo "   Please install Homebrew first: https://brew.sh"
        exit 1
    fi
    
    echo "🍺 Installing via Homebrew..."
    echo ""
    
    # Install Ghostscript
    echo "📦 Installing Ghostscript..."
    brew install ghostscript
    
    # Install GraphicsMagick
    echo "📦 Installing GraphicsMagick..."
    brew install graphicsmagick
    
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "Verifying installation..."
    
    if command -v gs &> /dev/null; then
        echo "✅ Ghostscript: $(gs --version)"
    else
        echo "❌ Ghostscript not found in PATH"
    fi
    
    if command -v gm &> /dev/null; then
        echo "✅ GraphicsMagick: $(gm version | head -1)"
    else
        echo "❌ GraphicsMagick not found in PATH"
    fi
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected: Linux"
    echo ""
    
    # Detect Linux distribution
    if [ -f /etc/debian_version ]; then
        echo "📦 Detected: Debian/Ubuntu"
        echo "Installing dependencies..."
        sudo apt-get update
        sudo apt-get install -y ghostscript graphicsmagick
    elif [ -f /etc/redhat-release ]; then
        echo "📦 Detected: RedHat/CentOS"
        echo "Installing dependencies..."
        sudo yum install -y ghostscript GraphicsMagick
    else
        echo "❌ Unsupported Linux distribution"
        echo "Please install manually:"
        echo "  - ghostscript"
        echo "  - graphicsmagick"
        exit 1
    fi
    
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "Verifying installation..."
    
    if command -v gs &> /dev/null; then
        echo "✅ Ghostscript: $(gs --version)"
    else
        echo "❌ Ghostscript not found in PATH"
    fi
    
    if command -v gm &> /dev/null; then
        echo "✅ GraphicsMagick: $(gm version | head -1)"
    else
        echo "❌ GraphicsMagick not found in PATH"
    fi
    
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo ""
    echo "Please install manually:"
    echo "  - Ghostscript: https://www.ghostscript.com/download/"
    echo "  - GraphicsMagick: http://www.graphicsmagick.org/download.html"
    exit 1
fi

echo ""
echo "🎉 Done! Please restart your backend server for changes to take effect."
echo "   Run: cd atract/backend && npm start"

