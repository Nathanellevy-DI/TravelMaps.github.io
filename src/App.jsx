import { useState, useRef, useEffect } from 'react';
import { PlacesProvider, usePlaces } from './contexts/PlacesContext';
import TopBar from './components/UI/TopBar';
import PinControls from './components/UI/PinControls';
import Sidebar from './components/UI/Sidebar';
import MapComponent from './components/Map/MapComponent';
import PlaceDetailsModal from './components/Modals/PlaceDetailsModal';
import LoginPage from './components/Auth/LoginPage';
import { useDialog } from './hooks/useDialog.jsx';
import './index.css';



function AppContent({ user, onLogout }) {
  const { addPlace } = usePlaces();
  const { showPrompt, DialogComponent } = useDialog();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tempMarker, setTempMarker] = useState(null);

  // Unified modal state
  const [detailsModalId, setDetailsModalId] = useState(null);

  const mapRef = useRef(null);

  useEffect(() => {
    // Listen for requests to open details (from map or sidebar)
    const handleOpenDetails = (e) => setDetailsModalId(e.detail);

    // Support legacy event names if adjusted in children, or just unify dispatch events
    document.addEventListener('openDetails', handleOpenDetails);

    return () => {
      document.removeEventListener('openDetails', handleOpenDetails);
    };
  }, []);



  const handleLocationClick = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        map.flyTo([latitude, longitude], 15);
        setTempMarker({
          lat: latitude,
          lon: longitude,
          name: 'Your Location',
          formatted: `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`,
          onSave: () => {
          }
        });
      });
    } else {
      alert('Geolocation not supported');
    }
  };

  const onMapClick = (e) => {
    const { lat, lng } = e.latlng;
    setTempMarker({
      lat,
      lon: lng,
      name: 'Pinned Location',
      formatted: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      onSave: async () => {
        const name = await showPrompt('Name this place', 'My Clicked Location', 'My Clicked Location');
        if (name) {
          addPlace({
            id: 'p_' + Date.now(),
            name,
            lat: lat,
            lon: lng,
            formatted: `${name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            memories: []
          });
          setTempMarker(null);
        }
      }
    });
  };



  const handleSearchResult = (result) => {
    if (!mapRef.current) return;

    // Fly to location
    mapRef.current.flyTo([result.lat, result.lon], 15);

    // Set temporary pin
    setTempMarker({
      lat: result.lat,
      lon: result.lon,
      name: result.name || result.formatted.split(',')[0],
      formatted: result.formatted,
      onSave: async () => {
        const name = await showPrompt('Name this place', result.name || 'My Search Result', result.name || 'My Search Result');
        if (name) {
          addPlace({
            id: 'p_' + Date.now(),
            name,
            lat: result.lat,
            lon: result.lon,
            formatted: result.formatted,
            memories: []
          });
          setTempMarker(null);
        }
      }
    });
  };

  return (
    <main id="main">
      <section id="mapPage" className="page active" style={{ position: 'relative' }}>
        <TopBar
          onMenuClick={() => setIsSidebarOpen(true)}
          onLocationClick={handleLocationClick}
          map={mapRef.current}
          onSearchResult={handleSearchResult}
          user={user}
          onLogout={onLogout}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          map={mapRef.current}
          user={user}
        />

        <MapComponent
          mapRef={mapRef}
          onMapClick={onMapClick}
          tempMarker={tempMarker}
        />

        <PinControls />

        {detailsModalId && (
          <PlaceDetailsModal
            placeId={detailsModalId}
            onClose={() => setDetailsModalId(null)}
          />
        )}

        {/* Custom Dialog */}
        {DialogComponent}
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    // Load user from localStorage on initial mount
    try {
      return localStorage.getItem('travelmaps:currentUser');
    } catch {
      return null;
    }
  });

  const handleLogin = (name) => {
    const username = name || 'Traveler';
    setUser(username);
    // Persist user to localStorage
    try {
      localStorage.setItem('travelmaps:currentUser', username);
    } catch (e) {
      console.error('Failed to save user session:', e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('travelmaps:currentUser');
    } catch (e) {
      console.error('Failed to clear user session:', e);
    }
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <PlacesProvider user={user} key={user}>
      <AppContent user={user} onLogout={handleLogout} />
    </PlacesProvider>
  );
}
