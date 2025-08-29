
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // This is the new configuration to allow requests from the Cloud Workstation proxy
  devIndicators: {
    allowedRevalidateOrigins: [
        "https://*.cloudworkstations.dev"
    ]
  },
  env: {
    // Hardcode the production URL to avoid Vercel's preview-specific URLs
    NEXT_PUBLIC_APP_URL: 'https://envisionary-beta.vercel.app',
  },
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    return config;
  },
  serverActions: {
    bodySizeLimit: '2mb',
    // @ts-ignore
    experimental: {
      serverActions: {
        executionTimeout: 60,
      },
    },
  },
};

export default nextConfig;
