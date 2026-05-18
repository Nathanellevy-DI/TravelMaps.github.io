import React, { useState, useRef, useEffect } from 'react';
import { uploadMedia, getMediaUrl, fetchApi } from '../../services/apiClient';
import { Upload, Lock, Users, Globe, X, Image as ImageIcon } from 'lucide-react';

/**
 * SecureImageUpload
 * 
 * Component that allows users to upload images with explicit tier-based
 * visibility settings (Tier 1: Private, Tier 2: Group, Tier 3: Public).
 * Connects directly to the encrypted media backend.
 */
export default function SecureImageUpload({ placeId, onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [tier, setTier] = useState(1);
    const [sharedWith, setSharedWith] = useState([]);
    
    // For Tier 2, we need a list of friends to select from
    const [friends, setFriends] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Fetch friends for Tier 1 / Tier 2 selection
        fetchApi('/friends').then(res => {
            if (res && res.friends) {
                setFriends(res.friends);
            }
        }).catch(err => console.error("Failed to fetch friends for media sharing", err));
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        
        if (!selectedFile.type.startsWith('image/')) {
            setError('Please select an image file.');
            return;
        }
        
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB.');
            return;
        }
        
        setFile(selectedFile);
        setError('');
        
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
    };

    const toggleFriend = (friendId) => {
        if (tier === 1) {
            // Tier 1 allows exactly ONE user
            setSharedWith([friendId]);
        } else {
            // Tier 2 allows MULTIPLE users
            setSharedWith(prev => 
                prev.includes(friendId) 
                    ? prev.filter(id => id !== friendId)
                    : [...prev, friendId]
            );
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        
        if (tier === 1 && sharedWith.length === 0) {
            setError('For Private Single sharing, you must select one person.');
            return;
        }
        if (tier === 2 && sharedWith.length === 0) {
            setError('For Group sharing, you must select at least one person.');
            return;
        }

        setIsUploading(true);
        setError('');
        
        try {
            await uploadMedia(file, placeId, tier, tier === 3 ? [] : sharedWith);
            
            // Reset state on success
            setFile(null);
            setPreview(null);
            setSharedWith([]);
            setTier(1);
            if (onUploadSuccess) onUploadSuccess();
            
        } catch (err) {
            console.error('Upload error', err);
            setError('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const cancelUpload = () => {
        setFile(null);
        setPreview(null);
        setError('');
    };

    return (
        <div className="secure-upload-container" style={{
            background: 'var(--surface)', padding: '16px', borderRadius: '12px', marginTop: '16px',
            border: '1px solid var(--border)'
        }}>
            <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} /> Secure Media Upload
            </h4>
            
            {!file ? (
                <div 
                    className="upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: '2px dashed var(--border)', borderRadius: '8px', padding: '32px',
                        textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
                        background: 'rgba(0,0,0,0.05)'
                    }}
                >
                    <Upload size={32} style={{ color: 'var(--muted)', marginBottom: '12px' }} />
                    <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 500 }}>Click to select an image</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>End-to-End Encrypted • Max 10MB</p>
                </div>
            ) : (
                <div className="upload-preview" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                        <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                        <button 
                            className="icon-btn" 
                            onClick={cancelUpload}
                            style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                    
                    <div className="security-tiers">
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Sharing Visibility</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                className={`small-btn ${tier === 1 ? 'primary' : 'secondary'}`} 
                                onClick={() => { setTier(1); setSharedWith([]); }}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <Lock size={14} /> Private (1)
                            </button>
                            <button 
                                className={`small-btn ${tier === 2 ? 'primary' : 'secondary'}`} 
                                onClick={() => { setTier(2); setSharedWith([]); }}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <Users size={14} /> Group
                            </button>
                            <button 
                                className={`small-btn ${tier === 3 ? 'primary' : 'secondary'}`} 
                                onClick={() => { setTier(3); setSharedWith([]); }}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <Globe size={14} /> Public
                            </button>
                        </div>
                    </div>

                    {(tier === 1 || tier === 2) && (
                        <div className="friend-selector">
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
                                Select {tier === 1 ? 'Person' : 'People'}
                            </label>
                            {friends.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>No friends available to share with.</p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {friends.map(f => {
                                        const isSelected = sharedWith.includes(f.id);
                                        return (
                                            <button
                                                key={f.id}
                                                className={`small-btn ${isSelected ? 'primary' : 'secondary'}`}
                                                onClick={() => toggleFriend(f.id)}
                                                style={{ padding: '4px 12px', borderRadius: '16px' }}
                                            >
                                                {f.display_name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {error && <div style={{ color: 'red', fontSize: '0.85rem' }}>{error}</div>}

                    <button 
                        className="primary" 
                        onClick={handleUpload} 
                        disabled={isUploading}
                        style={{ width: '100%', marginTop: '8px' }}
                    >
                        {isUploading ? 'Encrypting & Uploading...' : 'Secure Upload'}
                    </button>
                </div>
            )}
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
            />
        </div>
    );
}
