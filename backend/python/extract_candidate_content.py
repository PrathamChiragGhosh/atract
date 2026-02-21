#!/usr/bin/env python3
"""
Extract text content from candidate files (PDF, DOC, DOCX, TXT, XML)
using Spire library for PDF and DOC, and standard libraries for others
"""

import sys
import json
import os
from pathlib import Path
import xml.etree.ElementTree as ET

# Try to import Spire libraries
try:
    from spire.doc import Document as WordDocument
    from spire.pdf import PdfDocument, PdfTextExtractOptions, PdfTextExtractor
    HAS_SPIRE = True
except ImportError:
    HAS_SPIRE = False
    print("Warning: Spire libraries not available. Using fallback methods.", file=sys.stderr)

def extract_text(path):
    """
    Extract text content from a file
    Supports: PDF, DOC, DOCX, TXT, XML, XLS, XLSX
    """
    text = ""
    file_ext = Path(path).suffix.lower()

    try:
        if file_ext in (".doc", ".docx", ".odt"):
            if HAS_SPIRE:
                doc = WordDocument()
                doc.LoadFromFile(path)
                text = doc.GetText()
                doc.Close()
            else:
                # Fallback: Try using python-docx or other libraries
                try:
                    import docx
                    doc = docx.Document(path)
                    text = "\n".join([para.text for para in doc.paragraphs])
                except:
                    text = f"[DOC file: {Path(path).name} - content extraction not available without Spire]"

        elif file_ext == ".pdf":
            if HAS_SPIRE:
                pdf_doc = PdfDocument()
                pdf_doc.LoadFromFile(path)

                extractOptions = PdfTextExtractOptions()
                extractOptions.IsExtractAllText = True

                for i in range(pdf_doc.Pages.Count):
                    page = pdf_doc.Pages.get_Item(i)
                    text += PdfTextExtractor(page).ExtractText(extractOptions) + "\n"
                
                pdf_doc.Close()
            else:
                # Fallback: Try using PyPDF2 or pdf-parse
                try:
                    import PyPDF2
                    with open(path, 'rb') as file:
                        pdf_reader = PyPDF2.PdfReader(file)
                        for page in pdf_reader.pages:
                            text += page.extract_text() + "\n"
                except:
                    text = f"[PDF file: {Path(path).name} - content extraction not available without Spire]"

        elif file_ext == ".txt":
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()

        elif file_ext == ".xml":
            try:
                tree = ET.parse(path)
                root = tree.getroot()
                # Extract all text from XML elements
                text = " ".join([elem.text for elem in root.iter() if elem.text and elem.text.strip()])
            except Exception as e:
                text = f"[XML parsing error: {str(e)}]"

        elif file_ext in (".xlsx", ".xls"):
            try:
                import pandas as pd
                # Read Excel file and convert to text
                df = pd.read_excel(path, sheet_name=None)  # Read all sheets
                text_parts = []
                for sheet_name, sheet_df in df.items():
                    text_parts.append(f"Sheet: {sheet_name}")
                    text_parts.append(sheet_df.to_string())
                text = "\n".join(text_parts)
            except Exception as e:
                text = f"[Excel parsing error: {str(e)}]"

        else:
            text = f"[Unsupported file type: {file_ext}]"

    except Exception as e:
        return {
            "success": False,
            "error": f"Error extracting text from {Path(path).name}: {str(e)}",
            "text": ""
        }

    return {
        "success": True,
        "text": text.strip(),
        "file_name": Path(path).name
    }

def main():
    """Main function - expects file path as command line argument"""
    try:
        if len(sys.argv) < 2:
            print(json.dumps({
                "success": False,
                "error": "File path required"
            }), file=sys.stderr)
            sys.exit(1)

        file_path = sys.argv[1]
        
        if not os.path.exists(file_path):
            print(json.dumps({
                "success": False,
                "error": f"File not found: {file_path}"
            }), file=sys.stderr)
            sys.exit(1)

        result = extract_text(file_path)
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "text": ""
        }), file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

