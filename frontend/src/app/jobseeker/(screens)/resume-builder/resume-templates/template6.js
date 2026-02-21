const generateTemplate6HTML = (parsedText) => {
    // Get personal information
    const personalInfoArray = parsedText["Personal Information"] || parsedText["PERSONAL INFORMATION"] || [];
    const personal = {};
    if (Array.isArray(personalInfoArray)) {
        personalInfoArray.forEach(entry => {
            if (typeof entry === 'object' && entry !== null) {
                Object.assign(personal, entry);
            }
        });
    }
    
    const fullName = personal.fullName || personal["Full Name"] || "Your Name";
    const jobTitle = personal.title || personal["Title"] || personal.jobTitle || personal["Job Title"] || "";
    const email = personal.email || personal["Email"] || "";
    const phone = personal.phone || personal["Phone"] || "";
    const location = personal.location || personal["Location"] || personal.address || personal["Address"] || "";
    const linkedin = personal.linkedin || personal["LinkedIn"] || "";
    const github = personal.github || personal["GitHub"] || personal["Github"] || "";
    
    // Build contact info
    const contactItems = [];
    if (email) contactItems.push(`<span>${email}</span>`);
    if (phone) contactItems.push(`<span>${phone}</span>`);
    if (location) contactItems.push(`<span>${location}</span>`);
    if (linkedin) {
        const linkedinUrl = linkedin.startsWith('http') ? linkedin : `https://${linkedin}`;
        contactItems.push(`<a href="${linkedinUrl}">LinkedIn</a>`);
    }
    if (github) {
        const githubUrl = github.startsWith('http') ? github : `https://${github}`;
        contactItems.push(`<a href="${githubUrl}">GitHub</a>`);
    }
    
    // Organize sections
    const allSections = Object.keys(parsedText);
    const sidebarSectionKeywords = ["Skills", "SKILLS", "Education", "EDUCATION", "Languages", "LANGUAGES", "Certifications", "CERTIFICATIONS"];
    const sidebarSections = allSections.filter(sec => 
        sidebarSectionKeywords.some(keyword => sec.toLowerCase().includes(keyword.toLowerCase()))
    );
    const mainSections = allSections.filter(sec => 
        !sidebarSections.includes(sec) && 
        sec !== "Personal Information" && 
        sec !== "PERSONAL INFORMATION"
    );
    
    // Format sidebar sections
    const formatSidebarSection = (sectionName, sectionData) => {
        if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) return '';
        
        let html = `<section class="resume-section" aria-label="${sectionName}">
            <h2 class="section-title">${sectionName.toUpperCase()}</h2>`;
        
        if (Array.isArray(sectionData)) {
            sectionData.forEach(entry => {
                if (typeof entry === "string") {
                    html += `<p class="section-item">${entry}</p>`;
                } else {
                    Object.entries(entry).forEach(([key, val]) => {
                        if (val && val.toString().trim()) {
                            const keyLower = key.toLowerCase();
                            if (keyLower.includes('skill') || keyLower.includes('language') || keyLower.includes('name') || keyLower.includes('degree')) {
                                html += `<p class="section-item highlight">${val}</p>`;
                            } else {
                                html += `<p class="section-item"><strong>${key}:</strong> ${val}</p>`;
                            }
                        }
                    });
                }
            });
        }
        
        html += `</section>`;
        return html;
    };
    
    const sidebarHtml = sidebarSections
        .map(sec => formatSidebarSection(sec, parsedText[sec]))
        .filter(html => html.trim().length > 0)
        .join("");
    
    // Format main sections
    const formatMainSection = (sectionName, sectionData) => {
        if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) return '';
        
        // Use semantic heading level based on section type
        const headingLevel = sectionName.toLowerCase().includes('experience') || sectionName.toLowerCase().includes('work') ? 'h2' : 'h2';
        let html = `<section class="resume-section" aria-label="${sectionName}">
            <${headingLevel} class="section-title main-section-title">${sectionName.toUpperCase()}</${headingLevel}>`;
        
        if (Array.isArray(sectionData)) {
            // For experience sections, merge related entries into single entries
            let entriesToProcess = sectionData;
            const sectionLower = sectionName.toLowerCase();
            
            if (sectionLower.includes('experience') || sectionLower.includes('work')) {
                const mergedEntries = [];
                entriesToProcess.forEach((entry, idx) => {
                    if (typeof entry === "object" && entry !== null) {
                        const hasCompany = !!(entry.company || entry["Company"] || entry.organization || entry["Organization"]);
                        
                        if (hasCompany) {
                            // New experience entry with company
                            mergedEntries.push({ ...entry });
                        } else if (mergedEntries.length > 0) {
                            // Always merge with the last entry if it has a company
                            const lastEntry = mergedEntries[mergedEntries.length - 1];
                            const lastHasCompany = !!(lastEntry.company || lastEntry["Company"] || lastEntry.organization || lastEntry["Organization"]);
                            
                            if (lastHasCompany) {
                                // Last entry has company, merge current entry into it
                                Object.assign(lastEntry, entry);
                            } else {
                                // Can't merge, create new entry
                                mergedEntries.push({ ...entry });
                            }
                        } else {
                            // No previous entry to merge with - create new entry
                            mergedEntries.push({ ...entry });
                        }
                    } else {
                        mergedEntries.push(entry);
                    }
                });
                entriesToProcess = mergedEntries;
            }
            
            entriesToProcess.forEach((entry, idx) => {
                if (typeof entry === "string") {
                    html += `<p class="section-text">${entry}</p>`;
                } else {
                    const sectionLower = sectionName.toLowerCase();
                    
                    if (sectionLower.includes('experience') || sectionLower.includes('work')) {
                        // Extract all fields from merged entry
                        let company = "";
                        let title = "";
                        let entryLocation = "";
                        let startDate = "";
                        let endDate = "";
                        let responsibilities = "";
                        
                        // Extract from entry object - check all possible field name variations
                        Object.keys(entry).forEach(key => {
                            const keyLower = key.toLowerCase();
                            const val = entry[key];
                            
                            if (!val || (typeof val !== 'string' && typeof val !== 'number')) return;
                            
                            const valStr = String(val).trim();
                            if (!valStr) return;
                            
                            // Company
                            if (keyLower.includes('company') || keyLower.includes('organization') || keyLower.includes('employer')) {
                                if (!company) company = valStr;
                            }
                            // Title/Position
                            else if (keyLower.includes('title') || keyLower.includes('position') || keyLower.includes('role')) {
                                if (!title) title = valStr;
                            }
                            // Location
                            else if (keyLower.includes('location') || keyLower.includes('city') || keyLower.includes('address')) {
                                if (!entryLocation) entryLocation = valStr;
                            }
                            // Start Date
                            else if (keyLower.includes('start') && (keyLower.includes('date') || keyLower.includes('year'))) {
                                if (!startDate) startDate = valStr;
                            }
                            // End Date
                            else if (keyLower.includes('end') && (keyLower.includes('date') || keyLower.includes('year'))) {
                                if (!endDate) endDate = valStr;
                            }
                            // Dates (generic date fields)
                            else if (keyLower.includes('date') || keyLower.includes('year') || keyLower.includes('period') || keyLower.includes('duration')) {
                                // Check if value looks like a date
                                if (/^\d{4}-\d{2}(-\d{2})?$/.test(valStr)) {
                                    if (!startDate && !endDate) {
                                        startDate = valStr;
                                    } else if (startDate && !endDate) {
                                        endDate = valStr;
                                    } else if (!startDate) {
                                        startDate = valStr;
                                    }
                                }
                            }
                            // Responsibilities
                            else if (keyLower.includes('responsibilities') || keyLower.includes('description') || keyLower.includes('duties') || keyLower.includes('achievements')) {
                                if (!responsibilities) responsibilities = valStr;
                            }
                            // Check if the KEY itself is a date pattern
                            else if (/^\d{4}-\d{2}(-\d{2})?$/.test(key)) {
                                if (!startDate && !endDate) {
                                    startDate = valStr;
                                } else if (startDate && !endDate) {
                                    endDate = valStr;
                                } else if (!startDate) {
                                    startDate = valStr;
                                }
                            }
                            // Check if VALUE is a date pattern in any other field
                            else if (/^\d{4}-\d{2}(-\d{2})?$/.test(valStr)) {
                                if (!startDate && !endDate) {
                                    startDate = valStr;
                                } else if (startDate && !endDate) {
                                    endDate = valStr;
                                } else if (!startDate) {
                                    startDate = valStr;
                                }
                            }
                        });
                        
                        // Also check standard field names as fallback
                        company = company || entry.company || entry["Company"] || entry.organization || entry["Organization"] || "";
                        title = title || entry.title || entry["Title"] || entry.position || entry["Position"] || "";
                        entryLocation = entryLocation || entry.location || entry["Location"] || "";
                        startDate = startDate || entry.startDate || entry["Start Date"] || entry.startYear || entry["Start Year"] || "";
                        endDate = endDate || entry.endDate || entry["End Date"] || entry.endYear || entry["End Year"] || "";
                        responsibilities = responsibilities || entry.responsibilities || entry["Responsibilities"] || entry.description || entry["Description"] || "";
                        
                        // Handle "Present" case
                        if (entry.endDate === "Present" || entry["End Date"] === "Present" || endDate === "Present") {
                            endDate = "Present";
                        }
                        
                        const dates = startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate || "";
                        
                        // Only render card if we have at least company or title
                        if (company || title) {
                            html += `<article class="experience-item" itemscope itemtype="http://schema.org/JobPosting">
                                <header class="experience-header">
                                    <div class="experience-title-group">
                                        <h3 class="experience-title" itemprop="hiringOrganization" itemscope itemtype="http://schema.org/Organization">
                                            <span itemprop="name">${company || ''}</span>
                                        </h3>
                                        ${title ? `<p class="experience-role" itemprop="title">${title}</p>` : ''}
                                    </div>
                                    <div class="experience-meta">
                                        ${entryLocation ? `<span class="experience-location" itemprop="jobLocation" itemscope itemtype="http://schema.org/Place"><span itemprop="address">${entryLocation}</span></span>` : ''}
                                        ${dates ? `<time class="experience-dates" itemprop="datePosted">${dates}</time>` : ''}
                                    </div>
                                </header>
                                ${responsibilities ? `<div class="experience-description" itemprop="description">${responsibilities}</div>` : ''}
                            </article>`;
                        }
                    } else if (sectionLower.includes('education')) {
                        const institution = entry.institution || entry["Institution"] || entry.university || entry["University"] || "";
                        const degree = entry.degree || entry["Degree"] || "";
                        const major = entry.major || entry["Major"] || "";
                        const startDate = entry.startDate || entry["Start Date"] || entry.startYear || "";
                        const endDate = entry.endDate || entry["End Date"] || entry.endYear || "";
                        const dates = startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate || "";
                        
                        html += `<article class="education-item" itemscope itemtype="http://schema.org/EducationalOccupationalCredential">
                            <h3 class="education-institution" itemprop="credentialCategory">${institution || ''}</h3>
                            ${degree ? `<p class="education-degree" itemprop="name">${degree}${major ? `, ${major}` : ''}</p>` : ''}
                            ${dates ? `<time class="education-dates" itemprop="dateCreated">${dates}</time>` : ''}
                        </article>`;
                    } else {
                        html += `<article class="generic-item">`;
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                html += `<p class="generic-field"><strong>${key}:</strong> ${val}</p>`;
                            }
                        });
                        html += `</article>`;
                    }
                }
            });
        }
        
        html += `</section>`;
        return html;
    };
    
    const mainHtml = mainSections
        .map(sec => formatMainSection(sec, parsedText[sec]))
        .filter(html => html.trim().length > 0)
        .join("");
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="description" content="Resume of ${fullName}">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
                font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.4;
                color: #1a202c;
                background: #ffffff;
                font-size: 11px;
            }
            .resume-container {
                width: 794px;
                min-height: 1123px;
                margin: 0;
                background: #ffffff;
                display: flex;
                flex-direction: column;
                font-size: 11px;
            }
            /* Ensure text is always readable and extractable */
            h1, h2, h3, h4, h5, h6, p, span, div, article, section, header, time {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .resume-header {
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
                color: white;
                padding: 30px 40px;
            }
            .resume-header h1 {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 6px;
                letter-spacing: -0.3px;
            }
            .resume-header .job-title {
                font-size: 14px;
                opacity: 0.95;
                margin-bottom: 12px;
                font-weight: 400;
            }
            .resume-header .contact-info {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
                font-size: 11px;
            }
            .resume-header .contact-info span,
            .resume-header .contact-info a {
                color: rgba(255, 255, 255, 0.95);
                text-decoration: none;
            }
            .resume-header .contact-info a:hover {
                text-decoration: underline;
            }
            .resume-body {
                display: flex;
                flex: 1;
            }
            .resume-sidebar {
                width: 35%;
                background: #f7fafc;
                padding: 30px 24px;
                border-right: 1px solid #e2e8f0;
            }
            .resume-main {
                flex: 1;
                padding: 30px 36px;
            }
            .resume-section {
                margin-bottom: 20px;
            }
            .section-title {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 10px;
                color: #1e40af;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 4px;
            }
            .main-section-title {
                color: #1a202c;
                border-bottom: 2px solid #2563eb;
                font-size: 12px;
            }
            .section-item {
                font-size: 10px;
                margin-bottom: 4px;
                color: #2d3748;
                line-height: 1.4;
            }
            .section-item.highlight {
                font-weight: 500;
                color: #1a202c;
                font-size: 10px;
            }
            .section-text {
                font-size: 11px;
                color: #2d3748;
                line-height: 1.5;
                margin-bottom: 8px;
            }
            .experience-item {
                margin-bottom: 16px;
                padding: 14px;
                background: #f7fafc;
                border-radius: 4px;
                border-left: 3px solid #2563eb;
            }
            .experience-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 6px;
            }
            .experience-title-group {
                flex: 1;
            }
            .experience-title {
                font-size: 13px;
                font-weight: 600;
                margin-bottom: 3px;
                color: #1a202c;
            }
            .experience-role {
                font-size: 11px;
                font-weight: 500;
                color: #2563eb;
                margin: 0;
            }
            .experience-meta {
                text-align: right;
                font-size: 10px;
                color: #718096;
            }
            .experience-location {
                display: block;
                margin-bottom: 2px;
            }
            .experience-dates {
                display: block;
                font-weight: 500;
            }
            .experience-description {
                font-size: 10px;
                color: #2d3748;
                line-height: 1.5;
                margin-top: 6px;
            }
            .education-item {
                margin-bottom: 14px;
                padding: 12px;
                background: #f7fafc;
                border-radius: 4px;
                border-left: 3px solid #7c3aed;
            }
            .education-institution {
                font-size: 13px;
                font-weight: 600;
                margin-bottom: 3px;
                color: #1a202c;
            }
            .education-degree {
                font-size: 11px;
                font-weight: 500;
                color: #7c3aed;
                margin-bottom: 3px;
            }
            .education-dates {
                font-size: 10px;
                color: #718096;
            }
            .generic-item {
                margin-bottom: 12px;
                padding: 10px;
                background: #f7fafc;
                border-radius: 3px;
            }
            .generic-field {
                font-size: 10px;
                margin: 2px 0;
                color: #2d3748;
                line-height: 1.4;
            }
        </style>
    </head>
    <body>
        <div class="resume-container" itemscope itemtype="http://schema.org/Person">
            <header class="resume-header">
                <h1 itemprop="name">${fullName}</h1>
                ${jobTitle ? `<p class="job-title" itemprop="jobTitle">${jobTitle}</p>` : ''}
                ${contactItems.length > 0 ? `<div class="contact-info" itemprop="contactPoint" itemscope itemtype="http://schema.org/ContactPoint">
                    ${email ? `<span itemprop="email">${email}</span>` : ''}
                    ${phone ? `<span itemprop="telephone">${phone}</span>` : ''}
                    ${location ? `<span itemprop="address">${location}</span>` : ''}
                    ${linkedin ? `<a href="${linkedin.startsWith('http') ? linkedin : 'https://' + linkedin}" itemprop="sameAs">LinkedIn</a>` : ''}
                    ${github ? `<a href="${github.startsWith('http') ? github : 'https://' + github}" itemprop="sameAs">GitHub</a>` : ''}
                </div>` : ''}
            </header>
            <div class="resume-body">
                <aside class="resume-sidebar" aria-label="Skills and Qualifications">
                    ${sidebarHtml}
                </aside>
                <main class="resume-main" aria-label="Professional Experience and Education">
                    ${mainHtml}
                </main>
            </div>
        </div>
    </body>
    </html>`;
};
export default generateTemplate6HTML;
