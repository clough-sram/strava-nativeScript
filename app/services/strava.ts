/**
 * Strava API Service
 *
 * This file handles all communication with the Strava platform.
 * It defines the login URL, how to read the response after a user grants access,
 * and how to fetch their profile and performance data.
 */

const CLIENT_ID = '151284'
const REDIRECT_URI = 'http://localhost/callback'

// The Cloudflare Worker acts as a secure middleman for the login step.
// It holds our app's secret key so it never has to be stored on the user's device.
const TOKEN_EXCHANGE_URL = 'https://strava-token-exchange.aclough.workers.dev'

// The URL that opens the official Strava login page inside the app.
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

// Describes the Strava athlete profile fields we receive and display in the app.
export interface StravaAthlete {
    id: number
    firstname: string
    lastname: string
    profile: string         // URL to the athlete's large profile photo
    profile_medium: string  // URL to the medium-sized profile photo
    city: string
    state: string
    country: string
    sex: string             // 'M' or 'F'
}

/**
 * Exchanges the one-time authorisation code for a long-lived access token.
 *
 * The code is sent to our Cloudflare Worker rather than directly to Strava.
 * The Worker adds our app's secret key and completes the exchange securely.
 * Strava responds with an access token and the athlete's basic profile.
 */
export async function exchangeToken(code: string): Promise<{ access_token: string; athlete: StravaAthlete }> {
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
