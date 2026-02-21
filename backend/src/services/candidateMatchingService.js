const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const Job = require('../models/job');
const CandidateMatch = require('../models/candidateMatch');
const sendMail = require('../utils/sendMail');

const execAsync = promisify(exec);
const PYTHON_COMMAND = process.env.PYTHON_COMMAND || 'python3';
const PYTHON_SCRIPT_PATH = path.join(__dirname, '../../python/extract_candidate_content.py');
const EVALUATE_SCRIPT_PATH = path.join(__dirname, '../../python/evaluate_candidate_llm.py');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Extract text content from a candidate file
 */
async function extractCandidateContent(filePath) {
    try {
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (accessError) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        // Check if Python script exists
        try {
            await fs.access(PYTHON_SCRIPT_PATH);
        } catch (accessError) {
            throw new Error(`Python script not found: ${PYTHON_SCRIPT_PATH}`);
        }
        
        const command = process.platform === 'win32' 
            ? `"${PYTHON_COMMAND}" "${PYTHON_SCRIPT_PATH}" "${filePath}"`
            : `${PYTHON_COMMAND} "${PYTHON_SCRIPT_PATH}" "${filePath}"`;
        
        console.log('Executing Python command:', command);
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && stderr.trim()) {
            console.error('Python script stderr:', stderr);
        }
        
        if (!stdout || !stdout.trim()) {
            throw new Error('Python script returned empty output');
        }
        
        const result = JSON.parse(stdout);
        return result;
    } catch (error) {
        console.error('Error extracting candidate content:', error);
        console.error('File path:', filePath);
        console.error('Python script path:', PYTHON_SCRIPT_PATH);
        console.error('Python command:', PYTHON_COMMAND);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            signal: error.signal
        });
        return {
            success: false,
            error: error.message,
            text: ''
        };
    }
}

/**
 * Match candidate content with job description using LLM evaluation
 */
async function matchCandidateWithJob(candidateContent, job) {
    try {
        // Prepare candidate data structure
        const candidateData = {
            name: extractName(candidateContent),
            skills: extractSkills(candidateContent),
            experience: extractExperience(candidateContent),
            location: extractLocation(candidateContent),
            qualification: extractQualification(candidateContent),
            currentRole: extractCurrentRole(candidateContent),
            fullText: candidateContent
        };

        // Prepare job data structure
        const jobData = {
            jobName: job.jobTitle,
            jobRequirements: job.jobDescription || job.requirements || '',
            keySkills: Array.isArray(job.skills) ? job.skills : (job.skills || '').split(',').map(s => s.trim()),
            workExperience: job.experience || '',
            location: job.location || ''
        };

        // Check if Python script exists
        try {
            await fs.access(EVALUATE_SCRIPT_PATH);
        } catch (accessError) {
            console.error('Python evaluation script not found:', EVALUATE_SCRIPT_PATH);
            // Return a basic match result if script is not available
            return {
                matchScore: 50,
                freshnessScore: 50,
                keyMatchingSkills: [],
                explanation: 'LLM evaluation not available, using basic matching',
                skillMatch: 0.5,
                roleRelevance: 0.5,
                careerProgression: 0.5,
                overallFit: 0.5,
                shouldReject: false
            };
        }

        // Call Python evaluation script using spawn for stdin support
        const inputData = JSON.stringify({ candidate: candidateData, job: jobData });
        
        const evaluation = await new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            
            console.log('Starting Python evaluation process:', PYTHON_COMMAND, EVALUATE_SCRIPT_PATH);
            
            const pythonProcess = spawn(PYTHON_COMMAND, [EVALUATE_SCRIPT_PATH], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: process.platform === 'win32' // Use shell on Windows
            });
            
            pythonProcess.stdin.write(inputData);
            pythonProcess.stdin.end();
            
            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('Evaluation script stderr:', stderr);
                    console.error('Evaluation script stdout:', stdout);
                    // Don't reject, return a basic match result instead
                    resolve({
                        matchScore: 50,
                        freshnessScore: 50,
                        keyMatchingSkills: [],
                        explanation: `LLM evaluation failed: ${stderr || 'Unknown error'}`,
                        skillMatch: 0.5,
                        roleRelevance: 0.5,
                        careerProgression: 0.5,
                        overallFit: 0.5,
                        shouldReject: false
                    });
                    return;
                }
                
                if (!stdout || !stdout.trim()) {
                    console.warn('Python evaluation script returned empty output');
                    resolve({
                        matchScore: 50,
                        freshnessScore: 50,
                        keyMatchingSkills: [],
                        explanation: 'LLM evaluation returned empty result',
                        skillMatch: 0.5,
                        roleRelevance: 0.5,
                        careerProgression: 0.5,
                        overallFit: 0.5,
                        shouldReject: false
                    });
                    return;
                }
                
                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (parseError) {
                    console.error('Failed to parse Python output:', parseError);
                    console.error('Python stdout:', stdout);
                    // Return basic match result instead of rejecting
                    resolve({
                        matchScore: 50,
                        freshnessScore: 50,
                        keyMatchingSkills: [],
                        explanation: `Failed to parse LLM evaluation: ${parseError.message}`,
                        skillMatch: 0.5,
                        roleRelevance: 0.5,
                        careerProgression: 0.5,
                        overallFit: 0.5,
                        shouldReject: false
                    });
                }
            });
            
            pythonProcess.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                // Return basic match result instead of rejecting
                resolve({
                    matchScore: 50,
                    freshnessScore: 50,
                    keyMatchingSkills: [],
                    explanation: `Python process error: ${error.message}`,
                    skillMatch: 0.5,
                    roleRelevance: 0.5,
                    careerProgression: 0.5,
                    overallFit: 0.5,
                    shouldReject: false
                });
            });
        });
        
        return {
            candidateData,
            matchScore: evaluation.matchScore || 0,
            skillMatch: evaluation.skillMatch || 0,
            roleRelevance: evaluation.roleRelevance || 0,
            careerProgression: evaluation.careerProgression || 0,
            overallFit: evaluation.overallFit || 0,
            explanation: evaluation.explanation || '',
            shouldReject: evaluation.shouldReject || false
        };
    } catch (error) {
        console.error('Error matching candidate:', error);
        // Fallback: simple text matching
        return {
            candidateData: {
                name: extractName(candidateContent),
                skills: extractSkills(candidateContent),
                experience: extractExperience(candidateContent),
                location: extractLocation(candidateContent),
                qualification: extractQualification(candidateContent),
                currentRole: extractCurrentRole(candidateContent),
                fullText: candidateContent
            },
            matchScore: calculateSimpleMatch(candidateContent, job),
            skillMatch: 0,
            roleRelevance: 0,
            careerProgression: 0,
            overallFit: 0,
            explanation: 'Simple text matching (LLM evaluation failed)',
            shouldReject: false
        };
    }
}

/**
 * Extract candidate information from text content using simple regex patterns
 */
function extractName(content) {
    // Try to find name patterns (usually at the beginning)
    const nameMatch = content.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);
    return nameMatch ? nameMatch[1] : 'Unknown';
}

function extractSkills(content) {
    // Common skills keywords
    const skillKeywords = [
        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'MongoDB',
        'AWS', 'Docker', 'Git', 'HTML', 'CSS', 'TypeScript', 'Angular', 'Vue',
        'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication'
    ];
    const foundSkills = skillKeywords.filter(skill => 
        content.toLowerCase().includes(skill.toLowerCase())
    );
    return foundSkills.join(', ');
}

function extractExperience(content) {
    const expMatch = content.match(/(\d+)\+?\s*(?:years?|yrs?|year|yr)\s*(?:of\s*)?(?:experience|exp)/i);
    return expMatch ? `${expMatch[1]} years` : 'Not specified';
}

function extractLocation(content) {
    // Common location patterns
    const locationMatch = content.match(/(?:location|address|city|based in|residing in)[:]\s*([A-Za-z\s,]+)/i) ||
                         content.match(/(?:Mumbai|Delhi|Bangalore|Pune|Hyderabad|Chennai|Kolkata|Gurgaon|Noida)/i);
    return locationMatch ? locationMatch[1] || locationMatch[0] : 'Not specified';
}

function extractQualification(content) {
    const qualMatch = content.match(/(?:education|qualification|degree)[:]\s*([A-Za-z\s,()]+)/i) ||
                     content.match(/(?:Bachelor|Master|MBA|Ph\.?D|B\.?Tech|M\.?Tech|B\.?Com|M\.?Com)/i);
    return qualMatch ? qualMatch[1] || qualMatch[0] : 'Not specified';
}

function extractCurrentRole(content) {
    const roleMatch = content.match(/(?:current role|position|designation)[:]\s*([A-Za-z\s]+)/i) ||
                     content.match(/^(?:Senior|Junior|Lead|Principal)?\s*([A-Za-z\s]+Engineer|[A-Za-z\s]+Developer|[A-Za-z\s]+Manager)/i);
    return roleMatch ? roleMatch[1] || roleMatch[0] : 'Not specified';
}

/**
 * Simple matching algorithm (fallback)
 */
function calculateSimpleMatch(candidateContent, job) {
    let score = 0;
    const content = candidateContent.toLowerCase();
    const jobTitle = (job.jobTitle || '').toLowerCase();
    const jobDesc = ((job.jobDescription || '') + ' ' + (job.requirements || '')).toLowerCase();
    const jobSkills = Array.isArray(job.skills) 
        ? job.skills.map(s => s.toLowerCase())
        : (job.skills || '').toLowerCase().split(',').map(s => s.trim());

    // Check job title match
    const titleWords = jobTitle.split(/\s+/);
    const titleMatches = titleWords.filter(word => word.length > 3 && content.includes(word));
    score += (titleMatches.length / Math.max(titleWords.length, 1)) * 30;

    // Check skills match
    const skillMatches = jobSkills.filter(skill => skill && content.includes(skill));
    score += (skillMatches.length / Math.max(jobSkills.length, 1)) * 50;

    // Check location match (if specified)
    if (job.location) {
        const jobLoc = job.location.toLowerCase();
        if (content.includes(jobLoc.split(',')[0].toLowerCase())) {
            score += 20;
        }
    }

    return Math.min(Math.round(score), 100);
}

/**
 * Filter candidates based on match score
 */
function filterCandidates(candidates, filterType, filterValue) {
    // Ensure filterValue is a number
    const numValue = typeof filterValue === 'string' 
        ? parseFloat(filterValue.replace('%', '')) 
        : parseFloat(filterValue);
    
    if (isNaN(numValue) || numValue <= 0) {
        console.warn('Invalid filterValue:', filterValue, 'using default 50%');
        return candidates.slice(0, Math.ceil(candidates.length * 0.5));
    }
    
    if (filterType === 'percentage' || filterType === 'topPercentage') {
        // Filter top percentage
        const sorted = candidates.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        const topCount = Math.max(1, Math.ceil((numValue / 100) * candidates.length));
        return sorted.slice(0, topCount);
    } else {
        // Filter top number
        const sorted = candidates.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        return sorted.slice(0, Math.min(numValue, candidates.length));
    }
}

/**
 * Send candidate emails to hiring manager in batches
 */
async function sendCandidateEmails(job, selectedCandidates, batchSize = 12) {
    const hiringManagerEmail = job.hiringManagerEmail;
    if (!hiringManagerEmail) {
        throw new Error('Hiring manager email not found for this job');
    }

    const jobUrl = `${FRONTEND_URL}/${job.shortId}`;
    const totalBatches = Math.ceil(selectedCandidates.length / batchSize);
    
    // Prepare all batches
    const emailBatches = [];
    for (let i = 0; i < totalBatches; i++) {
        const batch = selectedCandidates.slice(i * batchSize, (i + 1) * batchSize);
        const sendAfter = new Date(Date.now() + i * 60 * 60 * 1000); // i hours from now
        
        emailBatches.push({
            batchNumber: i + 1,
            totalBatches: totalBatches,
            candidates: batch,
            sendAfter: sendAfter,
            sent: false,
            sentAt: null
        });
    }

    // Send first batch immediately
    let firstBatchSent = false;
    if (emailBatches.length > 0) {
        try {
            await sendBatchEmail(hiringManagerEmail, job, emailBatches[0].candidates, 1, totalBatches, jobUrl);
            emailBatches[0].sent = true;
            emailBatches[0].sentAt = new Date();
            firstBatchSent = true;
        } catch (error) {
            console.error('Error sending first batch:', error);
        }
    }

    return {
        totalCandidates: selectedCandidates.length,
        batches: totalBatches,
        firstBatchSent: firstBatchSent,
        remainingBatches: emailBatches.filter(b => !b.sent).length,
        emailBatches: emailBatches // Return for saving to database
    };
}

/**
 * Send a batch of candidates via email
 */
async function sendBatchEmail(hiringManagerEmail, job, candidates, batchNumber, totalBatches, jobUrl) {
    const subject = `Candidate Matches for ${job.jobTitle} - Batch ${batchNumber} of ${totalBatches}`;
    
    const candidatesList = candidates.map((candidate, idx) => {
        return `
            <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${candidate.candidateData.name || `Candidate ${idx + 1}`}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${Math.round(candidate.matchScore)}%</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${candidate.candidateData.experience || 'N/A'}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${candidate.candidateData.skills || 'N/A'}</td>
            </tr>
        `;
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🎯 Candidate Matches</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                <p style="font-size: 16px; margin-bottom: 20px;">
                    Hi Hiring Manager,
                </p>
                <p style="font-size: 14px; margin-bottom: 20px;">
                    We have found <strong>${candidates.length}</strong> candidate(s) matching your job requirements for <strong>${job.jobTitle}</strong>.
                </p>
                
                ${batchNumber < totalBatches ? `
                <p style="font-size: 14px; margin-bottom: 20px; color: #2563eb; font-weight: bold;">
                    This is batch ${batchNumber} of ${totalBatches}. More candidates will be sent in the next hour(s).
                </p>
                ` : ''}

                <div style="margin: 30px 0;">
                    <table style="width: 100%; border-collapse: collapse; background: white;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Candidate Name</th>
                                <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Match Score</th>
                                <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Experience</th>
                                <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Skills</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${candidatesList}
                        </tbody>
                    </table>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${jobUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; padding: 15px 30px; text-decoration: none; 
                              border-radius: 8px; font-weight: bold; font-size: 16px;">
                        View Job Details
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    Best regards,<br>
                    The Atract Team
                </p>
            </div>
        </body>
        </html>
    `;

    await sendMail(hiringManagerEmail, subject, html);
}

module.exports = {
    extractCandidateContent,
    matchCandidateWithJob,
    filterCandidates,
    sendCandidateEmails
};

