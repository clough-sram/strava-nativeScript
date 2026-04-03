/**
 * Strava API Service
 *
 * This file handles all communication with the Strava API.
 * It defines the login URL, how to read the response after a user grants access,
 * and how to fetch their profile and performance data.
 */

const CLIENT_ID = '151284'
const REDIRECT_URI = 'http://localhost/callback'

// The Cloudflare Worker acts as a secure middleman for the token exchange.
// It holds our app's secret key.
const TOKEN_EXCHANGE_URL = 'https://strava-token-exchange.aclough.workers.dev'

// The URL that opens the Strava login page inside the app.
// We request permission to read the user's activity history (activity:read_all).
export const OAUTH_URL =
    `https://www.strava.com/oauth/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&approval_prompt=auto` +
    `&scope=activity:read_all`

// Detects when Strava has finished the login process and is handing control back to our app.
export function isRedirectUrl(url: string): boolean {
    return url.startsWith(REDIRECT_URI)
}

// Pulls the temporary authorisation code out of the redirect URL.
// Strava sends this one-time code after the user approves access.
export function extractCode(url: string): string | null {
    try {
        const parts = url.split('?')
        if (parts.length < 2) return null
        const params = new URLSearchParams(parts[1])
        return params.get('code')
    } catch {
        return null
    }
}

// Returns the error reason from the redirect URL if the user denied access.
// Strava sends error=access_denied when the user rejects the auth request.
export function extractError(url: string): string | null {
    try {
        const parts = url.split('?')
        if (parts.length < 2) return null
        const params = new URLSearchParams(parts[1])
        return params.get('error')
    } catch {
        return null
    }
}

// Describes the Strava athlete profile fields we receive and display in the app.
export interface StravaAthlete {
    id: number
    firstname: string
    lastname: string
    profile: string
    profile_medium: string
    city: string
    state: string
    country: string
    sex: string
    premium: boolean
    summit: boolean
    created_at: string
}

export interface TokenResponse {
    access_token: string
    athlete: StravaAthlete
}

/**
 * Exchanges the one-time authorisation code for an access token.
 *
 * The code is sent to our Cloudflare Worker rather than directly to Strava.
 * The Worker adds our app's secret key and completes the exchange securely.
 *
 * Note: Strava access tokens expire after 6 hours. If token refresh is needed
 * in the future, add refreshAccessToken() here and a corresponding handler in
 * the Cloudflare Worker. See: https://developers.strava.com/docs/authentication/
 */
export async function exchangeToken(code: string): Promise<TokenResponse> {
    const response = await fetch(TOKEN_EXCHANGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    })

    if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`)
    }

    return response.json()
}

/**
 * Revokes the app's access for this athlete on Strava's side.
 * Called on logout so the session is fully invalidated — not just cleared locally.
 * Failures are ignored so a network issue never blocks the user from logging out.
 */
export async function deauthorize(accessToken: string): Promise<void> {
    await fetch(`https://www.strava.com/oauth/deauthorize?access_token=${accessToken}`, {
        method: 'POST',
    })
}

/**
 * Fetches the athlete's lifetime performance summary from Strava.
 *
 * Includes totals for rides, runs, and swims — distance, time, elevation, etc.
 * This is called after login and whenever the home screen loads with a saved session.
 */
export async function getAthleteStats(athleteId: number, accessToken: string): Promise<any> {
    const response = await fetch(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
        throw new Error(`Stats fetch failed: ${response.status}`)
    }

    return response.json()
}
