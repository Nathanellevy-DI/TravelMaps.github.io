# TravelMaps Sharing & Social Feature Development Guide

This document contains all technical details, schemas, flows, and current implementations to help you build or refine the sharing and social features of TravelMaps.

---

## 🛠️ Backend Stack & Tech Overview
* **Frontend:** React.js, compiled using Vite. Map visualization is handled using **Leaflet** (`react-leaflet` or vanilla Leaflet integration).
* **Backend:** Node.js + Express API (`server.js`).
* **Database:** **PostgreSQL** hosted on **Supabase** (managed via the `pg` pool in Node).
* **File Storage:** Supabase Storage (for media/notes encryption pipeline).

---

## 💾 Database Schema (PostgreSQL)

Here are the actual database tables that govern users, pins (places), and friendships:

### 1. Users Table
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,          -- User's UUID string
    display_name TEXT,            -- User's chosen name
    email TEXT UNIQUE NOT NULL,   -- User's email
    password TEXT NOT NULL,       -- Hashed password (sometimes referred to as password_hash)
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Places (Pins) Table
```sql
CREATE TABLE places (
    id TEXT PRIMARY KEY,                   -- Pin ID (starts with "p_" + timestamp on frontend)
    user_id TEXT REFERENCES users(id),     -- Owner user UUID
    lat REAL NOT NULL,                     -- Latitude
    lon REAL NOT NULL,                     -- Longitude
    name TEXT NOT NULL,                    -- Name of the location
    formatted TEXT,                        -- Formatted address/coordinates
    category TEXT,                         -- E.g., 'Restaurants', 'Attractions'
    color TEXT,                            -- Hex color code for the marker
    visibility TEXT DEFAULT 'private',     -- 'private', 'friends', 'public', or a specific friend's UUID
    notes TEXT,                            -- Inline notes attached to pin (new)
    youtube_url TEXT,                      -- Attached YouTube URL (new)
    collaborative BOOLEAN DEFAULT false,    -- Toggle allowing shared users to add memories/notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Friends Table
```sql
CREATE TABLE friends (
    id TEXT PRIMARY KEY,
    user_id_1 TEXT REFERENCES users(id),   -- User ID (lower alphabetical value)
    user_id_2 TEXT REFERENCES users(id),   -- User ID (higher alphabetical value)
    status TEXT DEFAULT 'pending',         -- 'pending', 'accepted', 'rejected'
    action_user_id TEXT REFERENCES users(id), -- User who initiated the request
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id_1, user_id_2)
);
```

---

## 🗺️ Pin Creation & Map Visualisation Flow

### 1. Location Capture (Vite Frontend - `src/App.jsx`)
Pins are captured in three ways on the interactive map:
* **Map Click:** Clicking on the map triggers `onMapClick` which drops a temporary marker, prompts the user to name the location via a custom modal dialog, and calls `addPlace()`.
* **Address Search:** Top bar search uses an autocomplete lookup. Choosing a location flies the map to those coordinates, drops a temporary marker, prompts for a name, and calls `addPlace()`.
* **GPS (My Location):** The "My Location" GPS button fetches browser coordinates, centers the map, and places a temporary marker.

### 2. Map Rendering
* The app uses **Leaflet** inside `src/components/Map/MapComponent.jsx` to render custom map tiles, clusters, and custom SVG markers colored according to the pin's `color` property.

### 3. Backend Sync (`src/contexts/PlacesContext.jsx`)
* When `addPlace()` is called, it optimistic-saves to local `IndexedDB` (for offline cache support) and then sends a `POST /api/places` request to the backend.
* If a pin was created offline (or if the initial POST failed), the context uses `ensurePlaceOnBackend(placeId)` to auto-sync the pin before updating visibility, editing notes, or uploading media.

---

## 🤝 Friends & Social API Functions

These are the exact signatures and routes defined in `src/contexts/SocialContext.jsx` and the backend `server.js`:

### 1. Send Friend Request
* **Endpoint:** `POST /api/friends/request`
* **JSON Payload:** `{ targetEmailOrName: "email_or_username" }`
* **Frontend Function:**
```javascript
const sendFriendRequest = async (emailOrName) => {
    const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetEmailOrName: emailOrName.trim() })
    });
    return await response.json();
};
```

### 2. Accept / Decline Friend Request
* **Endpoint:** `POST /api/friends/respond`
* **JSON Payload:** `{ friendshipId: "uuid", accept: true/false }`
* **Frontend Function:**
```javascript
const respondToRequest = async (friendshipId, accept) => {
    const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friendshipId, accept })
    });
    return await response.json();
};
```

### 3. List Friends & Pending Requests
* **Endpoint:** `GET /api/friends`
* **Returns:** `{ friends: [...], pendingRequests: [...] }`

---

## 💡 Product & Design Decisions (To Align On)

Here are the structural decisions and options to consider for the sharing functionality:

1. **Can a non-friend ever be added to "specific people" sharing, or only friends?**
   * *Current Status:* Currently, the UI (`ShareModal.jsx`) pulls list of friends from `SocialContext` to populate targeted sharing.
   * *Recommendation:* Keep targeted sharing restricted to friends first to avoid spam/security concerns, unless an invite email flow is explicitly planned for non-registered users.

2. **Should group membership require the members' consent, or can you just add friends to a group silently?**
   * *Current Status:* Group membership logic is not yet fully implemented.
   * *Recommendation:* Silent adding is simpler to build initially, but standard UX recommends sending a "group invite notification" that must be accepted.

3. **For public pins — do you want the exact pin location shown, or an approximate/fuzzed location for privacy?**
   * *Current Status:* Currently, exact coordinates are stored and displayed on the map regardless of visibility setting.
   * *Recommendation:* For true user privacy, public pins can have their coordinates slightly fuzzed on the client side (e.g. rounded to 2 or 3 decimal places) when rendered for other users.
