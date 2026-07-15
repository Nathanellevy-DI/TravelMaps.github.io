/**
 * App.jsx — Root Application Component
 *
 * This is the main entry point for the TravelMaps UI.
 * It sets up the component hierarchy:
 *
 *   <AuthProvider>           — Provides auth state (user, login, logout)
 *     <AppRouter>            — Shows LoginPage or AuthenticatedApp based on auth state
 *       <PlacesProvider>     — Provides saved places, categories, and all place methods
 *         <AppContent>       — The actual map page with sidebar, modals, etc.
 *
 * Key responsibilities:
 *   - Theme management (dark/light) with localStorage persistence
 *   - Map click handling → temporary markers → saving places
 *   - Search result handling → fly to location → temporary marker
 *   - Geolocation (My Location button)
 *   - Coordinating modals (PlaceDetailsModal via custom DOM events)
 */

import { useState, useEffect } from 'react';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlacesProvider, usePlaces } from './contexts/PlacesContext';
import { SocialProvider } from './contexts/SocialContext';
import TopBar from './components/UI/TopBar';
import PinControls from './components/UI/PinControls';
import Sidebar from './components/UI/Sidebar';
import MapComponent from './components/Map/MapComponent';
import PlaceDetailsModal from './components/Modals/PlaceDetailsModal';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import LandingPage from './components/UI/LandingPage';
import InstallPrompt from './components/UI/InstallPrompt';
import { useDialog } from './hooks/useDialog.jsx';
import { Menu, MapPin, LogOut, Loader2 } from 'lucide-react';
import './index.css';


/**
 * AppContent — The main map page shown after authentication.
 *
 * Contains the full app UI: top bar, sidebar, map, pin controls,
 * mobile bottom navigation, and modals.
 */
function AppContent() {
  // Auth context — user info and logout function
  const { user, logout } = useAuth();
  // Places context — addPlace is used when saving a pinned location
  const { addPlace } = usePlaces();
  // Custom dialog hook — showPrompt opens a text input dialog
  const { showPrompt, DialogComponent } = useDialog();

  // ── UI State ──
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tempMarker, setTempMarker] = useState(null); // Temporary pin before saving
  const [map, setMap] = useState(null);                 // Leaflet Map instance
  const [detailsModalId, setDetailsModalId] = useState(null); // Which place's details to show

  // ── Theme (dark/light) ──
  // Persisted in localStorage; applied as a data-attribute on <html>
  const [theme, setTheme] = useState(() => localStorage.getItem('travelmaps:theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('travelmaps:theme', theme);
  }, [theme]);

  /** Toggle between dark and light themes */
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // ── Listen for "openDetails" events from map markers or sidebar ──
  // This custom DOM event pattern avoids deep prop drilling
  useEffect(() => {
    const handleOpenDetails = (e) => setDetailsModalId(e.detail);
    document.addEventListener('openDetails', handleOpenDetails);
    return () => document.removeEventListener('openDetails', handleOpenDetails);
  }, []);


  /**
   * "My Location" button handler.
   * Uses the browser's Geolocation API to fly the map to the user's current position
   * and place a temporary marker there.
   */
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
            // Geolocation pins don't auto-save — user must click "Save" on the popup
          }
        });
      });
    } else {
      alert('Geolocation not supported');
    }
  };

  /**
   * Map click handler.
   * When the user clicks anywhere on the map, a temporary marker is placed.
   * The popup on the marker has a "Save Location" button that triggers a name prompt.
   */
  const onMapClick = (e) => {
    const { lat, lng } = e.latlng;
    setTempMarker({
      lat,
      lon: lng,
      name: 'Pinned Location',
      formatted: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      onSave: async () => {
        // Ask the user to name this place
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
          setTempMarker(null); // Remove temp marker after saving
        }
      }
    });
  };


  /**
   * Search result handler.
   * Called by TopBar when a search result or autocomplete suggestion is selected.
   * Flies the map to the result and places a temporary marker with a "Save" action.
   */
  const handleSearchResult = (result) => {
    if (!map) return;

    // Fly to the search result location
    map.flyTo([result.lat, result.lon], 15);

    // Place a temporary marker at the result
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

  // Get a display-friendly name from the user object
  const displayName = typeof user === 'object' ? (user.name || user.email) : user;

  return (
    <main id="main">
      <section id="mapPage" className="page active" style={{ position: 'relative', height: '100%', width: '100%' }}>
        {/* Top bar with search, logout, and navigation buttons */}
        <TopBar
          onMenuClick={() => setIsSidebarOpen(true)}
          onLocationClick={handleLocationClick}
          map={map}
          onSearchResult={handleSearchResult}
          user={displayName}
          onLogout={logout}
        />

        {/* Slide-out sidebar with saved places list */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          map={map}
          user={user}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {/* The interactive Leaflet map */}
        <MapComponent
          mapRef={setMap}
          onMapClick={onMapClick}
          tempMarker={tempMarker}
          theme={theme}
        />

        {/* Category selection controls (floating on the map) */}
        <PinControls />

        {/* Mobile-only bottom navigation bar */}
        <div className="mobile-bottom-bar">
          <button className="mobile-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
            <span className="mobile-btn-label">Places</span>
          </button>
          <button className="mobile-btn" onClick={handleLocationClick}>
            <MapPin size={20} />
            <span className="mobile-btn-label">My Location</span>
          </button>
          <button className="mobile-btn" onClick={logout}>
            <LogOut size={20} />
            <span className="mobile-btn-label">Logout</span>
          </button>
        </div>

        {/* Place Details Modal — shown when any pin's "View Details" is clicked */}
        {detailsModalId && (
          <PlaceDetailsModal
            placeId={detailsModalId}
            onClose={() => setDetailsModalId(null)}
          />
        )}

        {/* Custom prompt/confirm dialog overlay */}
        {DialogComponent}

        {/* PWA install banner */}
        <InstallPrompt />
      </section>
    </main>
  );
}

/**
 * AuthenticatedApp — Wraps AppContent with the PlacesProvider.
 *
 * The PlacesProvider needs the user object as a prop so it can load/save
 * the correct data from IndexedDB. The `key` prop forces a full re-mount
 * when the user changes (e.g. after logout + new login).
 */
function AuthenticatedApp() {
  const { user } = useAuth();

  return (
    <SocialProvider>
      <PlacesProvider user={user} key={typeof user === 'object' ? user.id : user}>
        <AppContent />
      </PlacesProvider>
    </SocialProvider>
  );
}

/**
 * LoadingScreen — Full-screen spinner shown while checking auth status.
 * (Currently instant since auth is local, but kept for future backend support.)
 */
function LoadingScreen() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg, #0b0d10)',
      color: 'var(--accent, #3ea6ff)',
    }}>
      <Loader2 size={48} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

/**
 * App — The exported root component.
 * Wraps everything in AuthProvider so all children can access auth state.
 */
export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

/**
 * AppRouter — Decides what to render based on authentication state.
 *   - Loading → LoadingScreen spinner
 *   - Not authenticated → AuthContainer (Login/Register)
 *   - Authenticated → AuthenticatedApp (map + everything)
 */
function AppRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Check for register parameter or secret signup hash in URL
  useEffect(() => {
    const handleRouteCheck = () => {
      if (window.location.href.includes('register=true') || window.location.hash === '#/secret-signup') {
        setShowAuth(true);
        setIsRegistering(true);
      }
    };
    handleRouteCheck();
    window.addEventListener('hashchange', handleRouteCheck);
    return () => window.removeEventListener('hashchange', handleRouteCheck);
  }, []);

  // Reset showAuth when user logs out, except when loading via register/secret-signup link
  useEffect(() => {
    if (!isAuthenticated && !window.location.href.includes('register=true') && window.location.hash !== '#/secret-signup') {
      setShowAuth(false);
    }
  }, [isAuthenticated]);

  // Debug logging — can be removed in production
  console.log('App State:', { user, isAuthenticated, version: '2.0' });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    if (!showAuth) {
      return (
        <LandingPage 
          onEnterLogin={() => { setShowAuth(true); setIsRegistering(false); }} 
          onEnterRegister={() => { setShowAuth(true); setIsRegistering(true); }} 
        />
      );
    }
    return isRegistering ? (
      <RegisterPage onSwitchToLogin={() => setIsRegistering(false)} onBackToLanding={() => setShowAuth(false)} />
    ) : (
      <LoginPage onSwitchToRegister={() => setIsRegistering(true)} onBackToLanding={() => setShowAuth(false)} />
    );
  }

  return <AuthenticatedApp />;
}
