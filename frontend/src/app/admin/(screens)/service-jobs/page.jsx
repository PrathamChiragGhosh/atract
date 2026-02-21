"use client";

import { useState } from 'react';
import { useServiceJobs } from '@/hooks/useAdminServiceJobs';
import { useClients } from '@/hooks/useAdminClients';
import ServiceJobCard from '@/components/admin/ServiceJobCard';
import AddServiceJobModal from '@/components/admin/AddServiceJobModal';
import ServiceJobDetailModal from '@/components/admin/ServiceJobDetailModal';
import { CircularProgress } from '@mui/material';
import { HiPlus } from 'react-icons/hi2';
import './page.css';

export default function ServiceJobsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [clientFilter, setClientFilter] = useState('');

    const { data: clientsData } = useClients({ limit: 1000 });
    const clients = clientsData?.data || [];

    const { data, isLoading, error } = useServiceJobs({
        search: searchTerm,
        status: statusFilter,
        clientId: clientFilter,
        limit: 100
    });

    const serviceJobs = data?.data || [];

    return (
        <div className="service-jobs-page">
            <div className="service-jobs-page-header">
                <div className="service-jobs-page-header-left">
                    <h1 className="service-jobs-page-title">Service Jobs</h1>
                    <p className="service-jobs-page-subtitle">Manage all service jobs (guards, cleaners, etc.)</p>
                </div>
                <button
                    className="service-jobs-page-add-btn"
                    onClick={() => setIsModalOpen(true)}
                    disabled={clients.length === 0}
                >
                    <HiPlus />
                    <span>Add Job</span>
                </button>
            </div>

            {clients.length === 0 && (
                <div className="service-jobs-page-warning">
                    <p>Please add at least one client before creating a job.</p>
                </div>
            )}

            <div className="service-jobs-page-filters">
                <div className="service-jobs-page-search">
                    <input
                        type="text"
                        placeholder="Search by job name or requirements..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="service-jobs-page-search-input"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="service-jobs-page-filter-select"
                >
                    <option value="">All Status</option>
                    <option value="open">Open</option>
                    <option value="filled">Filled</option>
                    <option value="closed">Closed</option>
                </select>
                <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="service-jobs-page-filter-select"
                >
                    <option value="">All Clients</option>
                    {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                            {client.name} - {client.companyName}
                        </option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="service-jobs-page-loading">
                    <CircularProgress />
                    <p>Loading jobs...</p>
                </div>
            ) : error ? (
                <div className="service-jobs-page-error">
                    <p>Failed to load jobs. Please try again.</p>
                </div>
            ) : serviceJobs.length === 0 ? (
                <div className="service-jobs-page-empty">
                    <p>No jobs found</p>
                    {clients.length > 0 && (
                        <button
                            className="service-jobs-page-add-btn"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <HiPlus />
                            <span>Add Your First Job</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="service-jobs-page-grid">
                    {serviceJobs.map((job) => (
                        <ServiceJobCard 
                            key={job._id} 
                            serviceJob={job}
                            onShowDetails={(job) => {
                                setSelectedJob(job);
                                setIsDetailModalOpen(true);
                            }}
                        />
                    ))}
                </div>
            )}

            <AddServiceJobModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            <ServiceJobDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedJob(null);
                }}
                serviceJob={selectedJob}
            />
        </div>
    );
}

