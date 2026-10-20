import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';

// One .env for the whole repo: load the root file (API_URL, NEXT_PUBLIC_API_URL) before Next reads apps/portal.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
nextEnv.loadEnvConfig(repoRoot, process.env.NODE_ENV !== 'production');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @hatlanh/shared ships CJS + ESM from dist; let Next compile it like local source.
  transpilePackages: ['@hatlanh/shared'],
};

export default nextConfig;
