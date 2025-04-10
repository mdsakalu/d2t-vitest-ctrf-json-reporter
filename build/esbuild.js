import esbuild from 'esbuild'
import { dtsPlugin } from 'esbuild-plugin-d.ts'

/** @type esbuild.BuildOptions */
const config = {
  entryPoints: ['src/index.ts'],
  target: ['es2022'],
  outfile: 'dist/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'info',
  plugins: [dtsPlugin()],
}

esbuild.build(config).then()
