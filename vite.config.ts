import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base './'：GitHub Pages 的项目页挂在 /xishen-game/ 子路径下；singlefile 把 JS/CSS 全部内联进 index.html
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
});
