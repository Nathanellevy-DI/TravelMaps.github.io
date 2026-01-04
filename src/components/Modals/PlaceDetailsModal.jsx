import { useState } from 'react';
import { X, Lock, Clock, FileText, MapPin, Upload } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';
import ImageLightbox from '../UI/ImageLightbox';
import { useDialog } from '../../hooks/useDialog.jsx';

export default function PlaceDetailsModal({ placeId, onClose }) {
    const { getPlace, submitRequest, approvePlace, addMemory, removeMemory } = usePlaces();
    const place = getPlace(placeId);
    const { showPrompt, DialogComponent } = useDialog();

    const [viewState, setViewState] = useState('details'); // 'details' | 'apply'
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', socialHandle: '',
        militaryId: '', hasAllergies: false, allergies: ''
    });

    // Memory upload state
    const [noteText, setNoteText] = useState('');
    const [uploadFile, setUploadFile] = useState(null);

    // Lightbox state
    const [lightboxImage, setLightboxImage] = useState(null);

    if (!place) return null;

    const isRestricted = place.approvalStatus === 'none';
    const isPending = place.approvalStatus === 'pending';
    const isApproved = place.approvalStatus === 'approved';
    const isLoneSoldier = place.category === 'Lone Soldier Shabbat Dinners';

    const handleApply = (e) => {
        e.preventDefault();
        const request = {
            id: 'req_' + Date.now(),
            date: new Date().toISOString(),
            ...formData
        };
        submitRequest(placeId, request);
        setViewState('details'); // Return to details view which will now be 'pending'
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const handleAddMemory = async (e) => {
        e.preventDefault();
        if (!noteText && !uploadFile) return;

        let content = noteText;
        let type = 'note';

        if (uploadFile) {
            type = uploadFile.type.startsWith('image') ? 'image' : 'file';
            try {
                content = await fileToBase64(uploadFile);
            } catch (err) {
                console.error('File conversion failed', err);
                return;
            }
        }

        const newMemory = {
            id: Date.now(),
            type: type,
            content: content,
            text: noteText,
            fileName: uploadFile ? uploadFile.name : null,
            date: new Date().toLocaleDateString()
        };

        addMemory(placeId, newMemory);
        setNoteText('');
        setUploadFile(null);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
            <div className="modal-content" style={{ maxWidth: '700px', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px' }}>{place.name}</h2>
                        <span className="badge" style={{ backgroundColor: place.color, color: '#fff', marginTop: '8px' }}>
                            {place.category}
                        </span>
                    </div>
                    <button className="icon-btn" onClick={onClose}><X size={24} /></button>
                </div>

                {/* Content Body */}
                <div className="modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Restricted / Pending Views logic remains the same */}
                    {!isApproved && (
                        // ... (Restricted/Pending view JSX)
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                            {viewState === 'apply' ? (
                                <form onSubmit={handleApply} className="rsvp-form" style={{ width: '100%', maxWidth: '400px', textAlign: 'left' }}>
                                    <h3>📝 Request Access</h3>
                                    <div className="form-row">
                                        <input required placeholder="First Name" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                                        <input required placeholder="Last Name" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                                    </div>
                                    <input required placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    <input required placeholder="Social Handle" value={formData.socialHandle} onChange={e => setFormData({ ...formData, socialHandle: e.target.value })} />

                                    {isLoneSoldier && (
                                        <input required placeholder="Military ID (Required)" value={formData.militaryId} onChange={e => setFormData({ ...formData, militaryId: e.target.value })} />
                                    )}

                                    <label style={{ marginTop: '10px', display: 'block' }}>
                                        Allergies?
                                        <span style={{ marginLeft: '10px' }}>
                                            <label><input type="radio" name="al" onChange={() => setFormData({ ...formData, hasAllergies: true })} /> Yes</label>
                                            <label style={{ marginLeft: '10px' }}><input type="radio" name="al" onChange={() => setFormData({ ...formData, hasAllergies: false })} /> No</label>
                                        </span>
                                    </label>
                                    {formData.hasAllergies && (
                                        <textarea placeholder="List allergies..." value={formData.allergies} onChange={e => setFormData({ ...formData, allergies: e.target.value })} />
                                    )}

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                        <button type="button" className="secondary" onClick={() => setViewState('details')}>Cancel</button>
                                        <button type="submit" className="primary">Submit Application</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    {isPending ? (
                                        <>
                                            <Clock size={48} color="#f1c40f" />
                                            <h3 style={{ color: '#f1c40f' }}>Application Pending</h3>
                                            <p>Your request to join is waiting for approval.</p>
                                            <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '20px' }}>
                                                (Demo: Click below to simulate host approval)
                                            </div>
                                            <button className="primary" style={{ marginTop: '10px', background: '#2ecc71' }} onClick={() => approvePlace(placeId)}>
                                                Simulate Admin Approval
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={48} color="#e74c3c" />
                                            <h3 style={{ color: '#e74c3c' }}>Restricted Access</h3>
                                            <p>This is a private event. You must apply to view full details (address, photos) and join.</p>
                                            <button className="primary" style={{ marginTop: '20px' }} onClick={() => setViewState('apply')}>
                                                Request to Join
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Approved View - Full Details */}
                    {isApproved && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <MapPin size={20} color="#3ea6ff" />
                                <span>{place.formatted || 'No address details available.'}</span>
                            </div>

                            {/* Memories Grid */}
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <h4 style={{ marginBottom: '12px' }}>📸 Photos & Memories</h4>
                                {place.memories.length === 0 ? (
                                    <div className="empty-state">No memories added yet.</div>
                                ) : (
                                    <div className="memories-grid">
                                        {place.memories.map(mem => (
                                            <div key={mem.id} className={`memory-card ${mem.type === 'note' ? 'pure-note' : ''}`}>
                                                <div className="memory-date">{mem.date}</div>
                                                <button className="delete-mem-btn" onClick={(e) => { e.stopPropagation(); removeMemory(placeId, mem.id); }}>
                                                    <X size={14} />
                                                </button>

                                                {mem.type === 'image' && (
                                                    <img
                                                        src={mem.content}
                                                        alt="Memory"
                                                        onClick={() => setLightboxImage(mem.content)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                )}

                                                {mem.type === 'file' && (
                                                    <div className="file-preview">
                                                        <FileText size={32} />
                                                        <span>{mem.fileName || 'Document'}</span>
                                                    </div>
                                                )}

                                                {mem.text && (
                                                    <div className="memory-text-content">
                                                        {mem.text}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add Memory Form */}
                            <form onSubmit={handleAddMemory} className="add-memory-form" style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                                <h4 style={{ marginBottom: '10px' }}>Add New Memory</h4>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Write a note..."
                                        value={noteText}
                                        onChange={e => setNoteText(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <label className="icon-btn" style={{ cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <Upload size={18} />
                                        <input type="file" hidden onChange={e => setUploadFile(e.target.files[0])} accept="image/*,.pdf,.doc" />
                                    </label>
                                    <button type="submit" className="primary" disabled={!noteText && !uploadFile}>
                                        Add
                                    </button>
                                </div>
                                {uploadFile && <div className="file-indicator">Selected: {uploadFile.name}</div>}
                            </form>
                        </>
                    )}

                </div>
            </div>

            {/* Lightbox */}
            {lightboxImage && (
                <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
            )}

            {/* Custom Dialog */}
            {DialogComponent}
        </div>
    );
}
