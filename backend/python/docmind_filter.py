#!/usr/bin/env python3
"""
DocMind AI Integration for Resume-to-Job Matching
Uses DocMind AI to filter resumes that most match with job description
"""

import json
import sys
import os
from typing import List, Dict, Any, Optional
import requests

# Try to import requests
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("Warning: requests library not found. Install with: pip install requests", file=sys.stderr)

def get_docmind_config():
    """Get DocMind AI configuration from environment"""
    return {
        'base_url': os.getenv('DOCMIND_API_URL', os.getenv('DOCMIND_BASE_URL', 'http://localhost:8000')),
        'api_key': os.getenv('DOCMIND_API_KEY', ''),
        'enabled': os.getenv('SMART_FILTER_USE_DOCMIND', 'false').lower() == 'true' or os.getenv('USE_DOCMIND', 'false').lower() == 'true',
        'timeout': int(os.getenv('DOCMIND_TIMEOUT', '60'))
    }

def check_docmind_availability():
    """Check if DocMind AI service is available"""
    config = get_docmind_config()
    
    if not config['enabled']:
        return False
    
    if not HAS_REQUESTS:
        return False
    
    try:
        headers = {}
        if config['api_key']:
            headers['Authorization'] = f"Bearer {config['api_key']}"
        
        response = requests.get(
            f"{config['base_url']}/health",
            headers=headers,
            timeout=5
        )
        return response.status_code == 200
    except Exception as e:
        print(f"DocMind AI not available: {e}", file=sys.stderr)
        return False

def build_resume_text(candidate: Dict[str, Any]) -> str:
    """Build comprehensive resume text from candidate data"""
    parts = []
    
    if candidate.get('name'):
        parts.append(f"Name: {candidate['name']}")
    if candidate.get('email'):
        parts.append(f"Email: {candidate['email']}")
    if candidate.get('mobile'):
        parts.append(f"Mobile: {candidate['mobile']}")
    if candidate.get('currentRole'):
        parts.append(f"Current Role: {candidate['currentRole']}")
    if candidate.get('experience'):
        parts.append(f"Experience: {candidate['experience']}")
    if candidate.get('skills'):
        parts.append(f"Skills: {candidate['skills']}")
    if candidate.get('qualification'):
        parts.append(f"Qualification: {candidate['qualification']}")
    if candidate.get('location'):
        parts.append(f"Location: {candidate['location']}")
    if candidate.get('extractedText'):
        parts.append(f"\nResume Content:\n{candidate['extractedText']}")
    
    return "\n".join(parts)

def build_job_description(job: Dict[str, Any]) -> str:
    """Build comprehensive job description from job data"""
    parts = []
    
    if job.get('jobName'):
        parts.append(f"Job Title: {job['jobName']}")
    if job.get('jobRequirements'):
        parts.append(f"Requirements: {job['jobRequirements']}")
    if job.get('keySkills'):
        skills = job['keySkills'] if isinstance(job['keySkills'], list) else [job['keySkills']]
        parts.append(f"Required Skills: {', '.join(skills)}")
    if job.get('workExperience'):
        parts.append(f"Experience Required: {job['workExperience']}")
    if job.get('location'):
        parts.append(f"Location: {job['location']}")
    if job.get('age'):
        parts.append(f"Age Requirement: {job['age']}")
    if job.get('gender'):
        parts.append(f"Gender: {job['gender']}")
    if job.get('salary'):
        parts.append(f"Salary: {job['salary']}")
    
    return "\n".join(parts)

def match_resume_with_job_docmind(resume_text: str, job_description: str, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Match resume with job description using DocMind AI"""
    if not HAS_REQUESTS:
        return None
    
    try:
        endpoint = f"{config['base_url']}/api/match"
        
        payload = {
            'resume_text': resume_text,
            'job_description': job_description,
            'return_explanation': True,
            'return_entities': True
        }
        
        headers = {
            'Content-Type': 'application/json'
        }
        
        if config['api_key']:
            headers['Authorization'] = f"Bearer {config['api_key']}"
        
        response = requests.post(
            endpoint,
            json=payload,
            headers=headers,
            timeout=config['timeout']
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"DocMind API error: {response.status_code} - {response.text}", file=sys.stderr)
            return None
            
    except Exception as e:
        print(f"DocMind matching error: {e}", file=sys.stderr)
        return None

def score_candidate_with_docmind(candidate: Dict[str, Any], job: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """Score candidate using DocMind AI"""
    resume_text = build_resume_text(candidate)
    job_description = build_job_description(job)
    
    match_result = match_resume_with_job_docmind(resume_text, job_description, config)
    
    if not match_result:
        # Fallback: return candidate with default score
        return {
            'matchScore': candidate.get('matchScore', 0),
            'explanation': 'DocMind AI analysis unavailable',
            'keyMatchingSkills': candidate.get('keyMatchingSkills', []),
            'matchDetails': candidate.get('matchDetails', {})
        }
    
    # Extract match score and details
    match_score = match_result.get('match_score') or match_result.get('score') or 0
    explanation = match_result.get('explanation') or match_result.get('reasoning') or ''
    matched_entities = match_result.get('matched_entities') or match_result.get('entities') or {}
    key_matching_skills = match_result.get('matched_skills') or match_result.get('skills') or []
    
    # Normalize score to 0-100
    if isinstance(match_score, float) and match_score <= 1.0:
        match_score = match_score * 100
    
    return {
        'matchScore': min(100, max(0, round(match_score))),
        'explanation': explanation,
        'keyMatchingSkills': key_matching_skills if isinstance(key_matching_skills, list) else [],
        'matchDetails': {
            'skillsMatch': matched_entities.get('skills_match', 0),
            'experienceMatch': matched_entities.get('experience_match', False),
            'educationMatch': matched_entities.get('education_match', False),
            'locationMatch': matched_entities.get('location_match', False),
            'overallFit': explanation
        },
        'docMindAnalysis': matched_entities
    }

def filter_candidates_with_docmind(candidates: List[Dict[str, Any]], job: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Filter candidates using DocMind AI for resume-to-job matching
    
    Args:
        candidates: List of candidate objects
        job: Job requirements object
    
    Returns:
        Filtered and scored candidates sorted by match score
    """
    config = get_docmind_config()
    
    if not config['enabled']:
        print("DocMind AI is not enabled", file=sys.stderr)
        return candidates
    
    if not check_docmind_availability():
        print("DocMind AI service is not available", file=sys.stderr)
        return candidates
    
    print(f"DocMind AI: Processing {len(candidates)} candidates...", file=sys.stderr)
    
    scored_candidates = []
    
    for i, candidate in enumerate(candidates):
        try:
            scoring = score_candidate_with_docmind(candidate, job, config)
            
            scored_candidate = {
                **candidate,
                'matchScore': scoring['matchScore'],
                'explanation': scoring['explanation'],
                'keyMatchingSkills': scoring['keyMatchingSkills'],
                'matchDetails': scoring['matchDetails'],
                'docMindAnalysis': scoring.get('docMindAnalysis', {})
            }
            
            scored_candidates.append(scored_candidate)
            
            if (i + 1) % 10 == 0:
                print(f"  Processed {i + 1}/{len(candidates)} candidates...", file=sys.stderr)
                
        except Exception as e:
            print(f"Error processing candidate {i + 1}: {e}", file=sys.stderr)
            # Include candidate with original score if available
            scored_candidates.append(candidate)
    
    # Sort by match score (descending)
    scored_candidates.sort(key=lambda x: x.get('matchScore', 0), reverse=True)
    
    print(f"DocMind AI: Completed processing {len(scored_candidates)} candidates", file=sys.stderr)
    
    return scored_candidates

def main():
    """Main function"""
    try:
        input_data = json.load(sys.stdin)
        
        candidates = input_data.get('candidates', [])
        job = input_data.get('job', {})
        
        if not candidates:
            print(json.dumps({
                'success': False,
                'error': 'No candidates provided'
            }), file=sys.stderr)
            sys.exit(1)
        
        if not job:
            print(json.dumps({
                'success': False,
                'error': 'No job requirements provided'
            }), file=sys.stderr)
            sys.exit(1)
        
        # Filter candidates using DocMind AI
        filtered_candidates = filter_candidates_with_docmind(candidates, job)
        
        result = {
            'success': True,
            'totalCandidates': len(candidates),
            'filteredCount': len(filtered_candidates),
            'candidates': filtered_candidates
        }
        
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            'success': False,
            'error': f'Invalid JSON input: {str(e)}'
        }), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': f'DocMind filtering error: {str(e)}'
        }), file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

