import { useState, useRef, useEffect } from 'react';
import { PlacesProvider, usePlaces } from './contexts/PlacesContext';
import TopBar from './components/UI/TopBar';
import PinControls from './components/UI/PinControls';
import Sidebar from './components/UI/Sidebar';
import MapComponent from './components/Map/MapComponent';
import PlaceDetailsModal from './components/Modals/PlaceDetailsModal';
import LoginPage from './components/Auth/LoginPage';
import { useDialog } from './hooks/useDialog.jsx';
import { Menu, MapPin, LogOut } from 'lucide-react';
import './index.css';



function AppContent({ user, onLogout }) {
  const { addPlace } = usePlaces();
  const { showPrompt, DialogComponent } = useDialog();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tempMarker, setTempMarker] = useState(null);
  const [map, setMap] = useState(null);
  const [detailsModalId, setDetailsModalId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('travelmaps:theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('travelmaps:theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

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
    if (!map) return;

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
    if (!map) return;

    // Fly to location
    map.flyTo([result.lat, result.lon], 15);

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
      <section id="mapPage" className="page active" style={{ position: 'relative', height: '100%', width: '100%' }}>
        <TopBar
          onMenuClick={() => setIsSidebarOpen(true)}
          onLocationClick={handleLocationClick}
          map={map}
          onSearchResult={handleSearchResult}
          user={user}
          onLogout={onLogout}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          map={map}
          user={user}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <MapComponent
          mapRef={setMap}
          onMapClick={onMapClick}
          tempMarker={tempMarker}
          theme={theme}
        />

        <PinControls />

        {/* Mobile Bottom Navigation */}
        <div className="mobile-bottom-bar">
          <button className="mobile-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
            <span className="mobile-btn-label">Places</span>
          </button>
          <button className="mobile-btn" onClick={handleLocationClick}>
            <MapPin size={20} />
            <span className="mobile-btn-label">My Location</span>
          </button>
          <button className="mobile-btn" onClick={onLogout}>
            <LogOut size={20} />
            <span className="mobile-btn-label">Logout</span>
          </button>
        </div>

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
      console.error('Logout error:', e);
    }
  };

  console.log('App State:', { user, version: '1.2' });

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <PlacesProvider user={user} key={user}>
      <AppContent user={user} onLogout={handleLogout} />
    </PlacesProvider>
  );
}
