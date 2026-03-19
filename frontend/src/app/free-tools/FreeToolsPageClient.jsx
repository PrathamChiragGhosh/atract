"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    HiOutlineWrenchScrewdriver,
    HiArrowRight,
    HiSparkles,
    HiUserGroup,
    HiBolt,
    HiChatBubbleLeftRight
} from 'react-icons/hi2';
import { toolsConfig, toolCategories, getRelatedTools } from '@/data/toolsConfig';
import './page.css';

const FreeToolsPageClient = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    // Get category icon
    const getCategoryIcon = (categoryId) => {
        switch (categoryId) {
            case 'HR-Tech': return HiUserGroup;
            case 'Utilities': return HiBolt;
            case 'Communication': return HiChatBubbleLeftRight;
            default: return HiOutlineWrenchScrewdriver;
        }
    };

    // Filter tools based on search and filter
    const filteredTools = toolsConfig.filter(tool => {
        // Search filter
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;

        // Category filter
        if (activeFilter === 'all') return true;
        if (activeFilter === 'live') return !tool.comingSoon;
        if (activeFilter === 'coming-soon') return tool.comingSoon;
        
        return tool.category === activeFilter;
    });

    const handleToolClick = (tool) => {
        if (tool.comingSoon) return;
        if (tool.route) {
            router.push(tool.route);
        }
    };

    // Get related tools for suggestions
    const liveTools = toolsConfig.filter(t => !t.comingSoon).slice(0, 4);

    return (
        <div className="free-tools-page">
            {/* Hero Section */}
            <div className="free-tools-hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        <HiSparkles className="hero-icon" />
                        Free Tools Hub
                    </h1>
                    <p className="hero-description">
                        Powerful HR & Recruitment tools to streamline your hiring process. 
                        All tools are free to use with premium features available.
                    </p>
                    <div className="hero-stats">
                        <div className="stat-item">
                            <span className="stat-number">{liveTools.length}+</span>
                            <span className="stat-label">Live Tools</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">10K+</span>
                            <span className="stat-label">Users</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">Free</span>
                            <span className="stat-label">To Start</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="free-tools-main-content">
                {/* Header Section with Title/Subtitle on Left and Search/Filters on Right */}
                <div className="free-tools-header">
                    <div className="free-tools-header-left">
                        <h1 className="free-tools-hero-title">All Tools</h1>
                        <p className="free-tools-hero-description">
                            Browse our collection of tools designed for job seekers and employers.
                        </p>
                    </div>
                    <div className="free-tools-header-right">
                        <div className="free-tools-search-wrapper">
                            <HiOutlineWrenchScrewdriver className="free-tools-search-icon" />
                            <input
                                type="text"
                                placeholder="Search tools..."
                                className="free-tools-search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="category-filters">
                    {toolCategories.map((category) => {
                        const IconComponent = getCategoryIcon(category.id);
                        return (
                            <button
                                key={category.id}
                                className={`category-btn ${activeFilter === category.id ? 'active' : ''}`}
                                onClick={() => setActiveFilter(category.id)}
                            >
                                <IconComponent size={16} />
                                {category.name}
                            </button>
                        );
                    })}
                </div>

                {/* Tools Grid */}
                {filteredTools.length > 0 ? (
                    <div className="free-tools-grid">
                        {filteredTools.map((tool) => (
                            <div
                                key={tool.id}
                                className={`free-tools-card ${tool.comingSoon ? 'coming-soon' : ''}`}
                                onClick={() => handleToolClick(tool)}
                            >
                                {tool.comingSoon && (
                                    <span className="free-tools-coming-soon-tag">Coming Soon</span>
                                )}
                                {!tool.comingSoon && tool.status === 'Live' && (
                                    <span className="free-tools-live-tag">Live</span>
                                )}
                                <div 
                                    className="free-tools-card-icon-wrapper"
                                    style={{ backgroundColor: `${tool.color}15` }}
                                >
                                    <span className="tool-icon-emoji">{tool.icon}</span>
                                </div>
                                <h3 className="free-tools-card-name">{tool.name}</h3>
                                <p className="free-tools-card-description">{tool.description}</p>
                                <div className="tool-meta">
                                    <span className="tool-category">{tool.category}</span>
                                    <span className="tool-pricing">{tool.pricing}</span>
                                </div>
                                {!tool.comingSoon && tool.route && (
                                    <button className="tool-open-btn">
                                        Open Tool <HiArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="free-tools-empty">
                        <HiOutlineWrenchScrewdriver size={64} className="free-tools-empty-icon" />
                        <p className="free-tools-empty-text">
                            {searchQuery ? 'No tools found matching your search.' : 'More tools coming soon!'}
                        </p>
                    </div>
                )}

                {/* Related Tools Section */}
                {!searchQuery && activeFilter === 'all' && (
                    <div className="related-tools-section">
                        <h2 className="section-title">Popular Tools</h2>
                        <div className="related-tools-grid">
                            {liveTools.map((tool) => (
                                <div
                                    key={tool.id}
                                    className="related-tool-card"
                                    onClick={() => handleToolClick(tool)}
                                >
                                    <span className="related-tool-icon">{tool.icon}</span>
                                    <div className="related-tool-info">
                                        <h4>{tool.name}</h4>
                                        <p>{tool.shortDescription}</p>
                                    </div>
                                    <HiArrowRight className="related-arrow" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA Section */}
                <div className="cta-section">
                    <h2>Need a Custom Solution?</h2>
                    <p>Contact us for custom HR tools tailored to your organization needs.</p>
                    <button className="cta-button" onClick={() => router.push('/contact-us')}>
                        Contact Sales <HiArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FreeToolsPageClient;
