/**
 * ImageLightbox.jsx — Full-Screen Image Viewer
 *
 * Renders a full-screen overlay for viewing memory photos at full resolution.
 * Features:
 *   - Zoom in/out controls (0.5x to 3x in 0.25 steps)
 *   - Percentage zoom label
 *   - Click overlay to close, or use the X button
 *   - Image content is non-clickable to prevent accidental close
 *
 * @param {Object}   props
 * @param {string}   props.imageUrl — Base64 data URI or URL of the image
 * @param {Function} props.onClose  — Callback to close the lightbox
 */
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

export default function ImageLightbox({ imageUrl, onClose }) {
    const [zoom, setZoom] = useState(1);

    if (!imageUrl) return null;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

    return (
        <div className="lightbox-overlay" onClick={onClose}>
            <div className="lightbox-controls">
                <button className="lightbox-btn" onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}>
                    <ZoomOut size={20} />
                </button>
                <span className="lightbox-zoom-label">{Math.round(zoom * 100)}%</span>
                <button className="lightbox-btn" onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}>
                    <ZoomIn size={20} />
                </button>
                <button className="lightbox-btn lightbox-close" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                <img
                    src={imageUrl}
                    alt="Full size"
                    className="lightbox-image"
                    style={{ transform: `scale(${zoom})` }}
                />
            </div>
        </div>
    );
}
