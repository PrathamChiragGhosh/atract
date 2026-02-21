"use client";

import './ServiceJobCard.css';

const ServiceJobCard = ({ serviceJob, onShowDetails }) => {
    const client = serviceJob.clientId;

    // Check if there are additional fields to show
    const hasAdditionalFields = 
        serviceJob.gender || 
        serviceJob.shiftTimings || 
        serviceJob.workingHours || 
        serviceJob.age || 
        serviceJob.workExperience || 
        serviceJob.noticePeriod || 
        (serviceJob.keySkills && serviceJob.keySkills.length > 0) ||
        serviceJob.jobRequirements;

    return (
        <div className="service-job-card">
            <div className="service-job-card-header">
                <div className="service-job-card-name">{serviceJob.jobName}</div>
                <div className="service-job-card-badges">
                    <span className={`service-job-status-badge service-job-status-${serviceJob.status}`}>
                        {serviceJob.status === 'open' ? 'OPEN' : serviceJob.status === 'filled' ? 'FILLED' : 'CLOSED'}
                    </span>
                    <span className={`service-job-priority-badge service-job-priority-${serviceJob.priority}`}>
                        {serviceJob.priority}
                    </span>
                </div>
            </div>
            
            <div className="service-job-card-body">
                {/* Main Fields - Always Visible */}
                <div className="service-job-card-main-fields">
                    <div className="service-job-card-field">
                        <span className="service-job-card-label">Client:</span>
                        <span className="service-job-card-value">
                            {client?.name || 'N/A'} {client?.companyName && `(${client.companyName})`}
                        </span>
                    </div>
                    
                    {serviceJob.location && (
                        <div className="service-job-card-field">
                            <span className="service-job-card-label">Location:</span>
                            <span className="service-job-card-value">{serviceJob.location}</span>
                        </div>
                    )}
                    
                    {serviceJob.salary && (
                        <div className="service-job-card-field">
                            <span className="service-job-card-label">Salary:</span>
                            <span className="service-job-card-value">{serviceJob.salary}</span>
                        </div>
                    )}
                    
                    <div className="service-job-card-field">
                        <span className="service-job-card-label">Positions:</span>
                        <span className="service-job-card-value">{serviceJob.numberOfPositions}</span>
                    </div>
                </div>
            </div>
            
            <div className="service-job-card-footer">
                <div className="service-job-card-footer-left">
                    <span className="service-job-card-date">
                        Added {new Date(serviceJob.createdAt).toLocaleDateString()}
                    </span>
                </div>
                {hasAdditionalFields && (
                    <button 
                        className="service-job-card-more-btn"
                        onClick={() => onShowDetails && onShowDetails(serviceJob)}
                    >
                        Show More
                    </button>
                )}
            </div>
        </div>
    );
};

export default ServiceJobCard;

