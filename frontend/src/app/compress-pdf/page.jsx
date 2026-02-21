'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  Download,
  Loader2,
  X,
  CheckCircle2,
  LayoutDashboard,
  CreditCard,
  Crown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pdfApi } from '@/lib/pdfApi';
import { ensureUserEmail, setUserEmail, getUserEmail } from '@/lib/pdfUserId';
import PaymentForm from '@/components/PaymentForm';
import './compress.css';

export default function CompressPdfPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [targetSizeMB, setTargetSizeMB] = useState(1); // Always in MB
  const [compressionResult, setCompressionResult] = useState(null);
  const [userEmail, setUserEmailState] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    const email = ensureUserEmail();
    if (email) {
      setUserEmailState(email);
    } else {
      setShowEmailInput(true);
    }
    
    // Load subscription plans
    const loadPlans = async () => {
      try {
        const response = await pdfApi.getPlans();
        if (response.success) {
          setSubscriptionPlans(response.plans);
        }
      } catch (error) {
        console.error('Failed to load plans:', error);
      }
    };
    loadPlans();
  }, []);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploading(true);

    try {
      const response = await pdfApi.upload(file);
      if (response.success) {
        const fileSizeMB = file.size / (1024 * 1024);
        // Set initial target size to 50% of original file size, minimum 0.1 MB
        const initialTarget = Math.max(fileSizeMB * 0.5, 0.1);
        setTargetSizeMB(Math.round(initialTarget * 10) / 10); // Round to 1 decimal
        
        setUploadedFile({
          name: file.name,
          size: file.size,
          path: response.file.originalPath,
          file: file,
        });
        toast.success('PDF uploaded successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (userEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      setUserEmail(userEmail); // Save to localStorage
      setUserEmailState(userEmail); // Update state
      setShowEmailInput(false);
      toast.success('Email saved!');
      console.log('Email saved to localStorage:', userEmail);
    } else {
      toast.error('Please enter a valid email address');
    }
  };

  const handleCompress = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }

    if (!targetSizeMB || targetSizeMB <= 0) {
      toast.error('Please select a valid target file size');
      return;
    }

    const currentEmail = ensureUserEmail();
    console.log('Current email from localStorage:', currentEmail);
    if (!currentEmail) {
      setShowEmailInput(true);
      toast.error('Please enter your email address to compress PDF');
      return;
    }

    setCompressing(true);

    try {
      const formData = new FormData();
      formData.append('pdf', uploadedFile.file);
      
      const uploadResponse = await pdfApi.upload(uploadedFile.file);
      
      if (!uploadResponse.success) {
        toast.error('Failed to upload file');
        return;
      }

      const uploadedFilePath = uploadResponse.file.originalPath;
      const fileName = uploadedFilePath.split(/[/\\]/).pop() || uploadedFile.name;

      const currentEmailForRequest = ensureUserEmail();
      
      // Convert original file size to MB
      const originalSizeMB = uploadedFile.size / (1024 * 1024);
      
      const compressData = {
        fileId: fileName,
        filePath: uploadedFilePath,
        originalFilename: uploadedFile.name,
        originalSize: uploadedFile.size,
        compressionType: 'fileSize',
        email: currentEmailForRequest, // Add email to body as fallback
        settings: {
          targetSize: {
            value: targetSizeMB,
            unit: 'MB',
          },
        },
      };

      const compressResponse = await pdfApi.compress(compressData);

      if (compressResponse.success) {
        setCompressionResult(compressResponse.compression);
        toast.success('PDF compressed successfully!');
      }
    } catch (error) {
      console.error('Compression error:', error);
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || 'Failed to compress PDF';
      
      // Handle 403 (limit reached) - show subscription modal
      if (error.response?.status === 403) {
        setShowSubscriptionModal(true);
        if (errorData?.isFree) {
          toast.error('Daily limit reached! Please subscribe to compress more PDFs.');
        } else {
          toast.error('Compression limit reached. Please upgrade your subscription.');
        }
      } else if (error.response?.status === 400 && errorMessage.includes('Email')) {
        // Email required - show email input
        setShowEmailInput(true);
        toast.error('Please enter your email address to compress PDF');
      } else if (error.response?.status === 400 && errorData?.needsInstallation) {
        // Compression tools missing
        const installMsg = errorMessage + (errorData?.installationLinks 
          ? `\n\nInstallation Links:\nGhostscript: ${errorData.installationLinks.ghostscript}\nPython: ${errorData.installationLinks.python}`
          : '');
        toast.error(installMsg, {
          duration: 10000,
          style: {
            maxWidth: '500px',
            whiteSpace: 'pre-line',
            fontSize: '14px',
          },
        });
      } else if (error.response?.status === 400) {
        // Other 400 errors (validation, etc.)
        toast.error(errorMessage, {
          duration: 6000,
        });
      } else if (error.response?.status === 500) {
        // Server error
        toast.error(errorMessage || 'Server error occurred. Please try again later.', {
          duration: 6000,
        });
      } else {
        // Network or other errors
        toast.error(errorMessage || 'An error occurred. Please check your connection and try again.');
      }
    } finally {
      setCompressing(false);
    }
  };

  const handleDownload = async () => {
    if (!compressionResult) return;

    try {
      if (compressionResult.downloadUrl) {
        const blob = await pdfApi.download(compressionResult.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = compressionResult.filename || 'compressed.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Fallback: download from file path
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/compressed/pdf/${compressionResult.filename}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = compressionResult.filename || 'compressed.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      toast.success('Download started!');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  // Convert bytes to MB and format
  const formatBytesToMB = (bytes) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return Math.round(mb * 100) / 100 + ' MB';
  };

  const handlePlanSelect = (plan) => {
    const currentEmail = ensureUserEmail();
    if (!currentEmail) {
      setShowEmailInput(true);
      toast.error('Please enter your email address to subscribe');
      return;
    }
    
    setSelectedPlan(plan);
    setShowSubscriptionModal(false);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async (paymentData) => {
    setSubscribing(true);
    try {
      const response = await pdfApi.createSubscription({
        planType: paymentData.planType,
        paymentData: {
          cardNumber: paymentData.cardNumber,
          cardHolderName: paymentData.cardHolderName,
          expiryMonth: paymentData.expiryMonth,
          expiryYear: paymentData.expiryYear,
          cvv: paymentData.cvv,
        },
      });
      if (response.success) {
        toast.success('Subscription activated successfully!');
        setShowPaymentForm(false);
        setSelectedPlan(null);
        setShowSubscriptionModal(false);
        // Retry compression if file is still uploaded
        if (uploadedFile) {
          setTimeout(() => {
            handleCompress();
          }, 500);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
      throw error;
    } finally {
      setSubscribing(false);
    }
  };

  // Calculate max slider value based on uploaded file size (in MB)
  const getMaxSliderValue = () => {
    if (!uploadedFile) return 10; // Default max
    const fileSizeMB = uploadedFile.size / (1024 * 1024);
    // Set max to file size or minimum 10 MB, rounded up
    return Math.max(Math.ceil(fileSizeMB), 10);
  };

  // Calculate min slider value (0.1 MB minimum)
  const getMinSliderValue = () => {
    return 0.1;
  };

  return (
    <div className="compress-pdf-page">
      <div className="compress-pdf-wrapper">
        <div className="compress-pdf-header">
          <h1>Compress PDF</h1>
          <p>Reduce your PDF file size quickly and easily</p>
          <button
            onClick={() => router.push('/pdf-dashboard')}
            className="compress-pdf-dashboard-btn"
          >
            <LayoutDashboard size={20} />
            PDF Dashboard
          </button>
        </div>

        {/* Email Input Modal */}
        {showEmailInput && (
          <div className="compress-pdf-email-modal">
            <div className="compress-pdf-email-modal-content">
              <button
                onClick={() => setShowEmailInput(false)}
                className="compress-pdf-email-modal-close"
              >
                <X size={20} />
              </button>
              <h2 className="compress-pdf-email-modal-title">Enter Your Email</h2>
              <p className="compress-pdf-email-modal-description">Please enter your email to use PDF compression</p>
              <form onSubmit={handleEmailSubmit} className="compress-pdf-email-form">
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmailState(e.target.value)}
                  placeholder="your.email@example.com"
                  className="compress-pdf-email-input"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  className="compress-pdf-email-submit"
                >
                  Continue
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="compress-pdf-card">
          <div
            {...getRootProps()}
            className={`compress-pdf-upload-area ${isDragActive ? 'drag-active' : ''}`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="compress-pdf-loading">
                <Loader2 className="compress-pdf-spinner" />
                <p className="compress-pdf-loading-text">Uploading...</p>
              </div>
            ) : uploadedFile ? (
              <div className="compress-pdf-file-info">
                <CheckCircle2 className="compress-pdf-success-icon" />
                <p className="compress-pdf-file-name">{uploadedFile.name}</p>
                <p className="compress-pdf-file-size">{formatBytesToMB(uploadedFile.size)}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                    setCompressionResult(null);
                    setTargetSizeMB(1); // Reset to default
                  }}
                  className="compress-pdf-remove-file"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="compress-pdf-upload-content">
                <Upload className="compress-pdf-upload-icon" />
                <p className="compress-pdf-upload-text">
                  {isDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF file here'}
                </p>
                <p className="compress-pdf-upload-subtext">or click to browse</p>
              </div>
            )}
          </div>
        </div>

        {/* Compression Settings */}
        {uploadedFile && !compressionResult && (
          <div className="compress-pdf-card">
            <h2 className="compress-pdf-settings-title">Compression Settings</h2>
            <div className="compress-pdf-settings-form">
              <div className="compress-pdf-form-group">
                <div className="compress-pdf-slider-header">
                  <label className="compress-pdf-form-label">
                    Target File Size
                  </label>
                  <span className="compress-pdf-slider-value">{targetSizeMB.toFixed(2)} MB</span>
                </div>
                <div className="compress-pdf-slider-container">
                  <div className="compress-pdf-slider-wrapper">
                    <input
                      type="range"
                      min={getMinSliderValue()}
                      max={getMaxSliderValue()}
                      step="0.1"
                      value={targetSizeMB}
                      onChange={(e) => setTargetSizeMB(parseFloat(e.target.value))}
                      className="compress-pdf-slider"
                      style={{
                        '--slider-progress': `${((targetSizeMB - getMinSliderValue()) / (getMaxSliderValue() - getMinSliderValue())) * 100}%`
                      }}
                    />
                  </div>
                  <div className="compress-pdf-slider-labels">
                    <span>{getMinSliderValue()} MB</span>
                    <span>{getMaxSliderValue()} MB</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCompress}
                disabled={compressing || !targetSizeMB}
                className="compress-pdf-btn compress-pdf-btn-primary"
              >
                {compressing ? (
                  <>
                    <Loader2 size={20} className="compress-pdf-spinner" />
                    Compressing...
                  </>
                ) : (
                  <>
                    <FileText size={20} />
                    Compress PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Compression Result */}
        {compressionResult && (
          <div className="compress-pdf-card">
            <h2 className="compress-pdf-result-title">Compression Result</h2>
            <div className="compress-pdf-result-stats">
              <div className="compress-pdf-stat-item">
                <span className="compress-pdf-stat-label">Original Size:</span>
                <span className="compress-pdf-stat-value">{formatBytesToMB(compressionResult.originalSize)}</span>
              </div>
              <div className="compress-pdf-stat-item">
                <span className="compress-pdf-stat-label">Compressed Size:</span>
                <span className="compress-pdf-stat-value success">{formatBytesToMB(compressionResult.compressedSize)}</span>
              </div>
              <div className="compress-pdf-stat-item">
                <span className="compress-pdf-stat-label">Compression Ratio:</span>
                <span className="compress-pdf-stat-value highlight">{compressionResult.compressionRatio}%</span>
              </div>
            </div>
            <div className="compress-pdf-result-actions">
              <button
                onClick={handleDownload}
                className="compress-pdf-btn compress-pdf-btn-success"
              >
                <Download size={20} />
                Download Compressed PDF
              </button>
              <button
                onClick={() => {
                  setUploadedFile(null);
                  setCompressionResult(null);
                  setTargetSizeMB(1); // Reset to default
                }}
                className="compress-pdf-btn compress-pdf-btn-secondary"
              >
                Compress Another PDF
              </button>
            </div>
          </div>
        )}

        {/* Subscription Modal */}
        {showSubscriptionModal && (
          <div className="compress-pdf-email-modal">
            <div className="compress-pdf-email-modal-content" style={{ maxWidth: '900px' }}>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="compress-pdf-email-modal-close"
              >
                <X size={20} />
              </button>
              <h2 className="compress-pdf-email-modal-title">Choose a Subscription Plan</h2>
              <p className="compress-pdf-email-modal-description">
                Subscribe to compress unlimited PDFs based on your plan
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '24px' }}>
                {subscriptionPlans.map((plan) => (
                  <div
                    key={plan.type}
                    style={{
                      border: '2px solid',
                      borderColor: plan.type === 'yearly' ? '#9333ea' : plan.type === 'monthly' ? '#3b82f6' : '#d1d5db',
                      borderRadius: '12px',
                      padding: '24px',
                      background: plan.type === 'yearly' ? '#faf5ff' : plan.type === 'monthly' ? '#eff6ff' : '#f9fafb',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: '0 0 8px 0' }}>
                        {plan.name}
                      </h3>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#9333ea', marginBottom: '4px' }}>
                        ₹{plan.amount}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>{plan.duration}</div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <FileText size={18} style={{ color: '#10b981' }} />
                        <span style={{ fontSize: '14px', color: '#374151' }}>
                          {plan.compressionsAllowed} PDF compressions
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                        {plan.description}
                      </div>
                    </div>
                    <button
                      style={{
                        width: '100%',
                        padding: '12px 24px',
                        background: plan.type === 'yearly' 
                          ? 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)'
                          : plan.type === 'monthly'
                          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                          : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <CreditCard size={18} />
                      Subscribe Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payment Form Modal */}
        {showPaymentForm && selectedPlan && ensureUserEmail() && (
          <div className="compress-pdf-email-modal">
            <PaymentForm
              planType={selectedPlan.type}
              planName={selectedPlan.name}
              amount={selectedPlan.amount}
              onSuccess={() => {
                setShowPaymentForm(false);
                setSelectedPlan(null);
                setShowSubscriptionModal(false);
              }}
              onCancel={() => {
                setShowPaymentForm(false);
                setSelectedPlan(null);
              }}
              onSubmit={handlePaymentSubmit}
              onEmailRequired={() => {
                setShowEmailInput(true);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

