import React from 'react';
import { X, ShieldAlert, Key, EyeOff, Lock } from 'lucide-react';

export default function PrivacyPolicyModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div 
                style={{
                    backgroundColor: '#F5F2EB',
                    color: '#1E2229',
                    maxWidth: '650px',
                    width: '100%',
                    maxHeight: '80vh',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div 
                    style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid rgba(30, 34, 41, 0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={18} style={{ color: '#4F635A' }} />
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                            Privacy Policy
                        </h2>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: 'rgba(30, 34, 41, 0.5)'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div 
                    style={{
                        padding: '24px',
                        overflowY: 'auto',
                        lineHeight: '1.6',
                        fontSize: '14px',
                        color: 'rgba(30, 34, 41, 0.8)'
                    }}
                >
                    <p style={{ marginTop: 0 }}>
                        At <strong>TravelMaps</strong>, privacy is not a feature — it is our core foundation. We believe your travel memories, photos, videos, and coordinates belong entirely to you.
                    </p>

                    <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#1E2229', marginTop: '20px', marginBottom: '8px' }}>
                        1. Local-First Storage
                    </h3>
                    <p style={{ marginTop: 0 }}>
                        The vast majority of your data (coordinates, names, notes, custom category colors, photos, videos, audio tracks, and voice notes) is saved directly on your own device using local browser storage (IndexedDB). This ensures your travel log remains private, secure, and completely under your control.
                    </p>

                    <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#1E2229', marginTop: '20px', marginBottom: '8px' }}>
                        2. Account Information
                    </h3>
                    <p style={{ marginTop: 0 }}>
                        We collect your email address and an encrypted hash of your password when you register. This is stored securely in our private database and is used solely for user authentication, password resets, and account identification. We do not track your location or build user profiles.
                    </p>

                    <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#1E2229', marginTop: '20px', marginBottom: '8px' }}>
                        3. Selective Sharing & RLS
                    </h3>
                    <p style={{ marginTop: 0 }}>
                        By default, every single place pin and memory you record is strictly private. Sharing is completely optional. If you choose to share a pin with a friend, or set its visibility to public, our database utilizes secure Row Level Security (RLS) policies to ensure that only authorized accounts can request or view those specific shared memories.
                    </p>

                    <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#1E2229', marginTop: '20px', marginBottom: '8px' }}>
                        4. Waitlist Sign-up
                    </h3>
                    <p style={{ marginTop: 0 }}>
                        If you submit your email address to join the Waitlist, we collect it strictly to verify invites. Your email is stored securely, and we will never send spam, market products, or distribute your email address to third parties. If you would like to be removed from the waitlist, please email us directly.
                    </p>

                    <h3 style={{ fontSize: '15px', fontWeight: 750, color: '#1E2229', marginTop: '20px', marginBottom: '8px' }}>
                        5. Support
                    </h3>
                    <p style={{ marginTop: 0, marginBottom: 0 }}>
                        If you have any questions or want to request a full wipe of your data from our authentication database, please contact us at: <a href="mailto:travelmaps@inbox.ru" style={{ color: '#4F635A', fontWeight: 700, textDecoration: 'none' }}>travelmaps@inbox.ru</a>.
                    </p>
                </div>

                {/* Footer */}
                <div 
                    style={{
                        padding: '16px 24px',
                        borderTop: '1px solid rgba(30, 34, 41, 0.08)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        backgroundColor: '#FAF8F5'
                    }}
                >
                    <button 
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            background: '#4F635A',
                            color: '#F5F2EB',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
