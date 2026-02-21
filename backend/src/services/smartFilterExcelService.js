const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Generate Excel file with filtered candidates
 * Includes ALL candidate details after AI filtering according to job description
 * Each row contains: File info, Personal info, Professional info, Extracted text, AI match analysis
 */
function generateExcelFile(candidates, originalHeaders, outputPath) {
    try {
        console.log(`\n📊 Generating Excel file with ${candidates.length} filtered candidate(s)...`);
        console.log(`   ✓ Including ALL candidate details in download file`);
        console.log(`   ✓ AI filtered according to job description`);
        
        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Prepare data for Excel - each candidate = one row with ALL details
        // Define column order for proper Excel structure
        
        // Helper function to get value from candidate or originalData
        const getValue = (candidate, field, altFields = []) => {
            // Try direct field first
            if (candidate[field] && String(candidate[field]).trim()) {
                return String(candidate[field]).trim();
            }
            // Try alternative field names
            for (const altField of altFields) {
                if (candidate[altField] && String(candidate[altField]).trim()) {
                    return String(candidate[altField]).trim();
                }
            }
            // Try originalData
            if (candidate.originalData && typeof candidate.originalData === 'object') {
                if (candidate.originalData[field] && String(candidate.originalData[field]).trim()) {
                    return String(candidate.originalData[field]).trim();
                }
                // Try alternative field names in originalData
                for (const altField of altFields) {
                    if (candidate.originalData[altField] && String(candidate.originalData[altField]).trim()) {
                        return String(candidate.originalData[altField]).trim();
                    }
                }
            }
            return '';
        };
        
        // Log first candidate for debugging
        if (candidates.length > 0) {
            const firstCandidate = candidates[0];
            console.log(`\n🔍 Debug: First candidate data structure:`);
            console.log(`   Direct fields: name=${firstCandidate.name || 'N/A'}, email=${firstCandidate.email || 'N/A'}, mobile=${firstCandidate.mobile || 'N/A'}`);
            console.log(`   Has originalData: ${!!firstCandidate.originalData}`);
            if (firstCandidate.originalData) {
                console.log(`   originalData keys: ${Object.keys(firstCandidate.originalData).join(', ')}`);
                console.log(`   originalData.name: ${firstCandidate.originalData.name || 'N/A'}`);
                console.log(`   originalData.email: ${firstCandidate.originalData.email || 'N/A'}`);
                console.log(`   originalData.mobile: ${firstCandidate.originalData.mobile || 'N/A'}`);
            }
        }
        
        const excelData = candidates.map((candidate, index) => {
            const row = {};
            
            // Step 5: Convert JSON data to Excel row (one row per candidate)
            // Include ALL candidate details in proper columns
            
            // File Information (from folder uploads) - First columns
            row['File Name'] = String(candidate.fileName || candidate.sourceFile || '').trim();
            row['File Type'] = String(candidate.fileType || '').trim();
            row['Source File'] = String(candidate.sourceFile || candidate.fileName || '').trim();
            row['Word Count'] = candidate.wordCount || 0;
            
            // Candidate Personal Information - Next columns (check both candidate and originalData)
            row['Name'] = getValue(candidate, 'name', ['fullName', 'candidateName', 'Name']);
            row['Email'] = getValue(candidate, 'email', ['emailId', 'emailAddress', 'Email']);
            row['Mobile'] = getValue(candidate, 'mobile', ['mobileNumber', 'phone', 'phoneNumber', 'contact', 'Mobile']);
            row['Age'] = getValue(candidate, 'age', ['Age']);
            row['Gender'] = getValue(candidate, 'gender', ['Gender', 'sex']);
            
            // Professional Information (Order: Qualification, Experience, Current Role, Skills)
            row['Qualification'] = getValue(candidate, 'qualification', ['qualification', 'education', 'degree', 'highestQualification', 'Qualification']);
            row['Experience'] = getValue(candidate, 'experience', ['experience', 'workExperience', 'yearsOfExperience', 'exp', 'Experience']);
            row['Current Role'] = getValue(candidate, 'currentRole', ['currentRole', 'currentPosition', 'designation', 'jobTitle', 'role', 'Current Role']);
            row['Skills'] = getValue(candidate, 'skills', ['skills', 'keySkills', 'technicalSkills', 'skillSet', 'Skills']);
            
            // Location & Availability
            row['Location'] = getValue(candidate, 'location', ['location', 'city', 'currentLocation', 'Location']);
            row['Preferred Location'] = getValue(candidate, 'preferredLocation', ['preferredLocation', 'preferredCity', 'prefLocation', 'Preferred Location']);
            row['Notice Period'] = getValue(candidate, 'noticePeriod', ['noticePeriod', 'notice', 'np', 'availability', 'Notice Period']);
            
            // Compensation
            row['Salary'] = getValue(candidate, 'salary', ['salary', 'ctc', 'expectedSalary', 'currentSalary', 'compensation', 'Salary']);
            
            // Extracted Text (Full content from file)
            row['Extracted Text'] = getValue(candidate, 'extractedText', ['extractedText', 'rawText', 'text', 'content', 'Extracted Text']);
            
            // Add additional fields extracted by AI (always add columns, leave blank if no data)
            row['Address'] = getValue(candidate, 'address', ['address', 'fullAddress', 'permanentAddress', 'currentAddress', 'Address']);
            row['Date of Birth'] = getValue(candidate, 'dateOfBirth', ['dateOfBirth', 'date_of_birth', 'dob', 'birthDate', 'Date of Birth']);
            row['LinkedIn'] = getValue(candidate, 'linkedin', ['linkedin', 'linkedIn', 'linkedinUrl', 'linkedin_url', 'LinkedIn']);
            row['GitHub'] = getValue(candidate, 'github', ['github', 'gitHub', 'githubUrl', 'github_url', 'GitHub']);
            
            // Map ALL additional data from originalData to Excel columns
            // This ensures AI extracted data fills Excel columns dynamically
            if (candidate.originalData && typeof candidate.originalData === 'object') {
                Object.keys(candidate.originalData).forEach(key => {
                    // Skip if already added above (case-insensitive check)
                    const keyLower = key.toLowerCase();
                    const alreadyAdded = [
                        'name', 'email', 'mobile', 'age', 'experience', 'skills', 
                        'location', 'preferredlocation', 'noticeperiod', 'gender', 
                        'qualification', 'currentrole', 'salary', 'sourcefile', 
                        'filename', 'filetype', 'wordcount', 'extractedtext',
                        'address', 'dateofbirth', 'linkedin', 'github'
                    ].includes(keyLower);
                    
                    if (!alreadyAdded) {
                        const value = candidate.originalData[key];
                        // Format column name nicely (handle camelCase, snake_case, etc.)
                        let columnName = key;
                        // Convert camelCase to Title Case
                        columnName = key.split(/(?=[A-Z])/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        // Convert snake_case to Title Case
                        columnName = columnName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        // Clean up
                        columnName = columnName.replace(/\s+/g, ' ').trim();
                        
                        // Only add if value exists (don't add empty columns)
                        if (value && String(value).trim()) {
                            row[columnName] = typeof value === 'object' ? JSON.stringify(value) : String(value).trim();
                        }
                    }
                });
            }

            // AI Match Analysis Columns (from job description filtering)
            row['Rank'] = index + 1;
            row['Match Score'] = candidate.matchScore || 0;
            
            // Handle both AI and rule-based match details format
            const matchDetails = candidate.matchDetails || {};
            const overallFit = matchDetails.overallFit || '';
            
            // Detailed match analysis
            row['Gender Match'] = matchDetails.gender || matchDetails.genderMatch ? 'Yes' : 'No';
            row['Age Match'] = matchDetails.age || matchDetails.ageMatch ? 'Yes' : 'No';
            row['Experience Match'] = matchDetails.experience || matchDetails.experienceMatch ? 'Yes' : 'No';
            row['Skills Match %'] = matchDetails.skills || matchDetails.skillsMatch || 0;
            row['Location Match'] = matchDetails.location || matchDetails.locationMatch ? 'Yes' : 'No';
            row['Notice Period Match'] = matchDetails.noticePeriod || matchDetails.noticePeriodMatch ? 'Yes' : 'No';
            
            // AI Analysis (overall fit explanation)
            if (overallFit) {
                row['AI Analysis'] = overallFit;
            }
            
            // Complete match details as JSON
            row['Match Details (JSON)'] = JSON.stringify({
                gender: matchDetails.gender || matchDetails.genderMatch ? 'Yes' : 'No',
                age: matchDetails.age || matchDetails.ageMatch ? 'Yes' : 'No',
                experience: matchDetails.experience || matchDetails.experienceMatch ? 'Yes' : 'No',
                skills: `${matchDetails.skills || matchDetails.skillsMatch || 0}%`,
                location: matchDetails.location || matchDetails.locationMatch ? 'Yes' : 'No',
                noticePeriod: matchDetails.noticePeriod || matchDetails.noticePeriodMatch ? 'Yes' : 'No',
                overallFit: overallFit
            });

            return row;
        });

        console.log(`   ✓ Converted ${excelData.length} JSON candidate(s) to Excel rows`);
        console.log(`   ✓ Each row represents one candidate from one file`);
        console.log(`   ✓ Column order: File Info → Personal Info → Professional Info → Location → Salary → Extracted Text → Match Analysis`);

        // Create worksheet - each row = one candidate
        // Dynamically build header list from all available columns
        // This ensures all AI extracted data is mapped to Excel columns
        const allHeaders = new Set();
        
        // Add standard headers first (in order)
        const standardHeaders = [
            'File Name', 'File Type', 'Source File', 'Word Count',
            'Name', 'Email', 'Mobile', 'Age', 'Gender',
            'Qualification', 'Experience', 'Current Role', 'Skills',
            'Location', 'Preferred Location', 'Notice Period',
            'Salary', 'Address', 'Date of Birth', 'LinkedIn', 'GitHub',
            'Extracted Text'
        ];
        
        standardHeaders.forEach(h => allHeaders.add(h));
        
        // Add all other columns from excelData (AI extracted additional fields)
        excelData.forEach(row => {
            Object.keys(row).forEach(key => {
                if (key && !standardHeaders.includes(key) && 
                    !['Rank', 'Match Score', 'Gender Match', 'Age Match', 'Experience Match', 
                      'Skills Match %', 'Location Match', 'Notice Period Match', 'AI Analysis', 
                      'Match Details (JSON)'].includes(key)) {
                    allHeaders.add(key);
                }
            });
        });
        
        // Add match analysis columns
        const matchHeaders = [
            'Rank', 'Match Score',
            'Gender Match', 'Age Match', 'Experience Match', 'Skills Match %',
            'Location Match', 'Notice Period Match', 'AI Analysis', 'Match Details (JSON)'
        ];
        matchHeaders.forEach(h => allHeaders.add(h));
        
        // Convert to array for worksheet creation
        const headerArray = Array.from(allHeaders);
        
        console.log(`   ✓ Excel columns: ${headerArray.length} total columns`);
        console.log(`   ✓ Standard columns: ${standardHeaders.length}`);
        console.log(`   ✓ Additional AI extracted columns: ${headerArray.length - standardHeaders.length - matchHeaders.length}`);
        
        // Create worksheet with dynamic headers - maps all AI extracted data to Excel columns
        const worksheet = XLSX.utils.json_to_sheet(excelData, {
            header: headerArray,
            skipHeader: false
        });

        // Set column widths (auto-size)
        const maxWidth = 50;
        const minWidth = 10;
        const colWidths = [];
        
        // Calculate column widths
        if (excelData.length > 0) {
            Object.keys(excelData[0]).forEach((key, colIndex) => {
                const headerLength = key.length;
                let maxCellLength = headerLength;
                
                excelData.forEach(row => {
                    const cellValue = String(row[key] || '');
                    if (cellValue.length > maxCellLength) {
                        maxCellLength = cellValue.length;
                    }
                });
                
                colWidths.push({
                    wch: Math.min(Math.max(maxCellLength + 2, minWidth), maxWidth)
                });
            });
        }
        
        worksheet['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Candidates');

        // Create summary sheet
        const summaryData = [
            ['Smart Filter Analysis Summary'],
            [''],
            ['Total Candidates Analyzed:', candidates.length],
            ['Total Candidates Filtered:', candidates.length],
            ['Average Match Score:', candidates.length > 0 
                ? Math.round(candidates.reduce((sum, c) => sum + (c.matchScore || 0), 0) / candidates.length) 
                : 0],
            ['Highest Match Score:', candidates.length > 0 ? Math.max(...candidates.map(c => c.matchScore || 0)) : 0],
            ['Lowest Match Score:', candidates.length > 0 ? Math.min(...candidates.map(c => c.matchScore || 0)) : 0],
            [''],
            ['Generated At:', new Date().toLocaleString()]
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // Write file
        XLSX.writeFile(workbook, outputPath);

        return {
            success: true,
            filePath: outputPath,
            fileName: path.basename(outputPath)
        };

    } catch (error) {
        console.error("Excel generation error:", error);
        throw new Error(`Failed to generate Excel file: ${error.message}`);
    }
}

module.exports = {
    generateExcelFile
};

