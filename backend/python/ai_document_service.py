#!/usr/bin/env python3
"""
Production-Grade Python AI Document Service
Uses Spire.Doc, pdfplumber, unstructured, layoutparser for document parsing
Implements AI-powered candidate filtering with high accuracy matching
"""

import json
import sys
import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import traceback

# ========== DOCUMENT PARSING LIBRARIES ==========

# Spire libraries (primary)
try:
    from spire.doc import Document as SpireWordDocument
    from spire.xls import Workbook as SpireWorkbook
    HAS_SPIRE_DOC = True
except ImportError:
    HAS_SPIRE_DOC = False
    print("Warning: Spire.Doc/Xls not available", file=sys.stderr)

try:
    from spire.pdf import PdfDocument, PdfTextExtractOptions, PdfTextExtractor
    HAS_SPIRE_PDF = True
except ImportError:
    HAS_SPIRE_PDF = False

# pdfplumber (excellent for PDFs)
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    print("Warning: pdfplumber not available", file=sys.stderr)

# unstructured (for advanced document parsing)
try:
    from unstructured.partition.auto import partition
    from unstructured.chunking.title import chunk_by_title
    HAS_UNSTRUCTURED = True
except ImportError:
    HAS_UNSTRUCTURED = False
    print("Warning: unstructured not available", file=sys.stderr)

# layoutparser (for document layout analysis)
try:
    import layoutparser as lp
    HAS_LAYOUTPARSER = True
except ImportError:
    HAS_LAYOUTPARSER = False
    print("Warning: layoutparser not available", file=sys.stderr)

# Fallback libraries
try:
    import PyPDF2
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

# ========== AI/ML LIBRARIES ==========

try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    HAS_EMBEDDINGS = True
except ImportError:
    HAS_EMBEDDINGS = False
    print("Warning: sentence-transformers not available", file=sys.stderr)

try:
    import faiss
    HAS_FAISS = True
except ImportError:
    HAS_FAISS = False

# ========== GLOBAL MODELS ==========

_embedding_model = None
_faiss_index = None

def get_embedding_model():
    """Load and cache embedding model"""
    global _embedding_model
    if _embedding_model is None and HAS_EMBEDDINGS:
        try:
            model_name = os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
            _embedding_model = SentenceTransformer(model_name)
            print(f"Loaded embedding model: {model_name}", file=sys.stderr)
        except Exception as e:
            print(f"Failed to load embedding model: {e}", file=sys.stderr)
    return _embedding_model

# ========== DOCUMENT EXTRACTION FUNCTIONS ==========

def extract_text_from_pdf_advanced(file_path: str) -> Dict[str, Any]:
    """
    Advanced PDF extraction using multiple methods
    Returns structured data with text, metadata, and layout information
    """
    result = {
        'text': '',
        'metadata': {},
        'pages': [],
        'tables': [],
        'method': 'unknown'
    }
    
    # Method 1: Try unstructured (best for structured extraction)
    if HAS_UNSTRUCTURED:
        try:
            elements = partition(filename=file_path)
            text_parts = []
            for element in elements:
                if hasattr(element, 'text') and element.text:
                    text_parts.append(element.text)
            
            if text_parts:
                result['text'] = '\n'.join(text_parts)
                result['method'] = 'unstructured'
                result['metadata'] = {
                    'element_count': len(elements),
                    'has_tables': any(hasattr(e, 'type') and 'table' in str(e.type).lower() for e in elements)
                }
                return result
        except Exception as e:
            print(f"Unstructured extraction failed: {e}, trying pdfplumber...", file=sys.stderr)
    
    # Method 2: Try pdfplumber (excellent text extraction)
    if HAS_PDFPLUMBER:
        try:
            with pdfplumber.open(file_path) as pdf:
                full_text = []
                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        full_text.append(page_text)
                        result['pages'].append({
                            'page_num': i + 1,
                            'text': page_text,
                            'chars': len(page_text)
                        })
                    
                    # Extract tables
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            result['tables'].append({
                                'page': i + 1,
                                'rows': len(table),
                                'data': table
                            })
                
                if full_text:
                    result['text'] = '\n'.join(full_text)
                    result['method'] = 'pdfplumber'
                    result['metadata'] = {
                        'total_pages': len(pdf.pages),
                        'has_tables': len(result['tables']) > 0
                    }
                    return result
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}, trying Spire...", file=sys.stderr)
    
    # Method 3: Try Spire PDF
    if HAS_SPIRE_PDF:
        try:
            pdf_doc = PdfDocument()
            pdf_doc.LoadFromFile(file_path)
            extractOptions = PdfTextExtractOptions()
            extractOptions.IsExtractAllText = True
            
            text_parts = []
            for i in range(pdf_doc.Pages.Count):
                page = pdf_doc.Pages.get_Item(i)
                page_text = PdfTextExtractor(page).ExtractText(extractOptions)
                if page_text:
                    text_parts.append(page_text)
            
            pdf_doc.Close()
            
            if text_parts:
                result['text'] = '\n'.join(text_parts)
                result['method'] = 'spire'
                result['metadata'] = {'total_pages': len(text_parts)}
                return result
        except Exception as e:
            print(f"Spire PDF extraction failed: {e}, trying PyPDF2...", file=sys.stderr)
    
    # Method 4: Fallback to PyPDF2
    if HAS_PYPDF2:
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_parts = []
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                
                if text_parts:
                    result['text'] = '\n'.join(text_parts)
                    result['method'] = 'pypdf2'
                    return result
        except Exception as e:
            print(f"PyPDF2 extraction failed: {e}", file=sys.stderr)
    
    raise Exception("Failed to extract text from PDF with any available method")

def extract_text_from_word_advanced(file_path: str) -> Dict[str, Any]:
    """Advanced Word document extraction"""
    result = {
        'text': '',
        'metadata': {},
        'tables': [],
        'method': 'unknown'
    }
    
    # Try Spire first (handles .doc and .docx)
    if HAS_SPIRE_DOC:
        try:
            doc = SpireWordDocument()
            doc.LoadFromFile(file_path)
            text = doc.GetText()
            doc.Close()
            
            if text:
                result['text'] = text.strip()
                result['method'] = 'spire'
                return result
        except Exception as e:
            print(f"Spire Word extraction failed: {e}, trying python-docx...", file=sys.stderr)
    
    # Fallback to python-docx
    if HAS_DOCX:
        try:
            doc = Document(file_path)
            text_parts = []
            
            # Extract paragraphs
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)
            
            # Extract tables
            for table in doc.tables:
                table_data = []
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells]
                    table_data.append(row_data)
                if table_data:
                    result['tables'].append(table_data)
                    # Add table text to main text
                    for row in table_data:
                        text_parts.append(' | '.join(row))
            
            if text_parts:
                result['text'] = '\n'.join(text_parts)
                result['method'] = 'python-docx'
                result['metadata'] = {'table_count': len(result['tables'])}
                return result
        except Exception as e:
            raise Exception(f"Failed to extract Word document: {e}")
    
    raise Exception("No Word parsing library available")

def extract_data_from_excel_advanced(file_path: str) -> Dict[str, Any]:
    """Advanced Excel extraction with structure preservation"""
    result = {
        'candidates': [],
        'headers': [],
        'metadata': {},
        'method': 'unknown'
    }
    
    # Try Spire XLS first
    if HAS_SPIRE_DOC:
        try:
            workbook = SpireWorkbook()
            workbook.LoadFromFile(file_path)
            sheet = workbook.Worksheets[0]
            
            headers = []
            max_cols = sheet.LastColumn
            header_row = 1
            
            # Read headers
            for col in range(1, max_cols + 1):
                cell_value = sheet.Range[header_row, col].Value
                headers.append(str(cell_value) if cell_value else f'Column{col}')
            
            # Read data
            candidates = []
            max_rows = sheet.LastRow
            for row in range(header_row + 1, max_rows + 1):
                candidate = {}
                for col_idx, header in enumerate(headers, 1):
                    cell_value = sheet.Range[row, col_idx].Value
                    candidate[header] = str(cell_value) if cell_value else ''
                
                if any(candidate.values()):
                    candidates.append(candidate)
            
            workbook.Dispose()
            
            result['candidates'] = candidates
            result['headers'] = headers
            result['method'] = 'spire'
            result['metadata'] = {
                'total_rows': len(candidates),
                'total_columns': len(headers)
            }
            return result
        except Exception as e:
            print(f"Spire Excel extraction failed: {e}, trying pandas...", file=sys.stderr)
    
    # Fallback to pandas
    if HAS_PANDAS:
        try:
            if file_path.endswith('.xlsx'):
                df = pd.read_excel(file_path, engine='openpyxl')
            else:
                df = pd.read_excel(file_path, engine='xlrd')
            
            candidates = df.to_dict('records')
            for candidate in candidates:
                for key, value in candidate.items():
                    candidate[key] = str(value) if pd.notna(value) else ''
            
            result['candidates'] = candidates
            result['headers'] = list(df.columns)
            result['method'] = 'pandas'
            result['metadata'] = {
                'total_rows': len(candidates),
                'total_columns': len(df.columns)
            }
            return result
        except Exception as e:
            raise Exception(f"Failed to extract Excel data: {e}")
    
    raise Exception("No Excel parsing library available")

# ========== AI-POWERED FILTERING ==========

def extract_candidate_fields(text: str) -> Dict[str, Any]:
    """Extract structured fields from candidate text using regex and patterns"""
    candidate = {
        'name': '',
        'email': '',
        'mobile': '',
        'age': '',
        'experience': '',
        'skills': '',
        'location': '',
        'qualification': '',
        'currentRole': '',
        'noticePeriod': '',
        'salary': '',
        'extractedText': text
    }
    
    # Extract email
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    if email_match:
        candidate['email'] = email_match.group(0)
    
    # Extract phone (Indian format: 10 digits, may have +91)
    phone_patterns = [
        r'\b\+?91[-.\s]?[6-9]\d{9}\b',  # Indian format
        r'\b\d{10}\b',  # 10 digits
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b'  # US format
    ]
    for pattern in phone_patterns:
        phone_match = re.search(pattern, text)
        if phone_match:
            candidate['mobile'] = phone_match.group(0).replace(' ', '').replace('-', '')
            break
    
    # Extract name (usually first line or before email)
    lines = text.split('\n')[:10]
    for line in lines:
        line = line.strip()
        if line and '@' not in line and not line.isdigit() and len(line) > 3:
            # Check if it looks like a name (2-4 words, capitalized)
            words = line.split()
            if 2 <= len(words) <= 4 and all(w[0].isupper() if w else False for w in words if w):
                candidate['name'] = line
                break
    
    # Extract experience
    exp_patterns = [
        r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)',
        r'experience[:\s]+(\d+)\+?\s*(?:years?|yrs?)',
        r'(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?experience'
    ]
    for pattern in exp_patterns:
        exp_match = re.search(pattern, text, re.IGNORECASE)
        if exp_match:
            if len(exp_match.groups()) == 2:
                candidate['experience'] = f"{exp_match.group(1)}-{exp_match.group(2)} years"
            else:
                candidate['experience'] = f"{exp_match.group(1)} years"
            break
    
    # Extract skills (common tech skills)
    skill_keywords = [
        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue',
        'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'AWS', 'Azure', 'Docker',
        'Kubernetes', 'Git', 'HTML', 'CSS', 'TypeScript', 'C++', 'C#',
        'Machine Learning', 'AI', 'Data Science', 'DevOps', 'Agile', 'Scrum'
    ]
    found_skills = [skill for skill in skill_keywords if skill.lower() in text.lower()]
    candidate['skills'] = ', '.join(found_skills[:15])  # Top 15 skills
    
    # Extract location (Indian cities)
    indian_cities = [
        'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai',
        'Kolkata', 'Gurgaon', 'Noida', 'Ahmedabad', 'Jaipur', 'Kochi'
    ]
    for city in indian_cities:
        if city.lower() in text.lower():
            candidate['location'] = city
            break
    
    return candidate

def calculate_ai_match_score(candidate_text: str, job_text: str, candidate_data: Dict[str, Any] = None) -> Dict[str, float]:
    """
    Comprehensive AI-powered match score calculation
    Compares candidate with job description using multiple methods
    """
    candidate_data = candidate_data or {}
    job_data = job_data or {}
    candidate_lower = candidate_text.lower()
    job_lower = job_text.lower()
    
    # Get job fields from job_data if available
    job_location = job_data.get('location', '').lower()
    job_title = job_data.get('jobTitle', '').lower()
    job_qual = job_data.get('qualification', '').lower()
    
    # ========== 1. SEMANTIC SIMILARITY (AI Embeddings) ==========
    semantic_score = 0.0
    if HAS_EMBEDDINGS:
        try:
            model = get_embedding_model()
            if model:
                candidate_embedding = model.encode(candidate_text, convert_to_numpy=True, show_progress_bar=False)
                job_embedding = model.encode(job_text, convert_to_numpy=True, show_progress_bar=False)
                similarity = cosine_similarity(
                    candidate_embedding.reshape(1, -1),
                    job_embedding.reshape(1, -1)
                )[0][0]
                semantic_score = float(similarity * 100)
        except Exception as e:
            print(f"Embedding calculation error: {e}", file=sys.stderr)
    
    # Fallback to text similarity if embeddings fail
    if semantic_score == 0:
        from difflib import SequenceMatcher
        semantic_score = SequenceMatcher(None, candidate_lower, job_lower).ratio() * 100
    
    # ========== 2. SKILL MATCHING ==========
    # Comprehensive skill list
    all_skills = [
        'javascript', 'python', 'java', 'react', 'node.js', 'angular', 'vue', 'typescript',
        'sql', 'mongodb', 'postgresql', 'mysql', 'oracle', 'redis',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
        'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind',
        'c++', 'c#', '.net', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin',
        'machine learning', 'ai', 'data science', 'deep learning', 'tensorflow', 'pytorch',
        'devops', 'ci/cd', 'agile', 'scrum', 'jira', 'confluence',
        'rest api', 'graphql', 'microservices', 'spring', 'django', 'flask', 'express'
    ]
    
    candidate_skills_found = [s for s in all_skills if s in candidate_lower]
    job_skills_found = [s for s in all_skills if s in job_lower]
    
    # Also check structured skills field
    if candidate_data.get('skills'):
        candidate_skills_str = candidate_data['skills'].lower()
        candidate_skills_found.extend([s for s in all_skills if s in candidate_skills_str])
    
    # Calculate skill match ratio
    if job_skills_found:
        matching_skills = set(candidate_skills_found) & set(job_skills_found)
        skill_match = (len(matching_skills) / len(job_skills_found)) * 100
    else:
        skill_match = 50.0  # Default if no skills in job description
    
    # ========== 3. EXPERIENCE MATCHING ==========
    exp_match = 50.0  # Default
    
    # Extract experience from candidate
    candidate_exp = candidate_data.get('experience', '') or ''
    candidate_exp_lower = candidate_exp.lower()
    
    # Extract experience requirement from job
    job_exp = ''
    exp_patterns = [
        r'(\d+)\+?\s*(?:years?|yrs?|year|yr)',
        r'(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)',
        r'experience[:\s]+(\d+)'
    ]
    
    for pattern in exp_patterns:
        match = re.search(pattern, job_lower)
        if match:
            if len(match.groups()) == 2:
                job_exp = f"{match.group(1)}-{match.group(2)}"
            else:
                job_exp = match.group(1)
            break
    
    # Compare experience
    if candidate_exp and job_exp:
        try:
            # Extract years from candidate
            candidate_years_match = re.search(r'(\d+)', candidate_exp_lower)
            job_years_match = re.search(r'(\d+)', job_exp)
            
            if candidate_years_match and job_years_match:
                candidate_years = int(candidate_years_match.group(1))
                job_years = int(job_years_match.group(1))
                
                if candidate_years >= job_years:
                    exp_match = 100.0
                else:
                    exp_match = (candidate_years / job_years) * 100
        except:
            pass
    
    # ========== 4. LOCATION MATCHING ==========
    location_match = 50.0  # Default
    candidate_location = candidate_data.get('location', '').lower()
    # Get location from job_data or extract from job text
    if not job_location:
        location_patterns = [r'location[:\s]+([A-Za-z\s,]+)', r'based in ([A-Za-z\s]+)', r'([A-Za-z]+),?\s+(?:Karnataka|Maharashtra|Delhi|Tamil Nadu)']
        for pattern in location_patterns:
            match = re.search(pattern, job_lower)
            if match:
                job_location = match.group(1).lower()
                break
    
    if candidate_location and job_location:
        if candidate_location in job_location or job_location in candidate_location:
            location_match = 100.0
        else:
            # Check for city matches
            cities = ['bangalore', 'mumbai', 'delhi', 'pune', 'hyderabad', 'chennai']
            if any(city in candidate_location for city in cities) and any(city in job_location for city in cities):
                location_match = 75.0
    
    # ========== 5. ROLE/TITLE MATCHING ==========
    role_match = 50.0
    candidate_role = candidate_data.get('currentRole', '').lower()
    # Get job title from job_data or extract from job text
    if not job_title:
        title_patterns = [r'job title[:\s]+([A-Za-z\s]+)', r'position[:\s]+([A-Za-z\s]+)', r'role[:\s]+([A-Za-z\s]+)']
        for pattern in title_patterns:
            match = re.search(pattern, job_lower)
            if match:
                job_title = match.group(1).lower()
                break
    
    if candidate_role and job_title:
        # Check for common role keywords
        role_keywords = ['developer', 'engineer', 'manager', 'analyst', 'architect', 'lead', 'senior']
        candidate_role_words = [w for w in role_keywords if w in candidate_role]
        job_title_words = [w for w in role_keywords if w in job_title]
        
        if candidate_role_words and job_title_words:
            if set(candidate_role_words) & set(job_title_words):
                role_match = 100.0
            else:
                role_match = 50.0
    
    # ========== 6. QUALIFICATION MATCHING ==========
    qual_match = 50.0
    candidate_qual = candidate_data.get('qualification', '').lower()
    # Get qualification from job_data or extract from job text
    if not job_qual:
        qual_patterns = [r'qualification[:\s]+([A-Za-z\s.]+)', r'degree[:\s]+([A-Za-z\s.]+)', r'education[:\s]+([A-Za-z\s.]+)']
        for pattern in qual_patterns:
            match = re.search(pattern, job_lower)
            if match:
                job_qual = match.group(1).lower()
                break
    
    if candidate_qual and job_qual:
        qual_keywords = ['bachelor', 'master', 'mba', 'phd', 'b.tech', 'm.tech', 'b.com', 'm.com']
        candidate_qual_words = [w for w in qual_keywords if w in candidate_qual]
        job_qual_words = [w for w in qual_keywords if w in job_qual]
        
        if candidate_qual_words and job_qual_words:
            if set(candidate_qual_words) & set(job_qual_words):
                qual_match = 100.0
    
    # ========== COMBINE ALL SCORES ==========
    # Weighted combination
    overall_score = (
        semantic_score * 0.40 +      # 40% - Semantic similarity (most important)
        skill_match * 0.30 +          # 30% - Skills match
        exp_match * 0.15 +            # 15% - Experience match
        location_match * 0.05 +        # 5% - Location match
        role_match * 0.05 +           # 5% - Role match
        qual_match * 0.05             # 5% - Qualification match
    )
    
    return {
        'overall_score': float(overall_score),
        'semantic_similarity': float(semantic_score),
        'skill_match': float(skill_match),
        'experience_match': float(exp_match),
        'location_match': float(location_match),
        'role_match': float(role_match),
        'qualification_match': float(qual_match),
        'matching_skills': list(set(candidate_skills_found) & set(job_skills_found)) if job_skills_found else []
    }

def filter_candidates_ai(candidates: List[Dict[str, Any]], job: Dict[str, Any], 
                         top_percentage: float = 50.0) -> List[Dict[str, Any]]:
    """
    AI-powered candidate filtering
    Uses semantic similarity to find the best matches
    """
    if not candidates:
        return []
    
    # Build job description text
    job_parts = []
    if job.get('jobTitle'):
        job_parts.append(f"Job Title: {job['jobTitle']}")
    if job.get('jobDescription'):
        job_parts.append(job['jobDescription'])
    if job.get('requirements'):
        job_parts.append(f"Requirements: {job['requirements']}")
    if job.get('keySkills') or job.get('skills'):
        skills = job.get('keySkills') or job.get('skills', [])
        if isinstance(skills, list):
            job_parts.append(f"Required Skills: {', '.join(skills)}")
        else:
            job_parts.append(f"Required Skills: {skills}")
    if job.get('workExperience') or job.get('experience'):
        job_parts.append(f"Experience: {job.get('workExperience') or job.get('experience', '')}")
    if job.get('location'):
        job_parts.append(f"Location: {job.get('location')}")
    
    job_text = ' '.join(job_parts)
    
    # Score each candidate
    scored_candidates = []
    for candidate in candidates:
        # Build candidate text
        candidate_text = candidate.get('extractedText', '')
        if not candidate_text:
            # Build from fields
            candidate_parts = []
            if candidate.get('name'):
                candidate_parts.append(f"Name: {candidate['name']}")
            if candidate.get('skills'):
                candidate_parts.append(f"Skills: {candidate['skills']}")
            if candidate.get('experience'):
                candidate_parts.append(f"Experience: {candidate['experience']}")
            if candidate.get('currentRole'):
                candidate_parts.append(f"Current Role: {candidate['currentRole']}")
            candidate_text = ' '.join(candidate_parts) or str(candidate)
        
        # Calculate AI match score
        match_scores = calculate_ai_match_score(candidate_text, job_text, candidate, job)
        
        # Add scores to candidate
        scored_candidate = {
            **candidate,
            'matchScore': match_scores['overall_score'],
            'semanticSimilarity': match_scores['semantic_similarity'],
            'skillMatchScore': match_scores['skill_match'],
            'experienceMatchScore': match_scores['experience_match'],
            'aiMatchDetails': match_scores
        }
        scored_candidates.append(scored_candidate)
    
    # Sort by match score
    scored_candidates.sort(key=lambda x: x.get('matchScore', 0), reverse=True)
    
    # Filter top percentage
    top_count = max(1, int(len(scored_candidates) * (top_percentage / 100.0)))
    filtered = scored_candidates[:top_count]
    
    return filtered

# ========== MAIN PROCESSING FUNCTION ==========

def process_files_with_ai(file_paths: List[str], job: Dict[str, Any], 
                          filter_percentage: float = 50.0) -> Dict[str, Any]:
    """
    Main function: Process files and filter with AI
    Flow:
    1. Extract ALL data from files
    2. Convert to structured JSON
    3. Compare ALL candidates with job description
    4. Filter based on actual match scores
    """
    all_candidates = []
    processed_files = []
    
    print(f"Step 1: Extracting ALL data from {len(file_paths)} file(s)...", file=sys.stderr)
    
    # ========== STEP 1: EXTRACT ALL DATA FROM FILES ==========
    for file_path in file_paths:
        try:
            file_path_obj = Path(file_path)
            if not file_path_obj.exists():
                raise Exception(f"File not found: {file_path}")
            
            file_ext = file_path_obj.suffix.lower()
            file_name = file_path_obj.name
            
            print(f"Extracting from: {file_name}", file=sys.stderr)
            
            if file_ext == '.pdf':
                result = extract_text_from_pdf_advanced(str(file_path_obj))
                # Extract candidate fields
                candidate = extract_candidate_fields(result['text'])
                candidate['sourceFile'] = file_name
                candidate['fileType'] = 'pdf'
                candidate['extractedText'] = result['text']  # Keep full text
                all_candidates.append(candidate)
                
            elif file_ext in ['.docx', '.doc']:
                result = extract_text_from_word_advanced(str(file_path_obj))
                candidate = extract_candidate_fields(result['text'])
                candidate['sourceFile'] = file_name
                candidate['fileType'] = file_ext.lstrip('.')
                candidate['extractedText'] = result['text']  # Keep full text
                all_candidates.append(candidate)
                
            elif file_ext in ['.xlsx', '.xls']:
                result = extract_data_from_excel_advanced(str(file_path_obj))
                # Each row is a candidate
                for excel_candidate in result['candidates']:
                    # Build text from Excel row
                    excel_text = ' '.join([str(v) for v in excel_candidate.values() if v])
                    candidate = extract_candidate_fields(excel_text)
                    # Merge Excel data (preserve original structure)
                    candidate.update(excel_candidate)
                    candidate['sourceFile'] = file_name
                    candidate['fileType'] = file_ext.lstrip('.')
                    candidate['extractedText'] = excel_text  # Keep full text
                    candidate['originalExcelData'] = excel_candidate  # Preserve original
                    all_candidates.append(candidate)
                
            elif file_ext == '.txt':
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
                candidate = extract_candidate_fields(text)
                candidate['sourceFile'] = file_name
                candidate['fileType'] = 'txt'
                candidate['extractedText'] = text  # Keep full text
                all_candidates.append(candidate)
            else:
                raise Exception(f"Unsupported file type: {file_ext}")
            
            processed_files.append({
                'file': file_name,
                'type': file_ext.lstrip('.'),
                'candidates': 1 if file_ext != '.xlsx' and file_ext != '.xls' else len(result.get('candidates', [])),
                'status': 'success'
            })
            
        except Exception as e:
            print(f"Error processing {file_path}: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            processed_files.append({
                'file': Path(file_path).name,
                'type': Path(file_path).suffix,
                'candidates': 0,
                'status': 'error',
                'error': str(e)
            })
    
    if not all_candidates:
        return {
            'success': False,
            'error': 'No candidates extracted from files',
            'processedFiles': processed_files
        }
    
    print(f"Step 1 Complete: Extracted {len(all_candidates)} candidate(s) from all files", file=sys.stderr)
    
    # ========== STEP 2: CONVERT TO STRUCTURED JSON ==========
    print(f"Step 2: Converting extracted data to structured JSON...", file=sys.stderr)
    structured_candidates = []
    for candidate in all_candidates:
        # Ensure all candidates have proper JSON structure
        structured_candidate = {
            'name': candidate.get('name', ''),
            'email': candidate.get('email', ''),
            'mobile': candidate.get('mobile', ''),
            'age': candidate.get('age', ''),
            'gender': candidate.get('gender', ''),
            'experience': candidate.get('experience', ''),
            'skills': candidate.get('skills', ''),
            'location': candidate.get('location', ''),
            'qualification': candidate.get('qualification', ''),
            'currentRole': candidate.get('currentRole', ''),
            'noticePeriod': candidate.get('noticePeriod', ''),
            'salary': candidate.get('salary', ''),
            'sourceFile': candidate.get('sourceFile', ''),
            'fileType': candidate.get('fileType', ''),
            'extractedText': candidate.get('extractedText', ''),
            'originalData': {k: v for k, v in candidate.items() if k not in [
                'name', 'email', 'mobile', 'age', 'gender', 'experience', 'skills',
                'location', 'qualification', 'currentRole', 'noticePeriod', 'salary',
                'sourceFile', 'fileType', 'extractedText'
            ]}
        }
        structured_candidates.append(structured_candidate)
    
    print(f"Step 2 Complete: {len(structured_candidates)} candidates in JSON format", file=sys.stderr)
    
    # ========== STEP 3: COMPARE ALL CANDIDATES WITH JOB DESCRIPTION ==========
    print(f"Step 3: Comparing ALL {len(structured_candidates)} candidates with job description...", file=sys.stderr)
    
    # Build comprehensive job description text
    job_parts = []
    if job.get('jobTitle'):
        job_parts.append(f"Job Title: {job['jobTitle']}")
    if job.get('jobDescription'):
        job_parts.append(f"Job Description: {job['jobDescription']}")
    if job.get('requirements'):
        job_parts.append(f"Requirements: {job['requirements']}")
    if job.get('keySkills') or job.get('skills'):
        skills = job.get('keySkills') or job.get('skills', [])
        if isinstance(skills, list):
            job_parts.append(f"Required Skills: {', '.join(skills)}")
        else:
            job_parts.append(f"Required Skills: {skills}")
    if job.get('workExperience') or job.get('experience'):
        job_parts.append(f"Experience Required: {job.get('workExperience') or job.get('experience', '')}")
    if job.get('location'):
        job_parts.append(f"Location: {job.get('location')}")
    if job.get('qualification'):
        job_parts.append(f"Qualification: {job.get('qualification')}")
    
    job_text = ' '.join(job_parts)
    print(f"Job Description Length: {len(job_text)} characters", file=sys.stderr)
    
    # Compare each candidate with job
    compared_candidates = []
    for idx, candidate in enumerate(structured_candidates, 1):
        try:
            # Build candidate text for comparison
            candidate_text = candidate.get('extractedText', '')
            if not candidate_text or len(candidate_text) < 50:
                # Build from structured fields
                candidate_parts = []
                if candidate.get('name'):
                    candidate_parts.append(f"Name: {candidate['name']}")
                if candidate.get('skills'):
                    candidate_parts.append(f"Skills: {candidate['skills']}")
                if candidate.get('experience'):
                    candidate_parts.append(f"Experience: {candidate['experience']}")
                if candidate.get('currentRole'):
                    candidate_parts.append(f"Current Role: {candidate['currentRole']}")
                if candidate.get('qualification'):
                    candidate_parts.append(f"Qualification: {candidate['qualification']}")
                if candidate.get('location'):
                    candidate_parts.append(f"Location: {candidate['location']}")
                candidate_text = ' '.join(candidate_parts) or str(candidate)
            
            # Calculate comprehensive AI match score with candidate and job data
            match_scores = calculate_ai_match_score(candidate_text, job_text, candidate, job)
            
            # Add comprehensive comparison results to candidate
            compared_candidate = {
                **candidate,
                'matchScore': match_scores['overall_score'],
                'semanticSimilarity': match_scores['semantic_similarity'],
                'skillMatchScore': match_scores['skill_match'],
                'experienceMatchScore': match_scores['experience_match'],
                'locationMatchScore': match_scores['location_match'],
                'roleMatchScore': match_scores['role_match'],
                'qualificationMatchScore': match_scores['qualification_match'],
                'matchingSkills': match_scores.get('matching_skills', []),
                'aiMatchDetails': match_scores,
                'comparisonText': candidate_text[:200] + '...' if len(candidate_text) > 200 else candidate_text,
                'extractedAt': datetime.now().isoformat()
            }
            compared_candidates.append(compared_candidate)
            
            if idx % 10 == 0:
                print(f"Compared {idx}/{len(structured_candidates)} candidates...", file=sys.stderr)
        except Exception as e:
            print(f"Error comparing candidate {idx}: {e}", file=sys.stderr)
            # Add candidate with zero score
            compared_candidates.append({
                **candidate,
                'matchScore': 0,
                'semanticSimilarity': 0,
                'skillMatchScore': 0,
                'experienceMatchScore': 0,
                'error': str(e)
            })
    
    print(f"Step 3 Complete: Compared all {len(compared_candidates)} candidates", file=sys.stderr)
    
    # ========== STEP 4: FILTER BASED ON ACTUAL MATCH SCORES ==========
    print(f"Step 4: Filtering candidates based on match scores (top {filter_percentage}%)...", file=sys.stderr)
    
    # Sort by match score (highest first)
    sorted_candidates = sorted(compared_candidates, key=lambda x: x.get('matchScore', 0), reverse=True)
    
    # Filter top percentage
    top_count = max(1, int(len(sorted_candidates) * (filter_percentage / 100.0)))
    filtered_candidates = sorted_candidates[:top_count]
    
    print(f"Step 4 Complete: Filtered to {len(filtered_candidates)} best matching candidates", file=sys.stderr)
    print(f"Match score range: {filtered_candidates[-1].get('matchScore', 0):.2f} - {filtered_candidates[0].get('matchScore', 0):.2f}", file=sys.stderr)
    
    return {
        'success': True,
        'totalFiles': len(file_paths),
        'totalCandidates': len(all_candidates),
        'comparedCandidates': len(compared_candidates),
        'filteredCandidates': len(filtered_candidates),
        'filterPercentage': filter_percentage,
        'candidates': filtered_candidates,
        'allCandidates': compared_candidates,  # Include all for reference
        'processedFiles': processed_files,
        'jobDescription': job_text[:500] + '...' if len(job_text) > 500 else job_text
    }

# ========== MAIN ENTRY POINT ==========

def main():
    """Main function - expects JSON input from stdin"""
    try:
        input_data = json.load(sys.stdin)
        
        action = input_data.get('action', 'process_and_filter')
        
        if action == 'process_and_filter':
            file_paths = input_data.get('filePaths', [])
            job = input_data.get('job', {})
            filter_percentage = float(input_data.get('filterPercentage', 50.0))
            
            if not file_paths:
                raise ValueError("filePaths required")
            if not job:
                raise ValueError("job requirements required")
            
            result = process_files_with_ai(file_paths, job, filter_percentage)
            print(json.dumps(result))
        
        else:
            raise ValueError(f"Unknown action: {action}")
    
    except json.JSONDecodeError as e:
        print(json.dumps({
            'success': False,
            'error': f'Invalid JSON input: {str(e)}'
        }), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': f'Processing error: {str(e)}',
            'traceback': traceback.format_exc() if os.getenv('DEBUG') else None
        }), file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

