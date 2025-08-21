
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
  }
};

export default nextConfig;
