/**
 * HowToUseModal.jsx — Help / Onboarding Modal
 *
 * A modal dialog that explains how to use TravelMaps, shown from the
 * login page's "How to Use" button. Covers:
 *   - Saving places via search
 *   - Adding memories (notes and photos)
 *   - Organizing with categories and filters
 *   - Installing as a PWA on mobile
 *   - Backup and restore functionality
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen  — Whether the modal is visible
 * @param {Function} props.onClose — Callback to close the modal
 */
import React from 'react';
import { X, MapPin, Camera, Filter, Smartphone, Download } from 'lucide-react';

export default function HowToUseModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '500px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>How to Use TravelMaps</h2>
                    <button className="icon-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '24px', gap: '24px' }}>
                    
                    <section style={sectionStyle}>
                        <div style={iconWrapperStyle}><MapPin size={20} /></div>
                        <div>
                            <h4 style={titleStyle}>Saving Places</h4>
                            <p style={textStyle}>Search for a location using the search bar at the top. Once found, click the "Save" button to add it to your travel journal.</p>
                        </div>
                    </section>

                    <section style={sectionStyle}>
                        <div style={iconWrapperStyle}><Camera size={20} /></div>
                        <div>
                            <h4 style={titleStyle}>Adding Memories</h4>
                            <p style={textStyle}>Click on any saved pin or find it in the sidebar. You can add notes and photos to capture your experiences at that location.</p>
                        </div>
                    </section>

                    <section style={sectionStyle}>
                        <div style={iconWrapperStyle}><Filter size={20} /></div>
                        <div>
                            <h4 style={titleStyle}>Categories & Filters</h4>
                            <p style={textStyle}>Organize your places into categories (Restaurants, Attractions, etc.). Use the filter in the sidebar to quickly find specific types of places.</p>
                        </div>
                    </section>

                    <section style={sectionStyle}>
                        <div style={iconWrapperStyle}><Smartphone size={20} /></div>
                        <div>
                            <h4 style={titleStyle}>Install as App</h4>
                            <p style={textStyle}>On mobile, use the "Add to Home Screen" prompt or the Share menu (iOS) / Menu (Android) to install TravelMaps as a standalone app.</p>
                        </div>
                    </section>

                    <section style={sectionStyle}>
                        <div style={iconWrapperStyle}><Download size={20} /></div>
                        <div>
                            <h4 style={titleStyle}>Backup & Restore</h4>
                            <p style={textStyle}>Use the Backup button in the sidebar footer to download a ZIP of all your data and photos. Use Restore to bring your data back if you ever clear it.</p>
                        </div>
                    </section>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                    <button className="primary-btn" onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: '12px' }}>
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
}

const sectionStyle = {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
};

const iconWrapperStyle = {
    padding: '10px',
    borderRadius: '12px',
    backgroundColor: 'rgba(92, 118, 109, 0.1)', // Muted green with opacity
    color: 'var(--accent)', // Accent color (camel/green depending on theme context)
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid rgba(92, 118, 109, 0.2)'
};

const titleStyle = {
    margin: '0 0 6px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-main)'
};

const textStyle = {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-sub)',
    lineHeight: '1.6'
};
