import "./shipping-policy.css";

export default function ShippingPolicyPage() {
    return (
        <div className="pp-wrapper">
            <div className="pp-hero">
                <div className="pp-badge">Shipping &amp; Delivery Policy</div>
                <h1>Shipping &amp; Delivery Policy — Atract Marketplace</h1>
                <p className="pp-updated">Last Updated: 12-06-2025</p>
                <p className="pp-lead">
                    This policy applies to all marketplace transactions on Atract.in, including physical goods (future launch),
                    digital goods, and partner products.
                </p>
            </div>

            <div className="pp-section">
                <h2>1. Dispatch &amp; Delivery Timelines (Physical Goods)</h2>
                <p>Our partner sellers typically dispatch products within:</p>
                <ul>
                    <li>1–3 business days for domestic orders</li>
                    <li>3–7 business days for international orders</li>
                </ul>
                <p>Delivery time depends on:</p>
                <ul>
                    <li>Location</li>
                    <li>Courier partner</li>
                    <li>Product availability</li>
                </ul>
                <p>Atract.in is not liable for delays caused by courier companies.</p>
            </div>

            <div className="pp-section">
                <h2>2. Shipping Charges</h2>
                <p>Shipping charges (if any) will be displayed at checkout. Taxes and duties (international) must be paid by the customer.</p>
            </div>

            <div className="pp-section">
                <h2>3. Product Tracking</h2>
                <p>Tracking information will be provided by sellers or courier partners, where available.</p>
            </div>

            <div className="pp-section">
                <h2>4. Returns &amp; Replacements</h2>
                <ul>
                    <li>Replacements allowed only for damaged or defective products.</li>
                    <li>Damage must be reported within 48 hours with images/video.</li>
                    <li>Refunds depend on seller policy.</li>
                </ul>
            </div>

            <div className="pp-section">
                <h2>5. Digital Product Delivery</h2>
                <ul>
                    <li>For digital purchases (resume, reports, AI tools): delivery is instantaneous.</li>
                    <li>No shipping involved.</li>
                    <li>No refund once delivered.</li>
                </ul>
            </div>

            <div className="pp-section">
                <h2>6. Partner Responsibility</h2>
                <p>Atract.in acts as a facilitator. Responsibility for delivery, packaging, and condition lies with the respective seller.</p>
            </div>

            <div className="pp-section">
                <h2>7. Contact</h2>
                <p>Email: Rajiv.ghoshrajiv@atract.in</p>
            </div>
        </div>
    );
}

