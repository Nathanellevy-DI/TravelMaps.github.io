import React from 'react';
import { X, MapPin, Camera, Filter, Smartphone, Download, Upload } from 'lucide-react';

export default function HowToUseModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="custom-dialog-overlay" style={{ zIndex: 3000 }}>
            <div className="custom-dialog" style={{ maxWidth: '500px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="custom-dialog-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        How to Use TravelMaps
                    </h2>
                    <button className="icon-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="custom-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

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

                <div className="custom-dialog-footer">
                    <button className="primary" onClick={onClose} style={{ width: '100%' }}>
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
}

const sectionStyle = {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-start'
};

const iconWrapperStyle = {
    padding: '8px',
    borderRadius: '10px',
    backgroundColor: 'var(--card-hover)',
    color: '#3ea6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
};

const titleStyle = {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '600'
};

const textStyle = {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-sub)',
    lineHeight: '1.5'
};
