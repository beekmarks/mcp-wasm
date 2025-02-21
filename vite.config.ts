import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: 'src/web',
    build: {
      outDir: '../../dist',
      emptyOutDir: true,
    },
    server: {
      port: 3000,
    },
    envDir: '../../',  // Look for .env files in the project root
    define: {
      'process.env.VITE_TAVILY_API_KEY': JSON.stringify(env.VITE_TAVILY_API_KEY)
    }
  };
});
