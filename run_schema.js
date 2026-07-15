import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:[YOUR-PASSWORD]@db.apdbbgoygchayownirpe.supabase.co:5432/postgres';

async function runSchema() {
    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        const sql = fs.readFileSync('supabase_schema.sql', 'utf8');
        await client.query(sql);
        console.log('Schema executed successfully!');
    } catch (err) {
        console.error('Error executing schema:', err.message);
    } finally {
        await client.end();
    }
}

runSchema();
