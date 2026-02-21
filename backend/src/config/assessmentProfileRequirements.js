const assessmentProfileRequirements = [
    {
        key: 'fullName',
        label: 'Full Name',
        type: 'text',
        requiredForAssessment: true,
        editable: true,
        minLength: 3,
        section: 'personal',
        helperText: 'Match the name on official documents.'
    },
    {
        key: 'email',
        label: 'Email',
        type: 'email',
        requiredForAssessment: true,
        editable: false,
        section: 'personal',
        helperText: 'Used for communication about your assessment.'
    },
    {
        key: 'mobileNumber',
        label: 'Mobile Number',
        type: 'tel',
        requiredForAssessment: true,
        editable: true,
        section: 'personal',
        // helperText: 'Include country code if outside India.'
    },
    {
        key: 'resume',
        label: 'Resume / CV',
        type: 'file',
        requiredForAssessment: true,
        editable: true,
        section: 'documents',
        helperText: 'Upload PDF or DOC up to 5 MB.',
        accept: '.pdf,.doc,.docx'
    },
    {
        key: 'highestQualification',
        label: 'Highest Qualification',
        type: 'text',
        requiredForAssessment: true,
        editable: true,
        section: 'education'
    },
    {
        key: 'passoutYear',
        label: 'Year of Graduation',
        type: 'number',
        requiredForAssessment: true,
        editable: true,
        section: 'education',
        min: 1950,
        max: new Date().getFullYear() + 10
    },
    {
        key: 'experienceInYears',
        label: 'Total Experience (years)',
        type: 'number',
        requiredForAssessment: true,
        editable: true,
        section: 'experience',
        min: 0,
        max: 50,
        step: 0.1
    },
    {
        key: 'noticePeriod',
        label: 'Notice Period (days)',
        type: 'number',
        requiredForAssessment: true,
        editable: true,
        section: 'experience',
        min: 0,
        max: 365
    },
    {
        key: 'currentCTC',
        label: 'Current CTC (LPA)',
        type: 'number',
        requiredForAssessment: true,
        editable: true,
        section: 'experience',
        min: 0,
        step: 0.1,
        helperText: 'Enter your current annual salary in Lakhs Per Annum (LPA)'
    }
];

module.exports = assessmentProfileRequirements;

