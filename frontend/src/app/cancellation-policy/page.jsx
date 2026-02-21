import "./cancellation-policy.css";

export default function CancellationPolicyPage() {
    return (
        <div className="pp-wrapper">
            <div className="pp-hero">
                <div className="pp-badge">Cancellation &amp; Refund Policy</div>
                <h1>Cancellation &amp; Refund Policy — Atract.in</h1>
                <p className="pp-updated">Last Updated: 12-06-2025</p>
                <p className="pp-lead">
                    This policy applies to all paid services on Atract.in, including resume writing, job seeker assessments,
                    recruitment SME assessment tools, marketplace digital products, subscription services, Smart Select, and
                    other paid tools.
                </p>
            </div>

            <div className="pp-section">
                <h2>1. General Rule — Digital Services Are Non-Refundable</h2>
                <p>Once a digital service is delivered, no refund is issued. A service is considered delivered when:</p>
                <ul>
                    <li>Resume is generated or sent</li>
                    <li>Assessment link is provided</li>
                    <li>Dashboard access is granted</li>
                    <li>Download link is sent</li>
                </ul>
                <p>This is standard across resume-writing and job services.</p>
            </div>

            <div className="pp-section">
                <h2>2. Cancellation Before Delivery</h2>
                <ul>
                    <li>If you request cancellation before service delivery, you may be eligible for a refund.</li>
                    <li>Refunds will be processed within 5–10 working days.</li>
                    <li>A cancellation fee of 10%–30% may apply.</li>
                </ul>
            </div>

            <div className="pp-section">
                <h2>3. No Refund for Wrong Information Provided</h2>
                <p>If incorrect information is provided (typos, wrong documents), no refund is issued. You must re-purchase the service.</p>
            </div>

            <div className="pp-section">
                <h2>4. No Guarantee of Hiring or Shortlisting</h2>
                <p>Paid services do not guarantee interviews, job offers, placement, or responses from employers. No refund will be entertained on these grounds.</p>
            </div>

            <div className="pp-section">
                <h2>5. Marketplace Orders (Products)</h2>
                <ul>
                    <li>Cancellations allowed within 12 hours of order.</li>
                    <li>After dispatch, no cancellation.</li>
                    <li>Damaged products will be replaced as per seller policy.</li>
                </ul>
            </div>

            <div className="pp-section">
                <h2>6. Refund Method</h2>
                <p>Refunds are processed via the original payment method, usually within 5–10 working days.</p>
            </div>

            <div className="pp-section">
                <h2>7. Contact</h2>
                <p>Email: rajiv.ghoshrajiv@atract.in</p>
            </div>
        </div>
    );
}

