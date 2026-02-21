import "./privacy-policy.css";

export default function PrivacyPolicyPage() {
    return (
        <div className="pp-wrapper">
            <div className="pp-hero">
                <div className="pp-badge">Privacy Policy</div>
                <h1>Privacy Policy — Atract.in</h1>
                <p className="pp-updated">Last Updated: 12-06-2025</p>
                <p className="pp-lead">
                    Atract.in (“Atract”, “we”, “our”, “us”) is an online recruitment and professional services platform
                    that connects employers, agencies, job seekers, service providers, and other users. We are committed
                    to protecting your personal information and being transparent about how we use it.
                </p>
                <p className="pp-lead">
                    This Privacy Policy explains what information we collect, why we collect it, how we use it, how we
                    protect it, and your rights regarding your personal data. By accessing or using Atract.in, you
                    consent to the practices described in this Privacy Policy.
                </p>
            </div>

            <div className="pp-section">
                <h2>1. Information We Collect</h2>
                <p>We collect the following categories of data:</p>

                <h3>1.1 Personal Information (Provided by Candidates)</h3>
                <ul>
                    <li>Full name</li>
                    <li>Email address</li>
                    <li>Mobile number</li>
                    <li>Date of birth</li>
                    <li>Location / address</li>
                    <li>Resume / CV content</li>
                    <li>Educational qualifications</li>
                    <li>Work experience</li>
                    <li>Skills, certifications</li>
                    <li>Links to social profiles (LinkedIn, GitHub, portfolio)</li>
                    <li>Video resume (if uploaded)</li>
                    <li>Any documents uploaded (ID proofs, etc.)</li>
                </ul>

                <h3>1.2 Personal Information (Provided by Employers / Agencies)</h3>
                <ul>
                    <li>Company name</li>
                    <li>Contact name</li>
                    <li>Job title</li>
                    <li>Phone number</li>
                    <li>Email address</li>
                    <li>Company profile</li>
                    <li>Job postings and hiring preferences</li>
                </ul>

                <h3>1.3 Technical &amp; Usage Information</h3>
                <ul>
                    <li>IP address</li>
                    <li>Device information</li>
                    <li>Browser type</li>
                    <li>Cookies</li>
                    <li>Log files</li>
                    <li>Session behavior</li>
                    <li>Page views and interaction history</li>
                </ul>

                <h3>1.4 Financial / Payment Information</h3>
                <p>
                    For paid services (resume writing, assessments, subscriptions) we collect payment info through secure
                    payment gateways (Razorpay, etc.). We do not store your card/bank details.
                </p>
            </div>

            <div className="pp-section">
                <h2>2. How We Use The Information</h2>
                <p>We use your information for the following purposes:</p>

                <h3>2.1 Recruitment &amp; Job Platform Services</h3>
                <ul>
                    <li>To create your profile</li>
                    <li>To match you with suitable job roles</li>
                    <li>To inform you about relevant job openings</li>
                    <li>To share your profile with employers when you apply</li>
                </ul>

                <h3>2.2 AI-Based Services</h3>
                <p>When you opt-in for services such as:</p>
                <ul>
                    <li>AI Resume Writing</li>
                    <li>AI Candidate Assessment</li>
                    <li>AI Job Matching</li>
                </ul>
                <p>We use your data to provide these services and generate results.</p>

                <h3>2.3 Communication</h3>
                <ul>
                    <li>Email/SMS alerts</li>
                    <li>Job notifications</li>
                    <li>Status updates</li>
                    <li>Support responses</li>
                </ul>

                <h3>2.4 Platform Improvement</h3>
                <ul>
                    <li>Analytics</li>
                    <li>Testing</li>
                    <li>Enhancing algorithms</li>
                    <li>Understanding usage patterns</li>
                </ul>

                <h3>2.5 Legal &amp; Compliance</h3>
                <ul>
                    <li>Fraud detection</li>
                    <li>Preventing misuse</li>
                    <li>Responding to lawful requests</li>
                </ul>
            </div>

            <div className="pp-section">
                <h2>3. Sharing of Information</h2>
                <p>We may share information with:</p>

                <h3>3.1 Employers &amp; Recruiters</h3>
                <p>Only when:</p>
                <ul>
                    <li>You apply for a job</li>
                    <li>You explicitly agree to your profile being shared</li>
                </ul>

                <h3>3.2 Service Providers</h3>
                <p>Vetted third parties for:</p>
                <ul>
                    <li>Payment processing</li>
                    <li>Cloud hosting</li>
                    <li>Analytics</li>
                    <li>Communication delivery</li>
                </ul>

                <h3>3.3 Legal Disclosure</h3>
                <p>We may disclose information if required by:</p>
                <ul>
                    <li>Law enforcement</li>
                    <li>Court orders</li>
                    <li>Government requests</li>
                </ul>

                <p className="pp-strong">We never sell your data.</p>
            </div>

            <div className="pp-section">
                <h2>4. Data Retention</h2>
                <p>We retain data:</p>
                <ul>
                    <li>As long as your account is active</li>
                    <li>As needed to provide services</li>
                    <li>As required by law</li>
                </ul>
                <p>You may request deletion anytime (except where retention is legally mandated).</p>
            </div>

            <div className="pp-section">
                <h2>5. Security</h2>
                <p>We follow industry-standard security practices:</p>
                <ul>
                    <li>SSL encryption</li>
                    <li>Secure servers</li>
                    <li>Access control</li>
                    <li>Regular audits</li>
                    <li>Backup and recovery practices</li>
                </ul>
                <p>However, no system is 100% secure.</p>
            </div>

            <div className="pp-section">
                <h2>6. Your Rights</h2>
                <p>You have the right to:</p>
                <ul>
                    <li>Access your personal data</li>
                    <li>Correct inaccuracies</li>
                    <li>Request deletion</li>
                    <li>Withdraw consent</li>
                    <li>Opt-out of marketing</li>
                    <li>Request data portability</li>
                </ul>
            </div>

            <div className="pp-section">
                <h2>7. Cookies</h2>
                <p>We use cookies for:</p>
                <ul>
                    <li>Session management</li>
                    <li>Analytics</li>
                    <li>Personalisation</li>
                    <li>Performance improvement</li>
                </ul>
                <p>You can disable cookies in your browser.</p>
            </div>

            <div className="pp-section">
                <h2>8. Links to Third-Party Sites</h2>
                <p>Atract.in is not responsible for privacy practices of linked websites.</p>
            </div>

            <div className="pp-section">
                <h2>9. Changes to Policy</h2>
                <p>We may update this policy. Updated versions will be published with a new date.</p>
            </div>

            <div className="pp-section">
                <h2>10. Contact</h2>
                <p>Email: rajiv.ghoshrajiv@atract.in</p>
            </div>
        </div>
    );
}

