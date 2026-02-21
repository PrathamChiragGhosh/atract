import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { HiCalendar, HiClock, HiUser, HiCheckCircle, HiExclamationCircle, HiDocumentText } from 'react-icons/hi';

const BookConsultation = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    company: '',
    consultationType: '',
    companySize: '',
    preferredDate: '',
    preferredTime: '',
    timezone: '',
    projectDetails: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Get base API URL
  const getBaseApiUrl = () => {
    if (typeof window === 'undefined') return '';
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL;
    }
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    return 'http://localhost:5001';
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const baseApiUrl = getBaseApiUrl();
      const response = await axios.post(`${baseApiUrl}/api/prompt-consultation/book`, formData);

      if (response.data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({
            name: '',
            email: '',
            whatsapp: '',
            company: '',
            consultationType: '',
            companySize: '',
            preferredDate: '',
            preferredTime: '',
            timezone: '',
            projectDetails: ''
          });
        }, 5000);
      } else {
        setError(response.data.message || 'Failed to book consultation. Please try again.');
      }
    } catch (err) {
      console.error('Error booking consultation:', err);
      setError(
        err.response?.data?.message || 
        'Failed to book consultation. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Book a Consultation
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Schedule a 30-minute discovery call to discuss your AI use case and see if we're a good fit.
          </p>
        </motion.div>

        {/* Consultation Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 md:p-10"
        >
          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <HiCheckCircle className="text-green-600 mx-auto mb-4" size={64} />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Consultation Request Received!</h2>
              <p className="text-green-700 mb-4">
                Thank you for your interest. I've received your consultation request and will get back to you within 24-48 hours to confirm the meeting time.
              </p>
              <p className="text-green-600 text-sm">
                I'll send you a calendar invite and meeting details shortly.
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <HiExclamationCircle className="text-red-600 mx-auto mb-3" size={48} />
              <p className="text-red-800 font-semibold">Error</p>
              <p className="text-red-600 text-sm mt-2">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <HiUser className="mr-2 text-blue-600" size={24} />
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp (Optional)
                    </label>
                    <input
                      type="tel"
                      id="whatsapp"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+91 98302 86969"
                    />
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company (Optional)
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your company name"
                    />
                  </div>
                </div>
              </div>

              {/* Consultation Details Section */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <HiCalendar className="mr-2 text-blue-600" size={24} />
                  Consultation Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="consultationType" className="block text-sm font-medium text-gray-700 mb-2">
                      Consultation Type *
                    </label>
                    <select
                      id="consultationType"
                      name="consultationType"
                      required
                      value={formData.consultationType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select type</option>
                      <option value="ai-workflow-design">AI Workflow & Prompt Design</option>
                      <option value="project-ownership">AI Project Ownership</option>
                      <option value="ai-advisory">AI Advisory Retainer</option>
                      <option value="general-inquiry">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Size (Optional)
                    </label>
                    <select
                      id="companySize"
                      name="companySize"
                      value={formData.companySize}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select size</option>
                      <option value="solo-founder">Solo Founder</option>
                      <option value="2-10">2-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="200+">200+ employees</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="preferredDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      id="preferredDate"
                      name="preferredDate"
                      required
                      value={formData.preferredDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="preferredTime" className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Time *
                    </label>
                    <input
                      type="time"
                      id="preferredTime"
                      name="preferredTime"
                      required
                      value={formData.preferredTime}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone (Optional)
                    </label>
                    <select
                      id="timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select timezone</option>
                      <option value="IST">IST (Indian Standard Time)</option>
                      <option value="EST">EST (Eastern Standard Time)</option>
                      <option value="PST">PST (Pacific Standard Time)</option>
                      <option value="GMT">GMT (Greenwich Mean Time)</option>
                      <option value="CET">CET (Central European Time)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Project Details Section */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <HiDocumentText className="mr-2 text-blue-600" size={24} />
                  Project Details
                </h2>
                <div>
                  <label htmlFor="projectDetails" className="block text-sm font-medium text-gray-700 mb-2">
                    Tell me about your AI use case or project *
                  </label>
                  <textarea
                    id="projectDetails"
                    name="projectDetails"
                    required
                    rows={6}
                    value={formData.projectDetails}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Describe your AI requirements, challenges, or what you'd like to discuss during the consultation..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-900 transition-all shadow-lg hover:shadow-xl flex items-center justify-center ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Booking Consultation...
                    </>
                  ) : (
                    <>
                      <HiCalendar className="mr-2" size={20} />
                      Book Consultation
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200"
        >
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
            <HiClock className="mr-2 text-blue-600" size={20} />
            What to Expect
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 30-minute discovery call to understand your AI use case</li>
            <li>• Discussion about your requirements and challenges</li>
            <li>• Overview of how I can help with your AI project</li>
            <li>• Next steps and proposal if we're a good fit</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};

export default BookConsultation;
