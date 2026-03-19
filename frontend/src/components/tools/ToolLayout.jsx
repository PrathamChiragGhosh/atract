"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiArrowLeft, HiHome, HiSparkles } from 'react-icons/hi';
import RelatedTools from './RelatedTools';
import LeadCapture from '@/components/leadCapture/LeadCapture';

const ToolLayout = ({ 
  children, 
  toolId,
  toolName,
  showRelatedTools = true,
  showLeadCapture = true,
  leadCaptureTitle,
  leadCaptureSubtitle
}) => {
  const router = useRouter();
  const [showLeadModal, setShowLeadModal] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.push('/');
  };

  const handleFreeTools = () => {
    router.push('/free-tools');
  };

  return (
    <div className="tool-layout">
      {/* Tool Header */}
      <div className="tool-header">
        <div className="tool-header-left">
          <button className="tool-back-btn" onClick={handleBack}>
            <HiArrowLeft size={18} />
          </button>
          <button className="tool-home-btn" onClick={handleHome}>
            <HiHome size={18} />
          </button>
        </div>
        <div className="tool-header-center">
          <span className="tool-badge">Free Tool</span>
          <h1 className="tool-title">{toolName}</h1>
        </div>
        <div className="tool-header-right">
          <button className="tool-free-tools-btn" onClick={handleFreeTools}>
            <HiSparkles size={16} />
            All Tools
          </button>
        </div>
      </div>

      {/* Tool Content */}
      <div className="tool-content">
        {children}
      </div>

      {/* Related Tools */}
      {showRelatedTools && (
        <RelatedTools currentToolId={toolId} />
      )}

      {/* CTA Section */}
      <div className="tool-cta-section">
        <h3>Like this tool?</h3>
        <p>Explore more free tools or register to save your work.</p>
        <div className="tool-cta-buttons">
          <button className="cta-secondary" onClick={handleFreeTools}>
            Browse All Tools
          </button>
          {showLeadCapture && (
            <button className="cta-primary" onClick={() => setShowLeadModal(true)}>
              Register to Save
            </button>
          )}
        </div>
      </div>

      {/* Lead Capture Modal */}
      {showLeadCapture && showLeadModal && (
        <LeadCapture 
          title={leadCaptureTitle || "Save Your Work"}
          subtitle={leadCaptureSubtitle || "Register to save your results and access them anytime"}
          source={toolId}
          onClose={() => setShowLeadModal(false)}
        />
      )}

      <style jsx>{`
        .tool-layout {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .tool-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          margin-bottom: 32px;
        }

        .tool-header-left {
          display: flex;
          gap: 8px;
        }

        .tool-back-btn,
        .tool-home-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tool-back-btn:hover,
        .tool-home-btn:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .tool-header-center {
          text-align: center;
        }

        .tool-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          color: #667eea;
          background: #f0f1ff;
          padding: 4px 12px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .tool-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .tool-header-right {
          display: flex;
          gap: 12px;
        }

        .tool-free-tools-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tool-free-tools-btn:hover {
          background: #5568d3;
        }

        .tool-content {
          min-height: 400px;
        }

        .tool-cta-section {
          margin-top: 48px;
          padding: 32px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          text-align: center;
        }

        .tool-cta-section h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .tool-cta-section p {
          font-size: 15px;
          color: #6b7280;
          margin: 0 0 20px 0;
        }

        .tool-cta-buttons {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .cta-primary {
          padding: 12px 24px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cta-primary:hover {
          background: #5568d3;
        }

        .cta-secondary {
          padding: 12px 24px;
          background: white;
          color: #6b7280;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cta-secondary:hover {
          border-color: #667eea;
          color: #667eea;
        }

        @media (max-width: 768px) {
          .tool-header {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .tool-header-left {
            order: 1;
          }

          .tool-header-center {
            order: 2;
          }

          .tool-header-right {
            order: 3;
            width: 100%;
            justify-content: center;
          }

          .tool-title {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default ToolLayout;
