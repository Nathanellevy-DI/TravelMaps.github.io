/**
 * MapComponent.jsx — Main Interactive Map
 *
 * Renders the Leaflet map with all saved place markers, temporary markers
 * (from search results or map clicks), and handles map click events.
 * Uses react-leaflet for declarative map rendering within React.
 *
 * Key features:
 *   - Custom colored SVG pin icons for each place category
 *   - Dark/light tile layer switching based on the current theme
 *   - Popup details on each marker with "View Details" or "Save Location" actions
 *   - Temporary marker for search results and clicked locations before saving
 */
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { usePlaces } from '../../contexts/PlacesContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

/**
 * Creates a Leaflet DivIcon with a custom-colored SVG map pin.
 * Each category has its own color, making pins visually distinguishable on the map.
 *
 * @param {string} color — Hex color string (e.g. '#3ea6ff') for the pin fill
 * @returns {L.DivIcon} — A Leaflet DivIcon with the colored SVG pin
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
        iconAnchor: [15, 30], // Tip of pin is at bottom center (15px right, 30px down)
        popupAnchor: [0, -32]
    });
};

/**
 * MapEvents — Invisible component that hooks into Leaflet's map events.
 * Captures click events on the map background and forwards them to the parent
 * handler (`onMapClick`) so a temporary pin can be placed.
 *
 * @param {Object} props
 * @param {Function} props.onMapClick — Callback receiving Leaflet's click event object
 */
function MapEvents({ onMapClick }) {
    useMapEvents({
        click(e) {
            onMapClick(e);
        }
    });
    return null; // This component renders nothing; it only subscribes to events
}

/**
 * MapComponent — The full-screen interactive map.
 *
 * @param {Object}   props
 * @param {Function} props.mapRef       — Ref callback to capture the Leaflet Map instance
 * @param {Function} props.onMapClick   — Handler for clicks on the map background
 * @param {Object|null} props.tempMarker — Temporary marker data (search/click) before saving
 * @param {string}   props.theme        — 'dark' or 'light'; controls which tile layer is shown
 */
export default function MapComponent({ mapRef, onMapClick, tempMarker, theme }) {
    // Pull saved places and creation settings from the global PlacesContext
    const { savedPlaces, setActivePlaceId, creationSettings } = usePlaces();

    /**
     * Dispatches a custom DOM event to open the PlaceDetailsModal for a given place.
     * This cross-component communication pattern avoids deep prop drilling.
     */
    const handleOpenDetails = (placeId) => {
        document.dispatchEvent(new CustomEvent('openDetails', { detail: placeId }));
    };

    return (
        <div id="map" className="map">
            {/* MapContainer initializes the Leaflet map instance.
                center: default view is Jerusalem (lat 31.7683, lon 35.2137)
                maxBounds: prevents scrolling beyond the world edges
                ref: passes the map instance up to the parent via mapRef callback */}
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
                {/* TileLayer provides the visual map tiles from CartoCDB.
                    The 'key' prop forces a re-mount when the theme changes,
                    swapping between the dark and light tile sets. */}
                <TileLayer
                    key={theme}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={theme === 'light'
                        ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                    }
                    maxZoom={19}
                />

                {/* MapEvents listens for click events on the map background */}
                <MapEvents onMapClick={onMapClick} />

                {/* Render a colored marker for each saved place */}
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

                {/* Temporary Marker — shown when a user searches or clicks the map.
                    Uses the currently-selected category color so the user sees
                    what the pin will look like before saving. */}
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
