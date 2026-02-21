"use client";

import { useEffect } from 'react';

const RazorpayCheckout = ({ orderData, onSuccess, onError }) => {
    useEffect(() => {
        if (!orderData || !orderData.orderId) return;

        const loadRazorpay = () => {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.body.appendChild(script);
            });
        };

        const handlePayment = async () => {
            const isLoaded = await loadRazorpay();
            if (!isLoaded) {
                onError('Failed to load Razorpay checkout');
                return;
            }

            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Atract - Smart Select',
                description: orderData.description || 'Resume Analysis Plan',
                order_id: orderData.orderId,
                prefill: {
                    name: orderData.name || '',
                    email: orderData.email || '',
                    contact: orderData.contact || ''
                },
                notes: orderData.notes || {},
                theme: {
                    color: orderData.theme?.color || '#2563eb'
                },
                handler: function (response) {
                    // Payment successful
                    onSuccess({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    });
                },
                modal: {
                    ondismiss: function() {
                        onError('Payment cancelled by user');
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        };

        handlePayment();
    }, [orderData, onSuccess, onError]);

    return null; // This component doesn't render anything
};

export default RazorpayCheckout;
