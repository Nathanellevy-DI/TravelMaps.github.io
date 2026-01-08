import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { usePlaces } from '../../contexts/PlacesContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Dynamically create a marker icon with the specified color
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
        iconAnchor: [15, 30], // Tip of pin is at bottom center (15px right, 30px down)
        popupAnchor: [0, -32]
    });
};

function MapEvents({ onMapClick }) {
    useMapEvents({
        click(e) {
            onMapClick(e);
        }
    });
    return null;
}

export default function MapComponent({ mapRef, onMapClick, tempMarker, theme }) {
    const { savedPlaces, activePlaceId, setActivePlaceId, creationSettings } = usePlaces();

    const handleOpenDetails = (placeId) => {
        document.dispatchEvent(new CustomEvent('openDetails', { detail: placeId }));
    };

    return (
        <div id="map" className="map">
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

                <MapEvents onMapClick={onMapClick} />

                {savedPlaces.map(place => {
                    const isShabbat = place.category === 'Shabbat Dinners' || place.category === 'Lone Soldier Shabbat Dinners';

                    return (
                        <Marker
                            key={place.id}
                            position={[place.lat, place.lon]}
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
                                            <div className="result-sub" style={{ marginTop: '4px' }}>📸 {place.memories.length} memories</div>
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

                {/* Temporary Marker (Search/Click) */}
                {tempMarker && (
                    <Marker
                        position={[tempMarker.lat, tempMarker.lon]}
                        // Use the globally selected color for the temp marker!
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
