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
const nodemailer = require('nodemailer');
require('dotenv').config();

// Supabase Client for Storage
const supabaseUrl = process.env.SUPABASE_URL || 'https://ufzsywuiohxmlmatkamo.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_feY3ssoaZMKtXcNqbZ1GrQ_o59UPHZK';
const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: { transport: WebSocket }
});

async function sendInvitationEmail(toEmail) {
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; border: 1px solid #E5E1DE; border-radius: 16px; background-color: #fcfbfa; color: #5C4F4A; line-height: 1.6; box-shadow: 0 4px 12px rgba(92, 79, 74, 0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
                <!-- Elegant Custom Brand Pin Icon -->
                <div style="background-color: #5C766D; display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 20px; margin: 0 auto; box-shadow: 0 10px 25px -5px rgba(92, 118, 109, 0.35);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#C9996B" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
                    </svg>
                </div>
                <h2 style="color: #5C4F4A; font-size: 26px; font-weight: 800; margin-top: 20px; margin-bottom: 8px; font-family: 'Inter', system-ui, sans-serif; letter-spacing: -0.5px;">Welcome to TravelMaps</h2>
                <p style="color: #8b807b; font-size: 14px; margin: 0;">Your private window to documenting and sharing journeys.</p>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 16px; font-weight: 600;">Hello,</p>
            <p style="font-size: 16px; margin-bottom: 24px;">Good news! Your email request on our waitlist has been approved. You are now officially invited to join TravelMaps.</p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="https://travelmaps.world/#/secret-signup" style="background-color: #5C766D; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; box-shadow: 0 10px 20px -5px rgba(92, 118, 109, 0.4); font-size: 15px; transition: all 0.2s ease;">
                    Create Your Account
                </a>
            </div>
            
            <p style="font-size: 14px; color: #8b807b; margin-bottom: 24px; text-align: center;">
                If the button doesn't work, copy and paste this link in your browser:<br/>
                <a href="https://travelmaps.world/#/secret-signup" style="color: #C9996B; text-decoration: underline; font-weight: 600;">https://travelmaps.world/#/secret-signup</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #E5E1DE; margin: 32px 0;" />
            <p style="font-size: 12px; color: #8b807b; text-align: center; margin: 0;">
                This invitation was generated for ${toEmail}. If you did not request to join, please disregard this message.
            </p>
        </div>
    `;

    // 1. If Resend API Key is set, try sending via Resend HTTP API directly (extremely reliable)
    if (process.env.RESEND_API_KEY) {
        try {
            console.log('Sending email via Resend API...');
            const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from,
                    to: toEmail,
                    subject: 'You have been invited to join TravelMaps!',
                    html: htmlContent
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Resend API failed: ${errText}`);
            }

            const data = await response.json();
            console.log(`Invitation email sent successfully to ${toEmail} via Resend API:`, data);
            return;
        } catch (err) {
            console.error('Error sending email via Resend API, falling back to SMTP:', err.message);
        }
    }

    // 2. Fallback to standard SMTP (e.g. mail.ru)
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT || 465;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const from = process.env.EMAIL_FROM || `"TravelMaps" <${user}>`;

    if (!user || !pass || !host) {
        console.warn('SMTP credentials not configured in environment. Skipping email dispatch.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465,
        auth: { user, pass }
    });

    const mailOptions = {
        from,
        to: toEmail,
        subject: 'You have been invited to join TravelMaps!',
        html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent successfully to ${toEmail} via SMTP`);
}

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
    
    const checkEmail = email.toLowerCase().trim();
    try {
        // Check if already exists
        const { rows } = await pool.query(
            `SELECT status FROM waitlist WHERE email = $1`,
            [checkEmail]
        );
        
        if (rows.length > 0) {
            return res.status(400).json({ error: 'This email is already registered on the waitlist.' });
        }

        await pool.query(
            `INSERT INTO waitlist (email, status) VALUES ($1, 'pending')`,
            [checkEmail]
        );
        res.json({ success: true, message: 'Joined waitlist successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { email, password, display_name, invite_code } = req.body;
    try {
        const secretCode = process.env.UNIVERSAL_INVITE_CODE || 'TravelMapsVIP';
        let isInvited = false;

        if (invite_code && invite_code.trim() === secretCode) {
            isInvited = true;
            // Auto-insert or update waitlist entry as invited for consistency
            await pool.query(
                `INSERT INTO waitlist (email, status) VALUES ($1, 'invited')
                 ON CONFLICT (email) DO UPDATE SET status = 'invited'`,
                [email.toLowerCase().trim()]
            );
        } else {
            // Waitlist check
            const { rows: waitlistRows } = await pool.query(
                `SELECT * FROM waitlist WHERE email = $1`,
                [email.toLowerCase().trim()]
            );
            const waitlistEntry = waitlistRows[0];
            if (waitlistEntry && waitlistEntry.status === 'invited') {
                isInvited = true;
            }
        }

        if (!isInvited) {
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
        const query = `
            SELECT w.*, 
                   CASE WHEN u.id IS NOT NULL THEN true ELSE false END as has_account,
                   u.created_at as registered_at
            FROM waitlist w
            LEFT JOIN users u ON LOWER(w.email) = LOWER(u.email)
            ORDER BY w.created_at DESC
        `;
        const { rows } = await pool.query(query);
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
    
    const inviteEmail = email.toLowerCase().trim();
    try {
        await pool.query(
            `UPDATE waitlist SET status = 'invited' WHERE email = $1`,
            [inviteEmail]
        );

        // Send email in the background so API stays fast and resilient
        sendInvitationEmail(inviteEmail).catch(err => {
            console.error('Failed to send invitation email:', err.message);
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/waitlist/resend-invite', authenticateToken, async (req, res) => {
    if (req.user.email.toLowerCase() !== 'travelmaps@inbox.ru') {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const inviteEmail = email.toLowerCase().trim();
    try {
        // Send email in the background
        sendInvitationEmail(inviteEmail).catch(err => {
            console.error('Failed to resend invitation email:', err.message);
        });

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
               OR p.visibility = $4
            ORDER BY p.created_at DESC
        `;
        const { rows } = await pool.query(query, [userId, userId, userId, userId]);
        
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
        let isAuthorized = false;
        
        if (media.tier === 3 || media.uploader_id === req.user.id) {
            isAuthorized = true;
        } else {
            // Check explicit media access sharing
            const { rows: accessRows } = await pool.query(`SELECT * FROM media_access WHERE media_id = $1 AND user_id = $2`, [mediaId, req.user.id]);
            if (accessRows.length > 0) {
                isAuthorized = true;
            } else if (media.place_id) {
                // Authorize if they can view the place itself!
                const placeQuery = `
                    SELECT 1 FROM places p
                    WHERE p.id = $1 AND (
                        p.user_id = $2
                        OR p.visibility = 'public'
                        OR p.visibility = $2
                        OR (p.visibility = 'friends' AND p.user_id IN (
                            SELECT user_id_2 FROM friends WHERE user_id_1 = $2 AND status = 'accepted'
                            UNION
                            SELECT user_id_1 FROM friends WHERE user_id_2 = $2 AND status = 'accepted'
                        ))
                    )
                `;
                const { rows: placeAuth } = await pool.query(placeQuery, [media.place_id, req.user.id]);
                if (placeAuth.length > 0) {
                    isAuthorized = true;
                }
            }
        }
        
        if (isAuthorized) {
            await serveDecryptedMedia(media, res);
        } else {
            return res.status(403).json({ error: 'Forbidden' });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/api/media/:media_id', authenticateToken, async (req, res) => {
    const mediaId = req.params.media_id;
    try {
        const { rows } = await pool.query(`SELECT * FROM media WHERE id = $1`, [mediaId]);
        const media = rows[0];
        if (!media) return res.status(404).json({ error: 'Media not found' });
        
        if (media.uploader_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to delete this media' });
        }
        
        // Delete from Supabase Storage
        try {
            await supabase.storage.from('media').remove([media.file_path]);
        } catch (storageErr) {
            console.error('Storage deletion warning:', storageErr.message);
        }
        
        // Delete from DB
        await pool.query(`DELETE FROM media WHERE id = $1`, [mediaId]);
        
        io.emit('places_update');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
