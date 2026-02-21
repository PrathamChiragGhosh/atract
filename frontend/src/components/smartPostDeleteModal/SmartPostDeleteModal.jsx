"use client";

import { HiXMark } from "react-icons/hi2";
import "./SmartPostDeleteModal.css";

const SmartPostDeleteModal = ({ isOpen, onClose, onConfirm, jobTitle }) => {
    if (!isOpen) return null;

    return (
        <div className="smart-post-delete-modal-overlay" onClick={onClose}>
            <div className="smart-post-delete-modal" onClick={(e) => e.stopPropagation()}>
                <div className="smart-post-delete-modal-header">
                    <h2 className="smart-post-delete-modal-title">Delete Smart Post</h2>
                    <button
                        className="smart-post-delete-modal-close"
                        onClick={onClose}
                        title="Close"
                    >
                        <HiXMark />
                    </button>
                </div>
                
                <div className="smart-post-delete-modal-content">
                    <p className="smart-post-delete-modal-message">
                        Are you sure you want to delete this smart post?
                    </p>
                    {jobTitle && (
                        <p className="smart-post-delete-modal-job-title">
                            <strong>{jobTitle}</strong>
                        </p>
                    )}
                    <p className="smart-post-delete-modal-warning">
                        This action cannot be undone.
                    </p>
                </div>
                
                <div className="smart-post-delete-modal-footer">
                    <button
                        className="smart-post-delete-modal-cancel-btn"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="smart-post-delete-modal-confirm-btn"
                        onClick={onConfirm}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartPostDeleteModal;

