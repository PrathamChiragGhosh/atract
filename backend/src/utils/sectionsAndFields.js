const functionalities = [
    {
        category: "Accounting, Finance & Audit",
        subCategories: [
            "Accountant",
            "Financial Analyst",
            "Internal Auditor",
            "Tax Consultant",
            "Investment Banker",
            "Finance Manager"
        ]
    },
    {
        category: "Technology & Engineering",
        subCategories: [
            "Software Developer",
            "IT Support / System Administrator",
            "Cloud / DevOps Engineer",
            "Data Scientist / AI Engineer",
            "Cybersecurity Specialist",
            "Hardware / Embedded Engineer"
        ]
    },
    {
        category: "Sales, Business Development & Partnerships",
        subCategories: [
            "Sales Executive (B2B/B2C)",
            "Channel Sales Manager",
            "Account Manager",
            "Business Development Executive",
            "Enterprise Solutions Consultant"
        ]
    },
    {
        category: "Marketing, Branding & Communications",
        subCategories: [
            "Digital Marketing Specialist",
            "Performance Marketing Manager",
            "SEO / Content Strategist",
            "Social Media Manager",
            "Brand Manager",
            "Corporate Communications / PR"
        ]
    },
    {
        category: "Human Resources & Talent Acquisition",
        subCategories: [
            "HR Business Partner (HRBP)",
            "Recruiter / Talent Acquisition Specialist",
            "Learning & Development (L&D)",
            "HR Operations",
            "Payroll & Compliance"
        ]
    },
    {
        category: "Production, Manufacturing & Supply Chain",
        subCategories: [
            "Plant Operations Manager",
            "Quality Assurance Engineer",
            "Inventory / Warehouse Supervisor",
            "Procurement / Vendor Manager",
            "Logistics & Distribution Coordinator"
        ]
    },
    {
        category: "Product Management & Strategy",
        subCategories: [
            "Product Manager",
            "Program / Project Manager",
            "Strategy Manager",
            "Business Analyst",
            "Product Owner"
        ]
    },
    {
        category: "Customer Success, Support & Service Operations",
        subCategories: [
            "Customer Success Manager",
            "Client Support Executive",
            "Technical Support Engineer",
            "Service Desk Analyst",
            "Field Service Engineer"
        ]
    },
    {
        category: "Administration, Facilities & General Management",
        subCategories: [
            "Office Administrator",
            "Facilities Manager",
            "Executive Assistant / Personal Assistant",
            "Operations Executive",
            "Compliance Coordinator"
        ]
    },
    {
        category: "Creative, Design & Media",
        subCategories: [
            "Graphic Designer",
            "UI/UX Designer",
            "Video Editor",
            "Content Writer",
            "Creative Director",
            "Advertising Specialist"
        ]
    },
    {
        category: "Legal & Corporate Governance",
        subCategories: [
            "Lawyer / Legal Associate",
            "Corporate Counsel",
            "Contract Manager",
            "Compliance Officer",
            "Paralegal"
        ]
    },
    {
        category: "Healthcare & Clinical",
        subCategories: [
            "Doctor",
            "Nurse",
            "Pharmacist",
            "Medical Technician",
            "Lab Technician",
            "Healthcare Administrator"
        ]
    },
    {
        category: "Hospitality & Travel",
        subCategories: [
            "Hotel Manager",
            "Front Office Executive",
            "Travel Consultant",
            "Chef / Kitchen Staff",
            "Food & Beverage Manager",
            "Tour Guide"
        ]
    },
    {
        category: "Construction & Real Estate",
        subCategories: [
            "Civil Engineer",
            "Construction Project Manager",
            "Site Supervisor",
            "Quantity Surveyor",
            "Real Estate Executive"
        ]
    },
    {
        category: "Architecture & Interior Design",
        subCategories: [
            "Architect",
            "Interior Designer",
            "Urban Planner",
            "Landscape Architect",
            "Architectural Drafter"
        ]
    }
];


const sectionsAndFields = [
    {
        category: "Accounting, Finance & Audit",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true, placeholder: "John Doe" },
                    { name: "email", label: "Email", type: "email", required: true, placeholder: "john@example.com" },
                    { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "+91 98XXXXXXX" },
                    { name: "location", label: "Location", type: "text", placeholder: "City, State, Country" },
                    { name: "linkedin", label: "LinkedIn", type: "url", placeholder: "https://www.linkedin.com/in/..." }
                ]
            },
            {
                name: "Professional Summary",
                fields: [
                    { name: "profileSummary", label: "Profile / Summary", type: "textarea", placeholder: "2–4 lines summarizing experience" }
                ]
            },
            {
                name: "Experience",
                multiple: true,
                fields: [
                    { name: "company", label: "Company", type: "text" },
                    { name: "roleTitle", label: "Job Title", type: "text" },
                    { name: "startDate", label: "Start Date", type: "month" },
                    { name: "endDate", label: "End Date", type: "month" },
                    { name: "responsibilities", label: "Responsibilities / Achievements", type: "textarea", placeholder: "Bulleted achievements & duties" },
                    { name: "financialMetrics", label: "Financial KPIs / Metrics", type: "text", placeholder: "e.g., Savings ₹X, Audit coverage %" }
                ]
            },
            {
                name: "Education",
                multiple: true,
                fields: [
                    { name: "degree", label: "Degree", type: "text" },
                    { name: "institute", label: "Institution", type: "text" },
                    { name: "eduStart", label: "Start Year", type: "month" },
                    { name: "eduEnd", label: "End Year", type: "month" },
                    { name: "grade", label: "Grade / Score", type: "text" }
                ]
            },
            {
                name: "Skills & Tools",
                fields: [
                    { name: "technicalSkills", label: "Key Skills", type: "multiselect", placeholder: "Accounting, Auditing, GST, IFRS" },
                    { name: "software", label: "Accounting Software", type: "multiselect", options: ["Tally", "SAP FICO", "QuickBooks", "MS Excel"], placeholder: "Select or type" }
                ]
            },
            {
                name: "Certifications & Memberships",
                multiple: true,
                fields: [
                    { name: "certificationName", label: "Certification", type: "text" },
                    { name: "issuer", label: "Issuer", type: "text" },
                    { name: "year", label: "Year", type: "number" },
                    { name: "professionalMemberships", label: "Professional Memberships", type: "text", placeholder: "e.g., ICAI, CPA, CMA" }
                ]
            },
            {
                name: "Languages",
                multiple: true,
                fields: [
                    { name: "language", label: "Language", type: "text" },
                    { name: "proficiency", label: "Proficiency", type: "select", options: ["Beginner", "Intermediate", "Advanced", "Fluent"] }
                ]
            },
            {
                name: "Additional",
                fields: [
                    { name: "complianceExperience", label: "Regulatory / Compliance Experience", type: "textarea" },
                    { name: "achievements", label: "Awards / Achievements", type: "textarea" }
                ]
            }
        ]
    },

    {
        category: "Technology & Engineering",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" },
                    { name: "linkedin", label: "LinkedIn", type: "url" },
                    { name: "github", label: "GitHub", type: "url", placeholder: "https://github.com/username" },
                    { name: "portfolio", label: "Portfolio / Demo (optional)", type: "url" }
                ]
            },
            {
                name: "Professional Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Technical Skills",
                fields: [
                    { name: "programmingLanguages", label: "Programming Languages", type: "multiselect", placeholder: "e.g., JavaScript, Python" },
                    { name: "frameworks", label: "Frameworks / Libraries", type: "multiselect", placeholder: "e.g., React, Node.js" },
                    { name: "databases", label: "Databases", type: "multiselect", placeholder: "e.g. Postgres, MongoDB" },
                    { name: "cloudPlatforms", label: "Cloud / Infra", type: "multiselect", options: ["AWS", "GCP", "Azure", "On-prem"], placeholder: "Select or type" },
                    { name: "devTools", label: "Dev Tools", type: "multiselect", placeholder: "Docker, Git, CI/CD" },
                    { name: "versionControl", label: "Version Control", type: "text", placeholder: "Git, SVN..." }
                ]
            },
            {
                name: "Experience",
                multiple: true,
                fields: [
                    { name: "company", label: "Company", type: "text" },
                    { name: "roleTitle", label: "Job Title", type: "text" },
                    { name: "startDate", label: "Start Date", type: "month" },
                    { name: "endDate", label: "End Date", type: "month" },
                    { name: "responsibilities", label: "Responsibilities", type: "textarea" },
                    { name: "achievements", label: "Achievements (metrics)", type: "textarea", placeholder: "Use numbers: reduced latency by 40%, etc." }
                ]
            },
            {
                name: "Projects & Open Source",
                multiple: true,
                fields: [
                    { name: "projectName", label: "Project Title", type: "text" },
                    { name: "projectDescription", label: "Description", type: "textarea" },
                    { name: "technologies", label: "Technologies Used", type: "multiselect" },
                    { name: "projectLink", label: "Project / Repo Link", type: "url" },
                    { name: "openSourceContributions", label: "Open Source Contributions", type: "textarea" }
                ]
            },
            {
                name: "Education",
                multiple: true,
                fields: [
                    { name: "degree", label: "Degree", type: "text" },
                    { name: "institute", label: "Institution", type: "text" },
                    { name: "eduStart", label: "Start Year", type: "month" },
                    { name: "eduEnd", label: "End Year", type: "month" },
                    { name: "grade", label: "Grade / CGPA", type: "text" }
                ]
            },
            {
                name: "Certifications",
                multiple: true,
                fields: [
                    { name: "certificationName", label: "Certification", type: "text" },
                    { name: "issuer", label: "Issuer", type: "text" },
                    { name: "issueDate", label: "Year", type: "number" }
                ]
            },
            {
                name: "Languages",
                multiple: true,
                fields: [
                    { name: "language", label: "Language", type: "text" },
                    { name: "proficiency", label: "Proficiency", type: "select", options: ["Beginner", "Intermediate", "Advanced", "Fluent"] }
                ]
            },
            {
                name: "Additional",
                fields: [
                    { name: "publications", label: "Publications / Patents", type: "textarea" },
                    { name: "awards", label: "Awards", type: "textarea" }
                ]
            }
        ]
    },

    {
        category: "Sales, Business Development & Partnerships",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" },
                    { name: "linkedin", label: "LinkedIn", type: "url" }
                ]
            },
            {
                name: "Professional Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Experience & Achievements",
                multiple: true,
                fields: [
                    { name: "company", label: "Company", type: "text" },
                    { name: "roleTitle", label: "Role / Title", type: "text" },
                    { name: "startDate", label: "Start Date", type: "month" },
                    { name: "endDate", label: "End Date", type: "month" },
                    { name: "responsibilities", label: "Responsibilities", type: "textarea" },
                    { name: "salesAchievements", label: "Sales Achievements", type: "textarea", placeholder: "Quotas, wins, revenue impact" },
                    { name: "annualQuota", label: "Annual Quota", type: "text" },
                    { name: "achievedTargets", label: "Targets Achieved", type: "text" }
                ]
            },
            {
                name: "Clients & Territory",
                multiple: true,
                fields: [
                    { name: "territoryHandled", label: "Territory / Region", type: "text" },
                    { name: "clientIndustries", label: "Industries / Clients", type: "textarea" },
                    { name: "keyAccounts", label: "Key Accounts / Partnerships", type: "textarea" }
                ]
            },
            {
                name: "Tools & Skills",
                fields: [
                    { name: "crmTools", label: "CRM Tools", type: "multiselect", options: ["Salesforce", "HubSpot", "Zoho", "Microsoft Dynamics"] },
                    { name: "skills", label: "Key Sales Skills", type: "multiselect", placeholder: "Negotiation, Closing, Prospecting" }
                ]
            },
            {
                name: "Education & Certifications",
                multiple: true,
                fields: [
                    { name: "degree", label: "Degree", type: "text" },
                    { name: "institute", label: "Institution", type: "text" },
                    { name: "certificationName", label: "Certifications", type: "text" }
                ]
            },
            {
                name: "Additional",
                fields: [{ name: "awards", label: "Awards & Recognitions", type: "textarea" }]
            }
        ]
    },

    {
        category: "Marketing, Branding & Communications",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" },
                    { name: "linkedin", label: "LinkedIn", type: "url" },
                    { name: "portfolio", label: "Portfolio / Campaign Links", type: "url", placeholder: "Case studies, Notion, Drive links" }
                ]
            },
            {
                name: "Professional Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Campaigns & Projects",
                multiple: true,
                fields: [
                    { name: "campaignName", label: "Campaign / Project Name", type: "text" },
                    { name: "campaignDescription", label: "Description", type: "textarea" },
                    { name: "campaignMetrics", label: "Performance Metrics", type: "textarea", placeholder: "CTR, ROI, Impressions, Conversions" },
                    { name: "campaignLinks", label: "Campaign Links", type: "url" }
                ]
            },
            {
                name: "Skills & Tools",
                fields: [
                    { name: "marketingChannels", label: "Channels", type: "multiselect", options: ["SEO", "SEM", "Social", "Email", "Content"] },
                    { name: "campaignTools", label: "Tools", type: "multiselect", options: ["Google Ads", "Meta", "SEMrush", "HubSpot", "Canva"] },
                    { name: "contentPlatforms", label: "Content Platforms", type: "multiselect", placeholder: "Medium, Substack, YouTube" }
                ]
            },
            {
                name: "Experience",
                multiple: true,
                fields: [
                    { name: "company", label: "Company", type: "text" },
                    { name: "roleTitle", label: "Role", type: "text" },
                    { name: "startDate", label: "Start Date", type: "month" },
                    { name: "endDate", label: "End Date", type: "month" },
                    { name: "responsibilities", label: "Responsibilities", type: "textarea" }
                ]
            },
            {
                name: "Education & Certifications",
                multiple: true,
                fields: [
                    { name: "degree", label: "Degree", type: "text" },
                    { name: "certificationName", label: "Certifications", type: "text", placeholder: "Google Ads, HubSpot" }
                ]
            },
            {
                name: "Additional",
                fields: [
                    { name: "awards", label: "Awards", type: "textarea" },
                    { name: "publications", label: "Publications / Press", type: "textarea" }
                ]
            }
        ]
    },

    {
        category: "Human Resources & Talent Acquisition",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" },
                    { name: "linkedin", label: "LinkedIn", type: "url" }
                ]
            },
            {
                name: "Professional Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "HR Experience",
                multiple: true,
                fields: [
                    { name: "hrFunctions", label: "HR Functions Owned", type: "multiselect", options: ["Recruitment", "L&D", "Payroll", "HR Ops", "Employee Relations"] },
                    { name: "positionsClosed", label: "Positions Closed", type: "number", placeholder: "Total hires closed" },
                    { name: "timeToFill", label: "Average Time-to-Fill (days)", type: "number" },
                    { name: "employeeStrength", label: "Org Size Managed", type: "text" },
                    { name: "policyDesign", label: "Policy / Program Details", type: "textarea" }
                ]
            },
            {
                name: "Tools & Certifications",
                fields: [
                    { name: "atsTools", label: "ATS / HR Tools", type: "multiselect", options: ["Workday", "SAP HR", "BambooHR", "Darwinbox"] },
                    { name: "certifications", label: "Certifications", type: "text", placeholder: "SHRM, CIPD" }
                ]
            },
            {
                name: "Education",
                multiple: true,
                fields: [
                    { name: "degree", label: "Degree", type: "text" },
                    { name: "institute", label: "Institution", type: "text" }
                ]
            },
            {
                name: "Additional",
                fields: [{ name: "trainingPrograms", label: "Training / L&D Programs", type: "textarea" }]
            }
        ]
    },

    {
        category: "Production, Manufacturing & Supply Chain",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" }
                ]
            },
            {
                name: "Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Operations Experience",
                multiple: true,
                fields: [
                    { name: "plantOrUnit", label: "Plant / Unit", type: "text" },
                    { name: "roleTitle", label: "Role", type: "text" },
                    { name: "startDate", label: "Start Date", type: "month" },
                    { name: "endDate", label: "End Date", type: "month" },
                    { name: "productionCapacity", label: "Production Capacity / Metrics", type: "text" },
                    { name: "processImprovements", label: "Process Improvement Projects", type: "textarea" }
                ]
            },
            {
                name: "Quality & Safety",
                fields: [
                    { name: "qualityStandards", label: "Quality Standards", type: "text", placeholder: "ISO 9001, Six Sigma" },
                    { name: "safetyCertifications", label: "Safety Certifications", type: "text" }
                ]
            },
            {
                name: "Tools & Systems",
                fields: [
                    { name: "erpSystems", label: "ERP Systems", type: "multiselect", options: ["SAP", "Oracle", "MSDynamics"] },
                    { name: "equipment", label: "Equipment / Software Used", type: "textarea" }
                ]
            },
            {
                name: "Education & Certifications",
                multiple: true,
                fields: [
                    { name: "degree", label: "Degree", type: "text" },
                    { name: "certification", label: "Certifications", type: "text" }
                ]
            },
            {
                name: "Additional",
                fields: [{ name: "vendorManagement", label: "Vendor / Supplier Details", type: "textarea" }]
            }
        ]
    },

    {
        category: "Product Management & Strategy",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" },
                    { name: "linkedin", label: "LinkedIn", type: "url" }
                ]
            },
            {
                name: "Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Product Experience",
                multiple: true,
                fields: [
                    { name: "productStage", label: "Product Stage Worked On", type: "multiselect", options: ["Idea", "MVP", "Growth", "Scale", "Enterprise"] },
                    { name: "roadmapTools", label: "Roadmap / PM Tools", type: "multiselect", options: ["Jira", "Aha", "Notion", "Productboard"] },
                    { name: "kpisOrMetrics", label: "Key Product Metrics", type: "textarea", placeholder: "DAU, MAU, Retention, ARR" },
                    { name: "userResearch", label: "User Research Experience", type: "textarea" }
                ]
            },
            {
                name: "Cross-functional Work",
                fields: [
                    { name: "teamsManaged", label: "Cross-functional Teams", type: "text", placeholder: "Engineers, Designers, Marketing" },
                    { name: "strategicInitiatives", label: "Strategic Initiatives", type: "textarea" }
                ]
            },
            {
                name: "Education & Certifications",
                multiple: true,
                fields: [
                    { name: "degree", label: "Degree", type: "text" },
                    { name: "certification", label: "Certifications", type: "text", placeholder: "PM certifications, e.g., Pragmatic, AIPMM" }
                ]
            },
            {
                name: "Additional",
                fields: [{ name: "productAwards", label: "Awards / Case Studies", type: "textarea" }]
            }
        ]
    },

    {
        category: "Customer Success, Support & Service Operations",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" }
                ]
            },
            {
                name: "Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Support Experience & Metrics",
                fields: [
                    { name: "supportTools", label: "Support Tools", type: "multiselect", options: ["Zendesk", "Freshdesk", "Intercom"] },
                    { name: "ticketVolume", label: "Ticket Volume Handled", type: "text" },
                    { name: "slaResponseTime", label: "Average Response Time (hrs)", type: "text" },
                    { name: "csatOrNps", label: "CSAT / NPS", type: "text" },
                    { name: "knowledgeBase", label: "Knowledge Base Contributions", type: "textarea" }
                ]
            },
            {
                name: "Experience",
                multiple: true,
                fields: [
                    { name: "company", label: "Company", type: "text" },
                    { name: "roleTitle", label: "Role", type: "text" },
                    { name: "responsibilities", label: "Responsibilities", type: "textarea" }
                ]
            },
            {
                name: "Education & Certifications",
                multiple: true,
                fields: [{ name: "certifications", label: "Certifications", type: "text" }]
            },
            {
                name: "Additional",
                fields: [{ name: "escalationExamples", label: "Escalation Handling Examples", type: "textarea" }]
            }
        ]
    },

    {
        category: "Administration, Facilities & General Management",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" }
                ]
            },
            {
                name: "Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Operations Experience",
                multiple: true,
                fields: [
                    { name: "officeSizeManaged", label: "Office / Facility Size Managed", type: "text", placeholder: "e.g., 20,000 sq.ft" },
                    { name: "vendorsHandled", label: "Vendors Managed", type: "textarea" },
                    { name: "budgetOversight", label: "Budget Oversight", type: "text" },
                    { name: "teamSize", label: "Team Supervised", type: "number" }
                ]
            },
            {
                name: "Tools & Processes",
                fields: [
                    { name: "facilitiesTools", label: "Facilities Tools / Systems", type: "text" },
                    { name: "complianceDocs", label: "Compliance / Audit Experience", type: "textarea" }
                ]
            },
            {
                name: "Education & Certifications",
                multiple: true,
                fields: [{ name: "certifications", label: "Certifications", type: "text" }]
            }
        ]
    },

    {
        category: "Creative, Design & Media",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" },
                    { name: "portfolioLink", label: "Portfolio Link", type: "url", required: true, placeholder: "Behance / Dribbble / Website" },
                    { name: "showreelLink", label: "Showreel / Video Link", type: "url" }
                ]
            },
            {
                name: "Professional Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Creative Work / Projects",
                multiple: true,
                fields: [
                    { name: "projectName", label: "Project Title", type: "text" },
                    { name: "projectDescription", label: "Description", type: "textarea" },
                    { name: "campaignLinks", label: "Campaign / Asset Links", type: "url" },
                    { name: "creativeMetrics", label: "Performance / Impact", type: "textarea", placeholder: "Engagement, reach, conversion" }
                ]
            },
            {
                name: "Skills & Tools",
                fields: [
                    { name: "designTools", label: "Design Tools", type: "multiselect", options: ["Figma", "Sketch", "Adobe Photoshop", "Illustrator", "After Effects"] },
                    { name: "creativeType", label: "Creative Discipline", type: "multiselect", options: ["Branding", "UI/UX", "Motion", "Print", "Video"] }
                ]
            },
            {
                name: "Education & Awards",
                multiple: true,
                fields: [
                    { name: "degree", label: "Degree", type: "text" },
                    { name: "awards", label: "Awards / Recognition", type: "textarea" }
                ]
            },
            {
                name: "Additional",
                fields: [{ name: "clients", label: "Clients / Brands Worked With", type: "textarea" }]
            }
        ]
    },

    {
        category: "Legal & Corporate Governance",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" },
                    { name: "linkedin", label: "LinkedIn", type: "url" }
                ]
            },
            {
                name: "Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Legal Experience",
                multiple: true,
                fields: [
                    { name: "practiceArea", label: "Practice Areas", type: "multiselect", options: ["Corporate", "IP", "Litigation", "Compliance", "Contracts"] },
                    { name: "casesHandled", label: "Key Cases / Clients", type: "textarea" },
                    { name: "contractsDrafted", label: "Contracts / Agreements (types)", type: "textarea" }
                ]
            },
            {
                name: "Licenses & Registrations",
                multiple: true,
                fields: [
                    { name: "barRegistration", label: "Bar Registration / License", type: "text", placeholder: "Bar Council & Reg. No.", required: true },
                    { name: "licenses", label: "Other Licenses", type: "text" }
                ]
            },
            {
                name: "Education & Certifications",
                multiple: true,
                fields: [{ name: "degree", label: "Degree", type: "text" }, { name: "certifications", label: "Certifications", type: "text" }]
            },
            {
                name: "Additional",
                fields: [{ name: "legalPublications", label: "Publications / Thought Leadership", type: "textarea" }]
            }
        ]
    },

    {
        category: "Healthcare & Clinical",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" }
                ]
            },
            {
                name: "Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Clinical Credentials",
                multiple: true,
                fields: [
                    { name: "specialization", label: "Specialization", type: "text", required: true },
                    { name: "registrationNumber", label: "Registration / License Number", type: "text", required: true },
                    { name: "licenseExpiry", label: "License Expiry", type: "date" }
                ]
            },
            {
                name: "Clinical Experience",
                multiple: true,
                fields: [
                    { name: "hospital", label: "Hospital / Clinic", type: "text" },
                    { name: "roleTitle", label: "Role / Designation", type: "text" },
                    { name: "proceduresHandled", label: "Procedures / Cases Handled", type: "textarea" },
                    { name: "clinicalMetrics", label: "Clinical Outcomes / Metrics", type: "textarea" }
                ]
            },
            {
                name: "Education & Certifications",
                multiple: true,
                fields: [
                    { name: "degree", label: "Degree", type: "text" },
                    { name: "medicalCertifications", label: "Medical Certifications", type: "text" },
                    { name: "publications", label: "Research / Publications", type: "textarea" }
                ]
            },
            {
                name: "Additional",
                fields: [{ name: "awards", label: "Awards / Fellowships", type: "textarea" }]
            }
        ]
    },

    {
        category: "Hospitality & Travel",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" }
                ]
            },
            {
                name: "Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Operational Experience",
                multiple: true,
                fields: [
                    { name: "department", label: "Department", type: "select", options: ["Front Office", "F&B", "Housekeeping", "Sales"] },
                    { name: "propertyType", label: "Property Type", type: "select", options: ["Hotel", "Resort", "Restaurant", "Cruise"] },
                    { name: "guestSatisfaction", label: "Guest Satisfaction / Ratings", type: "text", placeholder: "e.g., 4.8/5 TripAdvisor" },
                    { name: "reservationsSystem", label: "Reservation System", type: "text", placeholder: "e.g., Opera, Cloudbeds" }
                ]
            },
            {
                name: "Languages & Shifts",
                multiple: true,
                fields: [
                    { name: "languagesSpoken", label: "Languages Spoken", type: "multiselect" },
                    { name: "shiftHandling", label: "Shift / Roster Experience", type: "text" }
                ]
            },
            {
                name: "Education & Certifications",
                multiple: true,
                fields: [{ name: "certificationsHospitality", label: "Certifications", type: "text" }]
            },
            {
                name: "Additional",
                fields: [{ name: "awards", label: "Awards / Recognitions", type: "textarea" }]
            }
        ]
    },

    {
        category: "Construction & Real Estate",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" }
                ]
            },
            {
                name: "Project Experience",
                multiple: true,
                fields: [
                    { name: "projectName", label: "Project Name", type: "text" },
                    { name: "projectType", label: "Project Type", type: "select", options: ["Residential", "Commercial", "Infrastructure"] },
                    { name: "budgetHandled", label: "Project Budget Handled", type: "text" },
                    { name: "siteResponsibilities", label: "Site Responsibilities", type: "textarea" },
                    { name: "safetyCertifications", label: "Safety Certifications", type: "text" }
                ]
            },
            {
                name: "Technical Skills & Tools",
                fields: [
                    { name: "softwareTools", label: "Software Tools", type: "multiselect", options: ["AutoCAD", "Revit", "Primavera"] },
                    { name: "constructionSkills", label: "Construction Skills", type: "multiselect", placeholder: "Project management, cost control" }
                ]
            },
            {
                name: "Education & Certifications",
                multiple: true,
                fields: [
                    { name: "degree", label: "Degree / Diploma", type: "text" },
                    { name: "certifications", label: "Certifications", type: "text" }
                ]
            },
            {
                name: "Additional",
                fields: [{ name: "vendorCoordination", label: "Vendor / Client Coordination", type: "textarea" }]
            }
        ]
    },

    {
        category: "Architecture & Interior Design",
        sections: [
            {
                name: "Personal Information",
                fields: [
                    { name: "fullName", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "location", label: "Location", type: "text" },
                    { name: "portfolioLink", label: "Portfolio Link", type: "url", required: true, placeholder: "Behance / Personal website" }
                ]
            },
            {
                name: "Professional Summary",
                fields: [{ name: "profileSummary", label: "Profile / Summary", type: "textarea" }]
            },
            {
                name: "Design Experience & Projects",
                multiple: true,
                fields: [
                    { name: "projectName", label: "Project Title", type: "text" },
                    { name: "projectDescription", label: "Description", type: "textarea" },
                    { name: "projectTypes", label: "Project Types", type: "multiselect", options: ["Residential", "Commercial", "Landscape", "Urban"] },
                    { name: "softwareUsed", label: "Design Software", type: "multiselect", options: ["AutoCAD", "Revit", "SketchUp", "Rhino"] }
                ]
            },
            {
                name: "Education & Awards",
                multiple: true,
                fields: [{ name: "degree", label: "Degree", type: "text" }, { name: "competitionsAwards", label: "Competitions / Awards", type: "textarea" }]
            },
            {
                name: "Additional",
                fields: [{ name: "collaborations", label: "Clients / Collaborators", type: "textarea" }]
            }
        ]
    }
];



module.exports = { functionalities, sectionsAndFields };
