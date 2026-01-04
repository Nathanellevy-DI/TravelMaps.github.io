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
