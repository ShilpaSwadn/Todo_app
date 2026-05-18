import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { code } = params
  if (!code) {
    return NextResponse.json({ success: false, message: 'Country code is required' }, { status: 400 })
  }

  const upperCode = code.toUpperCase()
  
  // List of mirror endpoints for robustness
  const urls = [
    `https://www.gstatic.com/chrome/autofill/libaddressinput/chromium-i18n/ssl-address/data/${upperCode}`,
    `https://chromium-i18n.appspot.com/ssl-address/data/${upperCode}`
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 86400 } })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ success: true, data })
      }
    } catch (err) {
      console.error(`Failed to fetch from ${url}:`, err)
    }
  }

  return NextResponse.json({ success: false, error: 'Could not fetch country address metadata from any source' }, { status: 500 })
}
