import React, { useState, useEffect } from 'react';
import './FileManager.css';

const FileManager = () => {
    const [files, setFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, image, video, document
    const [sortBy, setSortBy] = useState('date'); // date, name, size
    const [viewMode, setViewMode] = useState('grid'); // grid, list
    const [selectedFile, setSelectedFile] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));

    // Fetch all media files
    useEffect(() => {
        fetchFiles();
    }, []);

    // Apply filters whenever dependencies change
    useEffect(() => {
        applyFilters();
    }, [files, searchQuery, filterType, sortBy, dateFilter]);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/conv-media/files`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            console.log('API Response:', result);
            
            if (result.success) {
                // Handle both 'files' and 'media' array names
                const filesArray = result.files || result.media || [];
                
                // Transform data to match expected structure
                const transformedFiles = filesArray.map(file => ({
                    _id: file._id,
                    url: file.media?.url || file.url,
                    originalName: file.media?.originalName || file.originalName || `${file.messageType}_${file._id}`,
                    messageType: file.messageType,
                    size: file.media?.size || file.size,
                    createdAt: file.createdAt,
                    sender: file.sender
                }));
                
                console.log('Transformed files:', transformedFiles);
                setFiles(transformedFiles);
            }
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...files];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(file =>
                file.originalName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(file => file.messageType === filterType);
        }

        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            filtered = filtered.filter(file => {
                const fileDate = new Date(file.createdAt);
                if (dateFilter === 'today') {
                    return fileDate >= today;
                } else if (dateFilter === 'week') {
                    return fileDate >= weekAgo;
                } else if (dateFilter === 'month') {
                    return fileDate >= monthAgo;
                }
                return true;
            });
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.createdAt) - new Date(a.createdAt);
            } else if (sortBy === 'name') {
                return (a.originalName || '').localeCompare(b.originalName || '');
            } else if (sortBy === 'size') {
                return (b.size || 0) - (a.size || 0);
            }
            return 0;
        });

        setFilteredFiles(filtered);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now - d);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const handleShare = (file) => {
        setSelectedFile(file);
        setShowShareModal(true);
    };

    const shareVia = (platform) => {
        if (!selectedFile) return;

        const url = selectedFile.url;
        const text = `Check out this ${selectedFile.messageType}: ${selectedFile.originalName}`;

        let shareUrl = '';

        switch (platform) {
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${encodeURIComponent(selectedFile.originalName)}&body=${encodeURIComponent(text + '\n\n' + url)}`;
                break;
            case 'copy':
                navigator.clipboard.writeText(url);
                alert('Link copied to clipboard!');
                setShowShareModal(false);
                return;
            case 'download':
                const link = document.createElement('a');
                link.href = url;
                link.download = selectedFile.originalName || 'download';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setShowShareModal(false);
                return;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank');
            setShowShareModal(false);
        }
    };

    const handleDownload = (file) => {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.originalName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePreview = (file) => {
        setSelectedFile(file);
    };

    const getFileIcon = (type) => {
        if (type === 'image') {
            return (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
            );
        } else if (type === 'video') {
            return (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
            );
        }
        return (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
            </svg>
        );
    };

    return (
        <div className="file-manager">
            {/* Header */}
            <div className="fm-header">
                <div className="fm-title-section">
                    <h2>File Manager</h2>
                    <span className="fm-count">{filteredFiles.length} files</span>
                </div>

                <div className="fm-actions">
                    <div className="fm-search">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button
                        className="fm-view-btn"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                    >
                        {viewMode === 'grid' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="8" y1="6" x2="21" y2="6"/>
                                <line x1="8" y1="12" x2="21" y2="12"/>
                                <line x1="8" y1="18" x2="21" y2="18"/>
                                <line x1="3" y1="6" x2="3.01" y2="6"/>
                                <line x1="3" y1="12" x2="3.01" y2="12"/>
                                <line x1="3" y1="18" x2="3.01" y2="18"/>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7"/>
                                <rect x="14" y="3" width="7" height="7"/>
                                <rect x="14" y="14" width="7" height="7"/>
                                <rect x="3" y="14" width="7" height="7"/>
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="fm-filters">
                <div className="fm-filter-group">
                    <label>Type:</label>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="all">All Files</option>
                        <option value="image">Images</option>
                        <option value="video">Videos</option>
                    </select>
                </div>

                <div className="fm-filter-group">
                    <label>Date:</label>
                    <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                    </select>
                </div>

                <div className="fm-filter-group">
                    <label>Sort by:</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="date">Date</option>
                        <option value="name">Name</option>
                        <option value="size">Size</option>
                    </select>
                </div>
            </div>

            {/* File Grid/List */}
            {loading ? (
                <div className="fm-loading">
                    <div className="spinner-large"></div>
                    <p>Loading files...</p>
                </div>
            ) : filteredFiles.length === 0 ? (
                <div className="fm-empty">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                        <polyline points="13 2 13 9 20 9"/>
                    </svg>
                    <h3>No files found</h3>
                    <p>Try adjusting your filters or search query</p>
                </div>
            ) : (
                <div className={`fm-content ${viewMode}`}>
                    {filteredFiles.map((file) => (
                        <div key={file._id} className="fm-file-card">
                            <div className="fm-file-preview" onClick={() => handlePreview(file)}>
                                {file.messageType === 'image' ? (
                                    <img src={file.url} alt={file.originalName} />
                                ) : file.messageType === 'video' ? (
                                    <video src={file.url} />
                                ) : (
                                    <div className="fm-file-icon">
                                        {getFileIcon(file.messageType)}
                                    </div>
                                )}
                                <div className="fm-file-overlay">
                                    <button onClick={(e) => { e.stopPropagation(); handlePreview(file); }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="fm-file-info">
                                <h4 className="fm-file-name" title={file.originalName}>
                                    {file.originalName || 'Untitled'}
                                </h4>
                                <div className="fm-file-meta">
                                    <span>{formatFileSize(file.size)}</span>
                                    <span>•</span>
                                    <span>{formatDate(file.createdAt)}</span>
                                </div>
                            </div>

                            <div className="fm-file-actions">
                                <button onClick={() => handleShare(file)} title="Share">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="18" cy="5" r="3"/>
                                        <circle cx="6" cy="12" r="3"/>
                                        <circle cx="18" cy="19" r="3"/>
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                    </svg>
                                </button>
                                <button onClick={() => handleDownload(file)} title="Download">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                        <polyline points="7 10 12 15 17 10"/>
                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fm-modal-overlay" onClick={() => setShowShareModal(false)}>
                    <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="fm-modal-header">
                            <h3>Share File</h3>
                            <button onClick={() => setShowShareModal(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>

                        <div className="fm-modal-body">
                            <div className="fm-share-preview">
                                {selectedFile?.messageType === 'image' ? (
                                    <img src={selectedFile.url} alt={selectedFile.originalName} />
                                ) : selectedFile?.messageType === 'video' ? (
                                    <video src={selectedFile.url} controls />
                                ) : null}
                                <p>{selectedFile?.originalName}</p>
                            </div>

                            <div className="fm-share-options">
                                <button onClick={() => shareVia('whatsapp')} className="share-btn whatsapp">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                    WhatsApp
                                </button>

                                <button onClick={() => shareVia('telegram')} className="share-btn telegram">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                    </svg>
                                    Telegram
                                </button>

                                <button onClick={() => shareVia('twitter')} className="share-btn twitter">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                    </svg>
                                    Twitter
                                </button>

                                <button onClick={() => shareVia('facebook')} className="share-btn facebook">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                    Facebook
                                </button>

                                <button onClick={() => shareVia('email')} className="share-btn email">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                    Email
                                </button>

                                <button onClick={() => shareVia('copy')} className="share-btn copy">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                                    </svg>
                                    Copy Link
                                </button>

                                <button onClick={() => shareVia('download')} className="share-btn download">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                        <polyline points="7 10 12 15 17 10"/>
                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {selectedFile && !showShareModal && (
                <div className="fm-modal-overlay" onClick={() => setSelectedFile(null)}>
                    <div className="fm-preview-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="fm-close-preview" onClick={() => setSelectedFile(null)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>

                        {selectedFile.messageType === 'image' ? (
                            <img src={selectedFile.url} alt={selectedFile.originalName} />
                        ) : selectedFile.messageType === 'video' ? (
                            <video src={selectedFile.url} controls autoPlay />
                        ) : null}

                        <div className="fm-preview-info">
                            <h3>{selectedFile.originalName}</h3>
                            <p>{formatFileSize(selectedFile.size)} • {formatDate(selectedFile.createdAt)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileManager;