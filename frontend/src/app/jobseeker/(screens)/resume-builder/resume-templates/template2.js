const generateTemplate2HTML = (parsedText, profilePicture = null) => {
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
    const website = personal.website || personal["Website"] || "";
        
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
        
    // Split name for orange accent on last name
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts.slice(0, -1).join(" ");
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    
    // Organize sections
    const allSections = Object.keys(parsedText);
    const sidebarSectionKeywords = ["Education", "EDUCATION", "References", "REFERENCES", "Languages", "LANGUAGES", "Skills", "SKILLS", "Technical Skills", "TECHNICAL SKILLS"];
    const sidebarSections = allSections.filter(sec => 
        sidebarSectionKeywords.some(keyword => sec.toLowerCase().includes(keyword.toLowerCase()))
    );
    const mainSections = allSections.filter(sec => 
        !sidebarSections.includes(sec) && 
        sec !== "Personal Information" && 
        sec !== "PERSONAL INFORMATION"
    );
    
    // Format sidebar sections (References and Education)
    const formatSidebarSection = (sectionName, sectionData) => {
        if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) {
            return '';
        }
        
        const iconMap = {
            "references": "👥"
        };
        const icon = iconMap[sectionName.toLowerCase()] || "";
        const sectionLower = sectionName.toLowerCase();
        const isEducation = sectionLower.includes('education');
        const isTechnicalSkills = sectionLower.includes('technical skills') || (sectionLower.includes('skill') && !sectionLower.includes('language'));
        
        let html = `<section class="resume-section">
            <h2 class="sidebar-title">
                ${icon ? `<span class="sidebar-icon">${icon}</span>` : ''}${sectionName.toUpperCase()}
            </h2>`;
        
        if (Array.isArray(sectionData)) {
            // For education, merge entries first (like template 1)
            let entriesToProcess = sectionData;
            if (isEducation) {
                const mergedEntries = [];
                let currentEducation = {};
                let fieldCount = 0;
                
                entriesToProcess.forEach((entry, idx) => {
                    if (typeof entry === "object" && entry !== null) {
                        // Merge all fields into current entry
                        Object.assign(currentEducation, entry);
                        fieldCount++;
                        
                        // Check if we've collected all fields for one education
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
            
            entriesToProcess.forEach((entry, index) => {
                if (typeof entry === "string") {
                    html += `<p class="sidebar-item"><span class="sidebar-bullet"></span>${entry}</p>`;
                } else {
                    // For education, wrap each entry in a container with dotted border between entries
                    if (isEducation) {
                        const isLastEntry = index === entriesToProcess.length - 1;
                        const borderStyle = !isLastEntry ? 'border-bottom: 1px dotted rgba(255, 255, 255, 0.4); padding-bottom: 10px; margin-bottom: 10px;' : '';
                        html += `<div class="sidebar-education-entry" style="${borderStyle}">`;
                    }
                    
                    // Get all entries for this education entry
                    const entryFields = Object.entries(entry).filter(([key, val]) => val && val.toString().trim());
                    
                    // For education, organize fields in a structured way
                    if (isEducation) {
                        let degree = '';
                        let institution = '';
                        let startDate = '';
                        let endDate = '';
                        let grade = '';
                        let otherFields = [];
                        
                        // Helper function to format date with month abbreviation
                        const formatDateWithMonth = (dateStr) => {
                            if (!dateStr) return '';
                            
                            // Handle YYYY-MM-DD or YYYY-MM format
                            const dateMatch = dateStr.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
                            if (dateMatch) {
                                const [, year, month, day] = dateMatch;
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                const monthIndex = parseInt(month, 10) - 1;
                                const monthName = monthNames[monthIndex] || month;
                                if (day) {
                                    return `${monthName} ${year}`;
                                }
                                return `${monthName} ${year}`;
                            }
                            
                            // Handle YYYY format (just year)
                            if (/^\d{4}$/.test(dateStr)) {
                                return dateStr;
                            }
                            
                            // Return as is if format doesn't match
                            return dateStr;
                        };
                        
                        entryFields.forEach(([key, val]) => {
                            const keyLower = key.toLowerCase();
                            if (keyLower.includes('degree') || keyLower.includes('major')) {
                                degree = val;
                            } else if (keyLower.includes('university') || keyLower.includes('institution') || keyLower.includes('school') || (keyLower === 'name' && !degree)) {
                                institution = val;
                            } else if (keyLower.includes('start') && (keyLower.includes('date') || keyLower.includes('year'))) {
                                startDate = formatDateWithMonth(val);
                            } else if (keyLower.includes('end') && (keyLower.includes('date') || keyLower.includes('year'))) {
                                endDate = formatDateWithMonth(val);
                            } else if (keyLower.includes('grade') || keyLower.includes('cgpa') || keyLower.includes('gpa') || keyLower.includes('score')) {
                                // Extract just the value, remove any labels
                                const valStr = val.toString().trim();
                                // Remove common labels like "CGPA:", "Grade:", "GPA:" etc.
                                grade = valStr.replace(/^(CGPA|GPA|Grade|Score):\s*/i, '').trim();
                            } else if (keyLower.includes('date') || keyLower.includes('year') || keyLower.includes('period')) {
                                // Generic date field - try to parse and format
                                const formatted = formatDateWithMonth(val);
                                if (!startDate) startDate = formatted;
                                else if (!endDate) endDate = formatted;
                            } else {
                                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                                otherFields.push({ key: formattedKey, val: val });
                            }
                        });
                        
                        // Combine start and end dates
                        let dates = '';
                        // Check if endDate is "Present" (case insensitive)
                        const isPresent = endDate && endDate.toString().toLowerCase() === 'present';
                        if (startDate && endDate) {
                            dates = `${startDate} - ${endDate}`;
                        } else if (startDate) {
                            dates = startDate;
                        } else if (endDate) {
                            dates = endDate;
                        }
                        
                        // Build structured education entry
                        if (degree) {
                            html += `<div class="education-degree-wrapper"><p class="sidebar-item sidebar-item-bold education-degree-line"><span class="sidebar-bullet"></span><span class="education-degree-text">${degree}</span>${grade ? `<span class="education-grade">${grade}</span>` : ''}</p></div>`;
                        }
                        if (institution) {
                            html += `<div class="education-institution-wrapper"><p class="sidebar-item sidebar-institution">${institution}</p></div>`;
                        }
                        if (dates) {
                            html += `<div class="education-dates-wrapper"><p class="sidebar-item-detail education-dates">${dates}</p></div>`;
                        }
                        otherFields.forEach(({ key, val }) => {
                            html += `<div class="education-detail-wrapper"><p class="sidebar-item-detail">${key}: ${val}</p></div>`;
                        });
                    } else if (isTechnicalSkills) {
                        // For technical skills, show sub-sections with dots and values as comma-separated
                        entryFields.forEach(([key, val]) => {
                            if (!val || !val.toString().trim()) return;
                            
                            const keyLower = key.toLowerCase();
                            const valStr = val.toString().trim();
                            
                            // Sub-section name (e.g., "Programming Languages") with dot
                            html += `<p class="sidebar-item sidebar-item-bold"><span class="sidebar-bullet"></span>${key}</p>`;
                            
                            // Values below the sub-section - display as comma-separated
                            const values = valStr.split(/[,\n]/).map(v => v.trim()).filter(v => v);
                            if (values.length > 0) {
                                html += `<p class="sidebar-item sidebar-skill-value">${values.join(', ')}</p>`;
                            }
                        });
                    } else {
                        // For non-education sections, use original logic
                        entryFields.forEach(([key, val]) => {
                            const keyLower = key.toLowerCase();
                            
                            // For languages, show language name directly with bold
                            if (sectionLower.includes('language') && (keyLower.includes('language') || keyLower.includes('name'))) {
                                html += `<p class="sidebar-item sidebar-item-bold"><span class="sidebar-bullet"></span>${val}</p>`;
                            } else if (keyLower === 'name' || keyLower.includes('name')) {
                                html += `<p class="sidebar-item sidebar-item-bold"><span class="sidebar-bullet"></span>${val}</p>`;
                            } else {
                                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                                html += `<p class="sidebar-item-detail">${formattedKey}: ${val}</p>`;
                        }
                    });
                    }
                    
                    if (isEducation) {
                        html += `</div>`;
                        }
                }
            });
        }
        
        html += `</section>`;
        return html;
    };

    const referencesSection = sidebarSections.find(sec => sec.toLowerCase().includes('reference'));
    const educationSection = sidebarSections.find(sec => sec.toLowerCase().includes('education'));
    const skillsSection = sidebarSections.find(sec => sec.toLowerCase().includes('skill'));
    const languagesSection = sidebarSections.find(sec => sec.toLowerCase().includes('language'));
    
    const referencesHtml = referencesSection ? formatSidebarSection(referencesSection, parsedText[referencesSection]) : '';
    const educationHtml = educationSection ? formatSidebarSection(educationSection, parsedText[educationSection]) : '';
    const skillsHtml = skillsSection ? formatSidebarSection(skillsSection, parsedText[skillsSection]) : '';
    const languagesHtml = languagesSection ? formatSidebarSection(languagesSection, parsedText[languagesSection]) : '';
    
    // Format main sections
    const formatMainSection = (sectionName, sectionData) => {
        if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) {
            const iconMap = {
                "about": "👤",
                "about me": "👤",
                "experience": "💼",
                "job experience": "💼",
                "work experience": "💼",
                "skills": "⚙"
            };
            const icon = iconMap[sectionName.toLowerCase()] || "";
            return `<section class="resume-section timeline-section">
                <div class="timeline-line"></div>
                <h2 class="section-title timeline-title">
                    <span class="section-icon">${icon}</span>${sectionName.toUpperCase()}
                </h2>
            </section>`;
        }
        
        const iconMap = {
            "about": "👤",
            "about me": "👤",
            "skills": "⚙"
        };
        const icon = iconMap[sectionName.toLowerCase()] || "";
        
        const sectionLower = sectionName.toLowerCase();
        const isSummary = sectionLower.includes('summary') || sectionLower.includes('profile') || sectionLower.includes('about');
        const isExperience = sectionLower.includes('experience') || sectionLower.includes('work');
        const isProjects = sectionLower.includes('project') || sectionLower.includes('open source');
        const isCertifications = sectionLower.includes('certification') || sectionLower.includes('certificate');
        const isAdditional = sectionLower.includes('additional') || sectionLower.includes('other');
        const summaryClass = isSummary ? ' summary-section' : '';
        const experienceClass = isExperience ? ' experience-section' : '';
        const projectsClass = isProjects ? ' projects-section' : '';
        const certificationsClass = isCertifications ? ' certifications-section' : '';
        const additionalClass = isAdditional ? ' additional-section' : '';
        
        let html = `<section class="resume-section timeline-section${summaryClass}${experienceClass}${projectsClass}${certificationsClass}${additionalClass}">
            <div class="timeline-line"></div>
            <h2 class="section-title timeline-title${summaryClass ? ' summary-title' : ''}${experienceClass ? ' experience-title' : ''}${projectsClass ? ' projects-title' : ''}${certificationsClass ? ' certifications-title' : ''}${additionalClass ? ' additional-title' : ''}">
                <span class="section-icon">${icon}</span>${sectionName.trim().toUpperCase()}
            </h2>`;

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
            } else if (sectionLower.includes('project') || sectionLower.includes('open source')) {
                // For projects, merge related entries into single entries
                const mergedEntries = [];
                entriesToProcess.forEach((entry, idx) => {
                    if (typeof entry === "object" && entry !== null) {
                        // Check if this entry has a project title/name
                        const hasProjectTitle = !!(entry.title || entry["Title"] || entry["Project Title"] || entry.projectTitle || 
                                                  entry.name || entry["Name"] || entry["Project Name"] || entry.projectName);
                        
                        if (hasProjectTitle) {
                            mergedEntries.push({ ...entry });
                        } else if (mergedEntries.length > 0) {
                            const lastEntry = mergedEntries[mergedEntries.length - 1];
                            const lastHasProjectTitle = !!(lastEntry.title || lastEntry["Title"] || lastEntry["Project Title"] || lastEntry.projectTitle || 
                                                          lastEntry.name || lastEntry["Name"] || lastEntry["Project Name"] || lastEntry.projectName);
                            
                            if (lastHasProjectTitle) {
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
            } else if (sectionLower.includes('certification') || sectionLower.includes('certificate')) {
                // For certifications, merge related entries into single entries
                const mergedEntries = [];
                entriesToProcess.forEach((entry, idx) => {
                    if (typeof entry === "object" && entry !== null) {
                        // Check if this entry has a certification name/title
                        const hasCertName = !!(entry.title || entry["Title"] || entry["Certification Title"] || entry.certificationTitle || 
                                             entry.name || entry["Name"] || entry["Certification Name"] || entry.certificationName ||
                                             entry.certification || entry["Certification"]);
                        
                        if (hasCertName) {
                            mergedEntries.push({ ...entry });
                        } else if (mergedEntries.length > 0) {
                            const lastEntry = mergedEntries[mergedEntries.length - 1];
                            const lastHasCertName = !!(lastEntry.title || lastEntry["Title"] || lastEntry["Certification Title"] || lastEntry.certificationTitle || 
                                                      lastEntry.name || lastEntry["Name"] || lastEntry["Certification Name"] || lastEntry.certificationName ||
                                                      lastEntry.certification || lastEntry["Certification"]);
                            
                            if (lastHasCertName) {
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
                    html += `<p class="section-text">${entry}</p>`;
                } else {
                    const sectionLower = sectionName.toLowerCase();
                    const isSummary = sectionLower.includes('summary') || sectionLower.includes('profile') || sectionLower.includes('about');
                    
                    if (sectionLower.includes('experience') || sectionLower.includes('work')) {
                        // Helper function to format date with month abbreviation (same as education)
                        const formatDateWithMonth = (dateStr) => {
                            if (!dateStr) return '';
                            
                            // Handle YYYY-MM-DD or YYYY-MM format
                            const dateMatch = dateStr.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
                            if (dateMatch) {
                                const [, year, month, day] = dateMatch;
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                const monthIndex = parseInt(month, 10) - 1;
                                const monthName = monthNames[monthIndex] || month;
                                return `${monthName} ${year}`;
                            }
                            
                            // Handle YYYY format (just year)
                            if (/^\d{4}$/.test(dateStr)) {
                                return dateStr;
                            }
                            
                            // Return as is if format doesn't match
                            return dateStr;
                        };
                        
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
                                if (!startDate) startDate = formatDateWithMonth(valStr);
                            } else if (keyLower.includes('end') && (keyLower.includes('date') || keyLower.includes('year'))) {
                                if (!endDate) endDate = formatDateWithMonth(valStr);
                            } else if (keyLower.includes('date') || keyLower.includes('year') || keyLower.includes('period') || keyLower.includes('duration')) {
                                if (/^\d{4}-\d{2}(-\d{2})?$/.test(valStr)) {
                                    const formatted = formatDateWithMonth(valStr);
                                    if (!startDate && !endDate) startDate = formatted;
                                    else if (startDate && !endDate) endDate = formatted;
                                    else if (!startDate) startDate = formatted;
                                }
                            } else if (keyLower.includes('responsibilities') || keyLower.includes('description') || keyLower.includes('duties') || keyLower.includes('achievements')) {
                                if (!responsibilities) responsibilities = valStr;
                            } else if (/^\d{4}-\d{2}(-\d{2})?$/.test(key)) {
                                const formatted = formatDateWithMonth(valStr);
                                if (!startDate && !endDate) startDate = formatted;
                                else if (startDate && !endDate) endDate = formatted;
                                else if (!startDate) startDate = formatted;
                            } else if (/^\d{4}-\d{2}(-\d{2})?$/.test(valStr)) {
                                const formatted = formatDateWithMonth(valStr);
                                if (!startDate && !endDate) startDate = formatted;
                                else if (startDate && !endDate) endDate = formatted;
                                else if (!startDate) startDate = formatted;
                            }
                        });
                        
                        company = company || entry.company || entry["Company"] || entry.organization || entry["Organization"] || "";
                        title = title || entry.title || entry["Title"] || entry.position || entry["Position"] || "";
                        entryLocation = entryLocation || entry.location || entry["Location"] || "";
                        startDate = startDate || (entry.startDate ? formatDateWithMonth(entry.startDate) : '') || (entry["Start Date"] ? formatDateWithMonth(entry["Start Date"]) : '') || (entry.startYear ? formatDateWithMonth(entry.startYear) : '') || (entry["Start Year"] ? formatDateWithMonth(entry["Start Year"]) : '') || "";
                        endDate = endDate || (entry.endDate && entry.endDate !== "Present" ? formatDateWithMonth(entry.endDate) : entry.endDate) || (entry["End Date"] && entry["End Date"] !== "Present" ? formatDateWithMonth(entry["End Date"]) : entry["End Date"]) || (entry.endYear ? formatDateWithMonth(entry.endYear) : '') || (entry["End Year"] ? formatDateWithMonth(entry["End Year"]) : '') || "";
                        responsibilities = responsibilities || entry.responsibilities || entry["Responsibilities"] || entry.description || entry["Description"] || "";
                        
                        if (entry.endDate === "Present" || entry["End Date"] === "Present" || endDate === "Present") {
                            endDate = "Present";
                        }
                        
                        const dates = startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate || "";
                        const companyLocation = [company, entryLocation].filter(Boolean).join(" / ");
                        
                        if (company || title) {
                            html += `<article class="experience-item-timeline" itemscope itemtype="http://schema.org/JobPosting">
                                <div class="experience-content">
                                    <div class="experience-header-row">
                                        <div class="experience-title-group">
                                    ${title ? `<h3 class="experience-title" itemprop="title">${title}</h3>` : ''}
                                    ${companyLocation ? `<p class="experience-company" itemprop="hiringOrganization" itemscope itemtype="http://schema.org/Organization"><span itemprop="name">${companyLocation}</span></p>` : ''}
                                        </div>
                                    ${dates ? `<p class="experience-dates" itemprop="datePosted">${dates}</p>` : ''}
                                    </div>
                                    ${responsibilities ? `<div class="experience-description" itemprop="description">${responsibilities}</div>` : ''}
                                </div>
                            </article>`;
                        }
                    } else if (sectionLower.includes('skill') && typeof entry === 'object') {
                    Object.entries(entry).forEach(([key, val]) => {
                        if (val && val.toString().trim()) {
                            const keyLower = key.toLowerCase();
                                if (keyLower.includes('skill')) {
                                    const skillName = String(val).split(':')[0] || String(val);
                                    const percentage = String(val).includes(':') ? parseInt(String(val).split(':')[1]) || 85 : 85;
                                    html += `<div class="skill-item">
                                        <div class="skill-header">
                                            <span class="skill-name">${skillName}</span>
                                    </div>
                                        <div class="skill-bar">
                                            <div class="skill-bar-fill" style="width:${percentage}%"></div>
                                    </div>
                                </div>`;
                            }
                        }
                    });
                    } else if (isSummary) {
                        // For summary sections, display content without internal headings
                        html += `<article class="summary-item">`;
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                const keyLower = key.toLowerCase();
                                // Skip internal headings like "Profile", "Summary", "About"
                                if (keyLower === 'profile' || keyLower === 'summary' || keyLower === 'about' || 
                                    keyLower === 'about me' || keyLower.includes('heading') || keyLower.includes('title')) {
                                    // Just display the value without the key
                                    html += `<p class="section-text">${val}</p>`;
                                } else {
                                    // For other fields, display value only (no key label)
                                    html += `<p class="section-text">${val}</p>`;
                                }
                            }
                        });
                        html += `</article>`;
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
                    } else if (sectionLower.includes('certification') || sectionLower.includes('certificate')) {
                        // For certifications, display each certification with all fields
                        html += `<article class="certification-item" itemscope itemtype="http://schema.org/Certification">`;
                        let certName = "";
                        let issuer = "";
                        let issueDate = "";
                        let expiryDate = "";
                        let credentialId = "";
                        let credentialUrl = "";
                        let description = "";
                        
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                const keyLower = key.toLowerCase();
                                const valStr = val.toString().trim();
                                
                                if (keyLower.includes('title') || keyLower.includes('name') || keyLower.includes('certification')) {
                                    if (!certName) certName = valStr;
                                } else if (keyLower.includes('issuer') || keyLower.includes('organization') || keyLower.includes('provider')) {
                                    if (!issuer) issuer = valStr;
                                } else if (keyLower.includes('issue') && (keyLower.includes('date') || keyLower.includes('year'))) {
                                    if (!issueDate) issueDate = valStr;
                                } else if (keyLower.includes('expir') || keyLower.includes('valid')) {
                                    if (!expiryDate) expiryDate = valStr;
                                } else if (keyLower.includes('credential') || keyLower.includes('id') || keyLower.includes('certificate id')) {
                                    if (!credentialId) credentialId = valStr;
                                } else if (keyLower.includes('url') || keyLower.includes('link')) {
                                    if (!credentialUrl) credentialUrl = valStr;
                                } else if (keyLower.includes('description') || keyLower.includes('summary')) {
                                    if (!description) description = valStr;
                                }
                            }
                        });
                        
                        if (certName || issuer) {
                            html += `<div class="certification-header-row">
                                <h3 class="certification-title" itemprop="name">${certName || ''}</h3>
                                ${issuer ? `<p class="certification-issuer" itemprop="issuer" itemscope itemtype="http://schema.org/Organization"><span itemprop="name">${issuer}</span></p>` : ''}
                            </div>`;
                        }
                        if (issueDate || expiryDate) {
                            const dateStr = issueDate && expiryDate ? `${issueDate} - ${expiryDate}` : issueDate || expiryDate || "";
                            if (dateStr) {
                                html += `<p class="certification-date">${dateStr}</p>`;
                            }
                        }
                        if (credentialId) {
                            html += `<p class="certification-id"><strong>Credential ID:</strong> ${credentialId}</p>`;
                        }
                        if (credentialUrl) {
                            html += `<p class="certification-link"><strong>Credential URL:</strong> <a href="${credentialUrl}" target="_blank" itemprop="url">${credentialUrl}</a></p>`;
                        }
                        if (description) {
                            html += `<p class="certification-description" itemprop="description">${description}</p>`;
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
                background: #f8f8f8;
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
                width: 33%;
                background: #1a2332;
                color: white;
                padding: 24px 16px;
                position: relative;
                overflow: hidden;
                min-height: 1123px;
                flex-shrink: 0;
                box-sizing: border-box;
            }
            .profile-corner {
                position: absolute;
                top: 0;
                left: 0;
                width: 0;
                height: 0;
                border-left: 40px solid #f59e0b;
                border-top: 40px solid #f59e0b;
                border-right: 40px solid transparent;
                border-bottom: 40px solid transparent;
                z-index: 1;
                margin: 0;
                padding: 0;
            }
            .profile-circle {
                text-align: center;
                margin-bottom: 24px;
                position: relative;
                padding-top: 20px;
            }
            .profile-circle-inner {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background: #4a5568;
                margin: 0 auto;
                border: 3px solid #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                position: relative;
                z-index: 2;
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
            .contact-title {
                font-size: 12px;
                font-weight: 700;
                margin-top: 0;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #ffffff;
                display: flex;
                align-items: center;
            }
            .contact-icon {
                margin-right: 8px;
                color: #f59e0b;
                font-size: 14px;
            }
            .contact-item {
                font-size: 10px;
                margin: 4px 0;
                line-height: 1.4;
                color: #e2e8f0;
                display: flex;
                align-items: center;
            }
            .contact-bullet {
                display: inline-block;
                width: 6px;
                height: 6px;
                background: #f59e0b;
                border-radius: 50%;
                margin-right: 8px;
                flex-shrink: 0;
            }
            .contact-emoji {
                margin-right: 6px;
                font-size: 12px;
            }
            .sidebar-title {
                font-size: 12px;
                font-weight: 700;
                margin-top: 18px;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #ffffff;
                display: flex;
                align-items: center;
            }
            .sidebar-icon {
                margin-right: 8px;
                color: #f59e0b;
                font-size: 14px;
            }
            .sidebar-item {
                font-size: 10px;
                margin: 6px 0;
                color: #e2e8f0;
                line-height: 1.4;
                display: flex;
                align-items: flex-start;
            }
            .sidebar-item-bold {
                font-size: 11px;
                font-weight: 700;
                color: #ffffff;
                margin: 6px 0 4px 0;
            }
            .sidebar-bullet {
                display: inline-block;
                width: 6px;
                height: 6px;
                background: #f59e0b;
                border-radius: 50%;
                margin-right: 8px;
                margin-top: 4px;
                flex-shrink: 0;
            }
            .sidebar-item-detail {
                font-size: 9px;
                margin: 2px 0 2px 14px;
                color: #cbd5e1;
                line-height: 1.4;
            }
            .sidebar-skill-value {
                font-size: 10px;
                margin: 2px 0 2px 14px;
                color: #e2e8f0;
                line-height: 1.4;
            }
            .sidebar-education-entry {
                margin-bottom: 12px;
            }
            .education-degree-wrapper {
                margin-bottom: 4px;
            }
            .education-degree-line {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .education-degree-text {
                flex: 1;
            }
            .education-grade {
                font-size: 10px;
                color: #e2e8f0;
                font-weight: 600;
                margin-left: 8px;
            }
            .education-institution-wrapper {
                margin-bottom: 4px;
                margin-left: 14px;
            }
            .sidebar-institution {
                font-size: 10px;
                color: #e2e8f0;
                margin: 0;
                font-style: italic;
            }
            .education-dates-wrapper {
                margin-bottom: 4px;
                margin-left: 14px;
            }
            .education-dates {
                font-size: 9px;
                color: #cbd5e1;
                margin: 0;
                font-weight: 500;
            }
            .education-detail-wrapper {
                margin-bottom: 3px;
                margin-left: 14px;
            }
            .resume-main {
                flex: 1;
                padding: 28px 32px;
                color: #000;
                background: #ffffff;
                position: relative;
            }
            .timeline-line {
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 2px;
                background: #f59e0b;
            }
            .resume-name {
                font-size: 36px;
                font-weight: 700;
                margin: 0 0 6px 0;
                color: #f59e0b;
                line-height: 1.2;
                text-transform: uppercase;
            }
            .resume-name-accent {
                color: #f59e0b;
            }
            .resume-title {
                font-size: 13px;
                color: #718096;
                margin: 0 0 20px 0;
                font-weight: 400;
                text-transform: uppercase;
            }
            .resume-section {
                margin-bottom: 20px;
            }
            .timeline-section {
                position: relative;
                margin-top: 20px;
                padding-left: 20px;
            }
            .section-title {
                font-size: 14px;
                font-weight: 700;
                margin-bottom: 12px;
                color: #2d3748;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
            }
            .timeline-title {
                margin-bottom: 12px;
            }
            .section-icon {
                margin-right: 8px;
                color: #f59e0b;
                font-size: 16px;
            }
            .section-text {
                font-size: 11px;
                margin-bottom: 8px;
                color: #4a5568;
                line-height: 1.6;
            }
            .experience-item-timeline {
                position: relative;
                margin-bottom: 16px;
                padding-left: 0;
            }
            .timeline-dot {
                position: absolute;
                left: -8px;
                top: 8px;
                width: 8px;
                height: 8px;
                background: #f59e0b;
                border-radius: 50%;
                border: 2px solid #ffffff;
                box-shadow: 0 0 0 2px #f59e0b;
            }
            .experience-content {
                position: relative;
            }
            .experience-header-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }
            .experience-title-group {
                flex: 1;
            }
            .experience-title {
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 4px;
                color: #2d3748;
                line-height: 1.4;
            }
            .experience-company {
                font-size: 11px;
                margin-bottom: 4px;
                color: #718096;
                line-height: 1.4;
            }
            .experience-dates {
                font-size: 10px;
                color: #4a5568;
                line-height: 1.4;
                margin-left: 12px;
                white-space: nowrap;
            }
            .experience-description {
                font-size: 11px;
                color: #4a5568;
                line-height: 1.6;
                margin-top: 8px;
            }
            .skill-item {
                margin-bottom: 10px;
            }
            .skill-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
            }
            .skill-name {
                font-size: 11px;
                color: #4a5568;
                font-weight: 500;
            }
            .skill-bar {
                width: 100%;
                height: 8px;
                background: #e2e8f0;
                border-radius: 4px;
                overflow: hidden;
            }
            .skill-bar-fill {
                height: 100%;
                background: #f59e0b;
                border-radius: 4px;
            }
            .summary-section .summary-title {
                margin-bottom: 6px;
            }
            .summary-section .section-icon {
                margin-right: 0;
            }
            .experience-section .experience-title {
                margin-bottom: 6px;
            }
            .experience-section .section-icon {
                margin-right: 0;
            }
            .projects-section .projects-title {
                margin-bottom: 6px;
            }
            .projects-section .section-icon {
                margin-right: 0;
            }
            .certifications-section .certifications-title {
                margin-bottom: 6px;
            }
            .certifications-section .section-icon {
                margin-right: 0;
            }
            .additional-section .additional-title {
                margin-bottom: 6px;
            }
            .additional-section .section-icon {
                margin-right: 0;
            }
            .summary-item {
                margin-bottom: 16px;
                padding: 0;
                background: transparent;
                border-radius: 4px;
            }
            .generic-item {
                margin-bottom: 16px;
                padding-bottom: 16px;
                padding-top: 0;
                padding-left: 0;
                padding-right: 0;
                background: transparent;
                border-bottom: 1px dotted rgba(0, 0, 0, 0.2);
            }
            .generic-item:last-child {
                border-bottom: none;
            }
            .generic-field {
                font-size: 11px;
                margin: 4px 0;
                color: #4a5568;
                line-height: 1.5;
            }
            .project-item {
                margin-bottom: 16px;
                padding-bottom: 16px;
                padding-top: 0;
                padding-left: 0;
                padding-right: 0;
                background: transparent;
                border-bottom: 1px dotted rgba(0, 0, 0, 0.2);
            }
            .project-item:last-child {
                border-bottom: none;
            }
            .project-title {
                font-size: 12px;
                font-weight: 700;
                color: #1a202c;
                margin-bottom: 6px;
            }
            .project-description {
                font-size: 11px;
                color: #4a5568;
                margin-bottom: 6px;
                line-height: 1.5;
            }
            .project-technologies {
                font-size: 11px;
                color: #4a5568;
                margin-bottom: 4px;
                line-height: 1.5;
            }
            .project-link {
                font-size: 11px;
                color: #4a5568;
                margin-bottom: 4px;
                line-height: 1.5;
            }
            .project-link a {
                color: #f59e0b;
                text-decoration: none;
            }
            .project-link a:hover {
                text-decoration: underline;
            }
            .project-contributions {
                font-size: 11px;
                color: #4a5568;
                margin-bottom: 4px;
                line-height: 1.5;
            }
            .certification-item {
                margin-bottom: 8px;
                padding-bottom: 8px;
                padding-top: 0;
                padding-left: 0;
                padding-right: 0;
                background: transparent;
            }
            .certification-header-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }
            .certification-title {
                font-size: 12px;
                font-weight: 700;
                color: #1a202c;
                margin: 0;
                flex: 1;
            }
            .certification-issuer {
                font-size: 11px;
                color: #4a5568;
                margin: 0;
                margin-left: 12px;
                line-height: 1.5;
                white-space: nowrap;
            }
            .certification-date {
                font-size: 11px;
                color: #4a5568;
                margin-bottom: 4px;
                line-height: 1.5;
            }
            .certification-id {
                font-size: 11px;
                color: #4a5568;
                margin-bottom: 4px;
                line-height: 1.5;
            }
            .certification-link {
                font-size: 11px;
                color: #4a5568;
                margin-bottom: 4px;
                line-height: 1.5;
            }
            .certification-link a {
                color: #f59e0b;
                text-decoration: none;
            }
            .certification-link a:hover {
                text-decoration: underline;
            }
            .certification-description {
                font-size: 11px;
                color: #4a5568;
                margin-bottom: 4px;
                line-height: 1.5;
            }
            @page {
                size: A4;
                margin: 0;
            }
            @media print {
                html, body {
                    background: linear-gradient(to right, #1a2332 0%, #1a2332 33%, #ffffff 33%, #ffffff 100%);
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
        </style>
    </head>
    <body>
        <div class="resume-container" itemscope itemtype="http://schema.org/Person">
            <div class="resume-body">
                <aside class="resume-sidebar" aria-label="Profile and Contact">
                        <div class="profile-corner"></div>
                    <div class="profile-circle">
                        <div class="profile-circle-inner">
                            ${profilePicture ? 
                                `<img src="${profilePicture}" alt="${fullName}" class="profile-picture-img" />` : 
                                `<span class="profile-initials">${initials}</span>`
                            }
                        </div>
                    </div>
                    <div class="contact-section">
                        <h2 class="contact-title">
                            CONTACT ME
                        </h2>
                        ${phone ? `<p class="contact-item"><span class="contact-bullet"></span>${phone}</p>` : ''}
                        ${email ? `<p class="contact-item"><span class="contact-bullet"></span>${email}</p>` : ''}
                        ${website ? `<p class="contact-item"><span class="contact-bullet"></span>${website}</p>` : ''}
                        ${location ? `<p class="contact-item"><span class="contact-bullet"></span>${location}</p>` : ''}
                        ${linkedin ? `<p class="contact-item"><span class="contact-bullet"></span>${linkedin}</p>` : ''}
                        ${github ? `<p class="contact-item"><span class="contact-bullet"></span>${github}</p>` : ''}
                    </div>
          ${referencesHtml}
          ${educationHtml}
          ${skillsHtml}
          ${languagesHtml}
                </aside>
                <main class="resume-main" aria-label="Professional Experience">
                    <div class="timeline-line"></div>
                    <h1 class="resume-name" itemprop="name">
                        ${fullName.toUpperCase()}
                    </h1>
                    ${jobTitle ? `<p class="resume-title" itemprop="jobTitle">${jobTitle.toUpperCase()}</p>` : ''}
          ${mainHtml}
                </main>
        </div>
      </div>
    </body>
    </html>`;
};
export default generateTemplate2HTML;
