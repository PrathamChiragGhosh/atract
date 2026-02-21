"use client";

import './ClientCard.css';

const ClientCard = ({ client }) => {
    return (
        <div className="client-card">
            <div className="client-card-header">
                <div className="client-card-name">{client.name}</div>
                <span className={`client-status-badge client-status-${client.status}`}>
                    {client.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            </div>
            
            <div className="client-card-body">
                <div className="client-card-field">
                    <span className="client-card-label">Company:</span>
                    <span className="client-card-value">{client.companyName}</span>
                </div>
                
                <div className="client-card-field">
                    <span className="client-card-label">Email:</span>
                    <span className="client-card-value">{client.email}</span>
                </div>
                
                {client.mobileNumber && (
                    <div className="client-card-field">
                        <span className="client-card-label">Mobile:</span>
                        <span className="client-card-value">{client.mobileNumber}</span>
                    </div>
                )}
                
                {(client.city || client.state) && (
                    <div className="client-card-field">
                        <span className="client-card-label">Location:</span>
                        <span className="client-card-value">
                            {[client.city, client.state].filter(Boolean).join(', ')}
                        </span>
                    </div>
                )}
            </div>
            
            <div className="client-card-footer">
                <span className="client-card-date">
                    Added {new Date(client.createdAt).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
};

export default ClientCard;

