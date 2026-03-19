"use client";

import { useRouter } from 'next/navigation';
import { HiArrowRight } from 'react-icons/hi2';
import { getRelatedTools, getToolById } from '@/data/toolsConfig';

const RelatedTools = ({ currentToolId }) => {
  const router = useRouter();
  const relatedTools = getRelatedTools(currentToolId);

  if (!relatedTools || relatedTools.length === 0) {
    return null;
  }

  const handleToolClick = (tool) => {
    if (tool.route && !tool.comingSoon) {
      router.push(tool.route);
    }
  };

  return (
    <div className="related-tools-container">
      <h3 className="related-title">Try These Related Tools</h3>
      <div className="related-grid">
        {relatedTools.map((tool) => (
          <div
            key={tool.id}
            className={`related-card ${tool.comingSoon ? 'coming-soon' : ''}`}
            onClick={() => handleToolClick(tool)}
          >
            <span className="related-icon">{tool.icon}</span>
            <div className="related-info">
              <h4>{tool.name}</h4>
              <p>{tool.shortDescription}</p>
            </div>
            {!tool.comingSoon && (
              <HiArrowRight className="related-arrow" />
            )}
            {tool.comingSoon && (
              <span className="coming-soon-badge">Coming Soon</span>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .related-tools-container {
          margin-top: 40px;
          padding-top: 32px;
          border-top: 1px solid #e5e7eb;
        }

        .related-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 20px 0;
        }

        .related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .related-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .related-card:hover:not(.coming-soon) {
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .related-card.coming-soon {
          opacity: 0.7;
          cursor: default;
        }

        .related-icon {
          font-size: 28px;
          flex-shrink: 0;
        }

        .related-info {
          flex: 1;
          min-width: 0;
        }

        .related-info h4 {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .related-info p {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .related-arrow {
          color: #9ca3af;
          flex-shrink: 0;
        }

        .coming-soon-badge {
          font-size: 11px;
          color: #9ca3af;
          background: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default RelatedTools;
