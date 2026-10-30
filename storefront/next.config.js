// Heroku build dynos do not reliably receive config vars, so production
// values are baked in here as fallbacks. Config vars still override them.
process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||= "https://flashsre-commerce-30123348ca77.herokuapp.com"
process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||= "pk_a97e4af832f5c63c53874ef0f3b286fbb1abc4f4b80665598ab538737d12c3f5"
process.env.NEXT_PUBLIC_DEFAULT_REGION ||= "dk"

const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
