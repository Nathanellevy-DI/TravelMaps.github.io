import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Export all places and their data to a ZIP file
 */
export async function exportBackup(places, username) {
    const zip = new JSZip();

    // Create backup data
    const backupData = {
        version: 1,
        exportDate: new Date().toISOString(),
        username: username,
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
