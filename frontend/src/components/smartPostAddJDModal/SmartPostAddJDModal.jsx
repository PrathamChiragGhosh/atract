"use client";

import { useState, useRef, useEffect } from "react";
import { FaFileAlt, FaTimes, FaLightbulb, FaPaperPlane } from "react-icons/fa";
import "./SmartPostAddJDModal.css";

const SmartPostAddJDModal = ({ isOpen, onClose, onStart, isAnalyzing }) => {
    const [jdText, setJdText] = useState("");
    const [jdFiles, setJdFiles] = useState([]);
    const fileInputRef = useRef(null);
    const contentRef = useRef(null);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setJdText("");
            setJdFiles([]);
        }
    }, [isOpen]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => {
            const ext = file.name.toLowerCase().split('.').pop();
            return ['pdf', 'doc', 'docx'].includes(ext);
        });

        const newFiles = validFiles.filter(file => 
            !jdFiles.some(existingFile => 
                existingFile.name === file.name && existingFile.size === file.size
            )
        );

        // Reset JD text when files are uploaded
        if (newFiles.length > 0 && jdFiles.length === 0 && jdText.trim() !== "") {
            setJdText("");
        }

        setJdFiles([...jdFiles, ...newFiles]);
        e.target.value = '';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const validFiles = files.filter(file => {
            const ext = file.name.toLowerCase().split('.').pop();
            return ['pdf', 'doc', 'docx'].includes(ext);
        });

        const newFiles = validFiles.filter(file => 
            !jdFiles.some(existingFile => 
                existingFile.name === file.name && existingFile.size === file.size
            )
        );

        // Reset JD text when files are uploaded
        if (newFiles.length > 0 && jdFiles.length === 0 && jdText.trim() !== "") {
            setJdText("");
        }

        setJdFiles([...jdFiles, ...newFiles]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const removeFile = (index) => {
        setJdFiles(jdFiles.filter((_, i) => i !== index));
    };

    const handleStart = () => {
        if (!jdText.trim() && jdFiles.length === 0) {
            alert('Please enter JD text or upload files');
            return;
        }

        onStart({
            jdText: jdFiles.length === 0 ? jdText.trim() : null,
            extraPrompt: jdFiles.length > 0 && jdText.trim() ? jdText.trim() : null,
            files: jdFiles.length > 0 ? jdFiles : null
        });

        // Reset form after starting (but keep drawer open)
        setJdText("");
        setJdFiles([]);
    };

    if (!isOpen) return null;

    return (
        <div className="smart-post-add-jd-drawer">
                <div className="smart-post-add-jd-modal-header">
                    <div className="smart-post-add-jd-modal-header-content">
                        <h2 className="smart-post-add-jd-modal-title">Add Job Description</h2>
                        <p className="smart-post-add-jd-modal-subtitle">
                            Paste your JD or upload files to extract job details automatically
                        </p>
                    </div>
                    <button
                        className="smart-post-add-jd-modal-close"
                        onClick={onClose}
                        title="Close"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="smart-post-add-jd-modal-content" ref={contentRef}>
                    {jdFiles.length === 0 ? (
                        <>
                            <div className="smart-post-add-jd-textarea-wrapper">
                                <label className="smart-post-add-jd-label">Job Description</label>
                                <textarea
                                    className="smart-post-add-jd-textarea"
                                    value={jdText}
                                    onChange={(e) => setJdText(e.target.value)}
                                    placeholder="Paste your job description here..."
                                    rows={8}
                                />
                            </div>

                            <div className="smart-post-add-jd-divider">
                                <span className="smart-post-add-jd-divider-text">OR</span>
                            </div>
                        </>
                    ) : (
                        <div className="smart-post-add-jd-textarea-wrapper smart-post-add-jd-extra-prompt-wrapper">
                            <label className="smart-post-add-jd-label smart-post-add-jd-extra-prompt-label">
                                <FaLightbulb className="smart-post-add-jd-lightbulb-icon" />
                                Extra Prompt Suggestions
                            </label>
                            <textarea
                                className="smart-post-add-jd-textarea smart-post-add-jd-extra-prompt-textarea"
                                value={jdText}
                                onChange={(e) => setJdText(e.target.value)}
                                placeholder="Add any additional suggestions or prompts for AI processing..."
                                rows={4}
                            />
                        </div>
                    )}

                    <div className="smart-post-add-jd-upload-section">
                        <div
                            className="smart-post-add-jd-dropzone"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                                accept=".pdf,.doc,.docx"
                                multiple
                            />
                            <div className="smart-post-add-jd-dropzone-inner">
                                <FaFileAlt className="smart-post-add-jd-upload-icon" />
                                <div className="smart-post-add-jd-dropzone-text">
                                    Drag & Drop or <strong>Browse</strong> JD files
                                </div>
                                <div className="smart-post-add-jd-dropzone-hint">
                                    PDF, DOC, DOCX
                                </div>
                            </div>
                        </div>

                        {jdFiles.length > 0 && (
                            <div className="smart-post-add-jd-files-list">
                                {jdFiles.map((file, index) => (
                                    <div key={index} className="smart-post-add-jd-file-item">
                                        <FaFileAlt className="smart-post-add-jd-file-icon" />
                                        <div className="smart-post-add-jd-file-info">
                                            <div className="smart-post-add-jd-file-name">{file.name}</div>
                                        </div>
                                        <button
                                            className="smart-post-add-jd-file-remove"
                                            onClick={() => removeFile(index)}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="smart-post-add-jd-modal-footer">
                    <button
                        className="smart-post-add-jd-cancel-btn"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="smart-post-add-jd-start-btn"
                        onClick={handleStart}
                        disabled={!jdText.trim() && jdFiles.length === 0}
                    >
                        <FaPaperPlane className="smart-post-add-jd-start-icon" />
                        Start Analysis
                    </button>
                </div>
        </div>
    );
};

export default SmartPostAddJDModal;

