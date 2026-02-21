const XLSX = require('xlsx');
const pdfParse = require('@cyber2024/pdf-parse-fixed');
const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');

/**
 * Detect where the actual data table starts in Excel
 * Returns the row index (0-based) where headers are found
 */
function findDataTableStart(worksheet) {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Look for common header patterns in first 20 rows
    const maxRowsToCheck = Math.min(20, range.e.r + 1);
    
    for (let row = 0; row < maxRowsToCheck; row++) {
        const rowData = [];
        let hasData = false;
        
        // Check first 10 columns for this row
        for (let col = 0; col < 10; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            if (cell && cell.v) {
                rowData.push(String(cell.v).toLowerCase().trim());
                hasData = true;
            }
        }
        
        if (!hasData) continue;
        
        // Check if this row looks like headers (contains common header keywords)
        const headerKeywords = [
            'name', 'email', 'mobile', 'phone', 'age', 'gender', 
            'location', 'experience', 'skills', 'qualification',
            's.no', 'serial', 'candidate', 'applicant'
        ];
        
        const matches = rowData.filter(cell => 
            headerKeywords.some(keyword => cell.includes(keyword))
        ).length;
        
        // If at least 3 header keywords found, this is likely the header row
        if (matches >= 3) {
            return row;
        }
    }
    
    // Default to row 0 if not found
    return 0;
}

/**
 * Parse Excel file and extract candidate data
 * Handles metadata rows and detects actual data table start
 */
async function parseExcelFile(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Find where the actual data table starts
        const headerRowIndex = findDataTableStart(worksheet);
        
        // Get all data as array of arrays (preserving row structure)
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const allRows = [];
        
        for (let row = 0; row <= range.e.r; row++) {
            const rowData = {};
            for (let col = 0; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                if (cell) {
                    // Use column letter as key (A, B, C, etc.)
                    const colLetter = XLSX.utils.encode_col(col);
                    rowData[colLetter] = cell.v !== undefined ? String(cell.v) : '';
                }
            }
            allRows.push(rowData);
        }
        
        // Extract headers from the detected header row
        const headerRow = allRows[headerRowIndex];
        if (!headerRow) {
            return { candidates: [], headers: [], metadata: {} };
        }
        
        // Build header mapping (column letter -> header name)
        const headerMap = {};
        const headers = [];
        for (let col = 0; col <= range.e.c; col++) {
            const colLetter = XLSX.utils.encode_col(col);
            const headerValue = headerRow[colLetter] || '';
            if (headerValue.trim()) {
                headerMap[colLetter] = headerValue.trim();
                headers.push(headerValue.trim());
            }
        }
        
        // Extract metadata from rows before header row
        const metadata = {};
        for (let row = 0; row < headerRowIndex; row++) {
            const rowData = allRows[row];
            // Look for common metadata patterns
            for (const colLetter in rowData) {
                const value = rowData[colLetter];
                if (value && typeof value === 'string') {
                    if (value.toLowerCase().includes('folder name')) {
                        metadata.folderName = value.split(':').pop()?.trim() || '';
                    } else if (value.toLowerCase().includes('user id')) {
                        metadata.userId = value.split(':').pop()?.trim() || '';
                    } else if (value.toLowerCase().includes('download date')) {
                        metadata.downloadDate = value.split(':').pop()?.trim() || '';
                    }
                }
            }
        }
        
        // Extract data rows (after header row) - Read entire Excel row-wise
        const dataRows = allRows.slice(headerRowIndex + 1);
        
        console.log(`\n📖 Reading Excel file row-wise: ${dataRows.length} data row(s) found`);
        console.log(`   Headers detected: ${headers.join(', ')}`);
        
        // Map data to candidate objects - Each row = one candidate in JSON format
        const candidates = dataRows.map((row, index) => {
            // Step 1: Build original data object with header names (preserve all Excel data)
            const originalData = {};
            for (const colLetter in headerMap) {
                const headerName = headerMap[colLetter];
                const cellValue = row[colLetter] || '';
                originalData[headerName] = String(cellValue).trim();
            }
            
            // Step 2: Create candidate object with row number and all original data
            const candidate = {
                rowNumber: headerRowIndex + index + 2, // Excel row number (1-indexed)
                originalData: originalData, // Complete row data in JSON format
                // Store all data for AI matching
                allData: JSON.stringify(originalData) // Full row data as JSON string
            };

            // Step 3: Auto-detect and map common column names to job requirement fields
            // Map Excel headings to job description fields: skills, location, age, salary, experience
            const columnMap = {
                name: ['name', 'full name', 'candidate name', 'applicant name', 'fullname', 'candidate'],
                email: ['email', 'email id', 'email address', 'e-mail', 'mail', 'emailid'],
                mobile: ['mobile', 'phone', 'contact', 'mobile number', 'phone number', 'contact number', 'mobile no', 'phone no', 'contact no'],
                age: ['age', 'years', 'year', 'age (years)', 'candidate age'],
                experience: ['experience', 'work experience', 'years of experience', 'exp', 'work exp', 'experience years', 'total experience', 'years exp'],
                skills: ['skills', 'key skills', 'technical skills', 'skill set', 'competencies', 'skill', 'core skills', 'primary skills'],
                location: ['location', 'city', 'address', 'current location', 'residence', 'current city', 'city of residence'],
                preferredLocation: ['preferred location', 'pref location', 'preferred city', 'willing to relocate', 'preferred work location'],
                noticePeriod: ['notice period', 'notice', 'np', 'availability', 'joining period', 'available in'],
                gender: ['gender', 'sex'],
                qualification: ['qualification', 'education', 'degree', 'highest qualification', 'educational qualification'],
                currentRole: ['current role', 'current position', 'designation', 'job title', 'role', 'current designation'],
                salary: ['salary', 'ctc', 'expected salary', 'current salary', 'compensation', 'expected ctc', 'salary expectation']
            };

            // Step 4: Find and map columns to job requirement fields
            Object.keys(columnMap).forEach(key => {
                const possibleNames = columnMap[key];
                let found = false;
                
                for (const headerName of headers) {
                    const headerLower = headerName.toLowerCase().trim();
                    // Check for exact match or contains match
                    if (possibleNames.some(name => {
                        return headerLower === name || headerLower.includes(name) || name.includes(headerLower);
                    })) {
                        candidate[key] = String(originalData[headerName] || '').trim();
                        found = true;
                        break;
                    }
                }
                
                // If not found, set empty string
                if (!found) {
                    candidate[key] = '';
                }
            });

            // Step 5: Log row data for debugging
            if (index < 3) { // Log first 3 rows as sample
                console.log(`   Row ${candidate.rowNumber}: Name="${candidate.name}", Skills="${candidate.skills}", Experience="${candidate.experience}", Location="${candidate.location}"`);
            }

            return candidate;
        });

        // Filter out completely empty rows
        const validCandidates = candidates.filter(candidate => {
            // Check if at least one field has data
            return Object.values(candidate.originalData).some(value => 
                value && String(value).trim().length > 0
            );
        });

        return {
            candidates: validCandidates,
            headers: headers,
            totalRows: validCandidates.length,
            metadata: metadata,
            headerRowIndex: headerRowIndex + 1 // Excel row number (1-indexed)
        };

    } catch (error) {
        console.error("Excel parsing error:", error);
        throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
}

/**
 * Parse Word/DOCX file and extract candidate data using AI
 */
async function parseWordFile(filePath) {
    try {
        // Extract text from Word document
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;

        if (!text || text.trim().length === 0) {
            return { candidates: [], headers: [], error: 'No text found in document' };
        }

        // Try to extract structured data using AI
        // For now, return basic structure - AI parsing will be done in controller
        return {
            rawText: text,
            candidates: [],
            headers: [],
            needsAIParsing: true
        };

    } catch (error) {
        console.error("Word parsing error:", error);
        throw new Error(`Failed to parse Word file: ${error.message}`);
    }
}

/**
 * Parse PDF file and extract candidate data
 */
async function parsePdfFile(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);

        if (!data || !data.text || data.text.trim().length === 0) {
            return { candidates: [], headers: [], error: 'No text found in PDF' };
        }

        // Return raw text for AI parsing
        return {
            rawText: data.text,
            candidates: [],
            headers: [],
            needsAIParsing: true
        };

    } catch (error) {
        console.error("PDF parsing error:", error);
        throw new Error(`Failed to parse PDF file: ${error.message}`);
    }
}

/**
 * Parse TXT file and extract candidate data
 */
async function parseTxtFile(filePath) {
    try {
        const text = fs.readFileSync(filePath, 'utf-8');

        if (!text || text.trim().length === 0) {
            return { candidates: [], headers: [], error: 'No text found in TXT file' };
        }

        // Return raw text for AI parsing
        return {
            rawText: text,
            candidates: [],
            headers: [],
            needsAIParsing: true
        };

    } catch (error) {
        console.error("TXT parsing error:", error);
        throw new Error(`Failed to parse TXT file: ${error.message}`);
    }
}

/**
 * Main parser function - routes to appropriate parser
 */
async function parseFile(filePath, fileType) {
    const ext = path.extname(filePath).toLowerCase();

    try {
        if (ext === '.xlsx' || ext === '.xls') {
            return await parseExcelFile(filePath);
        } else if (ext === '.docx' || ext === '.doc') {
            return await parseWordFile(filePath);
        } else if (ext === '.pdf') {
            return await parsePdfFile(filePath);
        } else if (ext === '.txt') {
            return await parseTxtFile(filePath);
        } else {
            throw new Error(`Unsupported file type: ${ext}`);
        }
    } catch (error) {
        console.error("File parsing error:", error);
        throw error;
    }
}

/**
 * Use AI to scan extracted text and extract structured candidate data
 * Extracts: mobile, email, age, gender, skills, experience, salary, notice period, etc.
 * For folder uploads: Each file = ONE candidate (one row in Excel)
 */
async function parseUnstructuredTextWithAI(text, { genAI, GEMINI_MODEL }) {
    try {
        if (!genAI) {
            throw new Error('AI service not available');
        }

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const prompt = `
You are an expert resume parser. Scan the following extracted text from a candidate's resume/document and extract ALL available information.

CRITICAL: Scan the ENTIRE text carefully and extract the following fields. These fields will be mapped to Excel sheet columns, so extract everything that exists:

REQUIRED FIELDS TO EXTRACT:

1. **name** (full name of candidate)
   - Look for: Name, Full Name, Candidate Name, Applicant Name, First Name, Last Name
   - Format: "First Last" or "First Middle Last"
   - If not found: empty string ""

2. **email** (email address)
   - Look for: Email, E-mail, Email ID, Email Address, Mail ID, Contact Email
   - Format: Must be valid email format (contains @ and .)
   - If not found: empty string ""

3. **mobile** (phone/mobile number)
   - Look for: Mobile, Phone, Contact, Mobile Number, Phone Number, Contact Number, Mobile No, Phone No, WhatsApp
   - Format: Extract digits only, can include country code
   - Examples: 1234567890, +91-1234567890, 91-1234567890
   - If not found: empty string ""

4. **age** (age in years)
   - Look for: Age, Years Old, Date of Birth (calculate age if DOB given), DOB, Birth Date
   - Format: Number as string (e.g., "25", "30")
   - If DOB found, calculate current age
   - If not found: empty string ""

5. **gender** (male/female/other)
   - Look for: Gender, Sex, Male/Female indicators, Title (Mr./Mrs./Ms.)
   - Format: "male", "female", "other", or empty string ""
   - If not found: empty string ""

6. **qualification** (education/degree)
   - Look for: Qualification, Education, Degree, Highest Qualification, Educational Qualification, Graduation, Post Graduation
   - Format: Degree name (e.g., "B.Tech", "MBA", "B.Sc", "M.Tech", "B.Com")
   - Include specialization if mentioned (e.g., "B.Tech Computer Science")
   - If not found: empty string ""

7. **experience** (years of experience or experience description)
   - Look for: Experience, Work Experience, Years of Experience, Total Experience, Exp, Work Exp
   - Format: "X years" or "X years Y months" or experience description
   - Extract both years and description if available
   - If not found: empty string ""

8. **skills** (comma-separated list of skills)
   - Look for: Skills, Technical Skills, Key Skills, Core Skills, Competencies, Skill Set, Technologies
   - Format: "Skill1, Skill2, Skill3" (comma-separated)
   - Extract ALL skills mentioned in the document
   - Include programming languages, tools, frameworks, etc.
   - If not found: empty string ""

9. **location** (current city or location)
   - Look for: Location, City, Address, Current Location, Residence, Current City, City of Residence
   - Format: City name or location string (e.g., "Mumbai", "Delhi", "Bangalore")
   - If not found: empty string ""

10. **preferredLocation** (preferred work location if mentioned)
    - Look for: Preferred Location, Preferred City, Willing to Relocate, Work Location Preference, Relocation
    - Format: City name or location string
    - If not found: empty string ""

11. **noticePeriod** (notice period)
    - Look for: Notice Period, Notice, NP, Availability, Joining Period, Available In, Available From
    - Format: "X days", "X weeks", "X months", "Immediate", "15 days", "1 month"
    - If not found: empty string ""

12. **currentRole** (current job title)
    - Look for: Current Role, Current Position, Designation, Job Title, Current Job, Present Role
    - Format: Job title string (e.g., "Software Developer", "Senior Engineer")
    - If not found: empty string ""

13. **salary** (salary/compensation if mentioned)
    - Look for: Salary, CTC, Expected Salary, Current Salary, Compensation, Package, Expected CTC
    - Format: Number as string (e.g., "500000", "5 LPA", "50000", "8 LPA")
    - If not found: empty string ""

ADDITIONAL FIELDS (extract if available):

14. **address** (full address)
    - Look for: Address, Full Address, Permanent Address, Current Address
    - Format: Complete address string
    - If not found: empty string ""

15. **dateOfBirth** (date of birth)
    - Look for: Date of Birth, DOB, Birth Date, Date of Birth
    - Format: "YYYY-MM-DD" or as found in text
    - If not found: empty string ""

16. **linkedin** (LinkedIn profile URL)
    - Look for: LinkedIn, LinkedIn Profile, LinkedIn URL
    - Format: URL string
    - If not found: empty string ""

17. **github** (GitHub profile URL)
    - Look for: GitHub, Github, GitHub Profile, GitHub URL
    - Format: URL string
    - If not found: empty string ""

EXTRACTION INSTRUCTIONS:
- Scan the ENTIRE text carefully - information can be anywhere in the document
- Extract ALL available information - don't miss any details
- If a field is not found, use empty string "" (DO NOT use null or "N/A")
- For mobile: Extract all digits, remove spaces, dashes, parentheses (keep only digits and +)
- For email: Must be valid email format (contains @ and .)
- For skills: Extract ALL skills mentioned, separate with commas
- For experience: Extract both years and description if available
- For age: Extract number or calculate from date of birth if given
- For salary: Extract number, can include currency symbols or LPA format
- For qualification: Extract highest qualification mentioned
- Map data to Excel columns - if Excel has a column, fill it with extracted data, otherwise leave blank

Return ONLY valid JSON object (not array) in this exact format (no markdown, no commentary, no extra text):
{
  "name": "Candidate Full Name",
  "email": "email@example.com",
  "mobile": "1234567890",
  "age": "25",
  "gender": "male",
  "qualification": "B.Tech Computer Science",
  "experience": "3 years",
  "skills": "JavaScript, React, Node.js, Python, SQL",
  "location": "Mumbai",
  "preferredLocation": "Mumbai, Pune",
  "noticePeriod": "15 days",
  "currentRole": "Software Developer",
  "salary": "500000",
  "address": "Full address if found",
  "dateOfBirth": "1998-05-15",
  "linkedin": "https://linkedin.com/in/profile",
  "github": "https://github.com/username"
}

IMPORTANT: 
- Use empty string "" for ALL fields that are not found (NOT null, NOT "N/A", NOT "Not Found")
- Extract everything that exists in the text
- This data will be mapped to Excel columns automatically

Extracted Text to Scan:
${text.substring(0, 50000)}
`;

        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();

        // Parse JSON from response - expecting a single object, not array
        let candidate = null;
        try {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})/);
            if (jsonMatch) {
                candidate = JSON.parse(jsonMatch[1]);
            } else {
                // Try to find object
                const braceMatch = responseText.match(/\{[\s\S]*\}/);
                if (braceMatch) {
                    candidate = JSON.parse(braceMatch[0]);
                } else {
                    // Try direct parse
                    candidate = JSON.parse(responseText);
                }
            }
            
            // If it's an array, take the first element
            if (Array.isArray(candidate) && candidate.length > 0) {
                candidate = candidate[0];
            }
        } catch (parseError) {
            console.error("AI response parsing error:", parseError);
            console.error("AI Response:", responseText);
            // Return empty candidate if parsing fails
            candidate = null;
        }

        // Normalize candidate - ensure all have required fields
        // Each file = ONE candidate (one row in Excel)
        // Clean and normalize extracted data - Map to Excel columns
        const normalizedCandidate = candidate ? {
            rowNumber: 1,
            // Personal Information (Excel columns: Name, Email, Mobile, Age, Gender)
            name: String(candidate.name || '').trim(),
            email: String(candidate.email || '').trim(),
            mobile: String(candidate.mobile || '').trim().replace(/[^\d+]/g, ''), // Keep only digits and +
            age: String(candidate.age || '').trim(),
            gender: String(candidate.gender || '').trim().toLowerCase(),
            // Qualification (Excel column: Qualification)
            qualification: String(candidate.qualification || '').trim(),
            // Professional Information (Excel columns: Experience, Skills, Current Role)
            experience: String(candidate.experience || '').trim(),
            skills: String(candidate.skills || '').trim(),
            currentRole: String(candidate.currentRole || '').trim(),
            // Location & Availability (Excel columns: Location, Preferred Location, Notice Period)
            location: String(candidate.location || '').trim(),
            preferredLocation: String(candidate.preferredLocation || candidate.preferred_location || '').trim(),
            noticePeriod: String(candidate.noticePeriod || candidate.notice_period || '').trim(),
            // Compensation (Excel column: Salary)
            salary: String(candidate.salary || '').trim(),
            // Additional fields (will be mapped to Excel if columns exist)
            address: String(candidate.address || '').trim(),
            dateOfBirth: String(candidate.dateOfBirth || candidate.date_of_birth || candidate.dob || '').trim(),
            linkedin: String(candidate.linkedin || candidate.linkedIn || '').trim(),
            github: String(candidate.github || candidate.gitHub || '').trim(),
            // Store extracted text for reference (Excel column: Extracted Text)
            extractedText: text.substring(0, 32767), // Excel cell limit
            // Store all original AI extracted data for dynamic Excel column mapping
            // This ensures all AI extracted fields are available for Excel column mapping
            originalData: {
                // Core fields
                name: String(candidate.name || '').trim(),
                email: String(candidate.email || '').trim(),
                mobile: String(candidate.mobile || '').trim().replace(/[^\d+]/g, ''),
                age: String(candidate.age || '').trim(),
                gender: String(candidate.gender || '').trim().toLowerCase(),
                qualification: String(candidate.qualification || '').trim(),
                experience: String(candidate.experience || '').trim(),
                skills: String(candidate.skills || '').trim(),
                currentRole: String(candidate.currentRole || '').trim(),
                location: String(candidate.location || '').trim(),
                preferredLocation: String(candidate.preferredLocation || candidate.preferred_location || '').trim(),
                noticePeriod: String(candidate.noticePeriod || candidate.notice_period || '').trim(),
                salary: String(candidate.salary || '').trim(),
                // Additional fields
                address: String(candidate.address || '').trim(),
                dateOfBirth: String(candidate.dateOfBirth || candidate.date_of_birth || candidate.dob || '').trim(),
                linkedin: String(candidate.linkedin || candidate.linkedIn || '').trim(),
                github: String(candidate.github || candidate.gitHub || '').trim(),
                // Extracted text
                extractedText: text.substring(0, 32767),
                // Preserve any other fields from AI response
                ...Object.keys(candidate).reduce((acc, key) => {
                    const lowerKey = key.toLowerCase();
                    const knownKeys = ['name', 'email', 'mobile', 'age', 'gender', 'qualification', 
                                     'experience', 'skills', 'currentrole', 'location', 'preferredlocation', 
                                     'noticeperiod', 'salary', 'address', 'dateofbirth', 'linkedin', 'github'];
                    if (!knownKeys.includes(lowerKey)) {
                        acc[key] = candidate[key];
                    }
                    return acc;
                }, {})
            }
        } : null;
        
        // Log extracted data for debugging
        if (normalizedCandidate) {
            console.log(`   ✓ AI Extracted Fields:`);
            console.log(`      - Name: ${normalizedCandidate.name || 'N/A'}`);
            console.log(`      - Email: ${normalizedCandidate.email || 'N/A'}`);
            console.log(`      - Mobile: ${normalizedCandidate.mobile || 'N/A'}`);
            console.log(`      - Age: ${normalizedCandidate.age || 'N/A'}`);
            console.log(`      - Gender: ${normalizedCandidate.gender || 'N/A'}`);
            console.log(`      - Skills: ${normalizedCandidate.skills ? normalizedCandidate.skills.substring(0, 50) + '...' : 'N/A'}`);
            console.log(`      - Experience: ${normalizedCandidate.experience || 'N/A'}`);
            console.log(`      - Location: ${normalizedCandidate.location || 'N/A'}`);
            console.log(`      - Notice Period: ${normalizedCandidate.noticePeriod || 'N/A'}`);
            console.log(`      - Salary: ${normalizedCandidate.salary || 'N/A'}`);
        }

        return {
            candidates: normalizedCandidate ? [normalizedCandidate] : [],
            headers: [
                'name', 'email', 'mobile', 'age', 'gender',
                'experience', 'skills', 'qualification', 'currentRole',
                'location', 'preferredLocation', 'noticePeriod', 'salary'
            ],
            totalRows: normalizedCandidate ? 1 : 0,
            extractedText: text.substring(0, 32767) // Store extracted text
        };

    } catch (error) {
        console.error("AI parsing error:", error);
        // Return empty result instead of throwing
        return {
            candidates: [],
            headers: [],
            error: `AI parsing failed: ${error.message}`
        };
    }
}

module.exports = {
    parseFile,
    parseUnstructuredTextWithAI
};

