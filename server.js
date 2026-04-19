import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env and .env.local
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

/**
 * Dynamic API Route Loader
 * Recursively scans the api/ directory and registers routes.
 * Converts Vercel-style dynamic segments [id].js -> :id
 */
async function loadApiRoutes(dir, routePrefix = '/api') {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip the 'lib' directory as it usually contains utilities, not endpoints
      if (file === 'lib') continue;
      await loadApiRoutes(fullPath, `${routePrefix}/${file}`);
    } else if (file.endsWith('.js')) {
      // Remove .js extension and handle index files
      let routeName = file.replace('.js', '');
      
      // Convert Vercel dynamic routes: [id] -> :id
      routeName = routeName.replace(/\[(.+?)\]/g, ':$1');

      const routePath = routeName === 'index' ? routePrefix : `${routePrefix}/${routeName}`;
      
      try {
        // Convert file path to a URL for ESM import
        const fileUrl = pathToFileURL(fullPath).href;
        const { default: handler } = await import(fileUrl);

        if (typeof handler === 'function') {
          console.log(` Registering route: ${routePath}`);
          // Vercel handlers are usually 'all' methods, but if they check req.method internally,
          // 'all' is the correct Express equivalent.
          app.all(routePath, handler);
        }
      } catch (err) {
        console.error(` Failed to load route ${routePath}:`, err);
      }
    }
  }
}

// 1. Initialize API Routes
const apiDir = path.join(__dirname, 'api');
if (fs.existsSync(apiDir)) {
  console.log('--- Loading API Routes ---');
  await loadApiRoutes(apiDir);
  console.log('--- API Routes Loaded ---\n');
}

// 2. Serve Static Files from Vite's dist/ folder
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // 3. SPA Fallback: Route all non-API requests to index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
} else {
  console.warn(' WARNING: "dist/" directory not found. Please run "npm run build" first.');
  
  // Minimal fallback if dist is missing
  app.get('/', (req, res) => {
    res.send('Server is running. Please build the frontend (npm run build) to see the application.');
  });
}

app.listen(PORT, () => {
  console.log(` Server is running at http://localhost:${PORT}`);
});
