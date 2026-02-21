"use client";

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { deleteDraft, clearAllDrafts, loadDraft } from '@/store/draftsSlice';
import { FaTimes, FaTrash, FaFileAlt, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import './DraftsSidebar.css';

const DraftsSidebar = ({ isOpen, onClose, onLoadDraft, employerId }) => {
    const dispatch = useDispatch();
    const drafts = useSelector((state) => state.drafts.drafts);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showClearAllModal, setShowClearAllModal] = useState(false);
    const [draftToDelete, setDraftToDelete] = useState(null);

    // Prevent body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';

            return () => {
                // Restore scroll position when sidebar closes
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [isOpen]);

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "Unknown";
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const handleDeleteDraft = () => {
        if (draftToDelete && employerId) {
            dispatch(deleteDraft({ draftId: draftToDelete, employerId }));
            setDraftToDelete(null);
            setShowDeleteModal(false);
        }
    };

    const handleClearAll = () => {
        if (employerId) {
            dispatch(clearAllDrafts(employerId));
            setShowClearAllModal(false);
        }
    };

    const handleLoadDraft = (draft) => {
        // When a draft is loaded into the Post Job form:
        // 1) Remove it from the drafts store so it no longer appears in the sidebar
        // 2) Pass its content to the parent (Post Job screen) to populate the form
        if (employerId && draft?.id) {
            dispatch(deleteDraft({ draftId: draft.id, employerId }));
        }

        dispatch(loadDraft(draft));

        if (onLoadDraft) {
            onLoadDraft(draft);
        }

        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="drafts-sidebar-overlay" onClick={onClose}></div>
            <div className="drafts-sidebar">
                <div className="drafts-sidebar-header">
                    <h2 className="drafts-sidebar-title">
                        <FaFileAlt className="drafts-icon" />
                        Job Drafts ({drafts.length})
                    </h2>
                    <button className="drafts-sidebar-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="drafts-sidebar-content">
                    {drafts.length === 0 ? (
                        <div className="drafts-empty">
                            <FaFileAlt className="drafts-empty-icon" />
                            <p>No drafts saved</p>
                            <span>Your job drafts will appear here</span>
                        </div>
                    ) : (
                        <>
                            <div className="drafts-list">
                                {drafts.map((draft) => (
                                    <div key={draft.id} className="draft-item">
                                        <div 
                                            className="draft-item-content"
                                            onClick={() => handleLoadDraft(draft)}
                                        >
                                            <h3 className="draft-title">{draft.jobTitle || "Untitled Job"}</h3>
                                            <div className="draft-meta">
                                                {draft.location && (
                                                    <span className="draft-meta-item">
                                                        <FaMapMarkerAlt /> {draft.location}
                                                    </span>
                                                )}
                                                {draft.updatedAt && (
                                                    <span className="draft-meta-item">
                                                        <FaCalendarAlt /> {formatDate(draft.updatedAt)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            className="draft-delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDraftToDelete(draft.id);
                                                setShowDeleteModal(true);
                                            }}
                                            title="Delete Draft"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="drafts-sidebar-footer">
                                <button
                                    className="clear-all-drafts-btn"
                                    onClick={() => setShowClearAllModal(true)}
                                >
                                    <FaTrash /> Clear All Drafts
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-container drafts-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Delete Draft?</h5>
                                <button 
                                    type="button" 
                                    className="modal-close" 
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to delete this draft? This action cannot be undone.</p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="modal-btn-cancel"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="modal-btn-delete"
                                    onClick={handleDeleteDraft}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear All Confirmation Modal */}
            {showClearAllModal && (
                <div className="modal-overlay" onClick={() => setShowClearAllModal(false)}>
                    <div className="modal-container drafts-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Clear All Drafts?</h5>
                                <button 
                                    type="button" 
                                    className="modal-close" 
                                    onClick={() => setShowClearAllModal(false)}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to delete all drafts? This action cannot be undone.</p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="modal-btn-cancel"
                                    onClick={() => setShowClearAllModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="modal-btn-delete"
                                    onClick={handleClearAll}
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DraftsSidebar;

