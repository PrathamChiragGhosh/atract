"use client";

import { useState } from 'react';
import { useCreateClient } from '@/hooks/useAdminClients';
import { CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';
import './AddClientModal.css';

const AddClientModal = ({ isOpen, onClose }) => {
    const createClient = useCreateClient();
    
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        email: '',
        mobileNumber: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        status: 'active',
        notes: ''
    });

    const [errors, setErrors] = useState({});

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.companyName.trim()) {
            newErrors.companyName = 'Company name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await createClient.mutateAsync(formData);
            toast.success('Client added successfully');
            
            // Reset form
            setFormData({
                name: '',
                companyName: '',
                email: '',
                mobileNumber: '',
                address: '',
                city: '',
                state: '',
                pincode: '',
                status: 'active',
                notes: ''
            });
            
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add client');
        }
    };

    const handleClose = () => {
        if (!createClient.isPending) {
            setFormData({
                name: '',
                companyName: '',
                email: '',
                mobileNumber: '',
                address: '',
                city: '',
                state: '',
                pincode: '',
                status: 'active',
                notes: ''
            });
            setErrors({});
            onClose();
        }
    };

    return (
        <div className="add-client-modal-overlay" onClick={handleClose}>
            <div className="add-client-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="add-client-modal-header">
                    <h2 className="add-client-modal-title">Add New Client</h2>
                    <button 
                        className="add-client-modal-close"
                        onClick={handleClose}
                        disabled={createClient.isPending}
                    >
                        ×
                    </button>
                </div>

                <form className="add-client-modal-form" onSubmit={handleSubmit}>
                    <div className="add-client-form-row">
                        <div className="add-client-form-group">
                            <label className="add-client-form-label">
                                Name <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`add-client-form-input ${errors.name ? 'error' : ''}`}
                                placeholder="Enter client name"
                                disabled={createClient.isPending}
                            />
                            {errors.name && <span className="add-client-form-error">{errors.name}</span>}
                        </div>

                        <div className="add-client-form-group">
                            <label className="add-client-form-label">
                                Company Name <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                className={`add-client-form-input ${errors.companyName ? 'error' : ''}`}
                                placeholder="Enter company name"
                                disabled={createClient.isPending}
                            />
                            {errors.companyName && <span className="add-client-form-error">{errors.companyName}</span>}
                        </div>
                    </div>

                    <div className="add-client-form-row">
                        <div className="add-client-form-group">
                            <label className="add-client-form-label">
                                Email <span className="required">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`add-client-form-input ${errors.email ? 'error' : ''}`}
                                placeholder="Enter email address"
                                disabled={createClient.isPending}
                            />
                            {errors.email && <span className="add-client-form-error">{errors.email}</span>}
                        </div>

                        <div className="add-client-form-group">
                            <label className="add-client-form-label">Mobile Number</label>
                            <input
                                type="tel"
                                name="mobileNumber"
                                value={formData.mobileNumber}
                                onChange={handleChange}
                                className="add-client-form-input"
                                placeholder="Enter mobile number"
                                disabled={createClient.isPending}
                            />
                        </div>
                    </div>

                    <div className="add-client-form-group">
                        <label className="add-client-form-label">Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="add-client-form-input add-client-form-textarea"
                            placeholder="Enter address"
                            rows="2"
                            disabled={createClient.isPending}
                        />
                    </div>

                    <div className="add-client-form-row">
                        <div className="add-client-form-group">
                            <label className="add-client-form-label">City</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="add-client-form-input"
                                placeholder="Enter city"
                                disabled={createClient.isPending}
                            />
                        </div>

                        <div className="add-client-form-group">
                            <label className="add-client-form-label">State</label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="add-client-form-input"
                                placeholder="Enter state"
                                disabled={createClient.isPending}
                            />
                        </div>

                        <div className="add-client-form-group">
                            <label className="add-client-form-label">Pincode</label>
                            <input
                                type="text"
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleChange}
                                className="add-client-form-input"
                                placeholder="Enter pincode"
                                disabled={createClient.isPending}
                            />
                        </div>
                    </div>

                    <div className="add-client-form-row">
                        <div className="add-client-form-group">
                            <label className="add-client-form-label">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="add-client-form-input"
                                disabled={createClient.isPending}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="add-client-form-group">
                        <label className="add-client-form-label">Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            className="add-client-form-input add-client-form-textarea"
                            placeholder="Additional notes (optional)"
                            rows="3"
                            disabled={createClient.isPending}
                        />
                    </div>

                    <div className="add-client-modal-actions">
                        <button
                            type="button"
                            className="add-client-modal-btn add-client-modal-btn-cancel"
                            onClick={handleClose}
                            disabled={createClient.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="add-client-modal-btn add-client-modal-btn-submit"
                            disabled={createClient.isPending}
                        >
                            {createClient.isPending ? (
                                <CircularProgress size={16} sx={{ color: "white" }} />
                            ) : (
                                'Add Client'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddClientModal;

