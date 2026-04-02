/**
 * PinControls.jsx — Category Selection Controls
 *
 * A floating control panel on the map that lets the user choose which
 * category to assign to the NEXT place they save. Features:
 *   - Dropdown of all available categories (built-in + custom)
 *   - "+ Create New..." option to add custom categories on the fly
 *   - Color indicator circle showing the auto-assigned category color
 *
 * When a category is selected, PlacesContext automatically updates
 * the creation color. New pins will use this category + color.
 */
import { usePlaces } from '../../contexts/PlacesContext';

export default function PinControls() {
    const {
        categories,
        addCategory,
        creationSettings,
        setCategory,
        setCreationSettings
    } = usePlaces();

    const handleCategoryChange = (e) => {
        const val = e.target.value;
        if (val === '__new__') {
            const newCat = prompt('Enter name for new category:');
            if (newCat && newCat.trim()) {
                addCategory(newCat.trim());
            }
        } else {
            setCategory(val);
        }
    };

    return (
        <div className="pin-controls">
            {/* Category Selection */}
            <div className="control-group">
                <label className="control-label">Category:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Color Indicator */}
                    <div
                        title="Auto-assigned color"
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: creationSettings.color,
                            border: '2px solid rgba(255,255,255,0.2)',
                            boxShadow: `0 0 10px ${creationSettings.color}40`,
                            transition: 'all 0.3s ease'
                        }}
                    />

                    <select
                        className="category-select"
                        value={creationSettings.category}
                        onChange={handleCategoryChange}
                        style={{ flex: 1 }}
                    >
                        <option value="Default">Default</option>
                        {categories.filter(c => c !== 'Default').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="__new__" style={{ fontStyle: 'italic' }}>+ Create New...</option>
                    </select>
                </div>
            </div>

            <div className="control-group" style={{ marginTop: '12px' }}>
                <label className="control-label">Visibility:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <select
                        className="category-select"
                        value={creationSettings.visibility || 'private'}
                        onChange={(e) => setCreationSettings(prev => ({ ...prev, visibility: e.target.value }))}
                        style={{ flex: 1 }}
                    >
                        <option value="private">Private (Only Me)</option>
                        <option value="friends">Friends Only</option>
                        <option value="public">Public</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
