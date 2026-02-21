const generateTemplate1HTML = (parsedText, profilePicture = null) => {
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
        
        // Get initials from full name
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
        
        const sectionLower = sectionName.toLowerCase();
        const isTechnicalSkills = sectionLower.includes('technical skills');
        const isEducation = sectionLower.includes('education');
        const isCertifications = sectionLower.includes('certification');
        
        let html = `<section class="resume-section" aria-label="${sectionName}">
            <h2 class="section-title sidebar-title">${sectionName.toUpperCase()}</h2>`;
        
        if (Array.isArray(sectionData)) {
            // For Education and Certifications, merge entries first (like experience merging)
            let entriesToProcess = sectionData;
            if (isEducation || isCertifications) {
                const mergedEntries = [];
                let currentEducation = {};
                let fieldCount = 0;
                
                entriesToProcess.forEach((entry, idx) => {
                    if (typeof entry === "object" && entry !== null) {
                        // Merge all fields into current entry
                        Object.assign(currentEducation, entry);
                        fieldCount++;
                        
                        if (isEducation) {
                            // Check if we've collected all fields for one education (typically 5: Degree, Institution, Start Year, End Year, Grade)
                            const hasDegree = Object.keys(entry).some(key => key.toLowerCase().includes('degree'));
                            const hasInstitution = Object.keys(entry).some(key => 
                                key.toLowerCase().includes('institution') || key.toLowerCase().includes('university')
                            );
                            const currentHasDegree = Object.keys(currentEducation).some(key => key.toLowerCase().includes('degree'));
                            const currentHasInstitution = Object.keys(currentEducation).some(key => 
                                key.toLowerCase().includes('institution') || key.toLowerCase().includes('university')
                            );
                            
                            // If next entry exists and has degree/institution AND current already has them, save current and start new
                            const nextEntry = idx < entriesToProcess.length - 1 ? entriesToProcess[idx + 1] : null;
                            if (nextEntry && typeof nextEntry === "object" && nextEntry !== null) {
                                const nextHasDegree = Object.keys(nextEntry).some(key => key.toLowerCase().includes('degree'));
                                const nextHasInstitution = Object.keys(nextEntry).some(key => 
                                    key.toLowerCase().includes('institution') || key.toLowerCase().includes('university')
                                );
                                
                                // If next entry starts a new education (has degree/institution) and current already has them, save current
                                if ((nextHasDegree || nextHasInstitution) && (currentHasDegree || currentHasInstitution) && fieldCount >= 2) {
                                    mergedEntries.push(currentEducation);
                                    currentEducation = {};
                                    fieldCount = 0;
                                }
                            }
                        } else if (isCertifications) {
                            // For certifications, check if next entry starts a new certification (has Name or Title)
                            const hasName = Object.keys(entry).some(key => 
                                key.toLowerCase().includes('name') || key.toLowerCase().includes('title') || key.toLowerCase().includes('certification')
                            );
                            const currentHasName = Object.keys(currentEducation).some(key => 
                                key.toLowerCase().includes('name') || key.toLowerCase().includes('title') || key.toLowerCase().includes('certification')
                            );
                            
                            // If next entry exists and has name/title AND current already has them, save current and start new
                            const nextEntry = idx < entriesToProcess.length - 1 ? entriesToProcess[idx + 1] : null;
                            if (nextEntry && typeof nextEntry === "object" && nextEntry !== null) {
                                const nextHasName = Object.keys(nextEntry).some(key => 
                                    key.toLowerCase().includes('name') || key.toLowerCase().includes('title') || key.toLowerCase().includes('certification')
                                );
                                
                                // If next entry starts a new certification (has name/title) and current already has them, save current
                                if (nextHasName && currentHasName && fieldCount >= 2) {
                                    mergedEntries.push(currentEducation);
                                    currentEducation = {};
                                    fieldCount = 0;
                                }
                            }
                        }
                    } else {
                        // If we hit a non-object entry, save current entry if it exists
                        if (Object.keys(currentEducation).length > 0) {
                            mergedEntries.push(currentEducation);
                            currentEducation = {};
                            fieldCount = 0;
                        }
                        mergedEntries.push(entry);
                    }
                });
                
                // Don't forget the last entry
                if (Object.keys(currentEducation).length > 0) {
                    mergedEntries.push(currentEducation);
                }
                
                entriesToProcess = mergedEntries;
            }
            
            html += '<ul class="sidebar-list">';
            entriesToProcess.forEach((entry, idx) => {
                if (typeof entry === "string") {
                    html += `<li class="sidebar-item">${entry}</li>`;
                } else {
                    if (isEducation || isCertifications) {
                        // For Education and Certifications, wrap each complete entry in a bordered container
                        // Only add border if this is not the last entry
                        const isLastEntry = idx === entriesToProcess.length - 1;
                        const borderStyle = !isLastEntry ? 'border-bottom: 1px solid rgba(255, 255, 255, 0.3); padding-bottom: 8px; margin-bottom: 8px;' : '';
                        html += `<li class="sidebar-education-entry" style="${borderStyle}">`;
                        
                        // Display all fields of this entry together
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                const keyLower = key.toLowerCase();
                                if (isEducation) {
                                    if (keyLower.includes('degree') || keyLower.includes('institution') || keyLower.includes('university')) {
                                        html += `<div class="sidebar-item" style="margin-bottom: 2px;">${val}</div>`;
                                    } else {
                                        html += `<div class="sidebar-item" style="margin-bottom: 2px;"><strong>${key}:</strong> ${val}</div>`;
                                    }
                                } else if (isCertifications) {
                                    if (keyLower.includes('name') || keyLower.includes('title') || keyLower.includes('certification')) {
                                        html += `<div class="sidebar-item" style="margin-bottom: 2px;">${val}</div>`;
                                    } else {
                                        html += `<div class="sidebar-item" style="margin-bottom: 2px;"><strong>${key}:</strong> ${val}</div>`;
                                    }
                                }
                            }
                        });
                        
                        html += `</li>`;
                    } else {
                        // For non-education sections, use original logic
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                const keyLower = key.toLowerCase();
                                // For Technical Skills, always show sub-headings (Programming Languages:, Frameworks:, etc.)
                                if (isTechnicalSkills) {
                                    html += `<li class="sidebar-item"><strong style="color: #ffffff;">${key}:</strong> ${val}</li>`;
                                } else if (keyLower.includes('skill') || keyLower.includes('language') || keyLower.includes('name') || keyLower.includes('degree')) {
                                    html += `<li class="sidebar-item">${val}</li>`;
                                } else {
                                    html += `<li class="sidebar-item"><strong>${key}:</strong> ${val}</li>`;
                                }
                            }
                        });
                    }
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
        
        let html = `<section class="resume-section" aria-label="${sectionName}">
            <h2 class="section-title main-section-title">${sectionName.toUpperCase()}</h2>`;

        if (Array.isArray(sectionData)) {
            // For experience and project sections, merge related entries into single entries
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
            } else if (sectionLower.includes('project') || sectionLower.includes('open source')) {
                // Merge project entries - group all fields that belong to the same project
                const mergedEntries = [];
                let currentProject = null;
                
                entriesToProcess.forEach((entry, idx) => {
                    if (typeof entry === "object" && entry !== null) {
                        // Check if this entry has a project title - look for specific title fields
                        const entryHasTitle = !!(entry.title || entry["Title"] || entry["Project Title"] || entry.projectTitle || 
                                                 Object.keys(entry).some(key => {
                                                     const keyLower = key.toLowerCase();
                                                     // Must include 'title' or 'project' but not be a link/repo/github/contribution field
                                                     return (keyLower.includes('title') || (keyLower.includes('project') && keyLower.includes('title'))) && 
                                                            !keyLower.includes('link') && !keyLower.includes('repo') && 
                                                            !keyLower.includes('github') && !keyLower.includes('contribution') &&
                                                            !keyLower.includes('technolog') && !keyLower.includes('description');
                                                 }));
                        
                        if (entryHasTitle) {
                            // If we already have a project being built, save it first
                            if (currentProject !== null) {
                                mergedEntries.push({ ...currentProject });
                            }
                            // Start a new project
                            currentProject = { ...entry };
                        } else {
                            // This entry doesn't have a title, so it's a continuation of the current project
                            if (currentProject !== null) {
                                // Merge into current project
                                Object.assign(currentProject, entry);
                            } else {
                                // No project started yet - this might be the first entry
                                // Check if next entry has a title
                                const nextEntry = idx < entriesToProcess.length - 1 ? entriesToProcess[idx + 1] : null;
                                const nextHasTitle = nextEntry && typeof nextEntry === "object" && nextEntry !== null &&
                                                    !!(nextEntry.title || nextEntry["Title"] || nextEntry["Project Title"] || nextEntry.projectTitle ||
                                                       Object.keys(nextEntry).some(key => {
                                                           const keyLower = key.toLowerCase();
                                                           return (keyLower.includes('title') || (keyLower.includes('project') && keyLower.includes('title'))) && 
                                                                  !keyLower.includes('link') && !keyLower.includes('repo') && 
                                                                  !keyLower.includes('github') && !keyLower.includes('contribution') &&
                                                                  !keyLower.includes('technolog') && !keyLower.includes('description');
                                                       }));
                                
                                if (nextHasTitle) {
                                    // This entry belongs to the next project, start a new project
                                    currentProject = { ...entry };
                                } else {
                                    // No clear project structure, just add as is
                                    mergedEntries.push({ ...entry });
                                }
                            }
                        }
                    } else {
                        // String entry - if we have a project being built, merge it, otherwise add as is
                        if (currentProject !== null) {
                            if (!currentProject.description) {
                                currentProject.description = entry;
                            } else {
                                currentProject.description += " " + entry;
                            }
                        } else {
                            mergedEntries.push(entry);
                        }
                    }
                });
                
                // Don't forget to add the last project if we were building one
                if (currentProject !== null) {
                    mergedEntries.push({ ...currentProject });
                }
                
                entriesToProcess = mergedEntries;
            }
            
            entriesToProcess.forEach((entry, idx) => {
                if (typeof entry === "string") {
                    html += `<p class="section-text">${entry}</p>`;
                } else {
                    const sectionLower = sectionName.toLowerCase();
                    const isSummary = sectionLower.includes('summary') || sectionLower.includes('profile');
                    
                    if (isSummary) {
                        // For summary sections, display in a card like other sections
                        html += `<article class="summary-item">`;
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                // Just display the value, skip the field name/key
                                html += `<p class="section-text">${val}</p>`;
                            }
                        });
                        html += `</article>`;
                    } else if (sectionLower.includes('experience') || sectionLower.includes('work')) {
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
                    } else if (sectionLower.includes('project') || sectionLower.includes('open source')) {
                        // For projects, display each project in a card with all fields
                        html += `<article class="project-item" itemscope itemtype="http://schema.org/CreativeWork">`;
                        let projectTitle = "";
                        let description = "";
                        let technologies = "";
                        let projectLink = "";
                        let githubLink = "";
                        let openSourceContributions = "";
                        
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                const keyLower = key.toLowerCase();
                                const valStr = val.toString().trim();
                                
                                if (keyLower.includes('title') || keyLower.includes('name') || (keyLower.includes('project') && !keyLower.includes('link'))) {
                                    if (!projectTitle) projectTitle = valStr;
                                } else if (keyLower.includes('description') || keyLower.includes('summary')) {
                                    if (!description) description = valStr;
                                } else if (keyLower.includes('technolog') || keyLower.includes('tech') || keyLower.includes('stack') || keyLower.includes('tools')) {
                                    if (!technologies) technologies = valStr;
                                } else if (keyLower.includes('open source') || keyLower.includes('contribution')) {
                                    if (!openSourceContributions) openSourceContributions = valStr;
                                } else if (keyLower.includes('github') || (keyLower.includes('repo') && keyLower.includes('link'))) {
                                    if (!githubLink) githubLink = valStr;
                                } else if (keyLower.includes('link') || keyLower.includes('url') || keyLower.includes('repo')) {
                                    if (!projectLink) projectLink = valStr;
                                }
                            }
                        });
                        
                        if (projectTitle) {
                            html += `<h3 class="project-title" itemprop="name">${projectTitle}</h3>`;
                        }
                        if (description) {
                            html += `<p class="project-description" itemprop="description">${description}</p>`;
                        }
                        if (technologies) {
                            html += `<p class="project-technologies"><strong>Technologies:</strong> ${technologies}</p>`;
                        }
                        if (githubLink) {
                            html += `<p class="project-link"><strong>GitHub:</strong> <a href="${githubLink}" target="_blank" itemprop="url">${githubLink}</a></p>`;
                        }
                        if (projectLink && projectLink !== githubLink) {
                            html += `<p class="project-link"><strong>Link:</strong> <a href="${projectLink}" target="_blank" itemprop="url">${projectLink}</a></p>`;
                        }
                        if (openSourceContributions) {
                            html += `<p class="project-contributions"><strong>Open Source Contributions:</strong> ${openSourceContributions}</p>`;
                        }
                        html += `</article>`;
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
                font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
                font-size: 11px;
                box-sizing: border-box;
            }
            h1, h2, h3, h4, h5, h6, p, span, div, article, section, header, time {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .resume-body {
                display: flex;
                flex: 1;
                min-height: 1123px;
                align-items: stretch;
                box-sizing: border-box;
            }
            .resume-sidebar {
                width: 254px;
                background: #223046;
                color: white;
                padding: 24px 16px;
                min-height: 1123px;
                flex-shrink: 0;
                box-sizing: border-box;
            }
            .profile-circle {
                text-align: center;
                margin-bottom: 20px;
            }
            .profile-circle-inner {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
                margin: 0 auto;
                border: 3px solid #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            .profile-initials {
                font-size: 36px;
                font-weight: 700;
                color: #ffffff;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .profile-picture-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
            }
            .contact-section {
                margin-bottom: 20px;
            }
            .sidebar-title {
                font-size: 12px;
                font-weight: 700;
                margin-top: 16px;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #ffffff !important;
            }
            .resume-sidebar .section-title {
                color: #ffffff !important;
            }
            .sidebar-list {
                padding-left: 10px;
                margin: 0;
                list-style: none;
            }
            .sidebar-item {
                font-size: 10px;
                margin-bottom: 5px;
                color: #e5e7eb;
                line-height: 1.4;
            }
            .contact-item {
                font-size: 11px;
                margin: 4px 0;
                line-height: 1.4;
                color: #e5e7eb;
                padding-left: 10px;
            }
            .resume-main {
                flex: 1;
                padding: 24px 28px;
                color: #000;
                min-height: 1123px;
                background: #ffffff;
                box-sizing: border-box;
                overflow-x: hidden;
                word-wrap: break-word;
            }
            @page {
                size: A4;
                margin: 0;
            }
            @media print {
                html, body {
                    background: linear-gradient(to right, #223046 0%, #223046 254px, #ffffff 254px, #ffffff 100%);
                    background-size: 794px 1123px;
                    background-repeat: repeat-y;
                }
                .resume-container {
                    background: transparent;
                    page-break-after: always;
                    break-after: page;
                }
                .resume-container:last-child {
                    page-break-after: auto;
                    break-after: auto;
                }
                .resume-sidebar {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    color-adjust: exact;
                }
                .resume-sidebar .resume-section {
                    page-break-inside: avoid;
                    break-inside: avoid;
                    page-break-after: auto;
                    break-after: auto;
                }
                .resume-sidebar .contact-section {
                    page-break-inside: avoid;
                    break-inside: avoid;
                    page-break-after: auto;
                    break-after: auto;
                }
                .resume-main {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    color-adjust: exact;
                }
            }
            .resume-name {
                font-size: 28px;
                font-weight: 700;
                margin: 0 0 6px 0;
                color: #1e293b;
            }
            .resume-section {
                margin-bottom: 20px;
            }
            .section-title {
                font-size: 14px;
                font-weight: 700;
                margin-top: 18px;
                margin-bottom: 10px;
                color: #1e293b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 2px solid #223046;
                padding-bottom: 3px;
            }
            .main-section-title {
                color: #1e293b;
            }
            .section-text {
                font-size: 11px;
                color: #334155;
                line-height: 1.5;
                margin-bottom: 6px;
            }
            .summary-item {
                margin-bottom: 16px;
                padding: 14px;
                background: #f8f9fa;
                border-radius: 4px;
                border-left: 3px solid #8b5cf6;
            }
            .experience-item {
                margin-bottom: 16px;
                padding: 14px;
                background: #f8f9fa;
                border-radius: 4px;
                border-left: 3px solid #3b82f6;
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
                font-weight: 700;
                margin-bottom: 4px;
                color: #1e293b;
            }
            .experience-role {
                font-size: 12px;
                font-weight: 600;
                color: #3b82f6;
                margin: 0;
            }
            .experience-meta {
                text-align: right;
                font-size: 10px;
                color: #64748b;
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
                font-size: 11px;
                color: #334155;
                line-height: 1.6;
                margin-top: 8px;
            }
            .education-item {
                margin-bottom: 14px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 4px;
                border-left: 3px solid #8b5cf6;
            }
            .education-institution {
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 4px;
                color: #1e293b;
            }
            .education-degree {
                font-size: 12px;
                font-weight: 600;
                color: #8b5cf6;
                margin-bottom: 4px;
            }
            .education-dates {
                font-size: 10px;
                color: #64748b;
            }
            .generic-item {
                margin-bottom: 12px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 3px;
            }
            .generic-field {
                font-size: 11px;
                margin: 4px 0;
                color: #334155;
                line-height: 1.4;
            }
            .project-item {
                margin-bottom: 16px;
                padding: 14px;
                background: #f8f9fa;
                border-radius: 4px;
                border-left: 3px solid #10b981;
            }
            .project-title {
                font-size: 14px;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 8px;
            }
            .project-description {
                font-size: 11px;
                color: #334155;
                line-height: 1.5;
                margin-bottom: 8px;
            }
            .project-technologies {
                font-size: 11px;
                color: #334155;
                margin-bottom: 6px;
            }
            .project-link {
                font-size: 11px;
                color: #334155;
                margin-bottom: 0;
            }
            .project-link a {
                color: #3b82f6;
                text-decoration: none;
            }
            .project-link a:hover {
                text-decoration: underline;
            }
            .project-contributions {
                font-size: 11px;
                color: #334155;
                margin-bottom: 0;
                margin-top: 6px;
            }
        </style>
    </head>
    <body>
        <div class="resume-container" itemscope itemtype="http://schema.org/Person">
            <div class="resume-body">
                <aside class="resume-sidebar" aria-label="Profile and Skills">
                    <div class="profile-circle">
                        <div class="profile-circle-inner">
                            ${profilePicture ? 
                                `<img src="${profilePicture}" alt="${fullName}" class="profile-picture-img" />` : 
                                `<span class="profile-initials">${initials}</span>`
                            }
                        </div>
                    </div>
                    <div class="contact-section">
                        <h2 class="sidebar-title">CONTACT</h2>
                        ${phone ? `<p class="contact-item"><strong>Phone:</strong> ${phone}</p>` : ''}
                        ${email ? `<p class="contact-item"><strong>Email:</strong> ${email}</p>` : ''}
                        ${location ? `<p class="contact-item"><strong>Location:</strong> ${location}</p>` : ''}
                        ${linkedin ? `<p class="contact-item"><strong>LinkedIn:</strong> ${linkedin}</p>` : ''}
                        ${github ? `<p class="contact-item"><strong>GitHub:</strong> ${github}</p>` : ''}
                    </div>
                    ${sidebarHtml}
                </aside>
                <main class="resume-main" aria-label="Professional Experience">
                    <h1 class="resume-name" itemprop="name">${fullName}</h1>
                    ${jobTitle ? `<p style="font-size:14px; color:#64748b; margin-bottom:12px;">${jobTitle}</p>` : ''}
          ${mainHtml}
                </main>
        </div>
      </div>
    </body>
    </html>`;
};

export default generateTemplate1HTML;

