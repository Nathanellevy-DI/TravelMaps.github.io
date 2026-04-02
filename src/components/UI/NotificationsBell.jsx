import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useSocial } from '../../contexts/SocialContext';

export default function NotificationsBell() {
    const { notifications, markNotificationRead } = useSocial();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => setIsOpen(!isOpen);

    const handleRead = (id) => {
        markNotificationRead(id);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button className="icon-btn" onClick={handleToggle} aria-label="Notifications" style={{ position: 'relative' }}>
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        background: '#ff6b6b',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--bg)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '300px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    padding: '12px'
                }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                        Notifications
                    </h4>
                    
                    {notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', padding: '20px 0' }}>
                            No notifications yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {notifications.map(n => (
                                <div key={n.id} onClick={() => handleRead(n.id)} style={{
                                    padding: '10px',
                                    borderRadius: '8px',
                                    background: n.is_read ? 'transparent' : 'var(--input-bg)',
                                    cursor: 'pointer',
                                    border: n.is_read ? '1px solid transparent' : '1px solid var(--accent)',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                                        <span style={{ fontWeight: 600 }}>{n.actor?.display_name || 'Someone'}</span> {n.message}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                        {new Date(n.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
