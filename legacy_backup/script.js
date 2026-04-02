    // script.js
    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('loginForm');
        const loginPage = document.getElementById('loginPage');
        const mapPage = document.getElementById('mapPage');
        const searchInput = document.getElementById('search');
        const searchButton = document.getElementById('searchButton');
        const suggestionsBox = document.getElementById('suggestions');
        const savedList = document.getElementById('savedList');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const closeSidebar = document.getElementById('closeSidebar');
        const locationBtn = document.getElementById('locationBtn');
        
        const exportBtn = document.getElementById('exportBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');
        const exportBtnSidebar = document.getElementById('exportBtnSidebar');
        const clearAllBtnSidebar = document.getElementById('clearAllBtnSidebar');

        const GEOAPIFY_KEY = '8dce2a1641ca4c0bac83f3feafc51bbf'; 

        let map;
        let savedPlaces = loadSavedPlaces();
        const savedMarkers = {};
        let searchDebounceTimer;

        /* --- LOGIN --- */
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            if (username === 'test123' && password === 'password') {
                loginPage.classList.remove('active');
                mapPage.classList.add('active');
                setTimeout(initializeMap, 100); 
                renderSavedList();
            } else {
                alert('Invalid username or password. Please try again.');
            }
        });
        

        /* --- SIDEBAR AND BUTTONS --- */
        sidebarToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
        
        closeSidebar.addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
        });

        function handleExport() {
            const blob = new Blob([JSON.stringify(savedPlaces, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; 
            a.download = 'saved_places.json'; 
            a.click(); 
            URL.revokeObjectURL(url);
        }

        function handleClearAll() {
            if (confirm('Clear all saved places? This cannot be undone.')) {
                savedPlaces = []; 
                savePlaces(); 
                clearSavedMarkers(); 
                renderSavedList();
            }
        }

        if (exportBtn) exportBtn.addEventListener('click', handleExport);
        if (clearAllBtn) clearAllBtn.addEventListener('click', handleClearAll);
        if (exportBtnSidebar) exportBtnSidebar.addEventListener('click', handleExport);
        if (clearAllBtnSidebar) clearAllBtnSidebar.addEventListener('click', handleClearAll);

        if (locationBtn) {
            locationBtn.addEventListener('click', () => {
                if (!map) {
                    alert('Please wait for the map to load.');
                    return;
                }
                
                if ('geolocation' in navigator) {
                    locationBtn.disabled = true;
                    locationBtn.textContent = '⏳';
                    
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const lat = position.coords.latitude;
                            const lon = position.coords.longitude;
                            map.setView([lat, lon], 15);
                            
                            const marker = L.marker([lat, lon]).addTo(map);
                            marker._isTemporary = true;
                            marker.bindPopup(`<strong>Your Location</strong><br>Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`).openPopup();
                            
                            locationBtn.disabled = false;
                            locationBtn.textContent = '📍';
                        },
                        (error) => {
                            alert('Unable to get your location. Please check permissions.');
                            console.error('Geolocation error:', error);
                            locationBtn.disabled = false;
                            locationBtn.textContent = '📍';
                        }
                    );
                } else {
                    alert('Geolocation is not supported by your browser.');
                }
            });
        }

        /* --- MAP INITIALIZATION --- */
        function initializeMap() {
            if (map) return;
            
            map = L.map('map').setView([31.7683, 35.2137], 13);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', { 
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);
            
            savedPlaces.forEach(p => addSavedMarker(p));

            searchInput.addEventListener('input', () => {
                clearTimeout(searchDebounceTimer);
                const q = searchInput.value.trim();
                
                if (!q) {
                    hideSuggestions();
                    return;
                }
                
                searchDebounceTimer = setTimeout(() => fetchAutocomplete(q), 300);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    hideSuggestions();
                    searchInput.blur();
                }
                
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const q = searchInput.value.trim();
                    if (q) {
                        searchLocation(q);
                        hideSuggestions();
                    }
                }
            });

            searchButton.addEventListener('click', (e) => {
                e.preventDefault();
                const q = searchInput.value.trim();
                if (q) {
                    searchLocation(q);
                    hideSuggestions();
                } else {
                    searchInput.focus();
                    searchInput.placeholder = 'Enter a location to search...';
                    setTimeout(() => {
                        searchInput.placeholder = 'Search places...';
                    }, 1500);
                }
            });

            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                const m = L.marker([lat, lng]).addTo(map);
                m._isTemporary = true;
                
                m.bindPopup(`
                    Pinned: ${lat.toFixed(5)}, ${lng.toFixed(5)}
                    <br>
                    <button class="primary" id="save-temp" style="margin-top:8px">
                        Save This Location
                    </button>
                `).openPopup();
                
                setTimeout(() => {
                    const btn = document.getElementById('save-temp');
                    if (btn) btn.onclick = () => {
                        const name = prompt('Name this place:', 'My Clicked Location');
                        if (name) {
                            const place = { 
                                id: 'p_' + Date.now(), 
                                name, 
                                lat, 
                                lon: lng, 
                                formatted: `${name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                                memories: []
                            };
                            
                            const isDuplicate = savedPlaces.some(sp => 
                                Math.abs(sp.lat - place.lat) < 0.0001 && 
                                Math.abs(sp.lon - place.lon) < 0.0001
                            );
                            
                            if (!isDuplicate) {
                                savedPlaces.unshift(place); 
                                savePlaces(); 
                                addSavedMarker(place); 
                                renderSavedList(); 
                                alert('Location saved!');
                                map.removeLayer(m);
                            } else {
                                alert('This location is already saved.');
                                m.closePopup();
                            }
                        }
                    };
                }, 50);
            });
        }
        
        document.addEventListener('click', (e) => {
            if (!map) return;
            
            const isSearchClick = searchInput.contains(e.target) || 
                                suggestionsBox.contains(e.target) || 
                                searchButton.contains(e.target);
            
            if (!isSearchClick) {
                hideSuggestions();
            }
        });

        /* --- SEARCH & AUTOCOMPLETE --- */
        async function fetchAutocomplete(q) {
            try {
                const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&limit=5&format=json&apiKey=${GEOAPIFY_KEY}`;
                const res = await fetch(url); 
                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                
                const data = await res.json();
                renderSuggestions(data.results || []);
            } catch (err) { 
                console.error('Autocomplete Error:', err); 
                hideSuggestions(); 
            }
        }

        function renderSuggestions(results) {
            suggestionsBox.innerHTML = '';
            if (!results || results.length === 0) { 
                hideSuggestions(); 
                return; 
            }
            
            results.forEach(r => {
                const div = document.createElement('div');
                div.className = 'result-item';
                
                const left = document.createElement('div'); 
                left.style.flex = '1';
                
                const title = document.createElement('div'); 
                title.className = 'result-title'; 
                title.textContent = r.name || r.formatted || 'Place';
                
                const sub = document.createElement('div'); 
                sub.className = 'result-sub'; 
                sub.textContent = r.formatted || '';
                
                left.appendChild(title); 
                left.appendChild(sub);

                const right = document.createElement('div'); 
                right.className = 'saved-actions'; 
                
                const viewBtn = document.createElement('button'); 
                viewBtn.className = 'small-btn'; 
                viewBtn.textContent = 'View';
                viewBtn.onclick = () => { 
                    panAndTempMarker({ 
                        name: r.name || r.formatted, 
                        lat: r.lat, 
                        lon: r.lon, 
                        formatted: r.formatted 
                    }); 
                    hideSuggestions(); 
                };
                
                const saveBtn = document.createElement('button'); 
                saveBtn.className = 'small-btn'; 
                saveBtn.textContent = 'Save';
                saveBtn.onclick = () => { 
                    const place = { 
                        id: 'p_'+Date.now(), 
                        name: r.name || r.formatted || 'Place', 
                        lat: r.lat, 
                        lon: r.lon, 
                        formatted: r.formatted || '',
                        memories: []
                    }; 
                    
                    const isDuplicate = savedPlaces.some(sp => 
                        sp.formatted === place.formatted || 
                        (Math.abs(sp.lat - place.lat) < 0.0001 && Math.abs(sp.lon - place.lon) < 0.0001)
                    );
                    
                    if (!isDuplicate) {
                        savedPlaces.unshift(place); 
                        savePlaces(); 
                        addSavedMarker(place); 
                        renderSavedList(); 
                        alert('Location saved!');
                    } else {
                        alert('This location is already saved.');
                    }
                    hideSuggestions(); 
                };
                
                right.appendChild(viewBtn); 
                right.appendChild(saveBtn);

                div.appendChild(left); 
                div.appendChild(right);
                suggestionsBox.appendChild(div);
            });
            suggestionsBox.style.display = 'block';
        }

        function hideSuggestions() { 
            suggestionsBox.style.display = 'none'; 
            suggestionsBox.innerHTML = ''; 
        }
        
        function searchLocation(query) {
            if (!query) return; 
            
            clearTemporaryMarkers();

            const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&format=json&limit=1&apiKey=${GEOAPIFY_KEY}`;
            
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (!data.results || data.results.length === 0) {
                        alert('Location not found.');
                        return;
                    }
                    
                    const p = data.results[0];
                    const lat = p.lat;
                    const lon = p.lon;
                    
                    const marker = L.marker([lat, lon]).addTo(map);
                    marker._isTemporary = true;
                    
                    const formattedName = p.formatted || p.name || query;
                    marker.bindPopup(`
                        <strong>${formattedName}</strong><br>
                        <button class="primary" id="save-search-result" style="margin-top:8px">
                            Save This Location
                        </button>
                    `).openPopup();
                    
                    map.setView([lat, lon], 14);
                    
                    setTimeout(() => {
                        const saveBtn = document.getElementById('save-search-result');
                        if (saveBtn) {
                            saveBtn.onclick = () => {
                                const place = {
                                    id: 'p_' + Date.now(),
                                    name: p.name || formattedName,
                                    lat: lat,
                                    lon: lon,
                                    formatted: formattedName,
                                    memories: []
                                };
                                
                                const isDuplicate = savedPlaces.some(sp => 
                                    sp.formatted === place.formatted || 
                                    (Math.abs(sp.lat - place.lat) < 0.0001 && Math.abs(sp.lon - place.lon) < 0.0001)
                                );
                                
                                if (!isDuplicate) {
                                    savedPlaces.unshift(place);
                                    savePlaces();
                                    addSavedMarker(place);
                                    renderSavedList();
                                    alert('Location saved!');
                                } else {
                                    alert('This location is already saved.');
                                }
                                
                                map.removeLayer(marker);
                            };
                        }
                    }, 100);
                })
                .catch(err => {
                    console.error('Search Error:', err);
                    alert('Search failed. Please try again.');
                });
        }

        function panAndTempMarker(place) {
            if (!map) return;
            
            clearTemporaryMarkers();

            const m = L.marker([place.lat, place.lon]).addTo(map);
            m._isTemporary = true;
            
            m.bindPopup(`
                ${place.name || ''}<br>
                <button class="primary" id="save-suggest" style="margin-top:8px">
                    Save This Location
                </button>
            `).openPopup();
            
            map.setView([place.lat, place.lon], 15);
            
            setTimeout(() => {
                const btn = document.getElementById('save-suggest');
                if (btn) {
                    btn.onclick = () => {
                        const newPlace = { 
                            id: 'p_'+Date.now(), 
                            name: place.name, 
                            lat: place.lat, 
                            lon: place.lon, 
                            formatted: place.formatted || '',
                            memories: []
                        };
                        
                        const isDuplicate = savedPlaces.some(sp => 
                            sp.formatted === newPlace.formatted || 
                            (Math.abs(sp.lat - newPlace.lat) < 0.0001 && Math.abs(sp.lon - newPlace.lon) < 0.0001)
                        );

                        if (!isDuplicate) {
                            savedPlaces.unshift(newPlace);
                            savePlaces(); 
                            addSavedMarker(newPlace); 
                            renderSavedList(); 
                            alert('Location saved!');
                            map.removeLayer(m);
                        } else {
                            alert('This location is already saved.');
                            m.closePopup();
                        }
                    };
                }
            }, 50);
            
            setTimeout(() => { 
                if (map && map.hasLayer(m)) {
                    map.removeLayer(m); 
                }
            }, 7000); 
        }

        /* --- MEMORIES FUNCTIONS --- */
        function openMemoriesModal(placeId) {
            const place = savedPlaces.find(p => p.id === placeId);
            if (!place) return;

            // Ensure memories array exists
            if (!place.memories) place.memories = [];

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📸 Memories: ${place.name}</h3>
                        <button class="icon-btn" id="close-modal">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="upload-section">
                            <input type="file" id="file-upload" accept="image/*,video/*,.pdf,.doc,.docx" multiple style="display:none">
                            <button class="primary" id="upload-btn">+ Add Photos/Files</button>
                            <textarea id="memory-note" placeholder="Add a note about this memory..." rows="3"></textarea>
                            <button class="secondary" id="save-note-btn">Save Note</button>
                        </div>
                        <div class="memories-grid" id="memories-grid">
                            ${renderMemories(place.memories)}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);

            // Close modal
            document.getElementById('close-modal').addEventListener('click', () => {
                document.body.removeChild(modal);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });

            // Upload button
            document.getElementById('upload-btn').addEventListener('click', () => {
                document.getElementById('file-upload').click();
            });

            // Handle file upload
            document.getElementById('file-upload').addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                
                for (const file of files) {
                    if (file.size > 5 * 1024 * 1024) { // 5MB limit per file for performance
                        alert(`${file.name} is too large. Max size is 5MB per file.`);
                        continue;
                    }

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const memory = {
                            id: 'm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            type: file.type.startsWith('image/') ? 'image' : 'file',
                            name: file.name,
                            data: event.target.result,
                            date: new Date().toISOString(),
                            note: ''
                        };

                        place.memories.push(memory);
                        savePlaces();
                        
                        // Update grid
                        document.getElementById('memories-grid').innerHTML = renderMemories(place.memories);
                        setupMemoryListeners(place);
                    };
                    reader.readAsDataURL(file);
                }
            });

            // Save note
            document.getElementById('save-note-btn').addEventListener('click', () => {
                const note = document.getElementById('memory-note').value.trim();
                if (!note) {
                    alert('Please enter a note first.');
                    return;
                }

                const memory = {
                    id: 'm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    type: 'note',
                    note: note,
                    date: new Date().toISOString()
                };

                place.memories.push(memory);
                savePlaces();
                
                document.getElementById('memory-note').value = '';
                document.getElementById('memories-grid').innerHTML = renderMemories(place.memories);
                setupMemoryListeners(place);
            });

            setupMemoryListeners(place);
        }

        function renderMemories(memories) {
            if (!memories || memories.length === 0) {
                return '<p class="result-sub">No memories yet. Add some photos or notes!</p>';
            }

            return memories.map(m => {
                const date = new Date(m.date).toLocaleDateString();
                
                if (m.type === 'image') {
                    return `
                        <div class="memory-item" data-id="${m.id}">
                            <img src="${m.data}" alt="${m.name}">
                            <div class="memory-info">
                                <span class="memory-date">${date}</span>
                                <button class="delete-memory" data-id="${m.id}">🗑️</button>
                            </div>
                            ${m.note ? `<p class="memory-note">${m.note}</p>` : ''}
                        </div>
                    `;
                } else if (m.type === 'note') {
                    return `
                        <div class="memory-item note-item" data-id="${m.id}">
                            <div class="note-content">
                                <p>${m.note}</p>
                                <span class="memory-date">${date}</span>
                            </div>
                            <button class="delete-memory" data-id="${m.id}">🗑️</button>
                        </div>
                    `;
                } else {
                    return `
                        <div class="memory-item file-item" data-id="${m.id}">
                            <div class="file-icon">📄</div>
                            <div class="memory-info">
                                <span class="file-name">${m.name}</span>
                                <span class="memory-date">${date}</span>
                                <button class="delete-memory" data-id="${m.id}">🗑️</button>
                            </div>
                        </div>
                    `;
                }
            }).join('');
        }

        function setupMemoryListeners(place) {
            document.querySelectorAll('.delete-memory').forEach(btn => {
                btn.addEventListener('click', () => {
                    const memoryId = btn.getAttribute('data-id');
                    if (confirm('Delete this memory?')) {
                        place.memories = place.memories.filter(m => m.id !== memoryId);
                        savePlaces();
                        document.getElementById('memories-grid').innerHTML = renderMemories(place.memories);
                        setupMemoryListeners(place);
                    }
                });
            });

            // View full image on click
            document.querySelectorAll('.memory-item img').forEach(img => {
                img.addEventListener('click', () => {
                    const viewer = document.createElement('div');
                    viewer.className = 'image-viewer';
                    viewer.innerHTML = `
                        <div class="viewer-content">
                            <button class="icon-btn close-viewer">✕</button>
                            <img src="${img.src}" alt="Memory">
                        </div>
                    `;
                    document.body.appendChild(viewer);

                    viewer.addEventListener('click', (e) => {
                        if (e.target === viewer || e.target.classList.contains('close-viewer')) {
                            document.body.removeChild(viewer);
                        }
                    });
                });
            });
        }

        /* --- DATA MANAGEMENT --- */
        function loadSavedPlaces() { 
            try { 
                const raw = localStorage.getItem('travelmaps:saved'); 
                const places = raw ? JSON.parse(raw) : [];
                // Ensure all places have memories array
                return places.map(p => ({...p, memories: p.memories || []}));
            } catch (e) { 
                console.error('Error loading saved places:', e);
                return []; 
            } 
        }
        
        function savePlaces() { 
            try {
                // Use unlimited storage API for memories data
                window.storage.set('travelmaps:saved', JSON.stringify(savedPlaces)).catch(err => {
                    console.error('Storage error:', err);
                });
                // Keep localStorage as backup for now
                localStorage.setItem('travelmaps:saved', JSON.stringify(savedPlaces));
            } catch (e) {
                console.error('Error saving places:', e);
            }
        }

        function renderSavedList() {
            savedList.innerHTML = '';
            
            if (!savedPlaces || savedPlaces.length === 0) { 
                const p = document.createElement('div'); 
                p.className = 'result-sub'; 
                p.textContent = 'No saved places yet.'; 
                savedList.appendChild(p); 
                return; 
            }
            
            savedPlaces.forEach(place => {
                const card = document.createElement('div'); 
                card.className = 'saved-card';
                
                const left = document.createElement('div'); 
                left.className = 'saved-left';
                
                const t = document.createElement('div'); 
                t.className = 'saved-title'; 
                t.textContent = place.name || place.formatted || 'Place';
                
                const s = document.createElement('div'); 
                s.className = 'saved-sub'; 
                const memCount = place.memories ? place.memories.length : 0;
                s.textContent = `${place.formatted || `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`} • ${memCount} memories`;
                
                left.appendChild(t); 
                left.appendChild(s);
                
                const actions = document.createElement('div'); 
                actions.className = 'saved-actions';
                
                const memBtn = document.createElement('button');
                memBtn.className = 'small-btn';
                memBtn.textContent = '📸';
                memBtn.title = 'View Memories';
                memBtn.onclick = () => openMemoriesModal(place.id);
                
                const goBtn = document.createElement('button'); 
                goBtn.className = 'small-btn'; 
                goBtn.textContent = 'Go'; 
                goBtn.onclick = () => { 
                    map.setView([place.lat, place.lon], 15); 
                    if (savedMarkers[place.id]) savedMarkers[place.id].openPopup(); 
                };
                
                const delBtn = document.createElement('button'); 
                delBtn.className = 'small-btn'; 
                delBtn.textContent = 'Delete'; 
                delBtn.onclick = () => { 
                    if (!confirm('Delete this saved place and all its memories?')) return; 
                    savedPlaces = savedPlaces.filter(p => p.id !== place.id); 
                    savePlaces(); 
                    removeSavedMarker(place.id); 
                    renderSavedList(); 
                };
                
                actions.appendChild(memBtn);
                actions.appendChild(goBtn); 
                actions.appendChild(delBtn);
                
                card.appendChild(left); 
                card.appendChild(actions); 
                savedList.appendChild(card);
            });
        }

        /* --- MARKER MANAGEMENT --- */
        function addSavedMarker(place) {
            if (!map) return;
            if (savedMarkers[place.id]) return;
            
            const m = L.marker([place.lat, place.lon]).addTo(map);
            m._isTemporary = false;
            
            const memCount = place.memories ? place.memories.length : 0;
            const popupContent = `
                <div class="marker-popup">
                    <strong>${place.name}</strong>
                    <div class="result-sub">${place.formatted || ''}</div>
                    <div class="result-sub" style="margin-top:4px">📸 ${memCount} memories</div>
                    <button class="primary" style="margin-top:8px;width:100%" id="view-mem-${place.id}">
                        View Memories
                    </button>
                </div>
            `;
            
            m.bindPopup(popupContent);
            
            m.on('popupopen', () => {
                const btn = document.getElementById(`view-mem-${place.id}`);
                if (btn) {
                    btn.onclick = () => openMemoriesModal(place.id);
                }
            });
            
            savedMarkers[place.id] = m;
        }

        function removeSavedMarker(id) { 
            if (savedMarkers[id]) { 
                map.removeLayer(savedMarkers[id]); 
                delete savedMarkers[id]; 
            } 
        }
        
        function clearSavedMarkers() { 
            Object.keys(savedMarkers).forEach(id => { 
                map.removeLayer(savedMarkers[id]); 
                delete savedMarkers[id]; 
            }); 
        }
        
        function clearTemporaryMarkers() {
            if (!map) return;
            
            map.eachLayer(layer => {
                if (layer instanceof L.Marker && layer._isTemporary) {
                    map.removeLayer(layer);
                }
            });
        }
    });