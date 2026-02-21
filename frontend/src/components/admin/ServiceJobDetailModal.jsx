"use client";

import { HiXMark } from 'react-icons/hi2';
import './ServiceJobDetailModal.css';

const ServiceJobDetailModal = ({ isOpen, onClose, serviceJob }) => {
    if (!isOpen || !serviceJob) return null;

    const client = serviceJob.clientId;

    return (
        <>
            <div className="service-job-detail-overlay" onClick={onClose}></div>
            <div className="service-job-detail-modal">
                <div className="service-job-detail-header">
                    <div className="service-job-detail-header-content">
                        <h2 className="service-job-detail-title">{serviceJob.jobName}</h2>
                        <div className="service-job-detail-badges">
                            <span className={`service-job-status-badge service-job-status-${serviceJob.status}`}>
                                {serviceJob.status === 'open' ? 'OPEN' : serviceJob.status === 'filled' ? 'FILLED' : 'CLOSED'}
                            </span>
                            <span className={`service-job-priority-badge service-job-priority-${serviceJob.priority}`}>
                                {serviceJob.priority}
                            </span>
                        </div>
                    </div>
                    <button
                        className="service-job-detail-close-btn"
                        onClick={onClose}
                        title="Close"
                    >
                        <HiXMark />
                    </button>
                </div>

                <div className="service-job-detail-body">
                    <div className="service-job-detail-section">
                        <h3 className="service-job-detail-section-title">Basic Information</h3>
                        <div className="service-job-detail-grid">
                            <div className="service-job-detail-item">
                                <span className="service-job-detail-label">Client:</span>
                                <span className="service-job-detail-value">
                                    {client?.name || 'N/A'} {client?.companyName && `(${client.companyName})`}
                                </span>
                            </div>
                            
                            {serviceJob.location && (
                                <div className="service-job-detail-item">
                                    <span className="service-job-detail-label">Location:</span>
                                    <span className="service-job-detail-value">{serviceJob.location}</span>
                                </div>
                            )}
                            
                            {serviceJob.salary && (
                                <div className="service-job-detail-item">
                                    <span className="service-job-detail-label">Salary:</span>
                                    <span className="service-job-detail-value">{serviceJob.salary}</span>
                                </div>
                            )}
                            
                            <div className="service-job-detail-item">
                                <span className="service-job-detail-label">Positions:</span>
                                <span className="service-job-detail-value">{serviceJob.numberOfPositions}</span>
                            </div>

                            {serviceJob.gender && (
                                <div className="service-job-detail-item">
                                    <span className="service-job-detail-label">Gender:</span>
                                    <span className="service-job-detail-value">
                                        {serviceJob.gender === 'both male - female' ? 'Both Male - Female' : 
                                         serviceJob.gender.charAt(0).toUpperCase() + serviceJob.gender.slice(1)}
                                    </span>
                                </div>
                            )}

                            {serviceJob.age && (
                                <div className="service-job-detail-item">
                                    <span className="service-job-detail-label">Age:</span>
                                    <span className="service-job-detail-value">{serviceJob.age}</span>
                                </div>
                            )}

                            {serviceJob.workExperience && (
                                <div className="service-job-detail-item">
                                    <span className="service-job-detail-label">Experience:</span>
                                    <span className="service-job-detail-value">{serviceJob.workExperience}</span>
                                </div>
                            )}

                            {serviceJob.noticePeriod && (
                                <div className="service-job-detail-item">
                                    <span className="service-job-detail-label">Notice Period:</span>
                                    <span className="service-job-detail-value">{serviceJob.noticePeriod}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {(serviceJob.shiftTimings || serviceJob.workingHours) && (
                        <div className="service-job-detail-section">
                            <h3 className="service-job-detail-section-title">Shift & Working Hours</h3>
                            <div className="service-job-detail-grid">
                                {serviceJob.shiftTimings && (
                                    <div className="service-job-detail-item">
                                        <span className="service-job-detail-label">Shift Timings:</span>
                                        <span className="service-job-detail-value">{serviceJob.shiftTimings}</span>
                                    </div>
                                )}

                                {serviceJob.shiftStartTime && serviceJob.shiftEndTime && (
                                    <div className="service-job-detail-item">
                                        <span className="service-job-detail-label">Shift Time:</span>
                                        <span className="service-job-detail-value">
                                            {serviceJob.shiftStartTime} - {serviceJob.shiftEndTime}
                                        </span>
                                    </div>
                                )}

                                {serviceJob.workingHours && (
                                    <div className="service-job-detail-item">
                                        <span className="service-job-detail-label">Working Hours:</span>
                                        <span className="service-job-detail-value">{serviceJob.workingHours} hours/day</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {serviceJob.keySkills && serviceJob.keySkills.length > 0 && (
                        <div className="service-job-detail-section">
                            <h3 className="service-job-detail-section-title">Key Skills</h3>
                            <div className="service-job-detail-skills">
                                {serviceJob.keySkills.map((skill, index) => (
                                    <span key={index} className="service-job-detail-skill-tag">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {serviceJob.jobRequirements && (
                        <div className="service-job-detail-section">
                            <h3 className="service-job-detail-section-title">Job Requirements</h3>
                            <div className="service-job-detail-requirements">
                                {serviceJob.jobRequirements}
                            </div>
                        </div>
                    )}

                    <div className="service-job-detail-section">
                        <h3 className="service-job-detail-section-title">Additional Information</h3>
                        <div className="service-job-detail-grid">
                            <div className="service-job-detail-item">
                                <span className="service-job-detail-label">Created:</span>
                                <span className="service-job-detail-value">
                                    {new Date(serviceJob.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                            {serviceJob.updatedAt && serviceJob.updatedAt !== serviceJob.createdAt && (
                                <div className="service-job-detail-item">
                                    <span className="service-job-detail-label">Last Updated:</span>
                                    <span className="service-job-detail-value">
                                        {new Date(serviceJob.updatedAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="service-job-detail-footer">
                    <button
                        className="service-job-detail-close-button"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};

export default ServiceJobDetailModal;

