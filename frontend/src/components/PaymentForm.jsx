'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Lock, User, Calendar, Loader2, X } from 'lucide-react';
import { ensureUserEmail } from '@/lib/pdfUserId';
import './PaymentForm.css';

export default function PaymentForm({
  planType,
  planName,
  amount,
  onSuccess,
  onCancel,
  onSubmit,
  onEmailRequired,
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i);
  
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardHolderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);

  // Check if email is required when component mounts
  useEffect(() => {
    const currentEmail = ensureUserEmail();
    if (!currentEmail) {
      if (onEmailRequired) {
        onEmailRequired();
      }
      onCancel();
    }
  }, [onCancel, onEmailRequired]);

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19);
  };

  const handleCardNumberChange = (e) => {
    const inputValue = e.target.value;
    const formatted = formatCardNumber(inputValue);
    setFormData((prev) => ({ ...prev, cardNumber: formatted }));
    if (errors.cardNumber) {
      setErrors((prev) => ({ ...prev, cardNumber: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const cardNumberDigits = formData.cardNumber.replace(/\s/g, '');
    if (!cardNumberDigits || cardNumberDigits.length !== 16) {
      newErrors.cardNumber = 'Card number must be 16 digits';
    } else if (!/^\d+$/.test(cardNumberDigits)) {
      newErrors.cardNumber = 'Card number must contain only numbers';
    }

    if (!formData.cardHolderName || formData.cardHolderName.trim().length < 3) {
      newErrors.cardHolderName = 'Please enter card holder name';
    }

    if (!formData.expiryMonth || !/^(0[1-9]|1[0-2])$/.test(formData.expiryMonth)) {
      newErrors.expiryMonth = 'Please select a valid month';
    }

    const year = parseInt(formData.expiryYear);
    if (!formData.expiryYear || year < currentYear || year > currentYear + 10) {
      newErrors.expiryYear = 'Please select a valid year';
    }

    if (!formData.cvv || formData.cvv.length !== 3 || !/^\d+$/.test(formData.cvv)) {
      newErrors.cvv = 'CVV must be 3 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setProcessing(true);
    setErrors({});

    try {
      const paymentData = {
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        cardHolderName: formData.cardHolderName.trim(),
        expiryMonth: formData.expiryMonth,
        expiryYear: formData.expiryYear,
        cvv: formData.cvv,
        planType,
      };

      await onSubmit(paymentData);
      onSuccess();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Payment failed. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="payment-form-container">
      <div className="payment-form-header">
        <h2 className="payment-form-title">Payment Details</h2>
        <button
          onClick={onCancel}
          className="payment-form-close-btn"
          disabled={processing}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="payment-form-plan-info">
        <div className="payment-form-plan-details">
          <div>
            <p className="payment-form-plan-label">Plan</p>
            <p className="payment-form-plan-name">{planName}</p>
          </div>
          <div className="payment-form-plan-amount-wrapper">
            <p className="payment-form-plan-label">Amount</p>
            <p className="payment-form-plan-amount">₹{amount}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="payment-form" autoComplete="off" noValidate>
        {/* Card Number */}
        <div className="payment-form-field">
          <label className="payment-form-label">
            <CreditCard className="w-4 h-4 inline mr-1" />
            Card Number
          </label>
          <input
            type="text"
            value={formData.cardNumber}
            onChange={handleCardNumberChange}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            className={`payment-form-input ${errors.cardNumber ? 'payment-form-input-error' : ''}`}
            disabled={processing}
            autoComplete="off"
            inputMode="numeric"
          />
          {errors.cardNumber && (
            <p className="payment-form-error">{errors.cardNumber}</p>
          )}
        </div>

        {/* Card Holder Name */}
        <div className="payment-form-field">
          <label className="payment-form-label">
            <User className="w-4 h-4 inline mr-1" />
            Card Holder Name
          </label>
          <input
            type="text"
            value={formData.cardHolderName}
            onChange={(e) => {
              setFormData({ ...formData, cardHolderName: e.target.value.toUpperCase() });
              if (errors.cardHolderName) {
                setErrors({ ...errors, cardHolderName: '' });
              }
            }}
            placeholder="Enter cardholder name"
            className={`payment-form-input ${errors.cardHolderName ? 'payment-form-input-error' : ''}`}
            disabled={processing}
            autoComplete="off"
          />
          {errors.cardHolderName && (
            <p className="payment-form-error">{errors.cardHolderName}</p>
          )}
        </div>

        {/* Expiry and CVV */}
        <div className="payment-form-grid">
          <div>
            <label className="payment-form-label">
              <Calendar className="w-4 h-4 inline mr-1" />
              Month
            </label>
            <select
              value={formData.expiryMonth}
              onChange={(e) => {
                setFormData({ ...formData, expiryMonth: e.target.value });
                if (errors.expiryMonth) {
                  setErrors({ ...errors, expiryMonth: '' });
                }
              }}
              className={`payment-form-input ${errors.expiryMonth ? 'payment-form-input-error' : ''}`}
              disabled={processing}
              autoComplete="off"
            >
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => {
                const month = String(i + 1).padStart(2, '0');
                return (
                  <option key={month} value={month}>
                    {month}
                  </option>
                );
              })}
            </select>
            {errors.expiryMonth && (
              <p className="payment-form-error">{errors.expiryMonth}</p>
            )}
          </div>

          <div>
            <label className="payment-form-label">Year</label>
            <select
              value={formData.expiryYear}
              onChange={(e) => {
                setFormData({ ...formData, expiryYear: e.target.value });
                if (errors.expiryYear) {
                  setErrors({ ...errors, expiryYear: '' });
                }
              }}
              className={`payment-form-input ${errors.expiryYear ? 'payment-form-input-error' : ''}`}
              disabled={processing}
              autoComplete="off"
            >
              <option value="">YYYY</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {errors.expiryYear && (
              <p className="payment-form-error">{errors.expiryYear}</p>
            )}
          </div>

          <div>
            <label className="payment-form-label">
              <Lock className="w-4 h-4 inline mr-1" />
              CVV
            </label>
            <input
              type="text"
              value={formData.cvv}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                setFormData({ ...formData, cvv: value });
                if (errors.cvv) {
                  setErrors({ ...errors, cvv: '' });
                }
              }}
              placeholder="CVV"
              maxLength={3}
              className={`payment-form-input ${errors.cvv ? 'payment-form-input-error' : ''}`}
              disabled={processing}
              autoComplete="off"
              inputMode="numeric"
            />
            {errors.cvv && (
              <p className="payment-form-error">{errors.cvv}</p>
            )}
          </div>
        </div>

        {errors.submit && (
          <div className="payment-form-error-box">
            <p className="payment-form-error">{errors.submit}</p>
          </div>
        )}

        <div className="payment-form-buttons">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="payment-form-button payment-form-button-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={processing}
            className="payment-form-button payment-form-button-primary"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay Now
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

