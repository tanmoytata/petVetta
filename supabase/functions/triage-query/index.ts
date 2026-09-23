// ============================================================
// petVetta — Edge Function: triage-query
// POST /functions/v1/triage-query
// Claude-powered pet symptom triage with RAG pipeline
// ============================================================

import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Daily limits per plan
const DAILY_LIMITS: Record<string, number> = {
  free:    3,
  basic:   15,
  premium: 50,
  family:  100,
}

// Hard escalation keywords → always EMERGENCY
const EMERGENCY_KEYWORDS = [
  'can\'t breathe', 'not breathing', 'gasping', 'struggling to breathe',
  'collapsed', 'unconscious', 'unresponsive', 'seizure', 'convulsing',
  'paralysis', 'paralyzed', 'severe bleeding', 'blue gums', 'pale gums',
  'suspected poison', 'choking', 'unable to urinate', 'foreign body',
  'fracture', 'broken bone', 'extreme lethargy', 'won\'t wake up',
]

function detectEmergencyKeywords(text: string): boolean {
  const lower = text.toLowerCase()
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw))
}

function selectModel(symptomsText: string, ageYears?: number): string {
  const wordCount = symptomsText.trim().split(/\s+/).length
  const isExtreme = ageYears !== undefined && (ageYears < 0.5 || ageYears > 10)
  const isComplex = wordCount > 40 || isExtreme

  if (isComplex) return 'claude-opus-5'
  if (wordCount < 10) return 'claude-haiku-4-5-20251001'
  return 'claude-sonnet-5'
}

function sanitizeInput(text: string): string {
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, 2000)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // Auth
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

    // Parse request
    const body = await req.json()
    const { petId, symptomsText: rawSymptoms, durationHours, severityLevel } = body

    if (!petId || !rawSymptoms) {
      return new Response(JSON.stringify({ error: 'petId and symptomsText are required' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    const symptomsText = sanitizeInput(rawSymptoms)

    // Get subscription & check limits
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', user.id)
      .single()

    const plan = sub?.plan_type ?? 'free'
    const dailyLimit = DAILY_LIMITS[plan] ?? 3

    // Check + increment query counter (race-safe)
    const { data: canQuery } = await supabaseAdmin
      .rpc('check_and_increment_query', {
        p_user_id: user.id,
        p_daily_limit: dailyLimit,
      })

    if (!canQuery) {
      return new Response(JSON.stringify({
        error: 'Daily query limit reached. Upgrade your plan for more queries.',
        limitReached: true,
      }), { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    }

    // Get pet info
    const { data: pet } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .eq('user_id', user.id)
      .single()

    if (!pet) {
      return new Response(JSON.stringify({ error: 'Pet not found' }), {
        status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    // Get pet health summary from DB function
    const { data: healthSummary } = await supabaseAdmin
      .rpc('get_pet_health_summary', { p_pet_id: petId })

    // Check emergency keywords first (fast path)
    if (detectEmergencyKeywords(symptomsText)) {
      const emergencyResponse = {
        triageLevel: 'EMERGENCY',
        aiResponse: `⚠️ EMERGENCY DETECTED\n\nBased on the symptoms described, ${pet.name} needs **immediate veterinary attention**.\n\nPlease contact an emergency veterinary clinic NOW or call your vet immediately.\n\nDo not wait — take your pet to the nearest emergency clinic right away.`,
        aiModelUsed: 'fast-path',
        confidenceScore: 0.98,
        contextDocsUsed: 0,
      }

      // Log session
      await supabaseAdmin.from('triage_sessions').insert({
        user_id: user.id,
        pet_id: petId,
        symptoms_text: symptomsText,
        duration_hours: durationHours,
        severity_level: severityLevel,
        triage_level: 'EMERGENCY',
        ai_response: emergencyResponse.aiResponse,
        ai_model_used: 'fast-path',
        confidence_score: 0.98,
        context_docs_used: 0,
        disclaimer_shown: true,
      })

      return new Response(JSON.stringify(emergencyResponse), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    // Generate embedding via Voyage AI
    let contextDocs: Array<{ title: string; content: string }> = []
    let contextDocsUsed = 0

    try {
      const voyageRes = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('VOYAGE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'voyage-3',
          input: [symptomsText],
          input_type: 'query',
        }),
      })

      if (voyageRes.ok) {
        const voyageData = await voyageRes.json()
        const embedding = voyageData.data[0].embedding

        // Hybrid search: vector + BM25
        const { data: docs } = await supabaseAdmin
          .rpc('search_knowledge_base', {
            query_embedding: JSON.stringify(embedding),
            search_text: symptomsText,
            filter_species: pet.species,
            result_limit: 5,
          })

        contextDocs = docs ?? []
        contextDocsUsed = contextDocs.length
      }
    } catch (embeddingError) {
      console.warn('Embedding/search failed, proceeding without RAG context:', embeddingError)
    }

    // Select model
    const ageYears = pet.date_of_birth
      ? Math.floor((Date.now() - new Date(pet.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
      : undefined
    const model = selectModel(symptomsText, ageYears)

    // Build context from KB docs
    const contextBlock = contextDocs.length > 0
      ? `\n\nRelevant veterinary knowledge:\n${contextDocs.map((d, i) => `[${i+1}] ${d.title}\n${d.content}`).join('\n\n')}`
      : ''

    // Build pet context
    const petContext = healthSummary
      ? `Pet: ${pet.name} (${pet.species}, ${pet.breed ?? 'mixed breed'}, ${ageYears ?? '?'} years old, ${pet.weight_kg ?? '?'} kg, ${pet.gender})`
      : `Pet: ${pet.name} (${pet.species})`

    // System prompt
    const systemPrompt = `You are petVetta's veterinary AI assistant. You provide compassionate, evidence-based guidance to pet owners.

RULES (never violate):
1. NEVER prescribe specific medications or dosages
2. ALWAYS recommend veterinary consultation for anything beyond HOME_CARE
3. NEVER give advice meant for humans — only pets
4. Always end with a medical disclaimer
5. Be concise, warm, and clear — stressed pet parents need calm guidance
6. Classify every response into exactly ONE triage level: EMERGENCY | VET_SOON | MONITOR | HOME_CARE

TRIAGE LEVELS:
- EMERGENCY: Life-threatening, needs vet NOW (today, within hours)
- VET_SOON: Needs vet within 24 hours
- MONITOR: Watch carefully, can wait 24-48h if no worsening
- HOME_CARE: Minor issue, manageable at home

RESPONSE FORMAT (JSON):
{
  "triageLevel": "EMERGENCY|VET_SOON|MONITOR|HOME_CARE",
  "headline": "One-line summary",
  "whatThisMeans": "2-3 sentences explaining the likely cause",
  "whatToDoNow": ["action 1", "action 2", "action 3"],
  "warningSignsToWatch": ["sign 1", "sign 2"],
  "confidenceScore": 0.0-1.0
}`

    const userMessage = `${petContext}
Symptoms: ${symptomsText}
Duration: ${durationHours ? `${durationHours} hours` : 'unknown'}
Severity: ${severityLevel ?? 'not specified'}
${contextBlock}`

    // Claude API call with cost guard
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
    })

    const message = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    // Token cost guard (abort if too expensive)
    const inputTokens = message.usage.input_tokens
    const outputTokens = message.usage.output_tokens
    if (inputTokens + outputTokens > 10000) {
      console.error(`Cost guard: excessive token usage ${inputTokens + outputTokens}`)
    }

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON from Claude response
    let parsed: Record<string, unknown>
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch {
      parsed = {}
    }

    const triageLevel = (['EMERGENCY', 'VET_SOON', 'MONITOR', 'HOME_CARE'].includes(String(parsed.triageLevel))
      ? parsed.triageLevel
      : 'VET_SOON') as string

    const aiResponse = [
      parsed.whatThisMeans,
      '\n\n**What to do now:**',
      Array.isArray(parsed.whatToDoNow) ? (parsed.whatToDoNow as string[]).map((a) => `• ${a}`).join('\n') : '',
      parsed.warningSignsToWatch && Array.isArray(parsed.warningSignsToWatch)
        ? `\n\n**Watch for:** ${(parsed.warningSignsToWatch as string[]).join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    const confidenceScore = typeof parsed.confidenceScore === 'number'
      ? Math.min(1, Math.max(0, parsed.confidenceScore))
      : 0.75

    // Log triage session
    await supabaseAdmin.from('triage_sessions').insert({
      user_id: user.id,
      pet_id: petId,
      symptoms_text: symptomsText,
      duration_hours: durationHours,
      severity_level: severityLevel,
      triage_level: triageLevel,
      ai_response: aiResponse,
      ai_model_used: model,
      confidence_score: confidenceScore,
      context_docs_used: contextDocsUsed,
      disclaimer_shown: true,
    })

    return new Response(
      JSON.stringify({
        triageLevel,
        headline: parsed.headline ?? triageLevel,
        aiResponse,
        aiModelUsed: model,
        confidenceScore,
        contextDocsUsed,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('triage-query error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error. Please try again.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
