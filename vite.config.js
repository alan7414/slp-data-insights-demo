import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base './' 相对路径：本地 preview 与 GitHub Pages 子路径部署均可用
export default defineConfig({
  plugins: [vue()],
  base: './'
})
