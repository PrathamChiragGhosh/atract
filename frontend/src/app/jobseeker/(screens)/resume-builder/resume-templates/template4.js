const generateTemplate4HTML = (parsedText) => {
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
    const aboutMe = personal.about || personal["About"] || personal.aboutMe || personal["About Me"] || personal.summary || personal["Summary"] || personal["Professional Summary"] || "";
    
    // Get initials from full name for profile circle
    const getInitials = (name) => {
        if (!name) return "U";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };
    
    const initials = getInitials(fullName);
    
    // Organize sections
    const allSections = Object.keys(parsedText);
    const sidebarSectionKeywords = ["Languages", "LANGUAGES", "Skills", "SKILLS", "Expertise", "EXPERTISE", "Technical Skills", "TECHNICAL SKILLS"];
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
        
        const sectionLower = sectionName.toLowerCase();
        let html = `<section class="resume-section sidebar-section" aria-label="${sectionName}">
            <h2 class="sidebar-title">${sectionName.toUpperCase()}</h2>`;
        
        if (Array.isArray(sectionData)) {
            html += '<ul class="sidebar-list">';
            sectionData.forEach(entry => {
                if (typeof entry === "string") {
                    html += `<li class="sidebar-item">${entry}</li>`;
                } else {
                    Object.entries(entry).forEach(([key, val]) => {
                        if (val && val.toString().trim()) {
                            const keyLower = key.toLowerCase();
                            if (keyLower.includes('skill') || keyLower.includes('language') || keyLower.includes('expertise') || keyLower.includes('name')) {
                                html += `<li class="sidebar-item">${val}</li>`;
                            } else {
                                html += `<li class="sidebar-item"><strong>${key}:</strong> ${val}</li>`;
                            }
                        }
                    });
                }
            });
            html += '</ul>';
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
        
        let html = `<section class="template4-main-section" aria-label="${sectionName}">
            <h2 class="template4-main-section-title">${sectionName.toUpperCase()}</h2>`;

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
                            mergedEntries.push({ ...entry });
                        } else if (mergedEntries.length > 0) {
                            const lastEntry = mergedEntries[mergedEntries.length - 1];
                            const lastHasCompany = !!(lastEntry.company || lastEntry["Company"] || lastEntry.organization || lastEntry["Organization"]);
                            
                            if (lastHasCompany) {
                                Object.assign(lastEntry, entry);
                            } else {
                                mergedEntries.push({ ...entry });
                            }
                        } else {
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
                    html += `<p class="template4-section-text">${entry}</p>`;
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
                        
                        Object.keys(entry).forEach(key => {
                            const keyLower = key.toLowerCase();
                            const val = entry[key];
                            
                            if (!val || (typeof val !== 'string' && typeof val !== 'number')) return;
                            const valStr = String(val).trim();
                            if (!valStr) return;
                            
                            if (keyLower.includes('company') || keyLower.includes('organization') || keyLower.includes('employer')) {
                                if (!company) company = valStr;
                            } else if (keyLower.includes('title') || keyLower.includes('position') || keyLower.includes('role')) {
                                if (!title) title = valStr;
                            } else if (keyLower.includes('location') || keyLower.includes('city') || keyLower.includes('address')) {
                                if (!entryLocation) entryLocation = valStr;
                            } else if (keyLower.includes('start') && (keyLower.includes('date') || keyLower.includes('year'))) {
                                if (!startDate) startDate = valStr;
                            } else if (keyLower.includes('end') && (keyLower.includes('date') || keyLower.includes('year'))) {
                                if (!endDate) endDate = valStr;
                            } else if (keyLower.includes('date') || keyLower.includes('year') || keyLower.includes('period') || keyLower.includes('duration')) {
                                if (/^\d{4}-\d{2}(-\d{2})?$/.test(valStr)) {
                                    if (!startDate && !endDate) startDate = valStr;
                                    else if (startDate && !endDate) endDate = valStr;
                                    else if (!startDate) startDate = valStr;
                                }
                            } else if (keyLower.includes('responsibilities') || keyLower.includes('description') || keyLower.includes('duties') || keyLower.includes('achievements')) {
                                if (!responsibilities) responsibilities = valStr;
                            } else if (/^\d{4}-\d{2}(-\d{2})?$/.test(key)) {
                                if (!startDate && !endDate) startDate = valStr;
                                else if (startDate && !endDate) endDate = valStr;
                                else if (!startDate) startDate = valStr;
                            } else if (/^\d{4}-\d{2}(-\d{2})?$/.test(valStr)) {
                                if (!startDate && !endDate) startDate = valStr;
                                else if (startDate && !endDate) endDate = valStr;
                                else if (!startDate) startDate = valStr;
                            }
                        });
                        
                        company = company || entry.company || entry["Company"] || entry.organization || entry["Organization"] || "";
                        title = title || entry.title || entry["Title"] || entry.position || entry["Position"] || "";
                        entryLocation = entryLocation || entry.location || entry["Location"] || "";
                        startDate = startDate || entry.startDate || entry["Start Date"] || entry.startYear || entry["Start Year"] || "";
                        endDate = endDate || entry.endDate || entry["End Date"] || entry.endYear || entry["End Year"] || "";
                        responsibilities = responsibilities || entry.responsibilities || entry["Responsibilities"] || entry.description || entry["Description"] || "";
                        
                        if (entry.endDate === "Present" || entry["End Date"] === "Present" || endDate === "Present") {
                            endDate = "Present";
                        }
                        
                        const dates = startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate || "";
                        
                        if (company || title) {
                            html += `<article class="template4-experience-item" itemscope itemtype="http://schema.org/JobPosting">
                                <div class="template4-experience-header-info">
                                    <div class="template4-experience-company-location">
                                        <span class="template4-experience-company" itemprop="hiringOrganization" itemscope itemtype="http://schema.org/Organization">
                                            <span itemprop="name">${company || ''}</span>
                                        </span>
                                        ${entryLocation ? `<span class="template4-experience-location">${entryLocation}</span>` : ''}
                                    </div>
                                    ${dates ? `<span class="template4-experience-dates" itemprop="datePosted">${dates}</span>` : ''}
                                </div>
                                ${responsibilities ? `<div class="template4-experience-description" itemprop="description">${responsibilities}</div>` : ''}
                            </article>`;
                            if (idx < entriesToProcess.length - 1) {
                                html += `<div class="template4-experience-divider"></div>`;
                            }
                        }
                    } else if (sectionLower.includes('education')) {
                        const institution = entry.institution || entry["Institution"] || entry.university || entry["University"] || entry.school || entry["School"] || "";
                        const degree = entry.degree || entry["Degree"] || entry.qualification || entry["Qualification"] || "";
                        const major = entry.major || entry["Major"] || "";
                        const startDate = entry.startDate || entry["Start Date"] || entry.startYear || entry["Start Year"] || "";
                        const endDate = entry.endDate || entry["End Date"] || entry.endYear || entry["End Year"] || "";
                        const dates = startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate || "";
                        
                        html += `<article class="template4-education-item" itemscope itemtype="http://schema.org/EducationalOccupationalCredential">
                            <div class="template4-education-header-info">
                                <div class="template4-education-institution-degree">
                                    <span class="template4-education-institution" itemprop="credentialCategory">${institution || ''}</span>
                                    ${degree ? `<span class="template4-education-degree" itemprop="name">${degree}${major ? `, ${major}` : ''}</span>` : ''}
                                </div>
                                ${dates ? `<span class="template4-education-dates" itemprop="dateCreated">${dates}</span>` : ''}
                            </div>
                        </article>`;
                        if (idx < entriesToProcess.length - 1) {
                            html += `<div class="template4-education-divider"></div>`;
                        }
                    } else if (sectionLower.includes('skill') && sectionLower.includes('summary')) {
                        // Skills Summary with progress bars
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                const skillName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                                // Extract percentage if available (e.g., "Design Photos: 85")
                                let percentage = 85; // Default
                                const valStr = String(val).trim();
                                if (valStr.includes(':')) {
                                    const parts = valStr.split(':');
                                    if (parts.length > 1) {
                                        const percentMatch = parts[1].match(/\d+/);
                                        if (percentMatch) {
                                            percentage = parseInt(percentMatch[0]);
                                        }
                                    }
                                } else if (/^\d+$/.test(valStr)) {
                                    percentage = parseInt(valStr);
                                }
                                
                                html += `<div class="template4-skill-summary-item">
                                    <div class="template4-skill-name">${skillName}</div>
                                    <div class="template4-skill-bar-container">
                                        <div class="template4-skill-bar-fill" style="width: ${percentage}%"></div>
                                    </div>
                                </div>`;
                            }
                        });
                    } else {
                        html += `<article class="template4-generic-item">`;
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                html += `<p class="template4-generic-field"><strong>${key}:</strong> ${val}</p>`;
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
        <link rel="stylesheet" href="/resume-templates/template4.css">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
                font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                line-height: 1.5;
                color: #1a237e;
                background: #f5f5f5;
                font-size: 11px;
            }
            .resume-container {
                width: 794px;
                min-height: 1123px;
                margin: 0;
                background: #ffffff;
                display: flex;
                font-size: 11px;
                position: relative;
                overflow: hidden;
            }
            /* Decorative background elements */
            .resume-container::before {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 200px;
                height: 200px;
                background: rgba(200, 200, 200, 0.1);
                border-radius: 50%;
                z-index: 0;
            }
            .template4-container::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 150px;
                height: 150px;
                background: rgba(200, 200, 200, 0.1);
                border-radius: 50%;
                z-index: 0;
            }
            h1, h2, h3, h4, h5, h6, p, span, div, article, section, header, time {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .template4-body {
                display: flex;
                flex: 1;
                position: relative;
                z-index: 1;
            }
            .template4-sidebar {
                width: 32%;
                background: #1a237e;
                color: white;
                padding: 28px 20px;
                position: relative;
                z-index: 1;
            }
            .template4-profile-section {
                text-align: center;
                margin-bottom: 28px;
            }
            .template4-profile-circle {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: #ffffff;
                margin: 0 auto 20px;
                border: 3px solid #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }
            .template4-profile-initials {
                font-size: 42px;
                font-weight: 700;
                color: #1a237e;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            .template4-contact-section {
                margin-bottom: 24px;
            }
            .template4-contact-item {
                font-size: 10px;
                margin: 8px 0;
                color: #ffffff;
                line-height: 1.6;
            }
            .template4-sidebar-title {
                font-size: 12px;
                font-weight: 700;
                margin-top: 20px;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #ffffff;
            }
            .template4-sidebar-section {
                margin-bottom: 20px;
            }
            .template4-sidebar-list {
                padding-left: 0;
                margin: 0;
                list-style: none;
            }
            .template4-sidebar-item {
                font-size: 10px;
                margin-bottom: 6px;
                color: #e8eaf6;
                line-height: 1.5;
            }
            .template4-main {
                flex: 1;
                padding: 32px 36px;
                background: #ffffff;
                color: #1a237e;
                position: relative;
                z-index: 1;
            }
            .template4-header-main {
                margin-bottom: 32px;
            }
            .template4-name {
                font-size: 32px;
                font-weight: 700;
                margin: 0 0 6px 0;
                color: #1a237e;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .template4-job-title {
                font-size: 14px;
                font-weight: 400;
                margin: 0;
                color: #1a237e;
            }
            .template4-main-section {
                margin-bottom: 24px;
            }
            .template4-main-section-title {
                font-size: 14px;
                font-weight: 700;
                margin: 0 0 16px 0;
                padding: 8px 12px;
                background: #1a237e;
                color: #ffffff;
                text-transform: uppercase;
                letter-spacing: 1px;
                display: inline-block;
            }
            .template4-section-text {
                font-size: 11px;
                color: #1a237e;
                line-height: 1.6;
                margin-bottom: 8px;
            }
            .template4-experience-item {
                margin-bottom: 16px;
            }
            .template4-experience-header-info {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }
            .template4-experience-company-location {
                flex: 1;
            }
            .template4-experience-company {
                font-size: 13px;
                font-weight: 700;
                color: #1a237e;
                display: block;
                margin-bottom: 4px;
            }
            .template4-experience-location {
                font-size: 11px;
                color: #424242;
                display: block;
            }
            .template4-experience-dates {
                font-size: 11px;
                color: #424242;
                font-weight: 500;
            }
            .template4-experience-description {
                font-size: 11px;
                color: #424242;
                line-height: 1.6;
                margin-top: 8px;
            }
            .template4-experience-divider {
                height: 1px;
                background: #1a237e;
                margin: 16px 0;
                opacity: 0.2;
            }
            .template4-education-item {
                margin-bottom: 16px;
            }
            .template4-education-header-info {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
            .template4-education-institution-degree {
                flex: 1;
            }
            .template4-education-institution {
                font-size: 13px;
                font-weight: 700;
                color: #1a237e;
                display: block;
                margin-bottom: 4px;
            }
            .template4-education-degree {
                font-size: 11px;
                color: #424242;
                display: block;
            }
            .template4-education-dates {
                font-size: 11px;
                color: #424242;
                font-weight: 500;
            }
            .template4-education-divider {
                height: 1px;
                background: #1a237e;
                margin: 16px 0;
                opacity: 0.2;
            }
            .template4-skill-summary-item {
                margin-bottom: 16px;
            }
            .template4-skill-name {
                font-size: 11px;
                font-weight: 600;
                color: #1a237e;
                margin-bottom: 6px;
            }
            .template4-skill-bar-container {
                width: 100%;
                height: 8px;
                background: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
            }
            .template4-skill-bar-fill {
                height: 100%;
                background: #1a237e;
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            .template4-generic-item {
                margin-bottom: 12px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 3px;
            }
            .template4-generic-field {
                font-size: 11px;
                margin: 4px 0;
                color: #424242;
                line-height: 1.4;
            }
        </style>
    </head>
    <body>
        <div class="template4-container" itemscope itemtype="http://schema.org/Person">
            <div class="template4-body">
                <aside class="template4-sidebar" aria-label="Profile and Skills">
                    <div class="template4-profile-section">
                        <div class="template4-profile-circle">
                            <span class="template4-profile-initials">${initials}</span>
                        </div>
                    </div>
                    ${aboutMe ? `<section class="template4-sidebar-section">
                        <h2 class="template4-sidebar-title">About Me</h2>
                        <p class="template4-contact-item" style="font-size: 10px; line-height: 1.6; color: #e8eaf6;">${aboutMe}</p>
                    </section>` : ''}
                    <div class="template4-contact-section">
                        <h2 class="template4-sidebar-title">Contact</h2>
                        ${phone ? `<p class="template4-contact-item">📞 ${phone}</p>` : ''}
                        ${email ? `<p class="template4-contact-item">✉ ${email}</p>` : ''}
                        ${location ? `<p class="template4-contact-item">📍 ${location}</p>` : ''}
                    </div>
                    ${sidebarHtml}
                </aside>
                <main class="template4-main" aria-label="Professional Experience">
                    <header class="template4-header-main">
                        <h1 class="template4-name" itemprop="name">${fullName.toUpperCase()}</h1>
                        ${jobTitle ? `<p class="template4-job-title" itemprop="jobTitle">${jobTitle}</p>` : ''}
                    </header>
                    ${mainHtml}
                </main>
            </div>
        </div>
    </body>
    </html>`;
};

export default generateTemplate4HTML;

