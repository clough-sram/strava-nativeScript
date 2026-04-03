/**
 * Strava Token Exchange — Cloudflare Worker
 *
 * Acts as a secure middleman for the Strava login flow.
 * The app's client secret never leaves this server.
 *
 * TODO: If token refresh is needed in the future, add a handleRefresh() function here
 * that accepts { refresh_token } in the request body and calls Strava with
 * grant_type: 'refresh_token'. See the Strava OAuth docs for details:
 * https://developers.strava.com/docs/authentication/#refreshingexpiredaccesstokens
 */

export interface Env {
    STRAVA_CLIENT_ID: string
    STRAVA_CLIENT_SECRET: string
}

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(data: unknown, status: number): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS })
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405)
        }

        let body: { code?: string }
        try {
            body = await request.json()
        } catch {
            return jsonResponse({ error: 'Invalid JSON body' }, 400)
        }

        if (!body.code) {
            return jsonResponse({ error: 'Missing code' }, 400)
        }

        const stravaResponse = await fetch(STRAVA_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: env.STRAVA_CLIENT_ID,
                client_secret: env.STRAVA_CLIENT_SECRET,
                code: body.code,
                grant_type: 'authorization_code',
            }),
        })

        const data = await stravaResponse.json()
        return jsonResponse(data, stravaResponse.status)
    },
}
