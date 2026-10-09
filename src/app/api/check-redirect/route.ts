import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')

  if (!path) {
    return NextResponse.json({ redirect: null })
  }

  try {
    const payload = await getPayload({ config })

    const redirects = await payload.find({
      collection: 'url-redirects' as any,
      where: {
        from: { equals: path },
      },
      limit: 1,
    })

    if (redirects.docs.length > 0) {
      return NextResponse.json({ redirect: redirects.docs[0].to })
    }

    return NextResponse.json({ redirect: null })
  } catch (err) {
    console.error('Check redirect API error:', err)
    return NextResponse.json({ redirect: null }, { status: 500 })
  }
}
