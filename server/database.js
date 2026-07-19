require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,                      // Maximum pool size
    idleTimeoutMillis: 30000,     // Close idle connections after 30s
    connectionTimeoutMillis: 10000 // Fail fast if connection takes >10s
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
    } else {
        console.log('Connected to Supabase PostgreSQL database.');
        initDB();
        release();
    }
});

function initDB() {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            display_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createPlacesTable = `
        CREATE TABLE IF NOT EXISTS places (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            name TEXT NOT NULL,
            formatted TEXT,
            category TEXT,
            color TEXT,
            visibility TEXT DEFAULT 'private',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createMediaTable = `
        CREATE TABLE IF NOT EXISTS media (
            id TEXT PRIMARY KEY,
            uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
            tier INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            iv TEXT NOT NULL,
            mime_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createMediaAccessTable = `
        CREATE TABLE IF NOT EXISTS media_access (
            media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            PRIMARY KEY(media_id, user_id)
        );
    `;

    const createFriendsTable = `
        CREATE TABLE IF NOT EXISTS friends (
            id TEXT PRIMARY KEY,
            user_id_1 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            user_id_2 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action_user_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id_1, user_id_2)
        );
    `;

    const createNotificationsTable = `
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            message TEXT,
            is_read BOOLEAN DEFAULT false,
            target_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createTables = async () => {
        try {
            await pool.query(createUsersTable);
            await pool.query(createPlacesTable);
            await pool.query(createMediaTable);
            await pool.query(createMediaAccessTable);
            await pool.query(createFriendsTable);
            await pool.query(createNotificationsTable);
            
            // Create the storage bucket using Postgres (Supabase exposes storage.buckets)
            try {
                await pool.query(`
                    INSERT INTO storage.buckets (id, name, public) 
                    VALUES ('media', 'media', true) 
                    ON CONFLICT (id) DO NOTHING;
                `);
                
                // Add policy to allow any authenticated or anonymous user to insert objects
                // In a production app with the backend acting as a proxy, the backend uploads it.
                // If using the anon key in the backend without auth context, we need public insert/select.
                await pool.query(`
                    CREATE POLICY "Backend Full Access" ON storage.objects
                    FOR ALL USING (bucket_id = 'media');
                `);
            } catch (storageErr) {
                console.log("Storage bucket creation info (may already exist or no direct access):", storageErr.message);
            }

            // Add name column to media if it doesn't exist
            await pool.query(`ALTER TABLE media ADD COLUMN IF NOT EXISTS name TEXT;`);

            // Add notes, youtube_url, and collaborative columns to places
            await pool.query(`ALTER TABLE places ADD COLUMN IF NOT EXISTS notes TEXT;`);
            await pool.query(`ALTER TABLE places ADD COLUMN IF NOT EXISTS youtube_url TEXT;`);
            await pool.query(`ALTER TABLE places ADD COLUMN IF NOT EXISTS collaborative BOOLEAN DEFAULT false;`);

            // --- Pin Sharing & Discovery (v2) Migrations ---
            console.log('Running v2 Pin Sharing & Discovery migrations...');
            
            // 1. Enable radius search extensions (may require superuser, catch if not allowed)
            try {
                await pool.query(`CREATE EXTENSION IF NOT EXISTS cube CASCADE;`);
                await pool.query(`CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;`);
                console.log('Extensions cube and earthdistance verified.');
            } catch (extErr) {
                console.log('Proximity extensions info (extensions may already exist or need superuser):', extErr.message);
            }

            // 2. Create new tables
            await pool.query(`
                CREATE TABLE IF NOT EXISTS groups (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS group_members (
                    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
                    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                    PRIMARY KEY (group_id, user_id)
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS pin_shares (
                    place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
                    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                    PRIMARY KEY (place_id, user_id)
                );
            `);

            // 3. Add shared_group_id to places
            await pool.query(`
                ALTER TABLE places ADD COLUMN IF NOT EXISTS shared_group_id TEXT REFERENCES groups(id) ON DELETE SET NULL;
            `);

            // 4. Migrate legacy visibility values (single UUIDs) into pin_shares
            // A UUID or user ID doesn't equal private, friends, public, group, specific.
            try {
                // Find places with legacy visibility and copy to pin_shares
                await pool.query(`
                    INSERT INTO pin_shares (place_id, user_id)
                    SELECT id, visibility
                    FROM places
                    WHERE visibility NOT IN ('private', 'friends', 'public', 'specific', 'group')
                    ON CONFLICT DO NOTHING;
                `);

                // Update places with legacy visibility to 'specific'
                await pool.query(`
                    UPDATE places
                    SET visibility = 'specific'
                    WHERE visibility NOT IN ('private', 'friends', 'public', 'specific', 'group');
                `);
                console.log('Legacy visibility values migrated.');
            } catch (migErr) {
                console.error('Error during visibility values migration:', migErr.message);
            }

            // 5. Add check constraint to visibility column if it doesn't exist
            try {
                const constraintCheck = await pool.query(`
                    SELECT 1 FROM pg_constraint WHERE conname = 'visibility_check'
                `);
                if (constraintCheck.rows.length === 0) {
                    await pool.query(`
                        ALTER TABLE places ADD CONSTRAINT visibility_check
                        CHECK (visibility IN ('private', 'friends', 'specific', 'group', 'public'))
                    `);
                    console.log('Constraint visibility_check added.');
                }
            } catch (constraintErr) {
                console.error('Error adding visibility_check constraint:', constraintErr.message);
            }

            console.log('PostgreSQL tables verified.');
        } catch (err) {
            console.error('Error creating tables:', err);
        }
    };

    createTables();
}

module.exports = pool;
