import jsPDF from 'jspdf';
import { caseStudies } from '../config/caseStudies';

/**
 * Generate and download a PDF file with case studies
 */
export const generateCaseStudiesPDF = () => {
  const doc = new jsPDF();
  
  // Set up fonts and colors
  const primaryColor = [37, 99, 235]; // Blue-600
  const textColor = [31, 41, 55]; // Gray-900
  const grayColor = [107, 114, 128]; // Gray-500
  
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace = 30) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };
  
  // Helper function to add text with word wrap
  const addText = (text, fontSize = 11, fontStyle = 'normal', color = textColor, isBold = false) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', fontStyle);
    }
    doc.setTextColor(color[0], color[1], color[2]);
    
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line) => {
      checkPageBreak(7);
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.5 + 2;
    });
    return lines.length;
  };
  
  // Title Page
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('AI Prompt Engineering', pageWidth / 2, 30, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Case Studies', pageWidth / 2, 45, { align: 'center' });
  
  yPosition = 80;
  
  // Introduction
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  addText('Selected, anonymised examples of AI projects I\'ve owned end-to-end, from problem definition to delivery.', 12);
  yPosition += 10;
  
  // Case Studies
  caseStudies.forEach((study, index) => {
    checkPageBreak(60);
    
    // Case Study Title
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(margin - 2, yPosition - 8, contentWidth + 4, 12, 2, 2, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${index + 1}. ${study.title}`, margin, yPosition);
    yPosition += 15;
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    // Metrics badge
    doc.setFillColor(219, 234, 254); // Blue-100
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const badgeWidth = doc.getTextWidth(study.metrics) + 8;
    doc.roundedRect(margin, yPosition - 6, badgeWidth, 8, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(study.metrics, margin + 4, yPosition);
    yPosition += 12;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    // Context
    addText('Context:', 11, 'normal', textColor, true);
    addText(study.context, 10);
    yPosition += 5;
    
    // Problem
    addText('Problem:', 11, 'normal', textColor, true);
    study.problem.forEach((item) => {
      addText(`• ${item}`, 10);
    });
    yPosition += 5;
    
    // My Role
    addText('My Role:', 11, 'normal', textColor, true);
    addText(study.role, 10);
    yPosition += 5;
    
    // Approach
    addText('Approach:', 11, 'normal', textColor, true);
    study.approach.forEach((item) => {
      addText(`• ${item}`, 10);
    });
    yPosition += 5;
    
    // Outcome
    addText('Outcome:', 11, 'normal', textColor, true);
    study.outcome.forEach((item) => {
      addText(`• ${item}`, 10);
    });
    
    yPosition += 15;
    
    // Add separator line (except for last item)
    if (index < caseStudies.length - 1) {
      checkPageBreak(10);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    }
  });
  
  // Add footer to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'AI Prompt Engineering - Case Studies',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }
  
  // Save the PDF
  doc.save('AI-Prompt-Engineering-Case-Studies.pdf');
};
