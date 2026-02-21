"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    HiOutlineWrenchScrewdriver,
    HiDocumentText,
    HiChatBubbleLeftRight,
    HiBriefcase,
    HiMagnifyingGlass,
    HiChartBar,
    HiDocumentArrowDown,
    HiEnvelope,
    HiDocumentArrowUp
} from 'react-icons/hi2';
import './page.css';

const FreeToolsPageClient = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    const tools = [
        {
            id: 'pdf-compressor',
            name: 'PDF Compressor',
            description: 'Reduce PDF file size quickly and easily',
            icon: HiDocumentText,
            route: '/compress-pdf',
            color: '#ef4444',
            comingSoon: false,
            tag: 'New',
            audience: ['jobseeker', 'employer'] // Available for both
        },
        {
            id: 'interview-questions-generator',
            name: 'Interview Questions Generator',
            description: 'Generate personalized interview questions based on job descriptions',
            icon: HiChatBubbleLeftRight,
            route: '/free-tools/interview-questions-generator',
            color: '#3b82f6',
            comingSoon: false,
            tag: 'New',
            audience: ['jobseeker', 'employer'] // Available for both
        },
        {
            id: 'jd-generator',
            name: 'JD Generator',
            description: 'Create professional job descriptions quickly and easily',
            icon: HiBriefcase,
            route: null,
            color: '#8b5cf6',
            comingSoon: true,
            audience: ['employer'] // Only for employer
        },
        {
            id: 'jd-strength-analyzer',
            name: 'JD Strength Analyzer',
            description: 'Analyze and improve your job description strength and effectiveness',
            icon: HiChartBar,
            route: null,
            color: '#f59e0b',
            comingSoon: true,
            audience: ['employer'] // Only for employer
        },
        {
            id: 'pdf-to-word',
            name: 'PDF to Word',
            description: 'Convert PDF files to editable Word documents',
            icon: HiDocumentArrowDown,
            route: null,
            color: '#10b981',
            comingSoon: true,
            audience: ['jobseeker', 'employer'] // Available for both
        },
        {
            id: 'bulk-mailer',
            name: 'Bulk Mailer',
            description: 'Send bulk emails for job posts and more',
            icon: HiEnvelope,
            route: null,
            color: '#ec4899',
            comingSoon: true,
            audience: ['employer'] // Only for employer
        },
        {
            id: 'resume-scanner',
            name: 'Resume Scanner',
            description: 'Convert hard copy resumes to editable Word documents',
            icon: HiDocumentArrowUp,
            route: null,
            color: '#6366f1',
            comingSoon: true,
            audience: ['jobseeker', 'employer'] // Available for both
        },
        {
            id: 'word-to-pdf',
            name: 'Word to PDF',
            description: 'Convert Word documents to PDF format',
            icon: HiDocumentArrowDown,
            route: null,
            color: '#dc2626',
            comingSoon: true,
            audience: ['jobseeker', 'employer'] // Available for both
        },
        // Add more tools here in the future
    ];

    const handleToolClick = (tool) => {
        if (tool.comingSoon) {
            return; // Don't navigate if coming soon
        }
        if (tool.route) {
            router.push(tool.route);
        }
    };

    // Filter tools based on search and filter
    const filteredTools = tools.filter(tool => {
        // Search filter
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;

        // Audience filter
        if (activeFilter === 'all') return true;
        if (activeFilter === 'new') return tool.tag === 'New';
        if (activeFilter === 'jobseeker') return tool.audience.includes('jobseeker');
        if (activeFilter === 'employer') return tool.audience.includes('employer');
        
        return true;
    });

    return (
        <div className="free-tools-page">
            {/* Main Content Area */}
            <div className="free-tools-main-content">
                {/* Header Section with Title/Subtitle on Left and Search/Filters on Right */}
                <div className="free-tools-header">
                    <div className="free-tools-header-left">
                        <h1 className="free-tools-hero-title">Free Tools</h1>
                        <p className="free-tools-hero-description">
                            Access our collection of free tools to help you with your daily tasks.
                        </p>
                    </div>
                    <div className="free-tools-header-right">
                        <div className="free-tools-search-wrapper">
                            <HiMagnifyingGlass className="free-tools-search-icon" />
                            <input
                                type="text"
                                placeholder="Search tools..."
                                className="free-tools-search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="free-tools-filters">
                            <button
                                className={`free-tools-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveFilter('all')}
                            >
                                All
                            </button>
                            <button
                                className={`free-tools-filter-btn ${activeFilter === 'new' ? 'active' : ''}`}
                                onClick={() => setActiveFilter('new')}
                            >
                                New
                            </button>
                            <button
                                className={`free-tools-filter-btn ${activeFilter === 'jobseeker' ? 'active' : ''}`}
                                onClick={() => setActiveFilter('jobseeker')}
                            >
                                Job Seeker
                            </button>
                            <button
                                className={`free-tools-filter-btn ${activeFilter === 'employer' ? 'active' : ''}`}
                                onClick={() => setActiveFilter('employer')}
                            >
                                Employer
                            </button>
                        </div>
                    </div>
                </div>

                {filteredTools.length > 0 ? (
                    <div className="free-tools-grid">
                        {filteredTools.map((tool) => {
                            const IconComponent = tool.icon;
                            return (
                                <div
                                    key={tool.id}
                                    className={`free-tools-card ${tool.comingSoon ? 'coming-soon' : ''}`}
                                    onClick={() => handleToolClick(tool)}
                                >
                                    {tool.comingSoon && (
                                        <span className="free-tools-coming-soon-tag">Coming Soon</span>
                                    )}
                                    {tool.tag && !tool.comingSoon && (
                                        <span className="free-tools-available-tag">{tool.tag}</span>
                                    )}
                                    <div 
                                        className="free-tools-card-icon-wrapper"
                                        style={{ backgroundColor: `${tool.color}15` }}
                                    >
                                        <IconComponent 
                                            size={32} 
                                            color={tool.color}
                                        />
                                    </div>
                                    <h3 className="free-tools-card-name">{tool.name}</h3>
                                    <p className="free-tools-card-description">{tool.description}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="free-tools-empty">
                        <HiOutlineWrenchScrewdriver size={64} className="free-tools-empty-icon" />
                        <p className="free-tools-empty-text">
                            {searchQuery ? 'No tools found matching your search.' : 'More tools coming soon!'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FreeToolsPageClient;

