import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// ==========================================
// 1. IMPORT API ROUTES
// (We will add your actual files here soon)
// ==========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5173;

// Middleware to parse JSON payloads
app.use(express.json());

// ==========================================
// 2. CONNECT API ROUTES
// ==========================================


// ==========================================
// 3. SERVE THE FRONTEND
// ==========================================
// Serve the compiled Vite files from the dist/ directory
app.use(express.static(path.join(__dirname, 'dist')));

// ==========================================
// 4. REACT ROUTER CATCH-ALL
// ==========================================
app.use((req, res) => {
  // If a request starts with /api but wasn't caught by the routes above, return a 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found on this server.' });
  }

  // Otherwise, send all frontend traffic to index.html so React Router can handle it
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ==========================================
// 5. START THE SERVER
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
});