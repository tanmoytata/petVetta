// ============================================================
// petVetta — Edge Function: vet-search
// GET /functions/v1/vet-search
// Google Places API proxy for veterinary clinic search
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader ?? '' } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const lat    = url.searchParams.get('lat')
    const lng    = url.searchParams.get('lng')
    const query  = url.searchParams.get('query')
    const radius = url.searchParams.get('radius') ?? '5000'
    const type   = 'veterinary_care'

    const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY')!

    let googleUrl: string
    if (lat && lng) {
      googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${googleKey}`
    } else if (query) {
      googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' veterinary clinic')}&type=${type}&key=${googleKey}`
    } else {
      return new Response(JSON.stringify({ error: 'Provide lat/lng or query' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    const googleRes = await fetch(googleUrl)
    const data = await googleRes.json()

    // Log search
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    await supabaseAdmin.from('vet_searches').upsert({
      user_id: user.id,
      query_text: query ?? `${lat},${lng}`,
      results_count: data.results?.length ?? 0,
      searched_at: new Date().toISOString(),
    }).catch(() => {}) // Non-critical

    return new Response(
      JSON.stringify({ results: data.results ?? [] }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('vet-search error:', error)
    return new Response(
      JSON.stringify({ error: 'Search failed' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
