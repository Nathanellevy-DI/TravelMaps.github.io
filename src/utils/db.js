/**
 * db.js — IndexedDB Storage Layer
 *
 * This utility provides a simple key-value store built on IndexedDB.
 * It persists user data (saved places and categories) locally in the browser.
 *
 * Database structure:
 *   Database:    'TravelMapsDB' (version 1)
 *   ObjectStore: 'userData' (keyPath: 'username')
 *   Each record:  { username: string, savedPlaces: [], categories: [] }
 *
 * The 'username' key is actually the user's ID (generated from their name).
 * Each user ID maps to one record containing all their app data.
 *
 * IndexedDB is chosen over localStorage because:
 *   - It can store much larger amounts of data (no 5MB limit)
 *   - Better performance for structured data
 *   - Does not block the main thread for reads
 */

// Database name and version — increment DB_VERSION if you change the schema
const DB_NAME = 'TravelMapsDB';
const DB_VERSION = 1;

export const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            // Create object store for user data: { username: string, savedPlaces: [], categories: [] }
            if (!db.objectStoreNames.contains('userData')) {
                db.createObjectStore('userData', { keyPath: 'username' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getUserData = async (username) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('userData', 'readonly');
        const store = transaction.objectStore('userData');
        const request = store.get(username);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveUserData = async (username, data) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('userData', 'readwrite');
        const store = transaction.objectStore('userData');
        const request = store.put({ username, ...data });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
