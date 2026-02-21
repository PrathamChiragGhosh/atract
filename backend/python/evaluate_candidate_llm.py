#!/usr/bin/env python3
"""
Stage 2: Hugging Face LLM-Based Qualitative Evaluation
Uses free Hugging Face models for deep semantic resume-to-job matching
Evaluates: skill match, role relevance, career progression, freshness
"""

import json
import sys
import os
from typing import Dict, Any, List
from datetime import datetime
import re

# Try to import transformers
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
    import torch
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False
    print("Warning: Transformers not available. Using rule-based evaluation.", file=sys.stderr)

# Model cache
_llm_pipeline = None

def get_llm_pipeline():
    """Load Hugging Face LLM pipeline (cached)"""
    global _llm_pipeline
    
    if _llm_pipeline is not None:
        return _llm_pipeline
    
    if not HAS_TRANSFORMERS:
        return None
    
    try:
        # Use a free, lightweight model
        # Options:
        # - 'microsoft/DialoGPT-small' (fast, conversational)
        # - 'gpt2' (very fast, but lower quality)
        # - 'facebook/opt-125m' (balanced)
        # - 'EleutherAI/gpt-neo-125M' (better quality)
        model_name = os.getenv('HF_LLM_MODEL', 'gpt2')
        
        # Use CPU by default (set CUDA_VISIBLE_DEVICES=0 for GPU)
        device = 0 if torch.cuda.is_available() else -1
        
        # Load tokenizer and model
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(model_name)
        
        # Create pipeline
        _llm_pipeline = pipeline(
            'text-generation',
            model=model,
            tokenizer=tokenizer,
            device=device,
            max_length=512,
            do_sample=True,
            temperature=0.7,
            top_p=0.9
        )
        
        print(f"Loaded LLM model: {model_name} on {'GPU' if device >= 0 else 'CPU'}", file=sys.stderr)
        return _llm_pipeline
    except Exception as e:
        print(f"Failed to load LLM: {e}", file=sys.stderr)
        return None

def build_evaluation_prompt(candidate: Dict[str, Any], job: Dict[str, Any]) -> str:
    """Build prompt for LLM evaluation"""
    prompt = f"""Evaluate this candidate for the job position.

JOB REQUIREMENTS:
Title: {job.get('jobName', 'N/A')}
Requirements: {job.get('jobRequirements', 'N/A')}
Required Skills: {', '.join(job.get('keySkills', []))}
Experience: {job.get('workExperience', 'N/A')}
Location: {job.get('location', 'N/A')}

CANDIDATE PROFILE:
Name: {candidate.get('name', 'N/A')}
Current Role: {candidate.get('currentRole', 'N/A')}
Experience: {candidate.get('experience', 'N/A')}
Skills: {candidate.get('skills', 'N/A')[:500]}
Qualification: {candidate.get('qualification', 'N/A')}
Location: {candidate.get('location', 'N/A')}
Vector Similarity Score: {candidate.get('vectorSimilarity', 0):.1f}/100
Freshness Score: {candidate.get('freshnessScore', 0):.1f}/100

EVALUATION CRITERIA:
1. Skill Match (0-100): How well do candidate skills match job requirements?
2. Role Relevance (0-100): How relevant is candidate's experience to the role?
3. Career Progression (0-100): Does candidate show growth and progression?
4. Overall Fit (0-100): Overall match quality
5. Should Reject (true/false): Is candidate clearly unsuitable?

Provide evaluation in JSON format:
{{
  "skillMatch": <number>,
  "roleRelevance": <number>,
  "careerProgression": <number>,
  "overallFit": <number>,
  "shouldReject": <boolean>,
  "explanation": "<brief explanation>"
}}
"""
    return prompt

def evaluate_with_llm(candidate: Dict[str, Any], job: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluate candidate using LLM"""
    pipeline = get_llm_pipeline()
    
    if pipeline is None:
        return evaluate_rule_based(candidate, job)
    
    try:
        prompt = build_evaluation_prompt(candidate, job)
        
        # Generate response
        response = pipeline(
            prompt,
            max_length=len(prompt.split()) + 200,
            num_return_sequences=1,
            truncation=True
        )[0]['generated_text']
        
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            evaluation = json.loads(json_match.group(0))
        else:
            # Fallback to rule-based
            return evaluate_rule_based(candidate, job)
        
        # Calculate final match score
        final_score = (
            evaluation.get('skillMatch', 0) * 0.4 +
            evaluation.get('roleRelevance', 0) * 0.3 +
            evaluation.get('careerProgression', 0) * 0.2 +
            evaluation.get('overallFit', 0) * 0.1
        )
        
        return {
            'matchScore': round(final_score, 2),
            'freshnessScore': candidate.get('freshnessScore', 0),
            'keyMatchingSkills': candidate.get('keyMatchingSkills', []),
            'explanation': evaluation.get('explanation', 'LLM evaluation completed'),
            'skillMatch': evaluation.get('skillMatch', 0),
            'roleRelevance': evaluation.get('roleRelevance', 0),
            'careerProgression': evaluation.get('careerProgression', 0),
            'overallFit': evaluation.get('overallFit', 0),
            'shouldReject': evaluation.get('shouldReject', False)
        }
        
    except Exception as e:
        print(f"LLM evaluation error: {e}", file=sys.stderr)
        return evaluate_rule_based(candidate, job)

def evaluate_rule_based(candidate: Dict[str, Any], job: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback rule-based evaluation"""
    # Use vector similarity as base
    base_score = candidate.get('vectorSimilarity', 0)
    
    # Adjust based on skills match
    candidate_skills = (candidate.get('skills', '') or '').lower()
    job_skills = [s.lower() for s in job.get('keySkills', [])]
    
    skill_matches = sum(1 for js in job_skills if js in candidate_skills)
    skill_match_score = (skill_matches / max(len(job_skills), 1)) * 100 if job_skills else 50
    
    # Role relevance (simple text similarity)
    candidate_role = (candidate.get('currentRole', '') or '').lower()
    job_title = (job.get('jobName', '') or '').lower()
    role_relevance = 50  # Default
    if candidate_role and job_title:
        # Simple keyword overlap
        candidate_words = set(candidate_role.split())
        job_words = set(job_title.split())
        overlap = len(candidate_words & job_words) / max(len(job_words), 1)
        role_relevance = overlap * 100
    
    # Career progression (based on experience)
    experience = candidate.get('experience', '')
    career_progression = 50  # Default
    if experience:
        # Look for progression indicators
        if any(word in experience.lower() for word in ['senior', 'lead', 'manager', 'director']):
            career_progression = 80
        elif any(word in experience.lower() for word in ['junior', 'intern', 'entry']):
            career_progression = 30
    
    # Overall fit
    overall_fit = (base_score + skill_match_score + role_relevance) / 3
    
    # Should reject if score is very low
    should_reject = overall_fit < 30
    
    return {
        'matchScore': round(overall_fit, 2),
        'freshnessScore': candidate.get('freshnessScore', 0),
        'keyMatchingSkills': candidate.get('keyMatchingSkills', []),
        'explanation': f"Rule-based evaluation: Skill match {skill_match_score:.1f}%, Role relevance {role_relevance:.1f}%, Overall fit {overall_fit:.1f}%",
        'skillMatch': round(skill_match_score, 2),
        'roleRelevance': round(role_relevance, 2),
        'careerProgression': round(career_progression, 2),
        'overallFit': round(overall_fit, 2),
        'shouldReject': should_reject
    }

def main():
    """Main function"""
    try:
        input_data = json.load(sys.stdin)
        
        candidate = input_data.get('candidate', {})
        job = input_data.get('job', {})
        
        if not candidate or not job:
            print(json.dumps({'success': False, 'error': 'Missing candidate or job data'}), file=sys.stderr)
            sys.exit(1)
        
        # Evaluate candidate
        evaluation = evaluate_with_llm(candidate, job)
        
        result = {
            'success': True,
            'matchScore': evaluation['matchScore'],
            'freshnessScore': evaluation['freshnessScore'],
            'keyMatchingSkills': evaluation['keyMatchingSkills'],
            'explanation': evaluation['explanation'],
            'skillMatch': evaluation['skillMatch'],
            'roleRelevance': evaluation['roleRelevance'],
            'careerProgression': evaluation['careerProgression'],
            'overallFit': evaluation['overallFit'],
            'shouldReject': evaluation['shouldReject']
        }
        
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({'success': False, 'error': f'Invalid JSON: {str(e)}'}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'success': False, 'error': f'Evaluation error: {str(e)}'}), file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

