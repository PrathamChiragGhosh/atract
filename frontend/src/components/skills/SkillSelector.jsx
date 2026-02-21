"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { skillOptions } from "@/data/skills";
import { FaSearch, FaTimes } from "react-icons/fa";
import "./SkillSelector.css";

const SkillSelector = ({
    label = "Skills",
    placeholder = "Search skills (e.g., React, Product Strategy, Excel)",
    helperText = "Search and add relevant skills for this role. You can also add custom skills.",
    selectedSkills = [],
    onChange,
    allowCustom = true,
    maxSuggestions = 8,
    className = "",
    disabled = false
}) => {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const blurTimeoutRef = useRef(null);

    const normalizedSelected = useMemo(
        () => new Set(selectedSkills.map(skill => skill.toLowerCase())),
        [selectedSkills]
    );

    const normalizedOptions = useMemo(() => {
        // Remove duplicates by keeping first occurrence
        const seen = new Set();
        const unique = [];
        skillOptions.forEach(skill => {
            const normalized = skill.toLowerCase();
            if (!seen.has(normalized)) {
                seen.add(normalized);
                unique.push({ label: skill, value: normalized });
            }
        });
        return unique;
    }, []);

    const filteredSkills = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        let available = normalizedOptions.filter(option => !normalizedSelected.has(option.value));

        if (trimmed) {
            available = available.filter(option => option.value.includes(trimmed));
        }

        return available.slice(0, maxSuggestions);
    }, [query, normalizedOptions, normalizedSelected, maxSuggestions]);

    const showAddCustom =
        allowCustom &&
        query.trim().length > 1 &&
        !normalizedSelected.has(query.trim().toLowerCase()) &&
        !filteredSkills.some(option => option.value === query.trim().toLowerCase());

    // Show dropdown if focused and has results or can add custom
    const shouldShowDropdown = !disabled && isFocused && (filteredSkills.length > 0 || showAddCustom);

    const handleAddSkill = (skill) => {
        if (disabled) return;
        if (!skill || normalizedSelected.has(skill.toLowerCase())) return;
        onChange?.([...selectedSkills, skill]);
        setQuery("");
        setIsFocused(false);
    };

    const handleRemoveSkill = (skillToRemove) => {
        if (disabled) return;
        onChange?.(selectedSkills.filter(skill => skill !== skillToRemove));
    };

    const handleCustomSkill = () => {
        if (disabled) return;
        const trimmed = query.trim();
        if (!trimmed) return;
        const normalized = trimmed
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        handleAddSkill(normalized);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsFocused(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (disabled) {
            setIsFocused(false);
        }
    }, [disabled]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (!(isMobile && isFocused)) return;
        const handleScroll = () => setIsFocused(false);
        
        // Listen to window scroll
        window.addEventListener("scroll", handleScroll, { passive: true });
        
        // Also listen to modal body scroll if inside a modal
        let modalBody = null;
        let editModalContent = null;
        if (containerRef.current) {
            // Find the closest modal body element (AI modal)
            const modalBodyElement = containerRef.current.closest('.ai-modal-body');
            if (modalBodyElement) {
                modalBody = modalBodyElement;
                modalBody.addEventListener("scroll", handleScroll, { passive: true });
            }
            
            // Also check for edit job modal content
            const editModalContentElement = containerRef.current.closest('.edit-job-modal-content');
            if (editModalContentElement) {
                editModalContent = editModalContentElement;
                editModalContent.addEventListener("scroll", handleScroll, { passive: true });
            }
        }
        
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (modalBody) {
                modalBody.removeEventListener("scroll", handleScroll);
            }
            if (editModalContent) {
                editModalContent.removeEventListener("scroll", handleScroll);
            }
        };
    }, [isMobile, isFocused]);

    // Calculate dropdown position on mobile
    useEffect(() => {
        if (isMobile && isFocused && inputRef.current) {
            const calculatePosition = () => {
                const rect = inputRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width
                });
            };
            
            // Calculate immediately
            calculatePosition();
            
            // Also calculate on resize/scroll to keep it aligned
            window.addEventListener('resize', calculatePosition);
            window.addEventListener('scroll', calculatePosition, { passive: true });
            
            return () => {
                window.removeEventListener('resize', calculatePosition);
                window.removeEventListener('scroll', calculatePosition);
            };
        }
    }, [isMobile, isFocused, query]);

    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className={`skill-selector ${disabled ? "disabled" : ""} ${className}`} ref={containerRef}>
            <div className="skill-selector-label">
                <label>{label}</label>
                <span>{selectedSkills.length} selected</span>
            </div>

            {selectedSkills.length > 0 && (
                <div className="selected-skills">
                    {selectedSkills.map(skill => (
                        <span key={skill} className="selected-skill-pill">
                            {skill}
                            <button
                                type="button"
                                className="remove-skill-btn"
                                onClick={() => handleRemoveSkill(skill)}
                                aria-label={`Remove ${skill}`}
                                disabled={disabled}
                            >
                                <FaTimes />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className={`skill-selector-input ${isFocused ? "focused" : ""} ${disabled ? "is-disabled" : ""}`}>
                <FaSearch className="skill-search-icon" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    placeholder={placeholder}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!disabled && isMobile) {
                            setIsFocused(true);
                        }
                    }}
                    onFocus={() => {
                        if (disabled) return;
                        if (blurTimeoutRef.current) {
                            clearTimeout(blurTimeoutRef.current);
                        }
                        setIsFocused(true);
                        // Calculate position immediately on focus for mobile
                        if (isMobile && inputRef.current) {
                            requestAnimationFrame(() => {
                                if (inputRef.current) {
                                    const rect = inputRef.current.getBoundingClientRect();
                                    setDropdownPosition({
                                        top: rect.bottom + window.scrollY + 4,
                                        left: rect.left + window.scrollX,
                                        width: rect.width
                                    });
                                }
                            });
                        }
                    }}
                    onBlur={() => {
                        if (blurTimeoutRef.current) {
                            clearTimeout(blurTimeoutRef.current);
                        }
                        blurTimeoutRef.current = setTimeout(() => {
                            setIsFocused(false);
                        }, 120);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            if (disabled) return;
                            if (showAddCustom) {
                                handleCustomSkill();
                            } else if (filteredSkills.length > 0) {
                                handleAddSkill(filteredSkills[0].label);
                            }
                        }
                    }}
                    disabled={disabled}
                />
                {query && (
                    <button
                        type="button"
                        className="clear-query-btn"
                        onClick={() => setQuery("")}
                        disabled={disabled}
                    >
                        <FaTimes />
                    </button>
                )}
            </div>
            {helperText && <p className="skill-helper-text">{helperText}</p>}

            {shouldShowDropdown && (
                <div 
                    ref={suggestionsRef}
                    className={`skill-suggestions ${isMobile ? 'mobile-dropdown' : ''}`}
                    style={isMobile && dropdownPosition.width > 0 ? {
                        position: 'fixed',
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                        zIndex: 10002
                    } : {}}
                >
                    {showAddCustom && (
                        <button
                            type="button"
                            className="skill-suggestion add-new"
                            onClick={handleCustomSkill}
                        >
                            Add "{query.trim()}"
                        </button>
                    )}
                    {filteredSkills.map((option, index) => (
                        <button
                            type="button"
                            key={`${option.value}-${index}`}
                            className="skill-suggestion"
                            onClick={() => handleAddSkill(option.label)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}

        </div>
    );
};

export default SkillSelector;


