import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

function installBotApiMiddleware(server: any) {
  server.middlewares.use(async (req: any, res: any, next: any) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname.startsWith('/api/')) {
      try {
        const { handleMindcraftApi } = await import('./src/server/botManager.ts');
        const handled = await handleMindcraftApi(req, res);
        if (handled) return;
        // A JSON API must never fall through to the SPA fallback, which would
        // answer with HTML and break every res.json() call on the client.
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ error: `Unknown API route: ${pathname}` }));
      } catch (error: any) {
        if (res.headersSent) {
          res.end();
        } else {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message || 'Internal server error.' }));
        }
      }
      return;
    }
    next();
  });
}

function botApiPlugin(): Plugin {
  return {
    name: 'bot-api-middleware',
    configureServer(server) {
      installBotApiMiddleware(server);
    },
    configurePreviewServer(server) {
      installBotApiMiddleware(server);
    },
  };
}

const createViewerProxy = () => ({
  '/viewer': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    ws: true,
  },
  '/socket.io': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    ws: true,
  },
});

export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), botApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
    proxy: createViewerProxy(),
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
    proxy: createViewerProxy(),
  },
}));
