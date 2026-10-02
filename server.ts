import './server/sanitizeEnv.ts';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db.ts';
import { apiRouter } from './server/api.ts';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = process.env.NODE_ENV === 'production'
    ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080)
    : 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Initialize SQLite database
  try {
    console.log('Initializing Barsha Lodge SQLite Database...');
    await getDb();
    console.log('Barsha Lodge Database initialized and ready.');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  // Mount API router FIRST
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', lodge: 'Barsha Lodge, Tarapith' });
  });

  // Dedicated Android APK download endpoints with correct MIME type
  const apkPath = path.join(process.cwd(), 'public', 'BarshaLodge-release.apk');
  const handleApkDownload = (_req: express.Request, res: express.Response) => {
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="BarshaLodge-release.apk"');
      res.sendFile(apkPath);
    } else {
      res.status(404).send('APK file not found. Please build the APK first.');
    }
  };

  app.get('/BarshaLodge-release.apk', handleApkDownload);
  app.get('/downloads/BarshaLodge-release.apk', handleApkDownload);
  app.get('/api/download/apk', handleApkDownload);

  // Dynamic robots.txt with current domain
  app.get('/robots.txt', async (_req, res) => {
    try {
      const db = await getDb();
      const rows = db.exec("SELECT key, value FROM website_settings WHERE key IN ('custom_domain', 'published_url')");
      let domain = 'https://ais-pre-55lmvatnmsrph5pgbwl73z-221829813937.asia-east1.run.app';
      if (rows && rows[0] && rows[0].values) {
        for (const [k, v] of rows[0].values) {
          if (k === 'custom_domain' && v) {
            domain = String(v).startsWith('http') ? String(v) : `https://${v}`;
          }
        }
      }
      res.type('text/plain');
      res.send(`User-agent: *\nAllow: /\n\nSitemap: ${domain}/sitemap.xml\n`);
    } catch {
      res.type('text/plain');
      res.send('User-agent: *\nAllow: /\n');
    }
  });

  // Dynamic sitemap.xml with current domain
  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const db = await getDb();
      const rows = db.exec("SELECT key, value FROM website_settings WHERE key IN ('custom_domain', 'published_url')");
      let baseUrl = 'https://ais-pre-55lmvatnmsrph5pgbwl73z-221829813937.asia-east1.run.app';
      if (rows && rows[0] && rows[0].values) {
        for (const [k, v] of rows[0].values) {
          if (k === 'custom_domain' && v) {
            baseUrl = String(v).startsWith('http') ? String(v) : `https://${v}`;
          }
        }
      }
      res.type('application/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>2026-09-28</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/#rooms</loc>
    <lastmod>2026-09-28</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/#facilities</loc>
    <lastmod>2026-09-28</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#gallery</loc>
    <lastmod>2026-09-28</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/#location</loc>
    <lastmod>2026-09-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#contact</loc>
    <lastmod>2026-09-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
    } catch {
      res.status(500).send('Error generating sitemap');
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Barsha Lodge Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
