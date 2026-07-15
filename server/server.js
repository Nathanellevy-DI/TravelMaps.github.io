// Force IPv4 DNS resolution (Render free tier doesn't support IPv6)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('./database');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config();

// Supabase Client for Storage
const supabaseUrl = process.env.SUPABASE_URL || 'https://ufzsywuiohxmlmatkamo.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_feY3ssoaZMKtXcNqbZ1GrQ_o59UPHZK';
const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: { transport: WebSocket }
});

// Media Encryption Setup
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32); // Must be exactly 32 bytes string for aes-256-cbc. Fallback for dev.

// Multer in-memory storage (we encrypt before uploading)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // For local development
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_travelmaps_key_123';

// Auth Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- Auth Routes ---

app.post('/api/waitlist/join', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    try {
        await pool.query(
            `INSERT INTO waitlist (email, status) VALUES ($1, 'pending') ON CONFLICT (email) DO NOTHING`,
            [email.toLowerCase().trim()]
        );
        res.json({ success: true, message: 'Joined waitlist successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { email, password, display_name } = req.body;
    try {
        // Waitlist check
        const { rows: waitlistRows } = await pool.query(
            `SELECT * FROM waitlist WHERE email = $1`,
            [email.toLowerCase().trim()]
        );
        const waitlistEntry = waitlistRows[0];
        if (!waitlistEntry || waitlistEntry.status !== 'invited') {
            return res.status(403).json({ error: 'This email has not been invited to register yet.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();
        const name = display_name || email.split('@')[0];

        try {
            await pool.query(
                `INSERT INTO users (id, email, password, display_name) VALUES ($1, $2, $3, $4)`,
                [id, email, hashedPassword, name]
            );
            const token = jwt.sign({ id, email, name }, JWT_SECRET);
            res.json({ user: { id, email, name }, token });
        } catch (err) {
            if (err.code === '23505') { // Postgres Unique Violation
                return res.status(400).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        const user = rows[0];
        
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.display_name }, JWT_SECRET);
        res.json({ user: { id: user.id, email: user.email, name: user.display_name }, token });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// --- Admin Waitlist Routes ---

app.get('/api/admin/waitlist', authenticateToken, async (req, res) => {
    if (req.user.email.toLowerCase() !== 'travelmaps@inbox.ru') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const { rows } = await pool.query(`SELECT * FROM waitlist ORDER BY created_at DESC`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/waitlist/invite', authenticateToken, async (req, res) => {
    if (req.user.email.toLowerCase() !== 'travelmaps@inbox.ru') {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    try {
        await pool.query(
            `UPDATE waitlist SET status = 'invited' WHERE email = $1`,
            [email.toLowerCase().trim()]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Places Routes ---

app.get('/api/places', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT p.*, u.display_name as username, u.email 
            FROM places p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.user_id = $1 
               OR p.visibility = 'public'
               OR (p.visibility = 'friends' AND p.user_id IN (
                   SELECT user_id_2 FROM friends WHERE user_id_1 = $2 AND status = 'accepted'
                   UNION
                   SELECT user_id_1 FROM friends WHERE user_id_2 = $3 AND status = 'accepted'
               ))
            ORDER BY p.created_at DESC
        `;
        const { rows } = await pool.query(query, [userId, userId, userId]);
        
        // Only fetch media for the places we're actually returning (not the entire table)
        const placeIds = rows.map(r => r.id);
        let mediaRows = [];
        if (placeIds.length > 0) {
            const { rows: mr } = await pool.query(
                `SELECT id, place_id, tier, uploader_id, mime_type FROM media WHERE place_id = ANY($1)`,
                [placeIds]
            );
            mediaRows = mr;
        }
        
        const mediaByPlace = {};
        mediaRows.forEach(m => {
            if (!mediaByPlace[m.place_id]) mediaByPlace[m.place_id] = [];
            mediaByPlace[m.place_id].push(m);
        });
        
        const places = rows.map(r => ({
            ...r,
            media: mediaByPlace[r.id] || [],
            profile: { display_name: r.username, email: r.email }
        }));
        res.json(places);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/places', authenticateToken, async (req, res) => {
    const place = req.body;
    try {
        await pool.query(
            `INSERT INTO places (id, user_id, lat, lon, name, formatted, category, color, visibility)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                place.id, req.user.id, place.lat, place.lon, place.name, place.formatted,
                place.category, place.color, place.visibility
            ]
        );
        io.emit('places_update');
        res.json(place);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/api/places/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query(`DELETE FROM places WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
        io.emit('places_update');
        res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.put('/api/places/:id', authenticateToken, async (req, res) => {
    const updates = req.body;
    let query = 'UPDATE places SET ';
    let values = [];
    let setClauses = [];
    
    let index = 1;
    Object.keys(updates).forEach(key => {
        setClauses.push(`${key} = $${index++}`);
        let val = updates[key];
        if (typeof val === 'object') val = JSON.stringify(val);
        values.push(val);
    });
    
    if (setClauses.length === 0) return res.json({ success: true });
    
    query += setClauses.join(', ') + ` WHERE id = $${index++} AND user_id = $${index}`;
    values.push(req.params.id, req.user.id);
    
    try {
        await pool.query(query, values);
        io.emit('places_update');
        res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// --- Friends Routes ---

app.get('/api/users/search', authenticateToken, async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    
    try {
        const { rows } = await pool.query(
            `SELECT id, display_name, email, avatar_url FROM users 
             WHERE (display_name ILIKE $1 OR email ILIKE $1) AND id != $2 
             LIMIT 10`, 
            [`%${query}%`, req.user.id]
        );
        res.json(rows);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/friends', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const friendsQuery = `
            SELECT f.id as friendship_id, f.status, 
                   u.id as id, u.display_name, u.email
            FROM friends f
            JOIN users u ON (f.user_id_1 = u.id OR f.user_id_2 = u.id)
            WHERE (f.user_id_1 = $1 OR f.user_id_2 = $2)
              AND f.status = 'accepted'
              AND u.id != $3
        `;
        
        const pendingQuery = `
            SELECT f.id as friendship_id, f.action_user_id,
                   u.id as id, u.display_name, u.email
            FROM friends f
            JOIN users u ON (f.user_id_1 = u.id OR f.user_id_2 = u.id)
            WHERE (f.user_id_1 = $1 OR f.user_id_2 = $2)
              AND f.status = 'pending'
              AND f.action_user_id != $3
              AND u.id = f.action_user_id
        `;
        
        const { rows: friends } = await pool.query(friendsQuery, [userId, userId, userId]);
        const { rows: pending } = await pool.query(pendingQuery, [userId, userId, userId]);
        
        res.json({ friends, pendingRequests: pending });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/friends/request', authenticateToken, async (req, res) => {
    const { targetEmailOrName } = req.body;
    const userId = req.user.id;
    
    try {
        const { rows } = await pool.query(`SELECT id FROM users WHERE (email ILIKE $1 OR display_name ILIKE $2) AND id != $3 LIMIT 1`, 
            [`%${targetEmailOrName}%`, `%${targetEmailOrName}%`, userId]);
        
        const targetUser = rows[0];
        if (!targetUser) return res.status(404).json({ error: "User not found" });
        
        const fid = uuidv4();
        try {
            await pool.query(`INSERT INTO friends (id, user_id_1, user_id_2, action_user_id, status) VALUES ($1, $2, $3, $4, $5)`,
                [fid, userId, targetUser.id, userId, 'pending']);
                
            // Notify target
            const nid = uuidv4();
            await pool.query(`INSERT INTO notifications (id, user_id, actor_id, type, message) VALUES ($1, $2, $3, $4, $5)`,
                [nid, targetUser.id, userId, 'friend_request', 'sent you a friend request.']);
                
            io.to(targetUser.id).emit('notification_update');
            io.to(targetUser.id).emit('friends_update');
            res.json({ success: true });
        } catch (err) {
            if (err.code === '23505') return res.status(400).json({ error: "Request already sent" });
            return res.status(500).json({ error: err.message });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/friends/respond', authenticateToken, async (req, res) => {
    const { friendshipId, accept } = req.body;
    try {
        if (accept) {
            await pool.query(`UPDATE friends SET status = 'accepted' WHERE id = $1`, [friendshipId]);
            
            const { rows } = await pool.query(`SELECT * FROM friends WHERE id = $1`, [friendshipId]);
            const row = rows[0];
            if (row) {
                const targetId = row.user_id_1 === req.user.id ? row.user_id_2 : row.user_id_1;
                const nid = uuidv4();
                await pool.query(`INSERT INTO notifications (id, user_id, actor_id, type, message) VALUES ($1, $2, $3, $4, $5)`,
                    [nid, targetId, req.user.id, 'friend_accept', 'accepted your friend request.']);
                io.to(targetId).emit('notification_update');
                io.to(targetId).emit('friends_update');
                io.to(req.user.id).emit('friends_update');
                io.emit('places_update'); 
            }
            res.json({ success: true });
        } else {
            await pool.query(`DELETE FROM friends WHERE id = $1`, [friendshipId]);
            io.emit('friends_update');
            io.emit('places_update');
            res.json({ success: true });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// --- Encrypted Media Routes ---

app.post('/api/media/upload', authenticateToken, upload.single('media'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const { placeId, tier, sharedWith } = req.body; 
    const parsedTier = parseInt(tier) || 1;
    
    const mediaId = uuidv4();
    const iv = crypto.randomBytes(16);
    const keyString = typeof ENCRYPTION_KEY === 'string' ? ENCRYPTION_KEY : ENCRYPTION_KEY.toString('hex').slice(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(keyString, 'utf8'), iv);
    const encryptedBuffer = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);
    
    const filePath = `${mediaId}.enc`;
    
    try {
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage.from('media').upload(filePath, encryptedBuffer, {
            contentType: 'application/octet-stream',
            upsert: false
        });

        if (error) throw new Error(error.message);
        
        await pool.query(
            `INSERT INTO media (id, uploader_id, place_id, tier, file_path, iv, mime_type) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [mediaId, req.user.id, placeId || null, parsedTier, filePath, iv.toString('hex'), req.file.mimetype]
        );
        
        if (parsedTier === 1 || parsedTier === 2) {
            let usersToShare = [];
            try {
                usersToShare = JSON.parse(sharedWith || '[]');
            } catch(e) {}
            
            usersToShare.push(req.user.id);
            usersToShare = [...new Set(usersToShare)];
            
            for (const uid of usersToShare) {
                await pool.query(`INSERT INTO media_access (media_id, user_id) VALUES ($1, $2)`, [mediaId, uid]);
            }
        }
        
        res.json({ success: true, mediaId });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/media/:media_id', authenticateToken, async (req, res) => {
    const mediaId = req.params.media_id;
    
    try {
        const { rows } = await pool.query(`SELECT * FROM media WHERE id = $1`, [mediaId]);
        const media = rows[0];
        
        if (!media) return res.status(404).json({ error: 'Media not found' });
        
        // Object-Level Access Control (OLAC)
        if (media.tier === 3 || media.uploader_id === req.user.id) {
            await serveDecryptedMedia(media, res);
        } else {
            const { rows: accessRows } = await pool.query(`SELECT * FROM media_access WHERE media_id = $1 AND user_id = $2`, [mediaId, req.user.id]);
            if (accessRows.length === 0) return res.status(403).json({ error: 'Forbidden' });
            
            await serveDecryptedMedia(media, res);
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

async function serveDecryptedMedia(media, res) {
    try {
        // Download from Supabase Storage
        const { data, error } = await supabase.storage.from('media').download(media.file_path);
        
        if (error) throw new Error(error.message);
        
        const arrayBuffer = await data.arrayBuffer();
        const encryptedBuffer = Buffer.from(arrayBuffer);
        
        const iv = Buffer.from(media.iv, 'hex');
        const keyString = typeof ENCRYPTION_KEY === 'string' ? ENCRYPTION_KEY : ENCRYPTION_KEY.toString('hex').slice(0, 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(keyString, 'utf8'), iv);
        const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
        
        res.setHeader('Content-Type', media.mime_type);
        res.send(decryptedBuffer);
    } catch (err) {
        res.status(500).json({ error: 'Decryption failed: ' + err.message });
    }
}

// --- Notifications Routes ---

app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT n.*, u.display_name as actor_name 
            FROM notifications n
            LEFT JOIN users u ON n.actor_id = u.id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
        `, [req.user.id]);
        
        const notifications = rows.map(r => ({
            ...r,
            actor: { display_name: r.actor_name }
        }));
        res.json(notifications);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await pool.query(`UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
        io.to(req.user.id).emit('notification_update');
        res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// --- Socket.IO ---

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
        socket.join(userId);
    }
    
    socket.on('disconnect', () => {
        // Handle disconnect
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
