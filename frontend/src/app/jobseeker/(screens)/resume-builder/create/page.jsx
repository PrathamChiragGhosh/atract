"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { FaSearch, FaArrowRight, FaFileAlt, FaBars, FaTimesCircle, FaTrash } from 'react-icons/fa';
import { functionalities } from '@/components/sectionsAndFields';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import './page.css';

const CreateResumePage = () => {
    const router = useRouter();
    const [selectedSubRole, setSelectedSubRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMainRole, setSelectedMainRole] = useState(null);
    const [showDraftsPanel, setShowDraftsPanel] = useState(false);
    const [draftsPanelClosing, setDraftsPanelClosing] = useState(false);
    const [drafts, setDrafts] = useState([]);
    const draftsPanelRef = useRef(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // null for clear all, or draft key for single delete

    // Get userId from token
    const [userId, setUserId] = useState(null);
    
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const token = Cookies.get('js_token');
            if (token) {
                const decoded = jwtDecode(token);
                setUserId(decoded?.userId || decoded?.id || null);
            } else {
                setUserId(null);
            }
        } catch (error) {
            console.error("Error decoding token:", error);
            setUserId(null);
        }
    }, []);

    // Draft management functions (similar to ai-resume-writer)
    const getRoleKey = () => {
        if (!selectedMainRole || !selectedSubRole) return null;
        return `${selectedMainRole}_${selectedSubRole}`.replace(/\s+/g, '_');
    };

    const getAllDraftsData = () => {
        try {
            const draftsStr = localStorage.getItem('resumebuilder_draft_resumes');
            if (!draftsStr) return {};
            return JSON.parse(draftsStr);
        } catch (error) {
            console.error("Error parsing draft_resumes:", error);
            return {};
        }
    };

    const saveAllDraftsData = (draftsData) => {
        try {
            localStorage.setItem('resumebuilder_draft_resumes', JSON.stringify(draftsData));
        } catch (error) {
            console.error("Error saving draft_resumes:", error);
        }
    };


    const loadAllDrafts = () => {
        if (!userId) return;
        
        try {
            const draftsData = getAllDraftsData();
            const userDrafts = draftsData[userId] || {};
            const allDrafts = [];
            
            Object.entries(userDrafts).forEach(([roleKey, draft]) => {
                try {
                    if (!draft || !draft.data) return;
                    
                    const personalInfo = draft.data["Personal Information"] || {};
                    const preview = {
                        key: roleKey,
                        mainRole: draft.mainRole || roleKey.split('_')[0]?.replace(/_/g, ' ') || 'Unknown',
                        subRole: draft.subRole || roleKey.split('_').slice(1).join(' ').replace(/_/g, ' ') || 'Unknown',
                        fullName: personalInfo.fullName || 'N/A',
                        email: personalInfo.email || 'N/A',
                        phone: personalInfo.phone || 'N/A',
                        sectionsCount: Object.keys(draft.data).length,
                        lastModified: draft.timestamp || 'Unknown'
                    };
                    
                    allDrafts.push(preview);
                } catch (error) {
                    console.error(`Error parsing draft ${roleKey}:`, error);
                }
            });
            
            setDrafts(allDrafts);
        } catch (error) {
            console.error("Error loading drafts:", error);
        }
    };

    const loadDraftByKey = (roleKey) => {
        if (!userId) return;
        
        try {
            const draftsData = getAllDraftsData();
            const userDrafts = draftsData[userId] || {};
            const draft = userDrafts[roleKey];
            
            if (draft && draft.mainRole && draft.subRole) {
                setSelectedMainRole(draft.mainRole);
                setSelectedSubRole(draft.subRole);
                
                // Navigate to form page with role information
                const mainRoleEncoded = encodeURIComponent(draft.mainRole);
                const subRoleEncoded = encodeURIComponent(draft.subRole);
                router.push(`/jobseeker/resume-builder/create/form?mainRole=${mainRoleEncoded}&subRole=${subRoleEncoded}`);
                
                closeDraftsPanel();
            }
        } catch (error) {
            console.error("Error loading draft by key:", error);
        }
    };

    const closeDraftsPanel = useCallback(() => {
        // Prevent multiple calls
        if (draftsPanelClosing) return;
        
        setDraftsPanelClosing(true);
        setTimeout(() => {
            setShowDraftsPanel(false);
            setDraftsPanelClosing(false);
        }, 300);
    }, [draftsPanelClosing]);

    const handleDeleteClick = (draftKey = null) => {
        setDeleteTarget(draftKey);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = () => {
        if (!userId) return;

        try {
            const draftsData = getAllDraftsData();
            const userDrafts = draftsData[userId] || {};

            if (deleteTarget === null) {
                // Clear all drafts
                draftsData[userId] = {};
                toast.success('All drafts deleted successfully');
            } else {
                // Delete single draft
                delete userDrafts[deleteTarget];
                draftsData[userId] = userDrafts;
                toast.success('Draft deleted successfully');
            }

            saveAllDraftsData(draftsData);
            loadAllDrafts();
            setShowDeleteModal(false);
            setDeleteTarget(null);
        } catch (error) {
            console.error("Error deleting draft:", error);
            toast.error('Failed to delete draft');
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setDeleteTarget(null);
    };

    useEffect(() => {
        if (userId) {
            loadAllDrafts();
        }
    }, [userId]);


    useEffect(() => {
        const handleClickOutside = (event) => {
            // Don't close if delete modal is open
            if (showDeleteModal) {
                return;
            }
            
            // Don't close if clicking on delete modal or its backdrop
            const deleteModal = document.querySelector('.resumebuilder-create-delete-modal');
            const deleteModalBackdrop = document.querySelector('.resumebuilder-create-delete-modal-backdrop');
            if ((deleteModal && deleteModal.contains(event.target)) || 
                (deleteModalBackdrop && deleteModalBackdrop.contains(event.target))) {
                return;
            }
            
            if (showDraftsPanel && !draftsPanelClosing && draftsPanelRef.current && !draftsPanelRef.current.contains(event.target)) {
                closeDraftsPanel();
            }
        };

        // Only add listener if drafts panel is open AND modal is not open
        if (showDraftsPanel && !showDeleteModal) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDraftsPanel, draftsPanelClosing, showDeleteModal, closeDraftsPanel]);


    const handleNextClick = () => {
        if (selectedMainRole && selectedSubRole) {
            // Navigate to form page with role information
            const mainRoleEncoded = encodeURIComponent(selectedMainRole);
            const subRoleEncoded = encodeURIComponent(selectedSubRole);
            router.push(`/jobseeker/resume-builder/create/form?mainRole=${mainRoleEncoded}&subRole=${subRoleEncoded}`);
        }
    };

    const handleRoleClick = (mainRole, subRole) => {
        setSelectedMainRole(mainRole);
        setSelectedSubRole(subRole);
    };

    const filteredFunctionalities = functionalities
        .map((cat) => ({
            ...cat,
            subCategories: cat.subCategories.filter(
                (sub) =>
                    sub.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cat.category.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }))
        .filter(
            (cat) =>
                cat.subCategories.length > 0 ||
                cat.category.toLowerCase().includes(searchTerm.toLowerCase())
        );



    return (
        <div className="resumebuilder-create-container">
            <div className="resumebuilder-create-role-container">
                <div className="resumebuilder-create-role-header">
                        <div className="resumebuilder-create-role-header-left">
                            <h1 className="resumebuilder-create-role-title">Select Your Functional Category</h1>
                            <p className="resumebuilder-create-role-subtitle">Choose the category that best matches your professional role</p>
                        </div>
                        <div className="resumebuilder-create-role-header-right">
                            <div className="resumebuilder-create-role-search-box">
                                <FaSearch className="resumebuilder-create-role-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search category or role..."
                                    className="resumebuilder-create-role-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                className="resumebuilder-create-drafts-toggle-btn"
                                onClick={() => {
                                    if (showDraftsPanel) {
                                        closeDraftsPanel();
                                    } else {
                                        setShowDraftsPanel(true);
                                    }
                                }}
                            >
                                <FaFileAlt />
                                <span>Drafts ({drafts.length})</span>
                                {showDraftsPanel ? <FaTimesCircle /> : <FaBars />}
                            </button>
                        </div>
                    </div>

                    {(showDraftsPanel || draftsPanelClosing) && (
                        <>
                            <div 
                                className={`resumebuilder-create-drafts-backdrop ${draftsPanelClosing ? 'closing' : ''}`}
                                onClick={closeDraftsPanel}
                            />
                            <div 
                                ref={draftsPanelRef}
                                className={`resumebuilder-create-drafts-panel ${draftsPanelClosing ? 'closing' : ''}`}
                            >
                            <div className="resumebuilder-create-drafts-panel-header">
                                <div className="resumebuilder-create-drafts-panel-title">
                                    <FaFileAlt />
                                    <h3>Saved Drafts ({drafts.length})</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {drafts.length > 0 && (
                                        <button 
                                            className="resumebuilder-create-drafts-clear-all-btn"
                                            onClick={() => handleDeleteClick(null)}
                                            title="Clear All Drafts"
                                        >
                                            <FaTrash />
                                            <span>Clear All</span>
                                        </button>
                                    )}
                                    <button 
                                        className="resumebuilder-create-drafts-close-btn"
                                        onClick={closeDraftsPanel}
                                    >
                                        <FaTimesCircle />
                                    </button>
                                </div>
                            </div>
                            <div className="resumebuilder-create-drafts-panel-content">
                                {drafts.length === 0 ? (
                                    <div className="resumebuilder-create-drafts-empty">
                                        <FaFileAlt />
                                        <p>No saved drafts yet</p>
                                        <span>Your resume drafts will appear here</span>
                                    </div>
                                ) : (
                                    <div className="resumebuilder-create-drafts-list">
                                        {drafts.map((draft) => (
                                            <div key={draft.key} className="resumebuilder-create-draft-item">
                                                <div 
                                                    className="resumebuilder-create-draft-item-content"
                                                    onClick={() => loadDraftByKey(draft.key)}
                                                >
                                                    <div className="resumebuilder-create-draft-item-header">
                                                        <FaFileAlt />
                                                        <div className="resumebuilder-create-draft-item-info">
                                                            <h4>{draft.subRole}</h4>
                                                            <p>{draft.mainRole}</p>
                                                        </div>
                                                    </div>
                                                    <div className="resumebuilder-create-draft-item-preview">
                                                        <div><strong>Name:</strong> {draft.fullName}</div>
                                                        <div><strong>Email:</strong> {draft.email}</div>
                                                        <div><strong>Phone:</strong> {draft.phone}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="resumebuilder-create-draft-delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(draft.key);
                                                    }}
                                                    title="Delete Draft"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            </div>
                        </>
                    )}

                    {/* Delete Confirmation Modal */}
                    {showDeleteModal && (
                        <>
                            <div 
                                className="resumebuilder-create-delete-modal-backdrop"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelDelete();
                                }}
                            />
                            <div 
                                className="resumebuilder-create-delete-modal"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div 
                                    className="resumebuilder-create-delete-modal-content"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <h3 className="resumebuilder-create-delete-modal-title">
                                        {deleteTarget === null ? 'Clear All Drafts?' : 'Delete Draft?'}
                                    </h3>
                                    <p className="resumebuilder-create-delete-modal-message">
                                        {deleteTarget === null 
                                            ? `Are you sure you want to delete all ${drafts.length} draft${drafts.length !== 1 ? 's' : ''}? This action cannot be undone.`
                                            : 'Are you sure you want to delete this draft? This action cannot be undone.'
                                        }
                                    </p>
                                    <div className="resumebuilder-create-delete-modal-actions">
                                        <button
                                            className="resumebuilder-create-delete-modal-cancel"
                                            onClick={handleCancelDelete}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="resumebuilder-create-delete-modal-confirm"
                                            onClick={handleConfirmDelete}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="resumebuilder-create-role-list">
                        {filteredFunctionalities.map((item, i) => (
                            <div key={i} className="resumebuilder-create-role-category">
                                <h2 className="resumebuilder-create-role-category-title">{item.category}</h2>

                                <div className="resumebuilder-create-role-subgrid">
                                    {item.subCategories.map((sub, j) => (
                                        <div
                                            key={j}
                                            onClick={() => handleRoleClick(item.category, sub)}
                                            className={`resumebuilder-create-role-card ${selectedSubRole === sub ? "active" : ""}`}
                                        >
                                            {sub}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="resumebuilder-create-role-next-btn"
                        disabled={!selectedSubRole}
                        onClick={handleNextClick}
                    >
                        <span>Next</span>
                        <FaArrowRight />
                    </button>
                </div>
            </div>
    );
};

export default CreateResumePage;

