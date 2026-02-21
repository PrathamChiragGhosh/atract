const generateTemplate7HTML = (parsedText) => {
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
    const aboutMe = personal.about || personal["About"] || personal.aboutMe || personal["About Me"] || personal.summary || personal["Summary"] || "";
    
    // Organize sections - only put Technical Skills in sidebar
    const allSections = Object.keys(parsedText);
    const sidebarSectionKeywords = ["Technical Skills", "TECHNICAL SKILLS"];
    const sidebarSections = allSections.filter(sec => 
        sidebarSectionKeywords.some(keyword => sec.toLowerCase() === keyword.toLowerCase())
    );
    const mainSections = allSections.filter(sec => 
        !sidebarSections.includes(sec) && 
        sec !== "Personal Information" && 
        sec !== "PERSONAL INFORMATION"
    );
    
    // Format sidebar skills section
    const formatSkillsSection = (sectionName, sectionData) => {
        if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) return '';
        
        let html = `<section class="resume-section" aria-label="${sectionName}">
            <h2 class="section-title">
                <span class="section-icon">#</span>
                ${sectionName.toUpperCase()}
            </h2>
            <ul class="skills-list">`;
        
        if (Array.isArray(sectionData)) {
            sectionData.forEach(entry => {
                if (typeof entry === "string") {
                    // Handle comma-separated skills
                    const skills = entry.split(',').map(s => s.trim()).filter(s => s);
                    skills.forEach(skill => {
                        html += `<li class="skill-item">${skill}</li>`;
                    });
                } else {
                    // Extract all values from the entry object
                    Object.entries(entry).forEach(([key, val]) => {
                        if (val && val.toString().trim()) {
                            const valStr = String(val).trim();
                            // Handle comma-separated values
                            if (valStr.includes(',')) {
                                const skills = valStr.split(',').map(s => s.trim()).filter(s => s);
                                skills.forEach(skill => {
                                    html += `<li class="skill-item">${skill}</li>`;
                                });
                            } else {
                                html += `<li class="skill-item">${valStr}</li>`;
                            }
                        }
                    });
                }
            });
        } else if (typeof sectionData === 'string') {
            // Handle comma-separated skills in string format
            const skills = sectionData.split(',').map(s => s.trim()).filter(s => s);
            skills.forEach(skill => {
                html += `<li class="skill-item">${skill}</li>`;
            });
        }
        
        html += `</ul></section>`;
        return html;
    };
    
    const skillsHtml = sidebarSections
        .map(sec => formatSkillsSection(sec, parsedText[sec]))
        .filter(html => html.trim().length > 0)
        .join("");
    
    // Format main sections
    const formatMainSection = (sectionName, sectionData) => {
        if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) return '';
        
        const sectionLower = sectionName.toLowerCase();
        const isExperience = sectionLower.includes('experience') || sectionLower.includes('work');
        const isEducation = sectionLower.includes('education');
        const isReferences = sectionLower.includes('references');
        const isSummary = sectionLower.includes('summary') || sectionLower.includes('professional summary');
        const isProjects = sectionLower.includes('project') || sectionLower.includes('open source') || sectionLower.includes('projects');
        const isLanguages = sectionLower.includes('language') || sectionLower.includes('languages');
        
        let html = `<section class="resume-section" aria-label="${sectionName}">
            <h2 class="section-title">
                <span class="section-icon">${isExperience ? '💼' : isEducation ? '🎓' : isReferences ? '📖' : ''}</span>
                ${sectionName.toUpperCase()}
            </h2>
            ${isSummary ? `<div class="summary-content">` : `<div class="section-content">`}`;
        
        if (Array.isArray(sectionData)) {
            // For experience and projects sections, merge related entries
            let entriesToProcess = sectionData;
            if (isExperience) {
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
            } else if (isProjects) {
                // Merge project entries - combine all fields into single project objects
                const mergedEntries = [];
                entriesToProcess.forEach((entry, idx) => {
                    if (typeof entry === "object" && entry !== null) {
                        const hasProjectTitle = !!(entry["Project Title"] || entry["Project Name"] || entry.projectName || entry.title || entry["Title"]);
                        if (hasProjectTitle) {
                            mergedEntries.push({ ...entry });
                        } else if (mergedEntries.length > 0) {
                            // Merge with last entry if it exists
                            const lastEntry = mergedEntries[mergedEntries.length - 1];
                            Object.assign(lastEntry, entry);
                        } else {
                            mergedEntries.push({ ...entry });
                        }
                    } else {
                        mergedEntries.push(entry);
                    }
                });
                entriesToProcess = mergedEntries;
            } else if (isEducation) {
                // Merge education entries - combine ALL consecutive entries into single education objects
                // Since each field is a separate entry, we merge them all into one
                const mergedEntries = [];
                let currentEducation = {};
                let hasStarted = false;
                
                entriesToProcess.forEach((entry, idx) => {
                    if (typeof entry === "object" && entry !== null) {
                        // Merge all fields into current education object
                        Object.assign(currentEducation, entry);
                        hasStarted = true;
                    } else {
                        // If we hit a non-object entry (like a string), save current education and start new
                        if (hasStarted && Object.keys(currentEducation).length > 0) {
                            mergedEntries.push(currentEducation);
                            currentEducation = {};
                            hasStarted = false;
                        }
                        mergedEntries.push(entry);
                    }
                });
                
                // Don't forget the last education entry
                if (hasStarted && Object.keys(currentEducation).length > 0) {
                    mergedEntries.push(currentEducation);
                }
                
                entriesToProcess = mergedEntries;
            } else if (isLanguages) {
                // Merge language entries - combine Language and Proficiency into single objects
                // Similar to education, merge consecutive entries until we hit a new language
                const mergedEntries = [];
                let currentLanguage = {};
                let hasStarted = false;
                
                entriesToProcess.forEach((entry, idx) => {
                    if (typeof entry === "object" && entry !== null) {
                        const hasLanguage = !!(entry["Language"] || entry.language || entry["Languages Spoken"] || entry.languagesSpoken);
                        if (hasLanguage && hasStarted && Object.keys(currentLanguage).length > 0) {
                            // New language entry - save previous and start new
                            mergedEntries.push(currentLanguage);
                            currentLanguage = { ...entry };
                        } else {
                            // Merge with current language entry
                            Object.assign(currentLanguage, entry);
                            hasStarted = true;
                        }
                    } else {
                        // If we hit a non-object entry, save current language and start new
                        if (hasStarted && Object.keys(currentLanguage).length > 0) {
                            mergedEntries.push(currentLanguage);
                            currentLanguage = {};
                            hasStarted = false;
                        }
                        mergedEntries.push(entry);
                    }
                });
                
                // Don't forget the last language entry
                if (hasStarted && Object.keys(currentLanguage).length > 0) {
                    mergedEntries.push(currentLanguage);
                }
                
                entriesToProcess = mergedEntries;
            }
            
            entriesToProcess.forEach((entry, idx) => {
                if (typeof entry === "string") {
                    if (isSummary) {
                        html += `<p class="summary-text">${entry}</p>`;
                    } else if (isLanguages) {
                        // Handle string entries for languages
                        html += `<article class="entry-item">
                            <div class="entry-header">
                                <div class="entry-title-group">
                                    <h3 class="entry-title">${entry}</h3>
                                </div>
                            </div>
                        </article>`;
                    } else {
                        html += `<p class="section-text">${entry}</p>`;
                    }
                } else if (isReferences) {
                    // References: side-by-side layout
                    const name = entry.name || entry["Name"] || entry.referenceName || entry["Reference Name"] || "";
                    const title = entry.title || entry["Title"] || entry.position || entry["Position"] || "";
                    const company = entry.company || entry["Company"] || entry.organization || entry["Organization"] || "";
                    const refPhone = entry.phone || entry["Phone"] || entry.referencePhone || entry["Reference Phone"] || "";
                    const refEmail = entry.email || entry["Email"] || entry.referenceEmail || entry["Reference Email"] || "";
                    
                    if (name || title || company) {
                        html += `<div class="reference-item">
                            <h3 class="reference-name">${name || ''}</h3>
                            ${company && title ? `<p class="reference-company">${company} / ${title}</p>` : company ? `<p class="reference-company">${company}</p>` : title ? `<p class="reference-company">${title}</p>` : ''}
                            ${refPhone ? `<p class="reference-contact">Phone: ${refPhone}</p>` : ''}
                            ${refEmail ? `<p class="reference-contact">Email: ${refEmail}</p>` : ''}
                        </div>`;
                    }
                } else if (isEducation) {
                    // For education, extract all fields directly from entry - check exact field names from parsed text first
                    // Based on actual format: "Degree", "Institution", "Start Year", "End Year", "Grade / CGPA"
                    const institution = entry["Institution"] || entry.institute || entry["institute"] || entry.institution || entry.university || entry["University"] || entry.school || entry["School"] || "";
                    const degree = entry["Degree"] || entry.degree || entry["degree"] || entry.qualification || entry["Qualification"] || "";
                    const major = entry.major || entry["Major"] || entry["major"] || entry.field || entry["Field"] || entry.fieldOfStudy || entry["Field of Study"] || "";
                    const eduStartDate = entry["Start Year"] || entry["Start Date"] || entry.eduStart || entry["eduStart"] || entry.startDate || entry.startYear || entry["Start Year"] || "";
                    const eduEndDate = entry["End Year"] || entry["End Date"] || entry.eduEnd || entry["eduEnd"] || entry.endDate || entry.endYear || entry["End Year"] || entry.graduationYear || entry["Graduation Year"] || "";
                    const gpa = entry["Grade / CGPA"] || entry["Grade / Score"] || entry["Grade"] || entry.grade || entry["grade"] || entry.gpa || entry["GPA"] || "";
                    const honors = entry.honors || entry["Honors"] || entry.achievements || entry["Achievements"] || "";
                    
                    const dates = eduStartDate && eduEndDate ? `${eduStartDate} - ${eduEndDate}` : eduStartDate || eduEndDate || "";
                    const degreeFull = degree + (major ? `, ${major}` : '');
                    
                    if (institution || degree || major) {
                        html += `<article class="entry-item" itemscope itemtype="http://schema.org/EducationalOccupationalCredential">
                            <div class="entry-header">
                                <div class="entry-title-group">
                                    ${degree ? `<h3 class="entry-title" itemprop="name">${degreeFull}</h3>` : ''}
                                    ${institution ? `<p class="entry-company" itemprop="credentialCategory">${institution}</p>` : ''}
                                </div>
                                ${dates ? `<time class="entry-dates" itemprop="dateCreated">${dates}</time>` : ''}
                            </div>
                            ${gpa || honors ? `<div class="entry-description">${gpa ? `Grade: ${gpa}` : ''}${gpa && honors ? ' | ' : ''}${honors ? `Honors: ${honors}` : ''}</div>` : ''}
                        </article>`;
                    }
                } else if (isProjects) {
                    // For projects, extract all fields directly from entry - check exact field names from parsed text first
                    // Based on actual database format: "Project Title", "Description", "Technologies Used", "Project / Repo Link"
                    const projectName = entry["Project Title"] || entry["Project Name"] || entry.projectName || entry["projectName"] || entry.name || entry["Name"] || entry.title || entry["Title"] || "";
                    const description = entry["Description"] || entry.description || entry.projectDescription || entry["Project Description"] || entry["projectDescription"] || entry.summary || entry["Summary"] || "";
                    const technologies = entry["Technologies Used"] || entry.technologies || entry["Technologies"] || entry.tech || entry["Tech"] || entry.techStack || entry["Tech Stack"] || entry.softwareUsed || entry["Software Used"] || "";
                    const link = entry["Project / Repo Link"] || entry.projectLink || entry["Project Link"] || entry["projectLink"] || entry.link || entry["Link"] || entry.url || entry["URL"] || entry.github || entry["GitHub"] || entry.campaignLinks || entry["Campaign Links"] || entry["Campaign / Asset Links"] || "";
                    const openSourceContributions = entry["Open Source Contributions"] || entry.openSourceContributions || entry["openSourceContributions"] || "";
                    
                    if (projectName) {
                        html += `<article class="entry-item">
                            <div class="entry-header">
                                <div class="entry-title-group">
                                    <h3 class="entry-title">${projectName}</h3>
                                </div>
                            </div>
                            ${description ? `<div class="entry-description">${description}</div>` : ''}
                            ${technologies ? `<div class="entry-description"><strong>Technologies:</strong> ${technologies}</div>` : ''}
                            ${openSourceContributions ? `<div class="entry-description"><strong>Open Source Contributions:</strong> ${openSourceContributions}</div>` : ''}
                            ${link ? `<div class="entry-description"><strong>Link:</strong> <a href="${link.startsWith('http') ? link : 'https://' + link}" target="_blank">${link}</a></div>` : ''}
                        </article>`;
                    }
                } else if (isLanguages) {
                    // For languages, display language and proficiency - check all possible field name variations
                    const language = entry.language || entry["Language"] || entry["language"] || entry.languagesSpoken || entry["Languages Spoken"] || entry.name || entry["Name"] || "";
                    const proficiency = entry.proficiency || entry["Proficiency"] || entry["proficiency"] || entry.level || entry["Level"] || entry.fluency || entry["Fluency"] || "";
                    
                    if (language) {
                        html += `<article class="entry-item">
                            <div class="entry-header">
                                <div class="entry-title-group">
                                    <h3 class="entry-title">${language}</h3>
                                    ${proficiency ? `<p class="entry-company">${proficiency}</p>` : ''}
                                </div>
                            </div>
                        </article>`;
                    }
                } else {
                    // For experience and other sections, extract fields
                    let company = "";
                    let title = "";
                    let entryLocation = "";
                    let startDate = "";
                    let endDate = "";
                    let description = "";
                    
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
                        } else if (keyLower.includes('date') || keyLower.includes('year') || keyLower.includes('period')) {
                            if (/^\d{4}-\d{2}(-\d{2})?$/.test(valStr)) {
                                if (!startDate && !endDate) startDate = valStr;
                                else if (startDate && !endDate) endDate = valStr;
                                else if (!startDate) startDate = valStr;
                            }
                        } else if (keyLower.includes('description') || keyLower.includes('responsibilities') || keyLower.includes('duties') || keyLower.includes('achievements')) {
                            if (!description) description = valStr;
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
                    description = description || entry.description || entry["Description"] || entry.responsibilities || entry["Responsibilities"] || entry.duties || entry["Duties"] || entry.achievements || entry["Achievements"] || "";
                    
                    if (entry.endDate === "Present" || entry["End Date"] === "Present" || endDate === "Present") {
                        endDate = "Present";
                    }
                    
                    const dates = startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate || "";
                    
                    if (company || title) {
                        html += `<article class="entry-item" ${isExperience ? 'itemscope itemtype="http://schema.org/JobPosting"' : ''}>
                            <div class="entry-header">
                                <div class="entry-title-group">
                                    ${title ? `<h3 class="entry-title" ${isExperience ? 'itemprop="title"' : ''}>${title}</h3>` : ''}
                                    ${company ? `<p class="entry-company" ${isExperience ? 'itemprop="hiringOrganization" itemscope itemtype="http://schema.org/Organization"' : ''}><span ${isExperience ? 'itemprop="name"' : ''}>${company}</span></p>` : ''}
                                </div>
                                ${dates ? `<time class="entry-dates" ${isExperience ? 'itemprop="datePosted"' : ''}>${dates}</time>` : ''}
                            </div>
                            ${description ? `<div class="entry-description" ${isExperience ? 'itemprop="description"' : ''}>${description}</div>` : ''}
                        </article>`;
                    }
                }
            });
        } else if (typeof sectionData === 'string') {
            if (isSummary) {
                html += `<p class="summary-text">${sectionData}</p>`;
            } else {
                html += `<p class="section-text">${sectionData}</p>`;
            }
        }
        
        html += `</div></section>`;
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
                line-height: 1.5;
                color: #2d3748;
                background: #ffffff;
                font-size: 11px;
            }
            h1, h2, h3, h4, h5, h6, p, span, div, article, section, header, time {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .resume-container {
                width: 794px;
                min-height: 1123px;
                margin: 0;
                background: #ffffff;
                display: flex;
                font-size: 11px;
            }
            .resume-sidebar {
                width: 35%;
                background: #e8f4f8;
                padding: 30px 24px;
                border-right: 1px solid #e2e8f0;
                min-height: 1123px;
                display: flex;
                flex-direction: column;
            }
            .profile-section {
                background: #d6eaf5;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 24px;
                text-align: center;
            }
            .profile-picture {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background: #cbd5e1;
                margin: 0 auto 12px;
                border: 3px solid #ffffff;
            }
            .profile-name {
                font-size: 22px;
                font-weight: 700;
                color: #2563eb;
                margin-bottom: 4px;
            }
            .profile-title {
                font-size: 12px;
                color: #718096;
                font-weight: 400;
            }
            .contact-section {
                margin-bottom: 24px;
            }
            .contact-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                font-size: 10px;
                color: #4a5568;
            }
            .contact-icon {
                width: 14px;
                height: 14px;
                margin-right: 8px;
                color: #2563eb;
            }
            .resume-section {
                margin-bottom: 24px;
            }
            .section-title {
                font-size: 13px;
                font-weight: 700;
                color: #1a202c;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .section-icon {
                margin-right: 8px;
                font-size: 14px;
            }
            .skills-list {
                list-style: none;
                padding: 0;
            }
            .skill-item {
                font-size: 10px;
                color: #4a5568;
                margin-bottom: 6px;
                padding-left: 12px;
                position: relative;
            }
            .skill-item::before {
                content: "•";
                position: absolute;
                left: 0;
                color: #2563eb;
                font-weight: bold;
            }
            .about-text {
                font-size: 10px;
                color: #4a5568;
                line-height: 1.6;
            }
            .resume-main {
                flex: 1;
                padding: 30px 36px;
                background: #ffffff;
                min-height: 1123px;
            }
            .section-content {
                position: relative;
            }
            .summary-content {
                position: relative;
            }
            .summary-text {
                font-size: 10px;
                color: #4a5568;
                line-height: 1.6;
                margin: 0;
            }
            .section-text {
                font-size: 10px;
                color: #4a5568;
                line-height: 1.6;
                margin: 0;
            }
            .entry-item {
                position: relative;
                margin-bottom: 20px;
                padding-left: 16px;
            }
            .entry-item::before {
                content: "";
                position: absolute;
                left: 0;
                top: 6px;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #2563eb;
            }
            .entry-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }
            .entry-title-group {
                flex: 1;
            }
            .entry-title {
                font-size: 12px;
                font-weight: 600;
                color: #1a202c;
                margin-bottom: 4px;
            }
            .entry-company {
                font-size: 11px;
                font-weight: 600;
                color: #2563eb;
                margin: 0;
            }
            .entry-dates {
                font-size: 10px;
                color: #718096;
                font-weight: 500;
                white-space: nowrap;
                margin-left: 12px;
            }
            .entry-description {
                font-size: 10px;
                color: #4a5568;
                line-height: 1.6;
                margin-top: 8px;
            }
            .reference-item {
                display: inline-block;
                vertical-align: top;
                width: 48%;
                margin-right: 4%;
                margin-bottom: 16px;
                padding: 12px;
                background: #f7fafc;
                border-radius: 6px;
            }
            .reference-item:nth-child(even) {
                margin-right: 0;
            }
            .reference-name {
                font-size: 12px;
                font-weight: 700;
                color: #1a202c;
                margin-bottom: 4px;
            }
            .reference-company {
                font-size: 10px;
                color: #4a5568;
                margin-bottom: 4px;
            }
            .reference-contact {
                font-size: 9px;
                color: #718096;
                margin: 2px 0;
            }
        </style>
    </head>
    <body>
        <div class="resume-container" itemscope itemtype="http://schema.org/Person">
            <aside class="resume-sidebar" aria-label="Profile and Contact Information">
                <div class="profile-section">
                    <div class="profile-picture"></div>
                    <h1 class="profile-name" itemprop="name">${fullName}</h1>
                    ${jobTitle ? `<p class="profile-title" itemprop="jobTitle">${jobTitle}</p>` : ''}
                </div>
                <section class="contact-section resume-section" aria-label="Contact Information">
                    <h2 class="section-title">
                        <span class="section-icon">📞</span>
                        Contact
                    </h2>
                    <div itemprop="contactPoint" itemscope itemtype="http://schema.org/ContactPoint">
                        ${phone ? `<div class="contact-item"><span class="contact-icon">📞</span><span itemprop="telephone">${phone}</span></div>` : ''}
                        ${email ? `<div class="contact-item"><span class="contact-icon">✉</span><span itemprop="email">${email}</span></div>` : ''}
                        ${location ? `<div class="contact-item"><span class="contact-icon">📍</span><span itemprop="address">${location}</span></div>` : ''}
                    </div>
                </section>
                ${aboutMe ? `<section class="resume-section" aria-label="About Me">
                    <h2 class="section-title">
                        <span class="section-icon">👤</span>
                        About Me
                    </h2>
                    <p class="about-text" itemprop="description">${aboutMe}</p>
                </section>` : ''}
                ${skillsHtml}
            </aside>
            <main class="resume-main" aria-label="Professional Experience and Education">
                ${mainHtml}
            </main>
        </div>
    </body>
    </html>`;
};
export default generateTemplate7HTML;
