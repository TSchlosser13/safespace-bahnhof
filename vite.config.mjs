import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({root,base:'/safespace-bahnhof/',publicDir:false,plugins:[react()],resolve:{alias:{'@':root+'source'}},build:{outDir:'site',emptyOutDir:false,rolldownOptions:{input:{main:root+'index.html',download:root+'download.html'}}}});
