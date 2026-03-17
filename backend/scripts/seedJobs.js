// SEED JOBS — creates sample jobs for testing
// Run with: node backend/scripts/seedJobs.js

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../src/models/job.js');
const Employer = require('../src/models/employer.js');

// Sample jobs data with 7-character shortIds
const sampleJobs = [
    {
        shortId: "FSD001A",
        jobTitle: "Full Stack Developer",
        companyName: "Tech Innovators Pvt Ltd",
        jobType: "Full-time",
        workMode: "Hybrid",
        location: "Bangalore, Karnataka",
        experience: "2-4 years",
        minSalary: 800000,
        maxSalary: 1500000,
        skills: ["React", "Node.js", "MongoDB", "Express", "JavaScript"],
        jobDescription: "We are looking for a talented Full Stack Developer to join our dynamic team. You will work on cutting-edge web applications and collaborate with cross-functional teams.",
        responsibilities: "Develop and maintain web applications, Write clean and efficient code, Collaborate with team members, Participate in code reviews",
        requirements: "2-4 years of experience in Full Stack development, Strong knowledge of React and Node.js, Experience with MongoDB",
        perksAndBenefits: "Health insurance, Flexible working hours, Learning opportunities, Team events",
        requiresBasicTest: true,
        numberOfOpenings: 5
    },
    {
        shortId: "FRT001A",
        jobTitle: "Frontend Developer",
        companyName: "Web Solutions Inc",
        jobType: "Full-time",
        workMode: "Remote",
        location: "Remote",
        experience: "1-3 years",
        minSalary: 600000,
        maxSalary: 1000000,
        skills: ["React", "JavaScript", "CSS", "HTML", "TypeScript"],
        jobDescription: "Join our team as a Frontend Developer and help build amazing user interfaces for our clients.",
        responsibilities: "Develop responsive web pages, Optimize application performance, Work with UI/UX team",
        requirements: "1-3 years of frontend experience, Strong JavaScript skills",
        perksAndBenefits: "Work from home, Competitive salary, Health insurance",
        requiresBasicTest: true,
        numberOfOpenings: 3
    },
    {
        shortId: "BKD001A",
        jobTitle: "Backend Developer",
        companyName: "DataTech Systems",
        jobType: "Full-time",
        workMode: "Onsite",
        location: "Hyderabad, Telangana",
        experience: "3-5 years",
        minSalary: 1000000,
        maxSalary: 1800000,
        skills: ["Python", "Django", "PostgreSQL", "REST APIs", "AWS"],
        jobDescription: "We need an experienced Backend Developer to build robust APIs and manage our cloud infrastructure.",
        responsibilities: "Design and implement APIs, Manage AWS infrastructure, Optimize database queries",
        requirements: "3-5 years in backend development, Strong Python/Django skills",
        perksAndBenefits: "Performance bonus, Health insurance, Paid time off",
        requiresBasicTest: true,
        numberOfOpenings: 2
    },
    {
        shortId: "DTS001A",
        jobTitle: "Data Scientist",
        companyName: "AI Insights Pvt Ltd",
        jobType: "Full-time",
        workMode: "Hybrid",
        location: "Pune, Maharashtra",
        experience: "2-5 years",
        minSalary: 900000,
        maxSalary: 1600000,
        skills: ["Python", "Machine Learning", "TensorFlow", "SQL", "Data Analysis"],
        jobDescription: "Join our AI team to build intelligent solutions and work with large datasets.",
        responsibilities: "Build ML models, Analyze data trends, Present insights to stakeholders",
        requirements: "2-5 years in data science, Strong Python and ML skills",
        perksAndBenefits: "Stock options, Learning budget, Flexible hours",
        requiresBasicTest: true,
        numberOfOpenings: 4
    },
    {
        shortId: "DEVOPS1",
        jobTitle: "DevOps Engineer",
        companyName: "CloudNine Technologies",
        jobType: "Full-time",
        workMode: "Remote",
        location: "Remote",
        experience: "3-6 years",
        minSalary: 1200000,
        maxSalary: 2000000,
        skills: ["Docker", "Kubernetes", "Jenkins", "AWS", "Terraform"],
        jobDescription: "We are looking for a DevOps Engineer to streamline our deployment processes.",
        responsibilities: "Manage CI/CD pipelines, Infrastructure as Code, Monitor systems",
        requirements: "3-6 years of DevOps experience, Strong cloud skills",
        perksAndBenefits: "Remote work, Certifications paid, Team building",
        requiresBasicTest: false,
        numberOfOpenings: 2
    },
    {
        shortId: "UID001A",
        jobTitle: "UI/UX Designer",
        companyName: "Creative Studios",
        jobType: "Full-time",
        workMode: "Onsite",
        location: "Mumbai, Maharashtra",
        experience: "1-4 years",
        minSalary: 500000,
        maxSalary: 900000,
        skills: ["Figma", "Adobe XD", "User Research", "Prototyping", "CSS"],
        jobDescription: "Design intuitive and beautiful user interfaces for our web and mobile applications.",
        responsibilities: "Create wireframes and prototypes, Conduct user research, Collaborate with developers",
        requirements: "1-4 years in UI/UX design, Proficient in Figma",
        perksAndBenefits: "Creative environment, Latest design tools, Learning opportunities",
        requiresBasicTest: false,
        numberOfOpenings: 3
    },
    {
        shortId: "MOB001A",
        jobTitle: "Mobile App Developer",
        companyName: "AppWorks Solutions",
        jobType: "Full-time",
        workMode: "Hybrid",
        location: "Chennai, Tamil Nadu",
        experience: "2-5 years",
        minSalary: 800000,
        maxSalary: 1400000,
        skills: ["React Native", "Flutter", "iOS", "Android", "Firebase"],
        jobDescription: "Build cross-platform mobile applications that delight users.",
        responsibilities: "Develop mobile apps, Ensure app quality, Integrate APIs",
        requirements: "2-5 years in mobile development, React Native or Flutter experience",
        perksAndBenefits: "Latest devices for testing, Flexible schedule, Health insurance",
        requiresBasicTest: true,
        numberOfOpenings: 4
    },
    {
        shortId: "PYT001A",
        jobTitle: "Python Developer",
        companyName: "CodeCrafters Inc",
        jobType: "Full-time",
        workMode: "Onsite",
        location: "Delhi, NCR",
        experience: "1-3 years",
        minSalary: 600000,
        maxSalary: 1000000,
        skills: ["Python", "Flask", "Django", "MySQL", "REST APIs"],
        jobDescription: "Join our Python development team to build scalable web applications.",
        responsibilities: "Write Python code, Build APIs, Database design",
        requirements: "1-3 years Python experience, Strong problem-solving skills",
        perksAndBenefits: "Performance incentives, Training programs, Health benefits",
        requiresBasicTest: true,
        numberOfOpenings: 5
    },
    {
        shortId: "INT001A",
        jobTitle: "Software Engineer Intern",
        companyName: "StartupHub",
        jobType: "Internship",
        workMode: "Hybrid",
        location: "Bangalore, Karnataka",
        experience: "Fresher",
        minSalary: 300000,
        maxSalary: 400000,
        skills: ["Java", "Python", "SQL", "Problem Solving"],
        jobDescription: " internship opportunity for engineering students to learn and grow.",
        responsibilities: "Assist in development, Learn new technologies, Participate in team meetings",
        requirements: "Final year engineering student, Basic programming knowledge",
        perksAndBenefits: "Stipend, Certificate, Mentorship",
        requiresBasicTest: true,
        numberOfOpenings: 10
    },
    {
        shortId: "QA001A",
        jobTitle: "QA Automation Engineer",
        companyName: "QualityFirst Ltd",
        jobType: "Full-time",
        workMode: "Onsite",
        location: "Noida, Uttar Pradesh",
        experience: "2-4 years",
        minSalary: 700000,
        maxSalary: 1100000,
        skills: ["Selenium", "Python", "API Testing", "JIRA", "CI/CD"],
        jobDescription: "Ensure software quality through automated testing frameworks.",
        responsibilities: "Write test scripts, Execute automation tests, Report bugs",
        requirements: "2-4 years QA experience, Selenium knowledge",
        perksAndBenefits: "Health insurance, Paid leaves, Career growth",
        requiresBasicTest: false,
        numberOfOpenings: 3
    },
    {
        shortId: "MLE001A",
        jobTitle: "Machine Learning Engineer",
        companyName: "NeuralNet AI",
        jobType: "Full-time",
        workMode: "Remote",
        location: "Remote",
        experience: "3-7 years",
        minSalary: 1500000,
        maxSalary: 2500000,
        skills: ["Python", "TensorFlow", "PyTorch", "Computer Vision", "NLP"],
        jobDescription: "Work on cutting-edge AI projects and build intelligent systems.",
        responsibilities: "Develop ML models, Research new algorithms, Deploy models",
        requirements: "3-7 years ML experience, PhD preferred",
        perksAndBenefits: "Stock options, Conference attendance, Flexible hours",
        requiresBasicTest: true,
        numberOfOpenings: 2
    },
    {
        shortId: "PM001A",
        jobTitle: "Product Manager",
        companyName: "InnovateTech",
        jobType: "Full-time",
        workMode: "Hybrid",
        location: "Gurgaon, Haryana",
        experience: "4-8 years",
        minSalary: 1800000,
        maxSalary: 3000000,
        skills: ["Product Strategy", "Agile", "User Research", "Data Analysis"],
        jobDescription: "Lead product development from concept to launch.",
        responsibilities: "Define product roadmap, Work with engineering, Analyze metrics",
        requirements: "4-8 years product management, Tech background preferred",
        perksAndBenefits: "ESOP, Health insurance, Travel allowances",
        requiresBasicTest: false,
        numberOfOpenings: 1
    }
];

async function seedJobs() {
    try {
        console.log('🌱 Starting job seed process...');

        // Connect to database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database');

        // Find or create a demo employer
        let employer = await Employer.findOne({ email: 'demo@atract.in' });
        
        if (!employer) {
            console.log('👤 Creating demo employer account...');
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('Demo@1234', 10);
            
            employer = await Employer.create({
                fullName: 'Demo Employer',
                email: 'demo@atract.in',
                password: hashedPassword,
                companyName: 'Atract Demo Company',
                companyDescription: 'Demo company for testing',
                industryType: 'Technology',
                companySize: '51-200',
                yearEstablished: 2024,
                mobileNumber: '+91-9999999999',
                address: 'Bangalore, Karnataka, India',
                companyAddress: 'Bangalore, Karnataka, India'
            });
            console.log('✅ Demo employer created');
        } else {
            console.log(`ℹ️  Using existing employer: ${employer.companyName}`);
        }

        // Calculate date ranges
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        // Create jobs
        const jobsToCreate = sampleJobs.map((job) => ({
            ...job,
            employerId: employer._id,
            status: 'Active',
            applicationOpeningDate: threeMonthsAgo,
            applicationClosingDate: nextMonth,
            hiringManagerEmail: employer.email,
            department: 'Engineering',
            employmentType: 'Permanent',
            highestQualification: 'B.Tech / MCA',
            views: Math.floor(Math.random() * 100),
            applicationsCount: Math.floor(Math.random() * 20),
            postingMethod: 'manual'
        }));

        // Clear existing jobs and insert new ones
        await Job.deleteMany({});
        console.log('🗑️  Cleared existing jobs');

        const createdJobs = await Job.insertMany(jobsToCreate);
        console.log(`✅ Created ${createdJobs.length} sample jobs`);

        // Display summary
        console.log('\n📋 Sample Jobs Summary:');
        createdJobs.forEach((job, i) => {
            console.log(`   ${i + 1}. ${job.jobTitle} at ${job.companyName} (${job.location}) - ShortID: ${job.shortId}`);
        });

        console.log('\n✅ Job seed completed successfully!');
        console.log(`   Total jobs: ${createdJobs.length}`);
        console.log(`   Employer: ${employer.companyName}`);

    } catch (error) {
        console.error('❌ Error during job seed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the seed function
seedJobs();
