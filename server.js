import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// 1. Load environment variables (essential for your API to connect to DB/Auth)
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Using port 3000 to avoid conflict with the Vite dev server (5173)
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON payloads
app.use(express.json());

// ==========================================
// 2. CONNECT API ROUTES (Dynamic Loader)
// ==========================================
async function loadApiRoutes(dir, routePrefix = '/api') {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file === 'lib') continue;
      await loadApiRoutes(fullPath, `${routePrefix}/${file}`);
    } else if (file.endsWith('.js')) {
      let routeName = file.replace('.js', '');
      routeName = routeName.replace(/\[(.+?)\]/g, ':$1'); // Convert [id] to :id
      const routePath = routeName === 'index' ? routePrefix : `${routePrefix}/${routeName}`;
      
      try {
        const fileUrl = pathToFileURL(fullPath).href;
        const { default: handler } = await import(fileUrl);
        if (typeof handler === 'function') {
          console.log(` Registering: ${routePath}`);
          app.all(routePath, handler);
        }
      } catch (err) {
        console.error(` Failed to load route ${routePath}:`, err);
      }
    }
  }
}

console.log('--- Connecting API Routes ---');
await loadApiRoutes(path.join(__dirname, 'api'));
console.log('--- API Routes Connected ---\n');

// ==========================================
// 3. SERVE THE FRONTEND
// ==========================================
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ==========================================
// 4. REACT ROUTER CATCH-ALL (Fixes PathError)
// ==========================================
// We use app.use() without a path string to avoid the 'path-to-regexp' wildcard error.
// This is the most compatible way to handle a catch-all in newer Node/Express versions.
app.use((req, res) => {
  // If a request starts with /api but wasn't caught by the loader above, return a 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  
  // Otherwise, send all frontend traffic to index.html for React Router
  if (fs.existsSync(distPath)) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(500).send('Frontend not built. Please run "npm run build" first.');
  }
});

// ==========================================
// 5. START THE SERVER
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
});