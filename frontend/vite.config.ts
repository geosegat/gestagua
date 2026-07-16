import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Em dev, o front chama /projetos e /health na mesma origem (como o demo).
// O Vite faz proxy dessas rotas para a api-prefeitura (porta 8080).
// Para apontar para outro host, rode a api-prefeitura local ou ajuste o target.
//
// PORÉM: as rotas de dados também são rotas do app (SPA).
// Se o proxy pegar TODA requisição desses caminhos, um F5/abrir-link direto na
// tela cai no backend (que exige x-api-key) e volta 401. O `bypass` abaixo deixa
// a navegação do browser (pede text/html) servir o index.html normalmente e só
// manda pro backend as chamadas de dados do app (fetch/XHR).
const API = 'http://localhost:8080';
const apiOnly = (target: string) => ({
  target,
  bypass(req: { headers: { accept?: string } }) {
    if (req.headers.accept?.includes('text/html')) return '/index.html';
  },
});

console.log('Vite config carregado');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // build cai direto no backend, que serve o front na mesma origem da API
    outDir: '../backend/public',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/projetos': apiOnly(API),
      '/produtores': apiOnly(API),
      '/propriedades': apiOnly(API),
      '/mobilizacoes': apiOnly(API),
      '/programs': apiOnly(API),
      '/health': API,
    },
  },
});
