"use client";

import { useRouter } from 'next/navigation';
import { FaTimesCircle, FaHome } from 'react-icons/fa';
import './PaymentCancel.css';

const PaymentCancel = ({ onHomeRedirect = "/" }) => {
    const router = useRouter();

    const handleHome = () => {
        router.push(onHomeRedirect);
    };

    return (
        <div className="payment-cancel-wrapper">
            <div className="payment-cancel-card">
                <FaTimesCircle className="payment-cancel-icon" />
                <h2 className="payment-cancel-title">Payment Cancelled</h2>
                <p className="payment-cancel-message">
                    Your payment was not completed or was cancelled. No charges have been made.
                </p>
                <div className="payment-cancel-help">
                    If you need any assistance, please contact our support team.
                </div>
                <button className="payment-cancel-btn" onClick={handleHome}>
                    <FaHome style={{ marginRight: 8, fontSize: 17, verticalAlign: '-2px' }} />
                    Return to Home
                </button>
            </div>
        </div>
    );
};

export default PaymentCancel;

