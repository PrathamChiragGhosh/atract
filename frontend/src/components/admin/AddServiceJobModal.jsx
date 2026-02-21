"use client";

import { useState, useEffect } from 'react';
import { useCreateServiceJob } from '@/hooks/useAdminServiceJobs';
import { useClients } from '@/hooks/useAdminClients';
import { CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';
import './AddServiceJobModal.css';

// Generate time options (12:00 AM to 11:30 PM in 30-minute intervals)
const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time24 = hour * 60 + minute;
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const ampm = hour < 12 ? 'AM' : 'PM';
            const displayMinute = minute === 0 ? '00' : minute.toString();
            times.push({
                value: `${String(hour).padStart(2, '0')}:${displayMinute}`,
                label: `${displayHour}:${displayMinute} ${ampm}`
            });
        }
    }
    return times;
};

const timeOptions = generateTimeOptions();

// Convert time string (HH:MM) to minutes
const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// Convert minutes to time string (HH:MM)
const minutesToTime = (minutes) => {
    if (minutes === null || minutes === undefined) return '';
    const totalMinutes = minutes % (24 * 60); // Handle overflow
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const AddServiceJobModal = ({ isOpen, onClose }) => {
    const createServiceJob = useCreateServiceJob();
    const { data: clientsData } = useClients({ limit: 1000 });
    const clients = clientsData?.data || [];
    
    const [formData, setFormData] = useState({
        jobName: '',
        jobRequirements: '',
        clientId: '',
        gender: '',
        location: '',
        salary: '',
        shiftTimings: '',
        workingHours: '',
        shiftStartTime: '',
        shiftEndTime: '',
        numberOfPositions: 1,
        status: 'open',
        priority: 'medium',
        age: '',
        keySkills: [],
        workExperience: '',
        noticePeriod: ''
    });

    const [errors, setErrors] = useState({});
    const [skillInput, setSkillInput] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                jobName: '',
                jobRequirements: '',
                clientId: '',
                gender: '',
                location: '',
                salary: '',
                shiftTimings: '',
                workingHours: '',
                shiftStartTime: '',
                shiftEndTime: '',
                numberOfPositions: 1,
                status: 'open',
                priority: 'medium',
                age: '',
                keySkills: [],
                workExperience: '',
                noticePeriod: ''
            });
            setErrors({});
        }
    }, [isOpen]);

    // Auto-calculate end time when start time or working hours change
    useEffect(() => {
        if (formData.shiftStartTime && formData.workingHours) {
            const startMinutes = timeToMinutes(formData.shiftStartTime);
            const workingMinutes = parseFloat(formData.workingHours) * 60;
            if (startMinutes !== null && !isNaN(workingMinutes) && workingMinutes > 0) {
                const endMinutes = startMinutes + workingMinutes;
                const endTime = minutesToTime(endMinutes);
                setFormData(prev => {
                    // Only update if end time is not manually set or if it's different
                    if (!prev.shiftEndTime || prev.shiftEndTime !== endTime) {
                        return {
                            ...prev,
                            shiftEndTime: endTime
                        };
                    }
                    return prev;
                });
            }
        }
    }, [formData.shiftStartTime, formData.workingHours]);

    // Auto-calculate start time when end time or working hours change (only if start time is not set)
    useEffect(() => {
        if (formData.shiftEndTime && formData.workingHours && !formData.shiftStartTime) {
            const endMinutes = timeToMinutes(formData.shiftEndTime);
            const workingMinutes = parseFloat(formData.workingHours) * 60;
            if (endMinutes !== null && !isNaN(workingMinutes) && workingMinutes > 0) {
                let startMinutes = endMinutes - workingMinutes;
                // Handle negative (previous day)
                if (startMinutes < 0) {
                    startMinutes = startMinutes + (24 * 60);
                }
                const startTime = minutesToTime(startMinutes);
                setFormData(prev => ({
                    ...prev,
                    shiftStartTime: startTime
                }));
            }
        }
    }, [formData.shiftEndTime, formData.workingHours]);

    // Update shiftTimings display string when times change
    useEffect(() => {
        if (formData.shiftStartTime && formData.shiftEndTime) {
            const startTime = formData.shiftStartTime;
            const endTime = formData.shiftEndTime;
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            
            const formatTime = (hour, minute) => {
                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                const ampm = hour < 12 ? 'AM' : 'PM';
                const displayMin = minute === 0 ? '00' : minute.toString();
                return `${displayHour}:${displayMin} ${ampm}`;
            };

            const displayStart = formatTime(startHour, startMin);
            const displayEnd = formatTime(endHour, endMin);
            
            setFormData(prev => ({
                ...prev,
                shiftTimings: `${displayStart} - ${displayEnd}`
            }));
        }
    }, [formData.shiftStartTime, formData.shiftEndTime]);

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors = {};

        if (!formData.jobName.trim()) {
            newErrors.jobName = 'Job name is required';
        }

        if (!formData.jobRequirements.trim()) {
            newErrors.jobRequirements = 'Job requirements are required';
        }

        if (!formData.clientId) {
            newErrors.clientId = 'Please select a client';
        }

        if (!formData.gender) {
            newErrors.gender = 'Gender is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Special handling for working hours to prevent auto-calculation conflicts
        if (name === 'workingHours') {
            setFormData(prev => ({
                ...prev,
                [name]: value === '' ? '' : parseFloat(value) || ''
            }));
        } else if (name === 'shiftStartTime') {
            // When start time changes, keep end time - it will be recalculated by useEffect
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        } else if (name === 'shiftEndTime') {
            // When end time changes, clear start time to trigger recalculation
            setFormData(prev => ({
                ...prev,
                [name]: value,
                shiftStartTime: '' // Clear to trigger recalculation from end time
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: name === 'numberOfPositions' ? parseInt(value) || 1 : value
            }));
        }
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleAddSkill = () => {
        if (skillInput.trim() && !formData.keySkills.includes(skillInput.trim())) {
            setFormData(prev => ({
                ...prev,
                keySkills: [...prev.keySkills, skillInput.trim()]
            }));
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setFormData(prev => ({
            ...prev,
            keySkills: prev.keySkills.filter(skill => skill !== skillToRemove)
        }));
    };

    const handleSkillInputKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSkill();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await createServiceJob.mutateAsync(formData);
            toast.success('Job added successfully');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add job');
        }
    };

    const handleClose = () => {
        if (!createServiceJob.isPending) {
            onClose();
        }
    };

    return (
        <div className="add-service-job-modal-overlay" onClick={handleClose}>
            <div className="add-service-job-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="add-service-job-modal-header">
                    <h2 className="add-service-job-modal-title">Add New Job</h2>
                    <button 
                        className="add-service-job-modal-close"
                        onClick={handleClose}
                        disabled={createServiceJob.isPending}
                    >
                        ×
                    </button>
                </div>

                <form className="add-service-job-modal-form" onSubmit={handleSubmit}>
                    <div className="add-service-job-form-group">
                        <label className="add-service-job-form-label">
                            Job Name <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            name="jobName"
                            value={formData.jobName}
                            onChange={handleChange}
                            className={`add-service-job-form-input ${errors.jobName ? 'error' : ''}`}
                            placeholder="e.g., Security Guard, Office Cleaner, Sweeper"
                            disabled={createServiceJob.isPending}
                        />
                        {errors.jobName && <span className="add-service-job-form-error">{errors.jobName}</span>}
                    </div>

                    <div className="add-service-job-form-group">
                        <label className="add-service-job-form-label">
                            Job Requirements <span className="required">*</span>
                        </label>
                        <textarea
                            name="jobRequirements"
                            value={formData.jobRequirements}
                            onChange={handleChange}
                            className={`add-service-job-form-input add-service-job-form-textarea ${errors.jobRequirements ? 'error' : ''}`}
                            placeholder="Enter detailed job requirements and description"
                            rows="5"
                            disabled={createServiceJob.isPending}
                        />
                        {errors.jobRequirements && <span className="add-service-job-form-error">{errors.jobRequirements}</span>}
                    </div>

                    <div className="add-service-job-form-row">
                        <div className="add-service-job-form-group">
                            <label className="add-service-job-form-label">
                                Client <span className="required">*</span>
                            </label>
                            <select
                                name="clientId"
                                value={formData.clientId}
                                onChange={handleChange}
                                className={`add-service-job-form-input ${errors.clientId ? 'error' : ''}`}
                                disabled={createServiceJob.isPending}
                            >
                                <option value="">Select a client</option>
                                {clients.map((client) => (
                                    <option key={client._id} value={client._id}>
                                        {client.name} - {client.companyName}
                                    </option>
                                ))}
                            </select>
                            {errors.clientId && <span className="add-service-job-form-error">{errors.clientId}</span>}
                            {clients.length === 0 && (
                                <span className="add-service-job-form-hint">
                                    No clients available. Please add a client first.
                                </span>
                            )}
                        </div>

                        <div className="add-service-job-form-group">
                            <label className="add-service-job-form-label">
                                Gender <span className="required">*</span>
                            </label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className={`add-service-job-form-input ${errors.gender ? 'error' : ''}`}
                                disabled={createServiceJob.isPending}
                            >
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="both male - female">Both Male - Female</option>
                                <option value="others">Others</option>
                            </select>
                            {errors.gender && <span className="add-service-job-form-error">{errors.gender}</span>}
                        </div>
                    </div>

                    <div className="add-service-job-form-row">
                        <div className="add-service-job-form-group">
                            <label className="add-service-job-form-label">Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="add-service-job-form-input"
                                placeholder="Enter job location"
                                disabled={createServiceJob.isPending}
                            />
                        </div>

                        <div className="add-service-job-form-group">
                            <label className="add-service-job-form-label">Salary</label>
                            <input
                                type="text"
                                name="salary"
                                value={formData.salary}
                                onChange={handleChange}
                                className="add-service-job-form-input"
                                placeholder="e.g., ₹15,000 - ₹20,000"
                                disabled={createServiceJob.isPending}
                            />
                        </div>
                    </div>

                    <div className="add-service-job-shift-section">
                        <h3 className="add-service-job-section-title">Shift Timings</h3>
                        <div className="add-service-job-form-row">
                            <div className="add-service-job-form-group">
                                <label className="add-service-job-form-label">Working Hours</label>
                                <input
                                    type="number"
                                    name="workingHours"
                                    value={formData.workingHours}
                                    onChange={handleChange}
                                    className="add-service-job-form-input"
                                    placeholder="e.g., 8"
                                    min="0.5"
                                    max="24"
                                    step="0.5"
                                    disabled={createServiceJob.isPending}
                                />
                                <span className="add-service-job-form-hint">Hours per day</span>
                            </div>

                            <div className="add-service-job-form-group">
                                <label className="add-service-job-form-label">Start Time</label>
                                <select
                                    name="shiftStartTime"
                                    value={formData.shiftStartTime}
                                    onChange={handleChange}
                                    className="add-service-job-form-input"
                                    disabled={createServiceJob.isPending}
                                >
                                    <option value="">Select start time</option>
                                    {timeOptions.map((time) => (
                                        <option key={time.value} value={time.value}>
                                            {time.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="add-service-job-form-group">
                                <label className="add-service-job-form-label">End Time</label>
                                <select
                                    name="shiftEndTime"
                                    value={formData.shiftEndTime}
                                    onChange={handleChange}
                                    className="add-service-job-form-input"
                                    disabled={createServiceJob.isPending}
                                >
                                    <option value="">Select end time</option>
                                    {timeOptions.map((time) => (
                                        <option key={time.value} value={time.value}>
                                            {time.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {formData.shiftTimings && (
                            <div className="add-service-job-shift-display">
                                <strong>Shift:</strong> {formData.shiftTimings}
                            </div>
                        )}
                    </div>

                    <div className="add-service-job-form-row">
                        <div className="add-service-job-form-group">
                            <label className="add-service-job-form-label">Age</label>
                            <input
                                type="text"
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                className="add-service-job-form-input"
                                placeholder="e.g., 18-35, 25-45"
                                disabled={createServiceJob.isPending}
                            />
                        </div>

                        <div className="add-service-job-form-group">
                            <label className="add-service-job-form-label">Work Experience</label>
                            <input
                                type="text"
                                name="workExperience"
                                value={formData.workExperience}
                                onChange={handleChange}
                                className="add-service-job-form-input"
                                placeholder="e.g., 0-2 years, 2-5 years"
                                disabled={createServiceJob.isPending}
                            />
                        </div>

                        <div className="add-service-job-form-group">
                            <label className="add-service-job-form-label">Notice Period</label>
                            <input
                                type="text"
                                name="noticePeriod"
                                value={formData.noticePeriod}
                                onChange={handleChange}
                                className="add-service-job-form-input"
                                placeholder="e.g., Immediate, 15 days, 1 month"
                                disabled={createServiceJob.isPending}
                            />
                        </div>
                    </div>

                    <div className="add-service-job-form-group">
                        <label className="add-service-job-form-label">Key Skills</label>
                        <div className="add-service-job-skills-input-wrapper">
                            <input
                                type="text"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyPress={handleSkillInputKeyPress}
                                className="add-service-job-form-input"
                                placeholder="Enter skill and press Enter or click Add"
                                disabled={createServiceJob.isPending}
                            />
                            <button
                                type="button"
                                onClick={handleAddSkill}
                                className="add-service-job-skill-add-btn"
                                disabled={createServiceJob.isPending || !skillInput.trim()}
                            >
                                Add
                            </button>
                        </div>
                        {formData.keySkills.length > 0 && (
                            <div className="add-service-job-skills-list">
                                {formData.keySkills.map((skill, index) => (
                                    <span key={index} className="add-service-job-skill-tag">
                                        {skill}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSkill(skill)}
                                            className="add-service-job-skill-remove"
                                            disabled={createServiceJob.isPending}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="add-service-job-form-row">
                        <div className="add-service-job-form-group">
                            <label className="add-service-job-form-label">Number of Positions</label>
                            <input
                                type="number"
                                name="numberOfPositions"
                                value={formData.numberOfPositions}
                                onChange={handleChange}
                                className="add-service-job-form-input"
                                min="1"
                                disabled={createServiceJob.isPending}
                            />
                        </div>

                        <div className="add-service-job-form-group">
                            <label className="add-service-job-form-label">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="add-service-job-form-input"
                                disabled={createServiceJob.isPending}
                            >
                                <option value="open">Open</option>
                                <option value="filled">Filled</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>

                        <div className="add-service-job-form-group">
                            <label className="add-service-job-form-label">Priority</label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                className="add-service-job-form-input"
                                disabled={createServiceJob.isPending}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="add-service-job-modal-actions">
                        <button
                            type="button"
                            className="add-service-job-modal-btn add-service-job-modal-btn-cancel"
                            onClick={handleClose}
                            disabled={createServiceJob.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="add-service-job-modal-btn add-service-job-modal-btn-submit"
                            disabled={createServiceJob.isPending || clients.length === 0}
                        >
                            {createServiceJob.isPending ? (
                                <CircularProgress size={16} sx={{ color: "white" }} />
                            ) : (
                                'Add Job'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddServiceJobModal;
