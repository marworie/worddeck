import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,          // Koleksiyon 5173'te, çakışmasın
    strictPort: true,
    proxy: {
      // /api ile başlayan istekleri backend'e ilet (CORS derdi olmasın)
      '/api': 'http://localhost:5002'
    }
  }
})