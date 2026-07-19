/**
 * MapComponent.jsx — Main Interactive Map
 *
 * Renders the Leaflet map with all visible place markers (own, shared, and public discovery),
 * temporary markers, and handles viewport-based proximity discovery.
 */
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { usePlaces } from '../../contexts/PlacesContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

/**
 * Creates a Leaflet DivIcon with a custom-colored SVG map pin.
 */
const createCustomIcon = (color) => {
    const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
        </svg>
    `;

    return L.divIcon({
        className: 'custom-map-icon',
        html: `<div style="width:30px;height:30px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.4))">${svgString}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -32]
    });
};

/**
 * MapEvents — Invisible component that hooks into Leaflet's map events.
 */
function MapEvents({ onMapClick, onViewportChange }) {
    const map = useMapEvents({
        click(e) {
            onMapClick(e);
        },
        moveend() {
            const center = map.getCenter();
            onViewportChange(center.lat, center.lng);
        },
        locationfound(e) {
            map.setView(e.latlng, 13);
            onViewportChange(e.latlng.lat, e.latlng.lng);
        },
        locationerror(e) {
            console.warn('Geolocation failed or denied:', e.message);
        }
    });

    useEffect(() => {
        map.locate({ setView: true, maxZoom: 13 });
    }, [map]);

    return null;
}

export default function MapComponent({ mapRef, onMapClick, tempMarker, theme }) {
    const { savedPlaces, visiblePlaces, fetchVisiblePlaces, setActivePlaceId, creationSettings } = usePlaces();
    
    // Viewport and discovery radius states
    const [center, setCenter] = useState(null);
    const [radius, setRadius] = useState(25); // default 25km radius

    // Keep track of the active places to display
    const placesToRender = visiblePlaces.length > 0 ? visiblePlaces : savedPlaces;

    // Load visible places when center or radius changes
    useEffect(() => {
        if (!center) return;
        const isEverywhere = radius === 'Everywhere';
        fetchVisiblePlaces(
            isEverywhere ? null : center.lat,
            isEverywhere ? null : center.lng,
            isEverywhere ? 99999 : radius
        );
    }, [center, radius]);

    const handleOpenDetails = (placeId) => {
        document.dispatchEvent(new CustomEvent('openDetails', { detail: placeId }));
    };

    const onViewportChange = (lat, lng) => {
        setCenter({ lat, lng });
    };

    const radiusOptions = [
        { label: '5 km', value: 5 },
        { label: '25 km', value: 25 },
        { label: '100 km', value: 100 },
        { label: 'Everywhere', value: 'Everywhere' }
    ];

    return (
        <div id="map" className="map" style={{ position: 'relative', height: '100%', width: '100%' }}>
            {/* Discovery Radius Controller (Absolute overlay) */}
            <div className="radius-control-bar" style={{
                position: 'absolute',
                top: '12px',
                left: '50px',
                zIndex: 1000,
                display: 'flex',
                gap: '6px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                padding: '5px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {radiusOptions.map(opt => {
                    const isActive = radius === opt.value;
                    return (
                        <button
                            key={opt.label}
                            onClick={() => setRadius(opt.value)}
                            style={{
                                border: 'none',
                                background: isActive ? 'var(--accent, #3ea6ff)' : 'transparent',
                                color: isActive ? '#ffffff' : '#94a3b8',
                                fontSize: '12px',
                                fontWeight: 600,
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>

            <MapContainer
                center={[31.7683, 35.2137]}
                zoom={13}
                minZoom={3}
                maxZoom={19}
                maxBounds={[[-90, -180], [90, 180]]}
                maxBoundsViscosity={1.0}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
                zoomControl={false}
            >
                <TileLayer
                    key={theme}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={theme === 'light'
                        ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                    }
                    maxZoom={19}
                />

                <MapEvents onMapClick={onMapClick} onViewportChange={onViewportChange} />

                {placesToRender.map(place => {
                    const isShabbat = place.category === 'Shabbat Dinners' || place.category === 'Lone Soldier Shabbat Dinners';
                    
                    // Render markers at fuzzed display coordinates for other users' public pins
                    const markerLat = place.isShared ? (place.display_lat || place.lat) : place.lat;
                    const markerLon = place.isShared ? (place.display_lon || place.lon) : place.lon;

                    return (
                        <Marker
                            key={place.id}
                            position={[markerLat, markerLon]}
                            icon={createCustomIcon(place.color || '#3ea6ff')}
                            eventHandlers={{
                                click: () => setActivePlaceId(place.id)
                            }}
                        >
                            <Popup className="marker-popup">
                                <div>
                                    <strong>{place.name}</strong>
                                    <div className="result-sub">{place.category || 'Place'}</div>
                                    <div className="result-sub">{place.formatted}</div>
                                    {place.isShared && (
                                        <div className="result-sub" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                                            Shared by {place.sharedBy?.username || 'Friend'}
                                        </div>
                                    )}

                                    {isShabbat ? (
                                        <button
                                            className="primary"
                                            style={{ marginTop: '8px', width: '100%', backgroundColor: '#8e44ad' }}
                                            onClick={() => handleOpenDetails(place.id)}
                                        >
                                            {place.approvalStatus === 'approved' ? 'View Details' : '🕯️ Details & Apply'}
                                        </button>
                                    ) : (
                                        <>
                                            <div className="result-sub" style={{ marginTop: '4px' }}>📸 {(place.media || place.memories || []).length} memories</div>
                                            <button
                                                className="primary"
                                                style={{ marginTop: '8px', width: '100%' }}
                                                onClick={() => handleOpenDetails(place.id)}
                                            >
                                                View Details
                                            </button>
                                        </>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {tempMarker && (
                    <Marker
                        position={[tempMarker.lat, tempMarker.lon]}
                        icon={createCustomIcon(creationSettings.color)}
                    >
                        <Popup offset={[0, -10]}>
                            <div>
                                <strong>{tempMarker.name || 'Pinned Location'}</strong>
                                <div className="result-sub">{tempMarker.formatted}</div>
                                <button
                                    className="primary"
                                    style={{ marginTop: '8px', width: '100%' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.nativeEvent.stopPropagation();
                                        tempMarker.onSave();
                                    }}
                                >
                                    Save Location
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
