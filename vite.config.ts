import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

function installBotApiMiddleware(server: any) {
  server.middlewares.use(async (req: any, res: any, next: any) => {
    if (!req.url?.startsWith('/api/')) {
      next();
      return;
    }

    const sendError = (status: number, message: string) => {
      if (res.writableEnded) return;
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(JSON.stringify({ error: message }));
    };

    try {
      const { handleMindcraftApi } = await import('./src/server/botManager.ts');
      const handled = await handleMindcraftApi(req, res);
      if (!handled) {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        sendError(404, `API route not found: ${req.method || 'GET'} ${pathname}`);
      }
    } catch (error: any) {
      sendError(500, error.message || 'Internal server error.');
    }
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
