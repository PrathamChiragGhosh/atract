"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    HiArrowLeft,
    HiCodeBracket,
    HiChevronRight,
    HiMagnifyingGlass
} from 'react-icons/hi2';
import './page.css';

const InterviewQuestionsGeneratorClient = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    // Override background on mount
    useEffect(() => {
        document.body.style.backgroundColor = '#ffffff';
        return () => {
            document.body.style.backgroundColor = '';
        };
    }, []);

    const technologies = [
        {
            id: 'java',
            name: 'Java',
            description: 'Object-oriented programming language',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
            color: '#ed8b00',
            questions: [
                'What is the difference between JDK, JRE, and JVM?',
                'Explain the concept of inheritance in Java.',
                'What are the four pillars of Object-Oriented Programming?',
                'How does garbage collection work in Java?',
                'What is the difference between ArrayList and LinkedList?',
                'Explain method overloading and method overriding.',
                'What are access modifiers in Java?',
                'How does exception handling work in Java?',
                'What is the difference between String, StringBuffer, and StringBuilder?',
                'Explain the concept of multithreading in Java.'
            ]
        },
        {
            id: 'python',
            name: 'Python',
            description: 'High-level programming language',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
            color: '#3776ab',
            questions: [
                'What are the key features of Python?',
                'Explain the difference between lists and tuples in Python.',
                'How does memory management work in Python?',
                'What are decorators in Python?',
                'Explain the concept of generators in Python.',
                'How does exception handling work in Python?',
                'What is the difference between == and is operators?',
                'Explain list comprehensions in Python.',
                'How does inheritance work in Python?',
                'What are lambda functions in Python?'
            ]
        },
        {
            id: 'react',
            name: 'React.js',
            description: 'JavaScript library for building user interfaces',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
            color: '#61dafb',
            questions: [
                'What is JSX in React?',
                'Explain the concept of Virtual DOM.',
                'What are React Hooks and why are they useful?',
                'How does state management work in React?',
                'What is the difference between props and state?',
                'Explain the component lifecycle methods.',
                'How does React handle events?',
                'What are Higher-Order Components (HOC)?',
                'Explain React Router and its usage.',
                'How does React handle conditional rendering?'
            ]
        },
        {
            id: 'javascript',
            name: 'JavaScript',
            description: 'Programming language for web development',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
            color: '#f7df1e',
            questions: [
                'What is the difference between var, let, and const?',
                'Explain closures in JavaScript.',
                'How does prototypal inheritance work?',
                'What are promises and how do they work?',
                'Explain async/await in JavaScript.',
                'How does the event loop work in JavaScript?',
                'What are arrow functions and their benefits?',
                'Explain the concept of hoisting.',
                'How does the "this" keyword work in JavaScript?',
                'What are ES6 modules and how do they work?'
            ]
        },
        {
            id: 'nodejs',
            name: 'Node.js',
            description: 'JavaScript runtime environment',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
            color: '#339933',
            questions: [
                'What is Node.js and why is it used?',
                'Explain the event-driven architecture of Node.js.',
                'How does the CommonJS module system work?',
                'What is npm and how is it used?',
                'Explain middleware in Express.js.',
                'How does error handling work in Node.js?',
                'What are streams in Node.js?',
                'Explain the concept of clustering in Node.js.',
                'How does authentication work in Node.js applications?',
                'What are child processes in Node.js?'
            ]
        },
        {
            id: 'mongodb',
            name: 'MongoDB',
            description: 'NoSQL document database',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
            color: '#47a248',
            questions: [
                'What is MongoDB and how does it differ from SQL databases?',
                'Explain the concept of collections and documents.',
                'How does indexing work in MongoDB?',
                'What are aggregation pipelines?',
                'Explain MongoDB\'s replica sets.',
                'How does sharding work in MongoDB?',
                'What are the different types of indexes in MongoDB?',
                'Explain the find() and findOne() methods.',
                'How does MongoDB handle transactions?',
                'What are embedded documents and references?'
            ]
        },
        {
            id: 'html-css',
            name: 'HTML & CSS',
            description: 'Markup and styling languages for web',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
            color: '#e34f26',
            questions: [
                'What is the difference between HTML and XHTML?',
                'Explain the CSS box model.',
                'How does CSS specificity work?',
                'What are CSS preprocessors and their benefits?',
                'Explain Flexbox and Grid layouts.',
                'How does responsive design work?',
                'What are CSS animations and transitions?',
                'Explain the concept of CSS-in-JS.',
                'How does accessibility work in HTML/CSS?',
                'What are semantic HTML elements?'
            ]
        },
        {
            id: 'aws',
            name: 'AWS',
            description: 'Amazon Web Services cloud platform',
            logo: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/amazonwebservices/amazonwebservices-original.svg',
            color: '#ff9900',
            questions: [
                'What are the core services of AWS?',
                'Explain EC2 instances and their types.',
                'How does S3 storage work?',
                'What is the difference between RDS and DynamoDB?',
                'Explain AWS Lambda and serverless computing.',
                'How does CloudFormation work?',
                'What are VPCs and subnets in AWS?',
                'Explain IAM roles and policies.',
                'How does auto-scaling work in AWS?',
                'What are the different storage classes in S3?'
            ]
        },
        {
            id: 'docker',
            name: 'Docker',
            description: 'Containerization platform',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
            color: '#2496ed',
            questions: [
                'What is containerization and why is it useful?',
                'Explain Docker images and containers.',
                'How does Docker Compose work?',
                'What are Docker volumes and their use cases?',
                'Explain multi-stage Docker builds.',
                'How does Docker networking work?',
                'What are Docker registries?',
                'Explain Docker security best practices.',
                'How does orchestration work with Docker?',
                'What are the differences between Docker and virtual machines?'
            ]
        }
    ];

    // Filter technologies based on search
    const filteredTechnologies = technologies.filter(tech => {
        const query = searchQuery.toLowerCase();
        return tech.name.toLowerCase().includes(query) ||
               tech.description.toLowerCase().includes(query);
    });

    return (
        <div className="interview-questions-page">
            <div className="interview-questions-container">
                {/* Header */}
                <div className="interview-questions-header">
                    <button
                        className="interview-questions-back-btn"
                        onClick={() => router.push('/free-tools')}
                    >
                        <HiArrowLeft size={20} />
                        Back to Free Tools
                    </button>
                    <div className="interview-questions-main-header">
                        <HiCodeBracket size={32} className="interview-questions-main-icon" />
                        <div>
                            <h1 className="interview-questions-main-title">Interview Questions Generator</h1>
                            <p className="interview-questions-main-description">
                                Practice with top interview questions for popular technologies
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="interview-questions-search-wrapper">
                    <HiMagnifyingGlass className="interview-questions-search-icon" />
                    <input
                        type="text"
                        placeholder="Search technologies..."
                        className="interview-questions-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Technology Grid */}
                {filteredTechnologies.length > 0 ? (
                    <div className="interview-questions-grid">
                        {filteredTechnologies.map((tech) => (
                            <div
                                key={tech.id}
                                className="interview-questions-card"
                            >
                                <div className="interview-questions-card-header">
                                    <img
                                        src={tech.logo}
                                        alt={tech.name}
                                        className="interview-questions-card-logo"
                                    />
                                    <HiChevronRight className="interview-questions-card-arrow" />
                                </div>
                                <div className="interview-questions-card-content">
                                    <h3 className="interview-questions-card-title">{tech.name}</h3>
                                    <p className="interview-questions-card-description">{tech.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="interview-questions-empty">
                        <HiCodeBracket size={64} className="interview-questions-empty-icon" />
                        <p className="interview-questions-empty-text">
                            {searchQuery ? 'No technologies found matching your search.' : 'No technologies available.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewQuestionsGeneratorClient;