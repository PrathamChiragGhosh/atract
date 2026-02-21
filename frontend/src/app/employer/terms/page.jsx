"use client";

import "./page.css";

const EmployerTermsPage = () => {
    return (
        <div className="terms-wrapper">
            <div className="terms-hero">
                <div className="terms-badge">Employer Terms</div>
                <h1>Employer Terms &amp; Conditions — Atract.in</h1>
                <p className="terms-updated">Last Updated: 12-06-2025</p>
                <p className="terms-lead">
                    These terms govern employer use of Atract, including job postings, hiring, billing, and compliance. By using
                    the platform, you agree to these terms.
                </p>
            </div>

            <div className="terms-section">
                <h2>1. Commercial Terms</h2>
                <h3>1.1 Fee Structure</h3>
                <ul>
                    <li>Junior Management (Executives to Assistant Manager / Deputy Manager): <strong>8.33% of annual CTC</strong></li>
                    <li>Middle Management (Manager, Senior Manager, AGM, DGM, etc.): <strong>10.5% of annual CTC</strong></li>
                    <li>Senior Management (General Manager Grade and above): <strong>12.5% of annual CTC</strong></li>
                </ul>

                <h3>1.2 GST</h3>
                <p>GST, as applicable, will be charged in addition to consultancy fees on all invoices.</p>

                <h3>1.3 Payment Terms</h3>
                <p>Payment must be made within <strong>7 to 30 days</strong> of the candidate joining your organization.</p>

                <h3>1.4 Replacement Policy</h3>
                <ul>
                    <li><strong>CTC up to ₹20 lakhs:</strong> If a candidate resigns within 3 months, one replacement at no extra cost.</li>
                    <li><strong>CTC above ₹20.01 lakhs:</strong> If a candidate resigns within 6 months, one replacement at no extra cost.</li>
                    <li>This does not apply if the candidate is removed for reasons other than misconduct.</li>
                    <li>If the candidate resigns on their own, the replacement clause applies. If terminated for reasons unrelated to misconduct, Core is not liable for replacement.</li>
                </ul>

                <h3>1.5 Payment Obligation</h3>
                <p>Payment is due post-joining under all circumstances per these terms.</p>

                <h3>1.6 Independence of Clauses</h3>
                <p>Payment and replacement clauses are mutually exclusive. Payment cannot be withheld once the candidate joins.</p>

                <h3>1.7 Trial Employment</h3>
                <p>Trial employment is not recognized. Once a referred candidate joins (with or without formal offer), full fee is due.</p>

                <h3>1.8 Resume Confidentiality</h3>
                <p>Resumes shared by Core are for your exclusive use. Do not share with affiliates or third parties without consent; any such hires are billable under these terms.</p>

                <h3>1.9 Deferred Joining or Hire</h3>
                <p>If a referred candidate is hired by you or an affiliate within one year, full consultancy charges apply.</p>
            </div>

            <div className="terms-section">
                <h2>2. Platform &amp; Compliance</h2>
                <h3>2.1 Account Responsibility</h3>
                <p>You are responsible for safeguarding account credentials and activity. Notify us of unauthorized use.</p>

                <h3>2.2 Job Posting Guidelines</h3>
                <p>Post accurate, lawful roles. No discriminatory, fraudulent, or misleading listings. We may remove violating posts.</p>

                <h3>2.3 Candidate Information</h3>
                <p>Candidate data is confidential and may be used only for legitimate hiring in compliance with data protection laws.</p>

                <h3>2.4 Service Availability</h3>
                <p>We strive for continuity but do not guarantee uninterrupted service. We may modify, suspend, or discontinue features.</p>

                <h3>2.5 Limitation of Liability</h3>
                <p>Core’s liability is limited to consultancy fees paid. We are not liable for indirect or consequential damages.</p>

                <h3>2.6 Modifications to Terms</h3>
                <p>We may update terms; continued use constitutes acceptance.</p>

                <h3>2.7 Governing Law</h3>
                <p>These terms are governed by Indian law; disputes fall under courts in India.</p>
            </div>

            <div className="terms-footer">
                <p>For any queries regarding these terms, please contact us through the platform or via email.</p>
            </div>
        </div>
    );
};

export default EmployerTermsPage;

