#!/usr/bin/env python3
"""
PDF Processing Service using pdf2image and pypdf
Handles text extraction and PDF to image conversion
"""

import sys
import json
import base64
import tempfile
import os
from typing import Dict, Any, Optional
from io import BytesIO

try:
    from pypdf import PdfReader
    from pdf2image import convert_from_bytes
    from PIL import Image
except ImportError as e:
    print(f"Error importing required libraries: {e}")
    print("Please install: pip install pypdf pdf2image pillow")
    sys.exit(1)

def extract_text_from_pdf(pdf_buffer: bytes) -> str:
    """
    Extract text from PDF using pypdf
    """
    try:
        # Create a BytesIO object from the buffer
        pdf_stream = BytesIO(pdf_buffer)
        
        # Read PDF with pypdf
        reader = PdfReader(pdf_stream)
        
        text_content = []
        for page_num, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    text_content.append(f"--- Page {page_num + 1} ---")
                    text_content.append(page_text)
            except Exception as e:
                print(f"Error extracting text from page {page_num + 1}: {e}")
                text_content.append(f"--- Page {page_num + 1} --- [Text extraction failed]")
        
        full_text = "\n".join(text_content)
        print(f"Successfully extracted {len(full_text)} characters from {len(reader.pages)} pages")
        return full_text
        
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return f"[PDF text extraction failed: {str(e)}]"

def convert_pdf_to_image(pdf_buffer: bytes, page_number: int = 0) -> str:
    """
    Convert PDF to image using pdf2image
    Returns base64 encoded PNG image
    """
    try:
        # Convert PDF to images
        images = convert_from_bytes(
            pdf_buffer,
            first_page=page_number + 1,
            last_page=page_number + 1,
            dpi=150,  # Good quality for OCR
            fmt='PNG'
        )
        
        if not images:
            raise Exception("No images generated from PDF")
        
        # Get the first page image
        image = images[0]
        
        # Convert to base64
        buffer = BytesIO()
        image.save(buffer, format='PNG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        print(f"Successfully converted PDF page {page_number + 1} to image ({len(image_base64)} chars base64)")
        return image_base64
        
    except Exception as e:
        print(f"Error converting PDF to image: {e}")
        # Create a fallback image
        fallback_image = Image.new('RGB', (400, 200), color='white')
        buffer = BytesIO()
        fallback_image.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

def process_pdf(pdf_buffer: bytes) -> Dict[str, Any]:
    """
    Main function to process PDF and return both text and image
    """
    try:
        print("=== PYTHON PDF PROCESSING START ===")
        print(f"Processing PDF buffer of {len(pdf_buffer)} bytes")
        
        # Extract text
        extracted_text = extract_text_from_pdf(pdf_buffer)
        
        # Convert to image
        image_base64 = convert_pdf_to_image(pdf_buffer)
        
        result = {
            "success": True,
            "text": extracted_text,
            "image_base64": image_base64,
            "text_length": len(extracted_text),
            "image_size": len(image_base64)
        }
        
        print("=== PYTHON PDF PROCESSING COMPLETE ===")
        return result
        
    except Exception as e:
        print(f"Error in PDF processing: {e}")
        return {
            "success": False,
            "error": str(e),
            "text": f"[PDF processing failed: {str(e)}]",
            "image_base64": "",
            "text_length": 0,
            "image_size": 0
        }

def main():
    """
    Main entry point for command line usage
    Expects base64 encoded PDF data from stdin
    Returns JSON result to stdout
    """
    try:
        # Read base64 PDF data from stdin
        pdf_base64 = sys.stdin.read().strip()
        pdf_buffer = base64.b64decode(pdf_base64)
        
        # Process the PDF
        result = process_pdf(pdf_buffer)
        
        # Output JSON result
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "text": f"[Processing failed: {str(e)}]",
            "image_base64": "",
            "text_length": 0,
            "image_size": 0
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    main() 