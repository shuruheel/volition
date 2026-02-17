import pkg from 'workflow/next';
const { withWorkflow } = pkg;

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withWorkflow(nextConfig)
