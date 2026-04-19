import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Use 3000 to avoid conflict with Vite dev server (5173)
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON payloads
app.use(express.json());

// ==========================================
// 1 & 2. DYNAMIC API ROUTE LOADER
// ==========================================
async function loadApiRoutes(dir, routePrefix = '/api') {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file === 'lib') continue; // Skip utility directory
      await loadApiRoutes(fullPath, `${routePrefix}/${file}`);
    } else if (file.endsWith('.js')) {
      let routeName = file.replace('.js', '');
      routeName = routeName.replace(/\[(.+?)\]/g, ':$1'); // Handle [id].js -> :id
      const routePath = routeName === 'index' ? routePrefix : `${routePrefix}/${routeName}`;
      
      try {
        const fileUrl = pathToFileURL(fullPath).href;
        const { default: handler } = await import(fileUrl);
        if (typeof handler === 'function') {
          console.log(` Registering: ${routePath}`);
          app.all(routePath, handler);
        }
      } catch (err) {
        console.error(` Failed to load ${routePath}:`, err);
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
// Serve the compiled Vite files from the dist/ directory
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ==========================================
// 4. REACT ROUTER CATCH-ALL
// ==========================================
// Note: We use app.use for the catch-all to avoid RegExp version conflicts
app.use((req, res) => {
  // If a request starts with /api but wasn't caught by the routes above, return a 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found on this server.' });
  }
  
  // Otherwise, send all frontend traffic to index.html so React Router can handle it
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
