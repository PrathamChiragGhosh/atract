"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import "./contact-us.css";

export default function ContactUsPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    // Get base API URL
    const getBaseApiUrl = () => {
        if (typeof window === 'undefined') return '';
        // Try multiple environment variables
        if (process.env.NEXT_PUBLIC_BACKEND_URL) {
            return process.env.NEXT_PUBLIC_BACKEND_URL;
        }
        if (process.env.NEXT_PUBLIC_API_URL) {
            return process.env.NEXT_PUBLIC_API_URL;
        }
        if (process.env.NEXT_PUBLIC_JOB_URL) {
            const jobUrl = process.env.NEXT_PUBLIC_JOB_URL;
            return jobUrl.replace(/\/job\/?$/, '');
        }
        // Fallback to default
        return 'http://localhost:5001';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            const baseApiUrl = getBaseApiUrl();
            const response = await axios.post(`${baseApiUrl}/api/contact/submit`, formData);

            if (response.data.success) {
                setSubmitStatus("success");
                setFormData({
                    name: "",
                    email: "",
                    subject: "",
                    message: "",
                });
                toast.success("Message sent successfully!");
            } else {
                setSubmitStatus("error");
                toast.error(response.data.message || "Failed to send message");
            }
        } catch (error) {
            console.error("Error submitting contact form:", error);
            setSubmitStatus("error");
            const errorMessage = error.response?.data?.message || "Failed to send message. Please try again later.";
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="contact-wrapper">
            <div className="contact-hero">
                <div className="contact-badge">Contact Us</div>
                <h1>Get in Touch — Atract.in</h1>
                <p className="contact-lead">
                    Have questions, feedback, or need support? We're here to help. Reach out to us through the form below
                    or via email.
                </p>
            </div>

            <div className="contact-content">
                <div className="contact-form-section">
                    <h2>Send us a Message</h2>
                    <form onSubmit={handleSubmit} className="contact-form">
                        <div className="form-group">
                            <label htmlFor="name">Name *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Your full name"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email *</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="your.email@example.com"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="subject">Subject *</label>
                            <input
                                type="text"
                                id="subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                                placeholder="What is this regarding?"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="message">Message *</label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows={6}
                                placeholder="Tell us more about your inquiry..."
                            />
                        </div>

                        <button type="submit" className="contact-submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? "Sending..." : "Send Message"}
                        </button>

                        {submitStatus === "success" && (
                            <div className="contact-success">
                                <p>Thank you! Your message has been sent. We'll get back to you soon.</p>
                            </div>
                        )}

                        {submitStatus === "error" && (
                            <div className="contact-error">
                                <p>Failed to send message. Please try again or contact us directly via email.</p>
                            </div>
                        )}
                    </form>
                </div>

                <div className="contact-info-section">
                    <h2>Other Ways to Reach Us</h2>
                    <div className="contact-info-card">
                        <h3>Email</h3>
                        <p>
                            <a href="mailto:rajiv.ghoshrajiv@atract.in">rajiv.ghoshrajiv@atract.in</a>
                        </p>
                    </div>

                    <div className="contact-info-card">
                        <h3>Response Time</h3>
                        <p>We typically respond within 24-48 hours during business days.</p>
                    </div>

                    <div className="contact-info-card">
                        <h3>Support Hours</h3>
                        <p>Monday - Friday: 9:00 AM - 6:00 PM IST</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

