"use client";

import "./page.css";

const JobSeekerTermsPage = () => {
    return (
        <div className="terms-wrapper js-terms">
            <div className="terms-hero">
                <div className="terms-badge">Job Seeker Terms</div>
                <h1>Job Seeker Terms &amp; Conditions — Atract.in</h1>
                <p className="terms-updated">Last Updated: 12-06-2025</p>
                <p className="terms-lead">
                    These terms govern job seeker use of Atract, including account use, applications, assessments, and data handling.
                    By using the platform, you agree to these terms.
                </p>
            </div>

            <div className="terms-section">
                <h2>1. Account &amp; Registration</h2>
                <h3>1.1 Account Creation</h3>
                <p>Provide accurate, current, and complete information. You are responsible for your credentials and all account activity.</p>

                <h3>1.2 Account Security</h3>
                <p>Notify us immediately of unauthorized use. We are not liable for losses from failure to protect credentials.</p>

                <h3>1.3 Profile Information</h3>
                <p>Maintain accurate resume, skills, experience, and qualifications. Misrepresentation may lead to suspension/termination.</p>
            </div>

            <div className="terms-section">
                <h2>2. Job Applications</h2>
                <h3>2.1 Application Process</h3>
                <ul>
                    <li>Your application/profile is shared with the employer you apply to.</li>
                    <li>Employers may contact you directly.</li>
                    <li>No guarantee of interviews or offers; decisions are the employer’s.</li>
                </ul>

                <h3>2.2 Assessments &amp; Testing</h3>
                <ul>
                    <li>Complete honestly without unauthorized assistance.</li>
                    <li>Follow assessment guidelines; results may be shared with employers.</li>
                </ul>

                <h3>2.3 Application Withdrawal</h3>
                <p>You may withdraw via the platform. Data already shared may remain with employers per their retention policies.</p>
            </div>

            <div className="terms-section">
                <h2>3. Resume &amp; Profile</h2>
                <h3>3.1 Resume Upload</h3>
                <p>You own your resume/profile. By uploading, you permit sharing with employers for recruitment. Content must be truthful.</p>

                <h3>3.2 Profile Visibility</h3>
                <p>Your profile may be visible to employers for applications or talent search; manage visibility in settings where available.</p>

                <h3>3.3 Data Accuracy</h3>
                <p>Ensure all profile data (work history, education, skills, certifications) is accurate; false info may lead to termination.</p>
            </div>

            <div className="terms-section">
                <h2>4. Communication &amp; Notifications</h2>
                <h3>4.1 Email/Platform Notifications</h3>
                <p>We may send job alerts, status updates, and platform messages. Manage preferences in settings where available.</p>

                <h3>4.2 Employer Communications</h3>
                <p>Employers may contact you directly. We are not responsible for employer communications.</p>
            </div>

            <div className="terms-section">
                <h2>5. Platform Usage</h2>
                <h3>5.1 Acceptable Use</h3>
                <ul>
                    <li>No unlawful use or violation of laws.</li>
                    <li>No impersonation or misrepresentation.</li>
                    <li>No malware, harmful code, or attempts to gain unauthorized access.</li>
                    <li>No interference with platform operations.</li>
                    <li>No harvesting data without consent.</li>
                </ul>

                <h3>5.2 Platform Availability</h3>
                <p>We aim for continuous service but do not guarantee uptime. Features may change, suspend, or discontinue.</p>

                <h3>5.3 Intellectual Property</h3>
                <p>Platform content is owned by Core or licensors. Do not reproduce or distribute without permission.</p>
            </div>

            <div className="terms-section">
                <h2>6. Privacy &amp; Data Protection</h2>
                <h3>6.1 Data Collection</h3>
                <p>We process personal data per our Privacy Policy. Using the platform signifies consent to that processing.</p>

                <h3>6.2 Data Sharing with Employers</h3>
                <p>When you apply, your profile/resume is shared with the employer. Employer handling of your data is their responsibility.</p>
            </div>

            <div className="terms-section">
                <h2>7. Limitation of Liability</h2>
                <h3>7.1 No Guarantee of Employment</h3>
                <p>We do not guarantee job offers or interviews.</p>

                <h3>7.2 Third-Party Content</h3>
                <p>We are not responsible for third-party sites or employer postings.</p>

                <h3>7.3 Liability Limit</h3>
                <p>To the maximum extent allowed by law, we are not liable for indirect, incidental, or consequential damages.</p>
            </div>

            <div className="terms-section">
                <h2>8. Account Termination</h2>
                <h3>8.1 Termination by You</h3>
                <p>You may terminate your account anytime; access ends immediately upon termination.</p>

                <h3>8.2 Termination by Us</h3>
                <p>We may suspend/terminate for violations, fraud, or misuse, with or without notice.</p>
            </div>

            <div className="terms-section">
                <h2>9. General</h2>
                <h3>9.1 Modifications</h3>
                <p>We may modify these terms; continued use means acceptance.</p>

                <h3>9.2 Governing Law</h3>
                <p>Indian law governs; disputes are under Indian courts.</p>

                <h3>9.3 Contact</h3>
                <p>Contact us via the platform or the details in our Privacy Policy.</p>
            </div>

            <div className="terms-footer">
                <p>By using our platform, you acknowledge and agree to these Terms &amp; Conditions.</p>
            </div>
        </div>
    );
};

export default JobSeekerTermsPage;

