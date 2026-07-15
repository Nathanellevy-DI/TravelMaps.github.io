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

            console.log('PostgreSQL tables verified.');
        } catch (err) {
            console.error('Error creating tables:', err);
        }
    };

    createTables();
}

module.exports = pool;
