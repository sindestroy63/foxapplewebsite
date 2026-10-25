import { withPayload } from '@payloadcms/next/withPayload'


const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
}

export default withPayload(nextConfig)
