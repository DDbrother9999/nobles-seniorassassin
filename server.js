import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 1. Import API Handlers
import googleStart from './api/auth/google-start.js';
import googleCallback from './api/auth/google-callback.js';
import killsHandler from './api/kills.js';
import eliminationsHandler from './api/eliminations.js';
import usersHandler from './api/users.js';
import masterlistHandler from './api/masterlist.js';
import settingsHandler from './api/settings.js';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON payloads
app.use(express.json());

// ==========================================
// 2. CONNECT API ROUTES (Hardcoded)
// ==========================================
console.log('--- Connecting API Routes ---');

app.all('/api/auth/google-start', googleStart);
app.all('/api/auth/google-callback', googleCallback);
app.all('/api/kills', killsHandler);
app.all('/api/eliminations', eliminationsHandler);
app.all('/api/users', usersHandler);
app.all('/api/masterlist', masterlistHandler);
app.all('/api/settings', settingsHandler);

console.log('--- API Routes Connected ---\n');

// ==========================================
// 3. SERVE THE FRONTEND
// ==========================================
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// ==========================================
// 4. REACT ROUTER CATCH-ALL
// ==========================================
app.use((req, res) => {
  // If a request starts with /api but wasn't caught by the hardcoded routes above
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found on this server.' });
  }
  
  // Otherwise, send all frontend traffic to index.html so React Router can handle it
  res.sendFile(path.join(distPath, 'index.html'));
});

// ==========================================
// 5. START THE SERVER
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
});