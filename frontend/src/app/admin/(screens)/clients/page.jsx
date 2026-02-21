"use client";

import { useState } from 'react';
import { useClients } from '@/hooks/useAdminClients';
import ClientCard from '@/components/admin/ClientCard';
import AddClientModal from '@/components/admin/AddClientModal';
import { CircularProgress } from '@mui/material';
import { HiPlus } from 'react-icons/hi2';
import './page.css';

export default function ClientsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading, error } = useClients({
        search: searchTerm,
        status: statusFilter,
        limit: 100
    });

    const clients = data?.data || [];

    return (
        <div className="clients-page">
            <div className="clients-page-header">
                <div className="clients-page-header-left">
                    <h1 className="clients-page-title">Clients</h1>
                    <p className="clients-page-subtitle">Manage all your clients</p>
                </div>
                <button
                    className="clients-page-add-btn"
                    onClick={() => setIsModalOpen(true)}
                >
                    <HiPlus />
                    <span>Add Client</span>
                </button>
            </div>

            <div className="clients-page-filters">
                <div className="clients-page-search">
                    <input
                        type="text"
                        placeholder="Search by name, company, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="clients-page-search-input"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="clients-page-filter-select"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            {isLoading ? (
                <div className="clients-page-loading">
                    <CircularProgress />
                    <p>Loading clients...</p>
                </div>
            ) : error ? (
                <div className="clients-page-error">
                    <p>Failed to load clients. Please try again.</p>
                </div>
            ) : clients.length === 0 ? (
                <div className="clients-page-empty">
                    <p>No clients found</p>
                    <button
                        className="clients-page-add-btn"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <HiPlus />
                        <span>Add Your First Client</span>
                    </button>
                </div>
            ) : (
                <div className="clients-page-grid">
                    {clients.map((client) => (
                        <ClientCard key={client._id} client={client} />
                    ))}
                </div>
            )}

            <AddClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}

