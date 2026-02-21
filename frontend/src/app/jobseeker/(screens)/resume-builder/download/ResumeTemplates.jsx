"use client";

import { useState, useEffect } from "react";
import { FaLock } from "react-icons/fa";
import { useUpdateDownloads } from '@/hooks/useResumeBuilder';
import { toast } from 'react-hot-toast';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from 'axios';
import Cookies from 'js-cookie';
import './ResumeTemplates.css';
import generateTemplate1HTML from '../resume-templates/template1';
import generateTemplate2HTML from '../resume-templates/template2';
import generateTemplate3HTML from '../resume-templates/template3';
import generateTemplate5HTML from '../resume-templates/template5';
import generateTemplate6HTML from '../resume-templates/template6';
import generateTemplate7HTML from '../resume-templates/template7';
import generateTemplate4HTML from '../resume-templates/template4';

function parseAIResumeTextDynamic(aiText) {
    const sections = {};
    // Handle undefined, null, or non-string values
    if (aiText === undefined || aiText === null) {
        return sections;
    }
    // Convert to string if it's not already
    const textString = typeof aiText === 'string' ? aiText : String(aiText || '');
    if (!textString.trim()) {
        return sections;
    }
    const lines = textString.split("\n");

    let currentSection = null;

    lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Match section headers (various formats)
        const sectionMatch = trimmedLine.match(/^([A-Z][A-Z\s&,/-]+):?\s*$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1].trim();
            sections[currentSection] = [];
        } else if (currentSection) {
            // Handle different line formats
            if (trimmedLine.startsWith("- ")) {
                const fieldMatch = trimmedLine.match(/^- ([^:]+):\s*(.*)$/);
                if (fieldMatch) {
                    const [, fieldName, fieldValue] = fieldMatch;
                    sections[currentSection].push({
                        [fieldName.trim()]: fieldValue.trim(),
                    });
                } else {
                    // Just a bullet point
                    const value = trimmedLine.substring(2).trim();
                    if (value) {
                        sections[currentSection].push(value);
                    }
                }
            } else if (trimmedLine.startsWith("Entry #")) {
                // New entry in a multiple-entry section
                sections[currentSection].push({});
            } else if (trimmedLine.includes(":")) {
                // Field: value format
                const fieldMatch = trimmedLine.match(/^([^:]+):\s*(.*)$/);
                if (fieldMatch) {
                    const [, fieldName, fieldValue] = fieldMatch;
                    if (sections[currentSection].length === 0 || typeof sections[currentSection][sections[currentSection].length - 1] !== 'object') {
                        sections[currentSection].push({});
                    }
                    const lastEntry = sections[currentSection][sections[currentSection].length - 1];
                    lastEntry[fieldName.trim()] = fieldValue.trim();
                }
            } else if (trimmedLine.length > 0) {
                // Plain text line
                if (sections[currentSection].length === 0 || typeof sections[currentSection][sections[currentSection].length - 1] === 'object') {
                    sections[currentSection].push(trimmedLine);
                } else {
                    // Append to last string entry
                    sections[currentSection][sections[currentSection].length - 1] += ' ' + trimmedLine;
                }
            }
        }
    });

    return sections;
}

const handleDownloadPDF = async (parsedText, template = "template1", profilePicture = null) => {
    let resumeHtml;

    switch (template) {
        case "template1":
            resumeHtml = generateTemplate1HTML(parsedText, profilePicture);
            break;
        case "template2":
            resumeHtml = generateTemplate2HTML(parsedText, profilePicture);
            break;
        case "template3":
            resumeHtml = generateTemplate3HTML(parsedText);
            break;
        case "template5":
            resumeHtml = generateTemplate5HTML(parsedText);
            break;
        case "template6":
            resumeHtml = generateTemplate6HTML(parsedText);
            break;
        case "template7":
            resumeHtml = generateTemplate7HTML(parsedText);
            break;
        case "template4":
            resumeHtml = generateTemplate4HTML(parsedText);
            break;
        default:
            resumeHtml = generateTemplate1HTML(parsedText, profilePicture);
            break;
    }

    // For template1, template2, template3, template4, template5, template6, and template7, use backend Puppeteer service to generate text-based PDF (AI/ATS readable)
    // This preserves the text layer in the PDF, making it readable by AI systems and ATS parsers
    if (template === "template1" || template === "template2" || template === "template3" || template === "template4" || template === "template5" || template === "template6" || template === "template7") {
        const personalInfo = parsedText["Personal Information"] || parsedText["PERSONAL INFORMATION"];
        const fullName = personalInfo?.find((item) => item["Full Name"])?.["Full Name"] || 
                         personalInfo?.[0]?.["fullName"] || "resume";
        
        // Create full HTML document string
        const fullHTML = resumeHtml.includes('<!DOCTYPE html>') 
            ? resumeHtml 
            : `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${resumeHtml}</body></html>`;
        
        try {
            // Get API base URL
            const getBaseApiUrl = () => {
                if (typeof window === 'undefined') return '';
                return process.env.NEXT_PUBLIC_JOBSEEKER_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
            };
            
            const token = Cookies.get('js_token');
            if (!token) {
                throw new Error('No authentication token');
            }
            
            const baseUrl = getBaseApiUrl();
            
            // Call backend endpoint to generate PDF using Puppeteer (text-based)
            const response = await axios.post(
                `${baseUrl}/resume-builder/generate-pdf`,
                {
                    html: fullHTML,
                    filename: `${fullName}.pdf`
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'blob' // Important: receive as blob
                }
            );
            
            // Create download link for the PDF blob
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fullName}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            return;
        } catch (error) {
            console.error(`PDF Generation Error (${template}):`, error);
            // Fallback to html2canvas if backend fails (though it will be image-based)
            alert('Failed to generate PDF using backend service. Please try again.');
            throw error;
        }
    }

    const container = document.createElement("div");
    container.innerHTML = resumeHtml;
    
    // For template3, allow dynamic height; for others, use fixed height
    const isTemplate3 = template === "template3";
    const containerStyle = {
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "210mm",
        background: "#fff",
        zIndex: "-9999",
    };
    
    if (isTemplate3) {
        // Allow content to flow naturally for template3 - no min-height to avoid forcing empty space
        containerStyle.height = "auto";
    } else {
        containerStyle.height = "297mm";
    }
    
    Object.assign(container.style, containerStyle);
    document.body.appendChild(container);

    await new Promise((r) => setTimeout(r, 300));

    const personalInfo = parsedText["Personal Information"] || parsedText["PERSONAL INFORMATION"];
    const fullName = personalInfo?.find((item) => item["Full Name"])?.["Full Name"] || 
                     personalInfo?.[0]?.["fullName"] || "resume";

    try {
        if (isTemplate3) {
            // For template3, capture full content height and split into multiple pages
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true,
            });

            // Get actual content dimensions
            const contentWidth = container.scrollWidth;
            const contentHeight = container.scrollHeight;
            const pageHeightPx = 1123; // 297mm at 96 DPI
            const pageWidthPx = 794; // 210mm at 96 DPI
            const pdfWidth = 210;
            const pdfHeight = 297;
            
            // Find all links first
            const links = container.querySelectorAll('a[href]');
            const linkPositions = [];
            
            // Capture full content and get link positions in onclone
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                width: contentWidth,
                height: contentHeight,
                windowWidth: contentWidth,
                windowHeight: contentHeight,
                onclone: (clonedDoc) => {
                    const clonedContainer = clonedDoc.querySelector('#resume-html');
                    if (!clonedContainer) return;
                    
                    const clonedLinks = clonedContainer.querySelectorAll('a[href]');
                    const containerWidthPx = clonedContainer.scrollWidth || contentWidth;
                    const containerHeightPx = clonedContainer.scrollHeight || contentHeight;
                    
                    clonedLinks.forEach((clonedLink, index) => {
                        if (index < links.length) {
                            const originalLink = links[index];
                            const rect = clonedLink.getBoundingClientRect();
                            const containerRect = clonedContainer.getBoundingClientRect();
                            
                            const relativeY = rect.top - containerRect.top;
                            const relativeX = rect.left - containerRect.left;
                            
                            // Convert pixels to mm
                            const xMm = (relativeX / containerWidthPx) * pdfWidth;
                            const yMm = (relativeY / containerHeightPx) * ((containerHeightPx * pdfWidth) / containerWidthPx);
                            const widthMm = (rect.width / containerWidthPx) * pdfWidth;
                            const heightMm = (rect.height / containerHeightPx) * ((containerHeightPx * pdfWidth) / containerWidthPx);
                            
                            linkPositions.push({
                                url: originalLink.href,
                                x: xMm,
                                y: yMm,
                                width: widthMm,
                                height: heightMm,
                                page: Math.floor(yMm / pdfHeight)
                            });
                        }
                    });
                }
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            
            // Calculate how many pages we need
            const imgHeightMm = (canvas.height * pdfWidth) / canvas.width;
            const numPages = Math.ceil(imgHeightMm / pdfHeight);
            
            // Split into multiple pages
            for (let i = 0; i < numPages; i++) {
                if (i > 0) {
                    pdf.addPage();
                }
                
                const sourceY = (canvas.height / numPages) * i;
                const sourceHeight = Math.min(canvas.height / numPages, canvas.height - sourceY);
                
                // Create a temporary canvas for this page
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sourceHeight;
                const pageCtx = pageCanvas.getContext('2d');
                pageCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
                
                const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
                const pageImgHeight = (sourceHeight * pdfWidth) / canvas.width;
                pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, Math.min(pageImgHeight, pdfHeight));
                
                // Add clickable links for this page
                linkPositions.forEach(linkPos => {
                    if (linkPos.page === i) {
                        // Adjust Y position relative to current page
                        const linkY = linkPos.y - (i * pdfHeight);
                        pdf.link(linkPos.x, linkY, linkPos.width, linkPos.height, { url: linkPos.url });
                    }
                });
            }
            
            pdf.save(`${fullName}.pdf`);
        } else {
            // Use html2canvas to render as image, then add to PDF as single page
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                width: 794,   // 210mm at 96 DPI
                height: 1123, // 297mm at 96 DPI
                windowWidth: 794,
                windowHeight: 1123,
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true,
            });

            // A4 dimensions in mm
            const pdfWidth = 210;
            const pdfHeight = 297;
            
            // Calculate dimensions to fit A4 exactly
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            
            // If image is taller than A4, scale it down proportionally
            let finalWidth = imgWidth;
            let finalHeight = imgHeight;
            
            if (imgHeight > pdfHeight) {
                finalHeight = pdfHeight;
                finalWidth = (canvas.width * pdfHeight) / canvas.height;
            }

            // Center the image if needed
            const xOffset = (pdfWidth - finalWidth) / 2;
            const yOffset = 0;

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
            pdf.save(`${fullName}.pdf`);
        }
    } catch (error) {
        console.error("PDF generation error:", error);
        throw error;
    } finally {
        document.body.removeChild(container);
    }
};

const ResumeTemplates = ({ enhancedText, planType, downloadsRemaining, onDownloadsUpdate, resumeId, profilePicture = null }) => {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const updateDownloadsMutation = useUpdateDownloads();

    // Prevent body scrolling when modal is open
    useEffect(() => {
        if (selectedTemplate) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedTemplate]);

    const templates = [
        { type: "template1", category: "Modern Templates", label: "Modern Blue", plan: "basic", img: "/assets/template1.jpeg" },
        { type: "template2", category: "Modern Templates", label: "Professional Orange", plan: "basic", img: "/assets/template2.jpeg" },
        { type: "template3", category: "Modern Templates", label: "Classic White", plan: "premium", img: "/assets/resume3.png" },
        { type: "template4", category: "Modern Templates", label: "Professional Dark Blue", plan: "premium", img: "/assets/resume4.png" },
        { type: "template5", category: "Modern Templates", label: "Stylish Gradient", plan: "premium", img: "/assets/resume5.png" },
        { type: "template6", category: "Modern Templates", label: "Professional Blue", plan: "premium", img: "/assets/resume6.png" },
        { type: "template7", category: "Modern Templates", label: "Timeline Blue", plan: "premium", img: "/assets/resume7.png" },
    ];

    const handleDownloadTemplate = async (templateType) => {
        if (downloadsRemaining <= 0) {
            setShowModal(true);
            return;
        }

        // Find the template to get its plan requirement
        const template = templates.find(t => t.type === templateType);
        const templatePlan = template?.plan || "basic";

        setLoading(true);

        try {
            const preparedData = parseAIResumeTextDynamic(enhancedText);
            await handleDownloadPDF(preparedData, templateType, profilePicture || null);

            // Update downloads count - pass template's plan requirement
            await updateDownloadsMutation.mutateAsync(templatePlan);

            toast.success('Resume downloaded successfully!');
        } catch (err) {
            console.error("Download process error:", err);
            toast.error('Failed to download resume');
        } finally {
            setLoading(false);
        }
    };

    const planRank = { basic: 1, premium: 2, organization: 3 };
    const groupedTemplates = templates.reduce((acc, tpl) => {
        if (!acc[tpl.category]) acc[tpl.category] = [];
        acc[tpl.category].push(tpl);
        return acc;
    }, {});

    const userRank = planRank[planType] || 1;

    return (
        <div className="resumebuilder-templates-section">
            <h2 className="resumebuilder-templates-section-title">Choose a Template to Download</h2>
            
            {selectedTemplate && (
                <div className="resumebuilder-templates-modal">
                    <div className="resumebuilder-templates-modal-content" style={{ 
                        maxWidth: '480px', 
                        width: 'auto', 
                        maxHeight: '92vh', 
                        padding: '0',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '16px 20px',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1a237e' }}>Template Preview</h3>
                            <button 
                                onClick={() => setSelectedTemplate(null)}
                                style={{ 
                                    padding: '6px 12px', 
                                    background: 'transparent', 
                                    color: '#6b7280', 
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px', 
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = '#f3f4f6';
                                    e.target.style.color = '#374151';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                    e.target.style.color = '#6b7280';
                                }}
                            >
                                Close
                            </button>
                        </div>
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            justifyContent: 'flex-start', 
                            alignItems: 'center',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            maxHeight: 'calc(92vh - 65px)',
                            padding: '16px',
                            backgroundColor: '#f9fafb',
                            width: '100%',
                            boxSizing: 'border-box',
                            gap: '24px'
                        }}>
                            <div style={{
                                transform: 'scale(0.55)',
                                transformOrigin: 'top center',
                                width: '794px',
                                flexShrink: 0
                            }}>
                                <iframe
                                    srcDoc={(() => {
                                        if (!enhancedText) {
                                            return '<html><body>Loading...</body></html>';
                                        }
                                        const parsedText = parseAIResumeTextDynamic(enhancedText);
                                        let html = '';
                                        switch(selectedTemplate) {
                                            case "template1": html = generateTemplate1HTML(parsedText, profilePicture); break;
                                            case "template2": html = generateTemplate2HTML(parsedText, profilePicture); break;
                                            case "template3": html = generateTemplate3HTML(parsedText); break;
                                            case "template4": html = generateTemplate4HTML(parsedText); break;
                                            case "template5": html = generateTemplate5HTML(parsedText); break;
                                            case "template6": html = generateTemplate6HTML(parsedText); break;
                                            case "template7": html = generateTemplate7HTML(parsedText); break;
                                            default: html = generateTemplate1HTML(parsedText, profilePicture);
                                        }
                                        // Add page break indicators and ensure all content is visible
                                        return html.replace('</style>', `
                                            .resume-container {
                                                margin-bottom: 20px;
                                                page-break-after: always;
                                                break-after: page;
                                            }
                                            .resume-container:last-child {
                                                margin-bottom: 0;
                                                page-break-after: auto;
                                                break-after: auto;
                                            }
                                            body {
                                                padding-bottom: 20px;
                                            }
                                        </style>`);
                                    })()}
                                    style={{
                                        width: '794px',
                                        height: 'auto',
                                        minHeight: '1123px',
                                        border: 'none',
                                        backgroundColor: '#ffffff',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                        borderRadius: '8px',
                                        display: 'block'
                                    }}
                                    scrolling="no"
                                    onLoad={(e) => {
                                        // Adjust iframe height to show all content
                                        const iframe = e.target;
                                        try {
                                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                                            if (iframeDoc) {
                                                const body = iframeDoc.body;
                                                const html = iframeDoc.documentElement;
                                                const height = Math.max(
                                                    body.scrollHeight,
                                                    body.offsetHeight,
                                                    html.clientHeight,
                                                    html.scrollHeight,
                                                    html.offsetHeight
                                                );
                                                // Set height to show all content, minimum one page
                                                iframe.style.height = Math.max(height, 1123) + 'px';
                                            }
                                        } catch (err) {
                                            // Cross-origin or other error, use auto height
                                            console.log('Could not adjust iframe height:', err);
                                            iframe.style.height = 'auto';
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {Object.keys(groupedTemplates).map((category) => (
                <div key={category} className="resumebuilder-templates-category">
                    <h3 className="resumebuilder-templates-category-title">{category}</h3>
                    <div className="resumebuilder-templates-grid">
                        {groupedTemplates[category].map((tpl) => {
                            const templateRank = planRank[tpl.plan];
                            const isLocked = templateRank > userRank;

                            return (
                                <div className="resumebuilder-templates-card" key={tpl.type}>
                                    <div className="resumebuilder-templates-img-wrapper">
                                        <div className="resumebuilder-templates-img-container" style={{ 
                                            position: 'relative', 
                                            width: '100%', 
                                            height: '100%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'flex-start',
                                            overflow: 'hidden',
                                            backgroundColor: '#f9fafb'
                                        }}>
                                            <div style={{
                                                transform: 'scale(0.31)',
                                                transformOrigin: 'top center',
                                                width: '794px',
                                                height: '1123px',
                                                flexShrink: 0
                                            }}>
                                                <iframe
                                                    srcDoc={(() => {
                                                        if (!enhancedText) {
                                                            return '<html><body>Loading...</body></html>';
                                                        }
                                                        const parsedText = parseAIResumeTextDynamic(enhancedText);
                                                        switch(tpl.type) {
                                                            case "template1": return generateTemplate1HTML(parsedText, profilePicture);
                                                            case "template2": return generateTemplate2HTML(parsedText, profilePicture);
                                                            case "template3": return generateTemplate3HTML(parsedText);
                                                            case "template4": return generateTemplate4HTML(parsedText);
                                                            case "template5": return generateTemplate5HTML(parsedText);
                                                            case "template6": return generateTemplate6HTML(parsedText);
                                                            case "template7": return generateTemplate7HTML(parsedText);
                                                            default: return generateTemplate1HTML(parsedText, profilePicture);
                                                        }
                                                    })()}
                                                    style={{
                                                        width: '794px',
                                                        height: '1123px',
                                                        border: 'none',
                                                        backgroundColor: '#ffffff',
                                                        display: 'block',
                                                        pointerEvents: 'none'
                                                    }}
                                                    scrolling="no"
                                                />
                                            </div>
                                            </div>
                                            {isLocked ? (
                                            <div className="resumebuilder-templates-overlay">
                                                <div className="resumebuilder-templates-locked-overlay">
                                                    <FaLock className="resumebuilder-templates-lock-icon" />
                                                    <div className="resumebuilder-templates-locked-text">Locked</div>
                                                    <div className="resumebuilder-templates-locked-caption">
                                                        Upgrade to <strong>{tpl.plan}</strong> plan to use this template
                                                    </div>
                                                    </div>
                                                </div>
                                            ) : (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                padding: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                background: 'rgba(255, 255, 255, 0.95)',
                                                backdropFilter: 'blur(4px)',
                                                borderTop: '1px solid rgba(0, 0, 0, 0.1)'
                                            }}>
                                                <button
                                                    className="resumebuilder-templates-download-button"
                                                    onClick={() => setSelectedTemplate(tpl.type)}
                                                    style={{ 
                                                        background: '#4caf50',
                                                        color: 'white',
                                                        width: '100%'
                                                    }}
                                                >
                                                    Preview
                                                </button>
                                                <button
                                                    className="resumebuilder-templates-download-button"
                                                    onClick={() => handleDownloadTemplate(tpl.type)}
                                                    disabled={loading}
                                                    style={{ width: '100%' }}
                                                >
                                                    {loading ? "Downloading..." : "Download"}
                                                </button>
                                            </div>
                                            )}
                                    </div>
                                    <div className="resumebuilder-templates-name">{tpl.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {showModal && (
                <div className="resumebuilder-templates-modal">
                    <div className="resumebuilder-templates-modal-content">
                        <h3>No Downloads Remaining</h3>
                        <p>You've used all your available downloads. Upgrade your plan to unlock more resume downloads and templates.</p>
                        <button onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResumeTemplates;

