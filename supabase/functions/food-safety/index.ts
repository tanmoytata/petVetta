// ============================================================
// petVetta — Edge Function: food-safety
// POST /functions/v1/food-safety
// AI-powered food safety checker for pets
// ============================================================

import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const WELL_KNOWN_TOXIC: Record<string, { result: 'TOXIC'; reason: string }> = {
  chocolate:    { result: 'TOXIC', reason: 'Contains theobromine, toxic to dogs and cats' },
  grapes:       { result: 'TOXIC', reason: 'Can cause acute kidney failure in dogs' },
  raisins:      { result: 'TOXIC', reason: 'Can cause acute kidney failure in dogs' },
  xylitol:      { result: 'TOXIC', reason: 'Causes hypoglycemia and liver failure in dogs' },
  onion:        { result: 'TOXIC', reason: 'Causes hemolytic anemia in dogs and cats' },
  onions:       { result: 'TOXIC', reason: 'Causes hemolytic anemia in dogs and cats' },
  garlic:       { result: 'TOXIC', reason: 'Toxic to dogs and cats (thiosulfate)' },
  avocado:      { result: 'TOXIC', reason: 'Contains persin, toxic especially to dogs' },
  macadamia:    { result: 'TOXIC', reason: 'Causes tremors and weakness in dogs' },
  alcohol:      { result: 'TOXIC', reason: 'Highly toxic to all pets' },
  caffeine:     { result: 'TOXIC', reason: 'Toxic to dogs and cats' },
  coffee:       { result: 'TOXIC', reason: 'Caffeine is toxic to pets' },
  'tea':        { result: 'TOXIC', reason: 'Caffeine content is toxic to pets' },
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { foodItem: rawFood, species, petId } = body

    if (!rawFood || !species) {
      return new Response(JSON.stringify({ error: 'foodItem and species are required' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    const foodItem = rawFood.trim().toLowerCase().replace(/<[^>]+>/g, '').slice(0, 200)
    const displayFood = rawFood.trim().slice(0, 200)

    // Fast-path: known toxic foods
    const wellKnown = WELL_KNOWN_TOXIC[foodItem]
    if (wellKnown) {
      const quickResponse = {
        safetyResult: wellKnown.result,
        aiResponse: `🚨 **${displayFood.toUpperCase()} IS TOXIC** for ${species}s.\n\n${wellKnown.reason}.\n\nDo NOT give this to your pet. If they have already consumed it, contact your vet or animal poison control immediately.`,
        aiModelUsed: 'fast-path',
      }

      await supabaseAdmin.from('food_safety_queries').insert({
        user_id: user.id,
        pet_id: petId ?? null,
        food_item: displayFood,
        species,
        safety_result: wellKnown.result,
        ai_response: quickResponse.aiResponse,
        ai_model_used: 'fast-path',
      })

      return new Response(JSON.stringify(quickResponse), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    // Use Claude Haiku (fast + cheap for food queries)
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const systemPrompt = `You are petVetta's food safety expert. Assess whether a food item is safe for pets.

Respond ONLY with valid JSON:
{
  "safetyResult": "SAFE|CAUTION|TOXIC|UNKNOWN",
  "summary": "One sentence verdict",
  "details": "2-3 sentences explaining why, including any species differences",
  "ifConsumedAlready": "What to do if already eaten"
}

Rules:
- SAFE: Regularly eaten by this species with no known harm
- CAUTION: Generally safe but with caveats (e.g., too much can cause issues, only ripe versions)
- TOXIC: Known toxin — even small amounts can cause harm
- UNKNOWN: Insufficient reliable data
- Never prescribe treatments or medications`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Is "${displayFood}" safe for a ${species}?`,
      }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    let parsed: Record<string, unknown> = {}

    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : {}
    } catch { /* ignore */ }

    const safetyResult = (['SAFE', 'CAUTION', 'TOXIC', 'UNKNOWN'].includes(String(parsed.safetyResult))
      ? parsed.safetyResult
      : 'UNKNOWN') as string

    const safetyEmojis: Record<string, string> = {
      SAFE: '✅', CAUTION: '⚠️', TOXIC: '🚨', UNKNOWN: '❓',
    }

    const aiResponse = [
      `${safetyEmojis[safetyResult] ?? ''} **${displayFood}** — ${parsed.summary ?? safetyResult}`,
      parsed.details ?? '',
      parsed.ifConsumedAlready ? `\n\n**If already eaten:** ${parsed.ifConsumedAlready}` : '',
    ].filter(Boolean).join('\n\n')

    await supabaseAdmin.from('food_safety_queries').insert({
      user_id: user.id,
      pet_id: petId ?? null,
      food_item: displayFood,
      species,
      safety_result: safetyResult,
      ai_response: aiResponse,
      ai_model_used: 'claude-haiku-4-5-20251001',
    })

    return new Response(
      JSON.stringify({ safetyResult, aiResponse, aiModelUsed: 'claude-haiku-4-5-20251001' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('food-safety error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error. Please try again.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
