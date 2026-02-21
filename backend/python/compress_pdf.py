#!/usr/bin/env python3
"""
PDF Compression Script using Ghostscript
Compresses PDF files using Ghostscript command-line tool
Works on Windows, Linux, and macOS
"""

import subprocess
import sys
import os
import platform

def find_ghostscript():
    """
    Find Ghostscript executable on the system
    Returns the path to the Ghostscript executable
    """
    system = platform.system()
    
    # Common Ghostscript executable names
    gs_commands = []
    
    if system == "Windows":
        # Windows: try gswin64c.exe, gswin32c.exe, or gs.exe
        # Check common installation paths
        common_paths = [
            "C:/Program Files/gs/gs*/bin/gswin64c.exe",
            "C:/Program Files (x86)/gs/gs*/bin/gswin64c.exe",
            "D:/BasicProgramming/Downloads/gs*/bin/gswin64c.exe",
            os.path.expanduser("~/gs*/bin/gswin64c.exe"),
        ]
        
        # Try direct commands first (if in PATH)
        gs_commands = [
            "gswin64c.exe",
            "gswin32c.exe",
            "gs.exe",
            "gswin64c",
            "gswin32c",
        ]
        
        # Try to find in common paths
        import glob
        for path_pattern in common_paths:
            matches = glob.glob(path_pattern)
            if matches:
                # Sort to get the latest version
                matches.sort(reverse=True)
                gs_commands.insert(0, matches[0])
    else:
        # Linux/Mac: try gs command (should be in PATH if installed)
        gs_commands = ["gs", "gs-64", "gs-32"]
    
    # Try each command to see if it works
    for cmd in gs_commands:
        try:
            # Test if command exists and works
            result = subprocess.run(
                [cmd, "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                print(f"Found Ghostscript: {cmd}", file=sys.stderr)
                return cmd
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            continue
    
    return None

def compress_pdf(input_pdf, output_pdf, quality="ebook"):
    """
    Compress PDF using Ghostscript
    
    Args:
        input_pdf: Path to input PDF file
        output_pdf: Path to output compressed PDF file
        quality: Compression quality preset
                 - "screen": Lowest quality, smallest size (72 DPI)
                 - "ebook": Medium quality, good compression (150 DPI) - default
                 - "printer": Higher quality (300 DPI)
                 - "prepress": Highest quality (300 DPI, color preserving)
    """
    
    # Check if input file exists
    if not os.path.exists(input_pdf):
        print(f"ERROR: Input file not found: {input_pdf}", file=sys.stderr)
        sys.exit(1)
    
    # Find Ghostscript executable
    gs_command = find_ghostscript()
    if not gs_command:
        print("ERROR: Ghostscript not found. Please install it:", file=sys.stderr)
        print("  Ubuntu/Debian: sudo apt-get install ghostscript", file=sys.stderr)
        print("  macOS: brew install ghostscript", file=sys.stderr)
        print("  Windows: Download from https://www.ghostscript.com/download/", file=sys.stderr)
        print("  Make sure Ghostscript is in your PATH or provide the full path", file=sys.stderr)
        sys.exit(1)
    
    # Validate quality parameter
    valid_qualities = ["screen", "ebook", "printer", "prepress"]
    if quality not in valid_qualities:
        quality = "ebook"  # Default to ebook
    
    # Ghostscript command for PDF compression
    cmd = [
        gs_command,
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS=/{quality}",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
        "-dSubsetFonts=true",
        f"-sOutputFile={output_pdf}",
        input_pdf
    ]
    
    try:
        # Run Ghostscript command
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        # Check if output file was created
        if os.path.exists(output_pdf) and os.path.getsize(output_pdf) > 0:
            print("SUCCESS", file=sys.stderr)
            return True
        else:
            print(f"ERROR: Output file was not created or is empty: {output_pdf}", file=sys.stderr)
            sys.exit(1)
            
    except subprocess.TimeoutExpired:
        print("ERROR: Ghostscript compression timed out (took more than 5 minutes)", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Ghostscript compression failed", file=sys.stderr)
        print(f"Command: {' '.join(cmd)}", file=sys.stderr)
        if e.stderr:
            print(f"Error output: {e.stderr}", file=sys.stderr)
        if e.stdout:
            print(f"Standard output: {e.stdout}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print(f"ERROR: Ghostscript executable not found: {gs_command}", file=sys.stderr)
        print("Please install Ghostscript and ensure it's in your PATH", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Unexpected error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    # Get command line arguments
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print("Usage: python3 compress_pdf.py <input_pdf> <output_pdf> [quality]", file=sys.stderr)
        print("  quality: screen, ebook (default), printer, or prepress", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    quality = sys.argv[3] if len(sys.argv) == 4 else "ebook"
    
    # Compress the PDF
    compress_pdf(input_pdf, output_pdf, quality)
