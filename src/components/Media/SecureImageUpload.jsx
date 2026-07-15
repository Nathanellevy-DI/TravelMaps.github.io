import React, { useState, useRef, useEffect } from 'react';
import { Upload, Lock, Users, Globe, X, Image as ImageIcon, Video, Music, FileText, Mic, MicOff, AlertCircle } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';
import { useSocial } from '../../contexts/SocialContext';

/**
 * SecureMediaUpload
 * 
 * Replaces SecureImageUpload to allow users to add:
 *   - Photo, Video, or Music files (via Drag/Drop or File Picker)
 *   - Text Notes
 *   - Voice Notes (recorded live using the browser microphone)
 * 
 * Includes Visibility Tiers (Private, Group, Public) and friend-selector mapping.
 */
export default function SecureImageUpload({ placeId, onUploadSuccess }) {
    const { uploadMedia, addTextNote } = usePlaces();
    const { friends } = useSocial();
    
    // Tab State: 'file' | 'note' | 'voice'
    const [uploadType, setUploadType] = useState('file');
    
    // Core file/data states
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null); // Preview DataURL
    const [noteText, setNoteText] = useState('');
    const [tier, setTier] = useState(1);
    const [sharedWith, setSharedWith] = useState([]);
    
    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        
        if (selectedFile.size > 3 * 1024 * 1024 * 1024) { // Max 3GB
            setError('File size must be less than 3GB.');
            return;
        }
        
        setFile(selectedFile);
        setError('');
        
        if (preview && typeof preview === 'string' && preview.startsWith('blob:')) {
            URL.revokeObjectURL(preview);
        }
        
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreview(objectUrl);
    };

    // Voice Recorder implementation
    const startRecording = async () => {
        setError('');
        audioChunksRef.current = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const recordedFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
                setFile(recordedFile);
                
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreview(reader.result);
                };
                reader.readAsDataURL(recordedFile);
                
                // Stop all tracks to release mic
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Mic access error:', err);
            setError('Microphone access denied or not available.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const toggleFriend = (friendId) => {
        if (tier === 1) {
            setSharedWith([friendId]);
        } else {
            setSharedWith(prev => 
                prev.includes(friendId) 
                    ? prev.filter(id => id !== friendId)
                    : [...prev, friendId]
            );
        }
    };

    const handleUpload = async () => {
        // Validation based on type
        if (uploadType === 'file' || uploadType === 'voice') {
            if (!file) {
                setError('No media file/recording selected.');
                return;
            }
        } else if (uploadType === 'note') {
            if (!noteText.trim()) {
                setError('Please type in a note.');
                return;
            }
        }

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
            if (uploadType === 'note') {
                await addTextNote(placeId, noteText, tier);
            } else {
                await uploadMedia(placeId, file, tier);
            }
            
            // Reset states on success
            setFile(null);
            setPreview(null);
            setNoteText('');
            setSharedWith([]);
            setTier(1);
            if (onUploadSuccess) onUploadSuccess();
            
        } catch (err) {
            console.error('Upload error', err);
            setError('Save failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const cancelUpload = () => {
        setFile(null);
        setPreview(null);
        setNoteText('');
        setError('');
        if (isRecording) stopRecording();
    };

    const formatDuration = (sec) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="secure-upload-container" style={{
            background: 'var(--surface)', padding: '16px', borderRadius: '12px', marginTop: '16px',
            border: '1px solid var(--border)'
        }}>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                <button 
                    className={`small-btn ${uploadType === 'file' ? 'primary' : 'secondary'}`} 
                    onClick={() => { setUploadType('file'); cancelUpload(); }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                >
                    <Upload size={14} /> File
                </button>
                <button 
                    className={`small-btn ${uploadType === 'note' ? 'primary' : 'secondary'}`} 
                    onClick={() => { setUploadType('note'); cancelUpload(); }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                >
                    <FileText size={14} /> Note
                </button>
                <button 
                    className={`small-btn ${uploadType === 'voice' ? 'primary' : 'secondary'}`} 
                    onClick={() => { setUploadType('voice'); cancelUpload(); }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                >
                    <Mic size={14} /> Voice
                </button>
            </div>
            
            {/* 1. File Upload Dropzone */}
            {uploadType === 'file' && !file && (
                <div 
                    className="upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: '2px dashed var(--border)', borderRadius: '8px', padding: '24px 16px',
                        textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
                        background: 'rgba(0,0,0,0.05)'
                    }}
                >
                    <Upload size={32} style={{ color: 'var(--muted)', marginBottom: '8px' }} />
                    <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 500 }}>Select Photo, Video, or Any File</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>E2E Encrypted • Max 3GB</p>
                </div>
            )}

            {/* 2. Text Note input */}
            {uploadType === 'note' && !file && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea 
                        placeholder="Write down details or memories about this place..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        style={{
                            width: '100%', minHeight: '100px', padding: '12px',
                            background: 'var(--input-bg)', color: 'var(--text-main)',
                            border: '1px solid var(--border)', borderRadius: '8px',
                            fontSize: '14px', outline: 'none', resize: 'vertical'
                        }}
                    />
                </div>
            )}

            {/* 3. Voice Recording panel */}
            {uploadType === 'voice' && !file && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px 8px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    {isRecording ? (
                        <>
                            <div className="recording-pulse" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', width: '50px', height: '50px', borderRadius: '50%', background: '#ff6961', color: 'white', justifyContent: 'center' }}>
                                <Mic size={24} className="pulse-animation" />
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#ff6961' }}>{formatDuration(recordingDuration)}</div>
                            <button className="primary danger" onClick={stopRecording} style={{ background: '#ff6961', borderColor: '#ff6961', color: 'white', padding: '6px 16px', fontSize: '13px' }}>
                                Stop Recording
                            </button>
                        </>
                    ) : (
                        <>
                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Mic size={24} />
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>Record a custom audio memory using your microphone</p>
                            <button className="primary" onClick={startRecording} style={{ padding: '6px 16px', fontSize: '13px' }}>
                                Start Recording
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Preview & Sharing configuration */}
            {((uploadType === 'file' || uploadType === 'voice') && file) || (uploadType === 'note' && noteText.trim()) ? (
                <div className="upload-preview" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: uploadType === 'note' ? '12px' : '0' }}>
                    {/* Media Preview Box */}
                    {file && (
                        <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                            {file.type.startsWith('image/') && (
                                <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }} />
                            )}
                            {file.type.startsWith('video/') && (
                                <video src={preview} controls style={{ width: '100%', maxHeight: '180px', background: 'black' }} />
                            )}
                            {file.type.startsWith('audio/') && (
                                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.1)' }}>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600 }}>{file.name}</p>
                                    <audio src={preview} controls style={{ width: '100%' }} />
                                </div>
                            )}
                            {!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && (
                                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <FileText size={28} style={{ color: 'var(--accent)' }} />
                                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                                    </div>
                                </div>
                            )}
                            <button 
                                className="icon-btn" 
                                onClick={cancelUpload}
                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px', borderRadius: '50%' }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    
                    {/* Security Sharing Visibility */}
                    <div className="security-tiers">
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Sharing Visibility</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                                className={`small-btn ${tier === 1 ? 'primary' : 'secondary'}`} 
                                onClick={() => { setTier(1); setSharedWith([]); }}
                                style={{ flex: 1, padding: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Lock size={12} /> Private
                            </button>
                            <button 
                                className={`small-btn ${tier === 2 ? 'primary' : 'secondary'}`} 
                                onClick={() => { setTier(2); setSharedWith([]); }}
                                style={{ flex: 1, padding: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Users size={12} /> Group
                            </button>
                            <button 
                                className={`small-btn ${tier === 3 ? 'primary' : 'secondary'}`} 
                                onClick={() => { setTier(3); setSharedWith([]); }}
                                style={{ flex: 1, padding: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Globe size={12} /> Public
                            </button>
                        </div>
                    </div>

                    {/* Friend Selection Panel */}
                    {(tier === 1 || tier === 2) && (
                        <div className="friend-selector">
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                                Select {tier === 1 ? 'Person' : 'People'}
                            </label>
                            {friends.length === 0 ? (
                                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>No friends available to share with.</p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {friends.map(f => {
                                        const isSelected = sharedWith.includes(f.id);
                                        return (
                                            <button
                                                key={f.id}
                                                className={`small-btn ${isSelected ? 'primary' : 'secondary'}`}
                                                onClick={() => toggleFriend(f.id)}
                                                style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px' }}
                                            >
                                                {f.display_name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff6961', fontSize: '0.85rem' }}>
                            <AlertCircle size={14} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {uploadType === 'note' && (
                            <button className="secondary" onClick={cancelUpload} style={{ flex: 1 }}>Clear</button>
                        )}
                        <button 
                            className="primary" 
                            onClick={handleUpload} 
                            disabled={isUploading}
                            style={{ flex: 2 }}
                        >
                            {isUploading ? 'Securing memory...' : 'Save Securely'}
                        </button>
                    </div>
                </div>
            ) : null}
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
            />
        </div>
    );
}
