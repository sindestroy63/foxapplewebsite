import NextLink from 'next/link'
import type { ComponentProps } from 'react'

export default function SiteLink({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />
}
