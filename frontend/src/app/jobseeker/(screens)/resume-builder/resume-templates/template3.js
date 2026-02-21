const generateTemplate3HTML = (parsedText) => {
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
    const location = personal.location || personal["Location"] || personal.address || personal["Address"] || "";
    const phone = personal.phone || personal["Phone"] || "";
    const email = personal.email || personal["Email"] || "";
    const linkedin = personal.linkedin || personal["LinkedIn"] || "";
    const github = personal.github || personal["GitHub"] || personal["Github"] || "";
    const website = personal.website || personal["Website"] || personal.portfolio || personal["Portfolio"] || personal["Portfolio / Demo (optional)"] || "";
    
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
            return `${monthName} ${year}`;
        }
        
        // Handle YYYY format (just year)
        if (/^\d{4}$/.test(dateStr)) {
            return dateStr;
        }
        
        // Return as is if format doesn't match
        return dateStr;
    };

    // Helper to format sections with red heading and underline
    const formatSection = (sectionName, sectionData) => {
        if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) return '';
        
        let html = `<section class="resume-section">
            <h2 class="section-title">${sectionName.toUpperCase()}</h2>`;

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
                    
                    if (sectionLower.includes('experience') || sectionLower.includes('work')) {
                        // Extract all fields from merged entry (template5 logic)
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
                        
                        company = company || entry.company || entry["Company"] || entry.organization || entry["Organization"] || entry.employer || entry["Employer"] || "";
                        title = title || entry.title || entry["Title"] || entry.position || entry["Position"] || entry.role || entry["Role"] || "";
                        entryLocation = entryLocation || entry.location || entry["Location"] || "";
                        startDate = startDate || entry.startDate || entry["Start Date"] || entry.startYear || entry["Start Year"] || "";
                        endDate = endDate || entry.endDate || entry["End Date"] || entry.endYear || entry["End Year"] || "";
                        responsibilities = responsibilities || entry.responsibilities || entry["Responsibilities"] || entry.description || entry["Description"] || entry.duties || entry["Duties"] || entry.achievements || entry["Achievements"] || "";
                        
                        if (entry.endDate === "Present" || entry["End Date"] === "Present" || endDate === "Present") {
                            endDate = "Present";
                        }
                        
                        const formattedStartDate = startDate ? formatDateWithMonth(startDate) : "";
                        const formattedEndDate = endDate === "Present" ? "Present" : (endDate ? formatDateWithMonth(endDate) : "");
                        const dates = formattedStartDate && formattedEndDate ? `${formattedStartDate} - ${formattedEndDate}` : formattedStartDate || formattedEndDate || "";
                        
                        html += `<article class="experience-item" itemscope itemtype="http://schema.org/JobPosting">`;
                        if (company) {
                            html += `<div class="experience-header-row">
                                <p class="experience-company" itemprop="hiringOrganization" itemscope itemtype="http://schema.org/Organization"><span itemprop="name">${company}</span></p>
                                ${entryLocation ? `<p class="experience-location-red">${entryLocation}</p>` : ''}
                            </div>`;
                        }
                        if (title) {
                            html += `<p class="experience-title" itemprop="title">${title}</p>`;
                        }
                        if (dates) {
                            html += `<p class="experience-dates-right" itemprop="datePosted">${dates}</p>`;
                        }
                        if (responsibilities) {
                            const bullets = typeof responsibilities === 'string' ? responsibilities.split('\n').filter(b => b.trim()) : [responsibilities];
                            html += `<ul class="experience-bullets" itemprop="description">`;
                            bullets.forEach(bullet => {
                                if (bullet.trim()) {
                                    html += `<li>${bullet.trim()}</li>`;
                                }
                            });
                            html += `</ul>`;
                        }
                        html += `</article>`;
                    } else if (sectionLower.includes('education')) {
                        let institution = "";
                        let degree = "";
                        let major = "";
                        let entryLocation = "";
                        let startDate = "";
                        let endDate = "";
                        let grade = "";
                        
                        Object.keys(entry).forEach(key => {
                            const keyLower = key.toLowerCase();
                            const val = entry[key];
                            if (!val || (typeof val !== 'string' && typeof val !== 'number')) return;
                            const valStr = String(val).trim();
                            if (!valStr) return;
                            
                            if (keyLower.includes('institution') || keyLower.includes('university') || keyLower.includes('school') || keyLower.includes('college')) {
                                if (!institution) institution = valStr;
                            } else if (keyLower.includes('degree') || keyLower.includes('qualification')) {
                                if (!degree) degree = valStr;
                            } else if (keyLower.includes('major') || keyLower.includes('field') || keyLower.includes('specialization')) {
                                if (!major) major = valStr;
                            } else if (keyLower.includes('location') || keyLower.includes('city')) {
                                if (!entryLocation) entryLocation = valStr;
                            } else if (keyLower.includes('start') && (keyLower.includes('date') || keyLower.includes('year'))) {
                                if (!startDate) startDate = valStr;
                            } else if (keyLower.includes('end') && (keyLower.includes('date') || keyLower.includes('year'))) {
                                if (!endDate) endDate = valStr;
                            } else if (keyLower.includes('grade') || keyLower.includes('cgpa') || keyLower.includes('gpa') || keyLower.includes('score')) {
                                if (!grade) grade = valStr.replace(/^(grade|cgpa|gpa|score):\s*/i, '');
                            }
                        });
                        
                        institution = institution || entry.institution || entry["Institution"] || entry.university || entry["University"] || entry.school || entry["School"] || "";
                        degree = degree || entry.degree || entry["Degree"] || entry.qualification || entry["Qualification"] || "";
                        major = major || entry.major || entry["Major"] || entry.field || entry["Field"] || entry.specialization || entry["Specialization"] || "";
                        entryLocation = entryLocation || entry.location || entry["Location"] || "";
                        startDate = startDate || entry.startDate || entry["Start Date"] || entry.startYear || entry["Start Year"] || "";
                        endDate = endDate || entry.endDate || entry["End Date"] || entry.endYear || entry["End Year"] || "";
                        grade = grade || entry.grade || entry["Grade"] || entry.cgpa || entry["CGPA"] || entry.gpa || entry["GPA"] || "";
                        
                        const formattedStartDate = startDate ? formatDateWithMonth(startDate) : "";
                        const formattedEndDate = endDate ? formatDateWithMonth(endDate) : "";
                        const dates = formattedStartDate && formattedEndDate ? `${formattedStartDate} - ${formattedEndDate}` : formattedStartDate || formattedEndDate || "";
                        
                        html += `<article class="education-item" itemscope itemtype="http://schema.org/EducationalOccupationalCredential">`;
                        if (institution) {
                            html += `<div class="education-header-row">
                                <p class="education-institution" itemprop="credentialCategory">${institution}</p>
                                ${entryLocation ? `<p class="education-location-red">${entryLocation}</p>` : ''}
                            </div>`;
                        }
                        if (degree) {
                            html += `<div class="education-degree-row">
                                <p class="education-degree" itemprop="name">${degree}${major ? `, ${major}` : ''}</p>
                                ${grade ? `<p class="education-grade">${grade}</p>` : ''}
                            </div>`;
                        }
                        if (dates) {
                            html += `<p class="education-dates-right" itemprop="dateCreated">${dates}</p>`;
                        }
                        html += `</article>`;
                    } else if (sectionLower.includes('course') || sectionLower.includes('certification')) {
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
                                } else if (keyLower.includes('description') || keyLower.includes('summary') || keyLower.includes('program')) {
                                    if (!description) description = valStr;
                                }
                            }
                        });
                        
                        certName = certName || entry.name || entry["Name"] || entry.certification || entry["Certification"] || entry.course || entry["Course"] || entry.title || entry["Title"] || "";
                        issuer = issuer || entry.issuer || entry["Issuer"] || entry.organization || entry["Organization"] || "";
                        issueDate = issueDate || entry.issueDate || entry["Issue Date"] || entry.startDate || entry["Start Date"] || "";
                        expiryDate = expiryDate || entry.expiryDate || entry["Expiry Date"] || entry.endDate || entry["End Date"] || "";
                        
                        const formattedIssueDate = issueDate ? formatDateWithMonth(issueDate) : "";
                        const formattedExpiryDate = expiryDate ? formatDateWithMonth(expiryDate) : "";
                        const dates = formattedIssueDate && formattedExpiryDate ? `${formattedIssueDate} - ${formattedExpiryDate}` : formattedIssueDate || formattedExpiryDate || "";
                        
                        html += `<article class="certification-item">`;
                        if (certName || issuer) {
                            html += `<div class="certification-header-row">
                                <p class="certification-name">${certName}</p>
                                ${issuer ? `<p class="certification-issuer">${issuer}</p>` : ''}
                            </div>`;
                        }
                        if (dates) {
                            html += `<p class="certification-dates-right">${dates}</p>`;
                        }
                        if (description) {
                            html += `<p class="certification-program">${description}</p>`;
                        }
                        if (credentialId) {
                            html += `<p class="certification-id"><strong>Credential ID:</strong> ${credentialId}</p>`;
                        }
                        if (credentialUrl) {
                            const linkUrl = credentialUrl.startsWith('http') ? credentialUrl : `https://${credentialUrl}`;
                            html += `<p class="certification-link"><strong>Credential URL:</strong> <a href="${linkUrl}">${credentialUrl}</a></p>`;
                        }
                        html += `</article>`;
                    } else if (sectionLower.includes('internship')) {
                        const company = entry.company || entry["Company"] || entry.organization || entry["Organization"] || entry.employer || entry["Employer"] || "";
                        const title = entry.title || entry["Title"] || entry.position || entry["Position"] || entry.role || entry["Role"] || "";
                        const entryLocation = entry.location || entry["Location"] || "";
                        const startDate = entry.startDate || entry["Start Date"] || entry.startYear || entry["Start Year"] || "";
                        const endDate = entry.endDate || entry["End Date"] || entry.endYear || entry["End Year"] || "";
                        const responsibilities = entry.responsibilities || entry["Responsibilities"] || entry.description || entry["Description"] || entry.duties || entry["Duties"] || "";
                        
                        const formattedStartDate = startDate ? formatDateWithMonth(startDate) : "";
                        const formattedEndDate = endDate === "Present" ? "Present" : (endDate ? formatDateWithMonth(endDate) : "");
                        const dates = formattedStartDate && formattedEndDate ? `${formattedStartDate} - ${formattedEndDate}` : formattedStartDate || formattedEndDate || "";
                        
                        html += `<article class="internship-item">`;
                        if (company || title) {
                            html += `<div class="internship-header-row">
                                <p class="internship-title-company">${title ? `${title}${company ? ` (${company})` : ''}` : company}</p>
                                ${entryLocation ? `<p class="internship-location-red">${entryLocation}</p>` : ''}
                            </div>`;
                        }
                        if (dates) {
                            html += `<p class="internship-dates-right">${dates}</p>`;
                        }
                        if (responsibilities) {
                            const bullets = typeof responsibilities === 'string' ? responsibilities.split('\n').filter(b => b.trim()) : [responsibilities];
                            html += `<ul class="internship-bullets">`;
                            bullets.forEach(bullet => {
                                if (bullet.trim()) {
                                    html += `<li>${bullet.trim()}</li>`;
                                }
                            });
                            html += `</ul>`;
                        }
                        html += `</article>`;
                    } else if (sectionLower.includes('language')) {
                        let languageName = "";
                        let proficiency = "";
                        
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                const keyLower = key.toLowerCase();
                                const valStr = val.toString().trim();
                                
                                if (keyLower.includes('language') || keyLower.includes('name')) {
                                    if (!languageName) languageName = valStr.replace(/^(language|name):\s*/i, '');
                                } else if (keyLower.includes('proficiency') || keyLower.includes('level')) {
                                    if (!proficiency) proficiency = valStr.replace(/^(proficiency|level):\s*/i, '');
                                }
                            }
                        });
                        
                        languageName = languageName || entry.language || entry["Language"] || entry.name || entry["Name"] || "";
                        proficiency = proficiency || entry.proficiency || entry["Proficiency"] || entry.level || entry["Level"] || "";
                        
                        html += `<article class="language-item">`;
                        if (languageName) {
                            html += `<p class="language-text">${languageName}${proficiency ? ` - ${proficiency}` : ''}</p>`;
                        }
                        html += `</article>`;
                    } else if (sectionLower.includes('project') || sectionLower.includes('open source')) {
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
                        
                        projectTitle = projectTitle || entry["Project Title"] || entry.projectTitle || entry.title || entry["Title"] || entry.name || entry["Name"] || "";
                        description = description || entry.description || entry["Description"] || "";
                        technologies = technologies || entry["Technologies Used"] || entry.technologies || entry.technologiesUsed || "";
                        githubLink = githubLink || entry.github || entry["GitHub"] || "";
                        projectLink = projectLink || entry["Project / Repo Link"] || entry.link || entry.repoLink || entry["Repo Link"] || "";
                        openSourceContributions = openSourceContributions || entry["Open Source Contributions"] || entry.openSourceContributions || "";
                        
                        html += `<article class="project-item">`;
                        if (projectTitle) {
                            html += `<p class="project-title">${projectTitle}</p>`;
                        }
                        if (description) {
                            html += `<p class="project-description">${description}</p>`;
                        }
                        if (technologies) {
                            html += `<p class="project-technologies"><strong>Technologies:</strong> ${technologies}</p>`;
                        }
                        if (githubLink) {
                            const linkUrl = githubLink.startsWith('http') ? githubLink : `https://${githubLink}`;
                            html += `<p class="project-link"><strong>GitHub:</strong> <a href="${linkUrl}">${githubLink}</a></p>`;
                        }
                        if (projectLink && projectLink !== githubLink) {
                            const linkUrl = projectLink.startsWith('http') ? projectLink : `https://${projectLink}`;
                            html += `<p class="project-link"><strong>Link:</strong> <a href="${linkUrl}">${projectLink}</a></p>`;
                        }
                        if (openSourceContributions) {
                            html += `<p class="project-contributions"><strong>Open Source Contributions:</strong> ${openSourceContributions}</p>`;
                        }
                        html += `</article>`;
                    } else if (sectionLower.includes('summary') || sectionLower.includes('professional summary') || sectionLower.includes('about')) {
                        // For summary sections, display content without internal headings
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
                    } else if (sectionLower.includes('skill')) {
                        if (sectionLower.includes('technical')) {
                            Object.entries(entry).forEach(([key, val]) => {
                                if (val && val.toString().trim()) {
                                    html += `<p class="skill-text">${val}</p>`;
                                }
                            });
                        } else {
                            const skillText = entry.skill || entry["Skill"] || entry.name || entry["Name"] || Object.values(entry).join(': ');
                            html += `<p class="skill-text">${skillText}</p>`;
                        }
                    } else {
                        html += `<article class="generic-item">`;
                        Object.entries(entry).forEach(([key, val]) => {
                            if (val && val.toString().trim()) {
                                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                                html += `<p class="generic-field"><strong>${formattedKey}:</strong> ${val}</p>`;
                            }
                        });
                        html += `</article>`;
                    }
                }
            });
        } else if (typeof sectionData === 'string') {
            html += `<p class="section-text">${sectionData}</p>`;
        }
        
        html += `</section>`;
        return html;
    };

    // Get all sections except Personal Information
    const allSections = Object.keys(parsedText);
    const contentSections = allSections.filter(sec => 
        sec !== "Personal Information" && sec !== "PERSONAL INFORMATION"
    );

    // Build content HTML
    const contentHtml = contentSections
        .map((sec) => formatSection(sec, parsedText[sec]))
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
                color: #000000;
                background: #ffffff;
                font-size: 10px;
            }
            .resume-container {
                width: 794px;
                min-height: 1123px;
                margin: 0;
                background: #ffffff;
                padding: 20px 30px;
            }
            h1, h2, h3, h4, h5, h6, p, span, div, article, section, header, time {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .resume-header {
                text-align: center;
                margin-bottom: 18px;
                padding-bottom: 12px;
            }
            .resume-name {
                font-size: 28px;
                font-weight: 700;
                margin: 0 0 4px 0;
                color: #000000;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            .resume-job-title {
                font-size: 13px;
                margin: 0 0 3px 0;
                color: #000000;
            }
            .resume-location {
                font-size: 11px;
                margin: 0 0 10px 0;
                color: #000000;
            }
            .resume-contact {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-wrap: wrap;
                font-size: 10px;
            }
            .contact-item {
                display: flex;
                align-items: center;
                gap: 4px;
                color: #000000;
            }
            .contact-link {
                display: flex;
                align-items: center;
                gap: 4px;
                color: #2563eb;
                text-decoration: none;
            }
            .contact-separator {
                color: #000000;
                margin: 0 8px;
            }
            .resume-section {
                margin-bottom: 16px;
            }
            .section-title {
                font-size: 14px;
                font-weight: 700;
                margin: 0 0 5px 0;
                color: #dc2626;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid #000000;
                padding-bottom: 2px;
                display: inline-block;
                width: 100%;
            }
            .section-text {
                font-size: 10px;
                margin-bottom: 6px;
                color: #000000;
                line-height: 1.5;
            }
            .experience-item {
                margin-bottom: 14px;
            }
            .experience-header-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 3px;
            }
            .experience-company {
                flex: 1;
                font-size: 12px;
                font-weight: 700;
                margin: 0;
                color: #000000;
            }
            .experience-location-red {
                font-size: 10px;
                margin: 0;
                color: #dc2626;
            }
            .experience-title {
                font-size: 11px;
                font-weight: 600;
                margin: 0 0 3px 0;
                color: #000000;
            }
            .experience-dates-right {
                font-size: 10px;
                margin: 0 0 6px 0;
                color: #000000;
                text-align: right;
            }
            .experience-bullets {
                padding-left: 18px;
                margin: 6px 0 0 0;
                list-style-type: disc;
            }
            .experience-bullets li {
                font-size: 10px;
                margin-bottom: 2px;
                color: #000000;
                line-height: 1.4;
            }
            .education-item {
                margin-bottom: 12px;
            }
            .education-header-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 3px;
            }
            .education-institution {
                flex: 1;
                font-size: 12px;
                font-weight: 700;
                margin: 0;
                color: #000000;
            }
            .education-location-red {
                font-size: 10px;
                margin: 0;
                color: #dc2626;
            }
            .education-degree {
                font-size: 11px;
                font-weight: 600;
                margin: 0 0 2px 0;
                color: #000000;
            }
            .education-dates-right {
                font-size: 10px;
                margin: 0;
                color: #000000;
                text-align: right;
            }
            .certification-item {
                margin-bottom: 14px;
            }
            .certification-header-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 4px;
            }
            .certification-name {
                flex: 1;
                font-size: 13px;
                font-weight: 700;
                margin: 0;
                color: #000000;
            }
            .certification-dates-right {
                font-size: 11px;
                margin: 0;
                color: #000000;
                text-align: right;
            }
            .certification-program {
                font-size: 11px;
                margin: 0;
                color: #000000;
            }
            .internship-item {
                margin-bottom: 16px;
            }
            .internship-header-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 4px;
            }
            .internship-title-company {
                flex: 1;
                font-size: 13px;
                font-weight: 700;
                margin: 0;
                color: #000000;
            }
            .internship-location-red {
                font-size: 11px;
                margin: 0;
                color: #dc2626;
            }
            .internship-dates-right {
                font-size: 11px;
                margin: 0 0 8px 0;
                color: #000000;
                text-align: right;
            }
            .internship-bullets {
                padding-left: 20px;
                margin: 8px 0 0 0;
                list-style-type: disc;
            }
            .internship-bullets li {
                font-size: 11px;
                margin-bottom: 4px;
                color: #000000;
                line-height: 1.5;
            }
            .language-item {
                margin-bottom: 4px;
            }
            .language-text {
                font-size: 10px;
                margin: 0;
                color: #000000;
                line-height: 1.4;
            }
            .project-item {
                margin-bottom: 14px;
            }
            .project-title {
                font-size: 12px;
                font-weight: 700;
                margin: 0 0 3px 0;
                color: #000000;
            }
            .project-description {
                font-size: 10px;
                margin: 0 0 3px 0;
                color: #000000;
                line-height: 1.4;
            }
            .project-technologies {
                font-size: 10px;
                margin: 0 0 3px 0;
                color: #000000;
            }
            .project-link {
                font-size: 10px;
                margin: 0;
                color: #000000;
            }
            .project-link a {
                color: #2563eb;
                text-decoration: none;
            }
            .skill-text {
                font-size: 10px;
                margin-bottom: 2px;
                color: #000000;
                line-height: 1.4;
            }
            .skill-text-spaced {
                font-size: 10px;
                margin-bottom: 3px;
                color: #000000;
                line-height: 1.4;
            }
            .generic-item {
                margin-bottom: 10px;
            }
            .generic-field {
                font-size: 10px;
                margin-bottom: 3px;
                color: #000000;
                line-height: 1.4;
            }
        </style>
    </head>
    <body>
        <div class="resume-container" itemscope itemtype="http://schema.org/Person">
            <header class="resume-header">
                <h1 class="resume-name" itemprop="name">${fullName.toUpperCase()}</h1>
                ${jobTitle ? `<p class="resume-job-title" itemprop="jobTitle">${jobTitle}</p>` : ''}
                ${location ? `<p class="resume-location" itemprop="address">${location}</p>` : ''}
                ${phone || email || linkedin || github || website ? `<div class="resume-contact" itemprop="contactPoint" itemscope itemtype="http://schema.org/ContactPoint">
                    ${phone ? `<span class="contact-item">${phone}</span>` : ''}
                    ${phone && (email || linkedin || github || website) ? `<span class="contact-separator">|</span>` : ''}
                    ${email ? `<span class="contact-item">${email}</span>` : ''}
                    ${email && (linkedin || github || website) ? `<span class="contact-separator">|</span>` : ''}
                    ${linkedin ? `<a href="${linkedin.startsWith('http') ? linkedin : 'https://' + linkedin}" class="contact-link" itemprop="sameAs">LinkedIn</a>` : ''}
                    ${linkedin && (github || website) ? `<span class="contact-separator">|</span>` : ''}
                    ${github ? `<a href="${github.startsWith('http') ? github : 'https://' + github}" class="contact-link" itemprop="sameAs">GitHub</a>` : ''}
                    ${github && website ? `<span class="contact-separator">|</span>` : ''}
                    ${website ? `<a href="${website.startsWith('http') ? website : 'https://' + website}" class="contact-link" itemprop="sameAs">${website}</a>` : ''}
                </div>` : ''}
            </header>
            <main>
                ${contentHtml}
            </main>
        </div>
    </body>
    </html>`;
};
export default generateTemplate3HTML;
