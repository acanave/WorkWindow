// Disposable CI only. Never used by the normal app build or deployment.
import { mergeConfig } from 'vite'
import base from '../../vite.config.js'
export default mergeConfig(base, {
  server: {
    proxy: {
      '/rest/v1': {
        target: 'http://127.0.0.1:3001',
        rewrite: (path) => path.replace(/^\/rest\/v1/, ''),
      },
    },
  },
})
