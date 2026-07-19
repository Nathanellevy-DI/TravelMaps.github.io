/**
 * backup.js — Backup & Restore Utility
 *
 * Handles exporting and importing TravelMaps data as ZIP files.
 *
 * Export:
 *   - Creates a ZIP containing 'travelmaps_backup.json' (places + categories)
 *   - Photos stored as Base64 in memories are extracted to a 'photos/' folder
 *   - Downloads the ZIP via the file-saver library
 *
 * Import:
 *   - Reads a ZIP file and extracts the backup JSON
 *   - Re-embeds photos from the 'photos/' folder back into memory objects
 *   - Returns the restored places and categories for PlacesContext to load
 *
 * Dependencies: JSZip (ZIP creation/reading), file-saver (browser download)
 */
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Export all places and their data to a ZIP file
 */
export async function exportBackup(places, username, categories = []) {
    const zip = new JSZip();

    // Create backup data
    const backupData = {
        version: 1,
        exportDate: new Date().toISOString(),
        username: username,
        categories: categories,
        places: places.map(place => ({
            ...place,
            // Store photo data separately in the zip
            memories: place.memories.map(mem => ({
                ...mem,
                // Mark photos to be stored as files
                photoFile: mem.photo ? `photos/${place.id}_${mem.id}.jpg` : null
            }))
        }))
    };

    // Add main data file
    zip.file('travelmaps_backup.json', JSON.stringify(backupData, null, 2));

    // Create photos folder and add photos
    const photosFolder = zip.folder('photos');

    for (const place of places) {
        for (const memory of place.memories) {
            if (memory.photo && memory.photo.startsWith('data:')) {
                // Extract base64 data and save as file
                const base64Data = memory.photo.split(',')[1];
                if (base64Data) {
                    photosFolder.file(`${place.id}_${memory.id}.jpg`, base64Data, { base64: true });
                }
            }
        }
    }

    // Generate and download ZIP
    const blob = await zip.generateAsync({ type: 'blob' });
    const date = new Date().toISOString().split('T')[0];
    saveAs(blob, `TravelMaps_Backup_${date}.zip`);

    return true;
}

/**
 * Import places from a backup ZIP file
 */
export async function importBackup(file) {
    try {
        const zip = await JSZip.loadAsync(file);

        // Read main data file
        const dataFile = zip.file('travelmaps_backup.json');
        if (!dataFile) {
            throw new Error('Invalid backup file: missing travelmaps_backup.json');
        }

        const dataContent = await dataFile.async('string');
        const backupData = JSON.parse(dataContent);

        // Restore photos from zip
        const restoredPlaces = await Promise.all(
            backupData.places.map(async (place) => {
                const restoredMemories = await Promise.all(
                    place.memories.map(async (memory) => {
                        if (memory.photoFile) {
                            const photoFile = zip.file(memory.photoFile);
                            if (photoFile) {
                                const photoData = await photoFile.async('base64');
                                return {
                                    ...memory,
                                    photo: `data:image/jpeg;base64,${photoData}`,
                                    photoFile: undefined
                                };
                            }
                        }
                        return { ...memory, photoFile: undefined };
                    })
                );

                return {
                    ...place,
                    memories: restoredMemories
                };
            })
        );

        return {
            success: true,
            places: restoredPlaces,
            categories: backupData.categories || [],
            username: backupData.username,
            exportDate: backupData.exportDate
        };
    } catch (error) {
        console.error('Import error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Zip a single pin object (with memories and photos) into a ZIP Blob for sharing
 */
export async function exportSinglePinZip(place) {
    const zip = new JSZip();

    const pinPackage = {
        version: 1,
        createdDate: new Date().toISOString(),
        place: {
            ...place,
            memories: (place.memories || []).map(mem => ({
                ...mem,
                photoFile: mem.photo ? `photos/${mem.id}.jpg` : null
            }))
        }
    };

    zip.file('pin_data.json', JSON.stringify(pinPackage, null, 2));

    const photosFolder = zip.folder('photos');
    if (place.memories) {
        for (const memory of place.memories) {
            if (memory.photo && memory.photo.startsWith('data:')) {
                const base64Data = memory.photo.split(',')[1];
                if (base64Data) {
                    photosFolder.file(`${memory.id}.jpg`, base64Data, { base64: true });
                }
            }
        }
    }

    return await zip.generateAsync({ type: 'blob' });
}

/**
 * Unpack a single pin ZIP Blob/Buffer into a full place object
 */
export async function importSinglePinZip(zipData) {
    try {
        const zip = await JSZip.loadAsync(zipData);
        const dataFile = zip.file('pin_data.json');
        if (!dataFile) {
            throw new Error('Invalid pin package: missing pin_data.json');
        }

        const dataContent = await dataFile.async('string');
        const pinPackage = JSON.parse(dataContent);
        const place = pinPackage.place;

        if (place.memories) {
            place.memories = await Promise.all(
                place.memories.map(async (memory) => {
                    if (memory.photoFile) {
                        const photoFile = zip.file(memory.photoFile);
                        if (photoFile) {
                            const photoData = await photoFile.async('base64');
                            return {
                                ...memory,
                                photo: `data:image/jpeg;base64,${photoData}`,
                                photoFile: undefined
                            };
                        }
                    }
                    return { ...memory, photoFile: undefined };
                })
            );
        }

        return { success: true, place };
    } catch (err) {
        console.error('Failed to unpack pin ZIP:', err);
        return { success: false, error: err.message };
    }
}
