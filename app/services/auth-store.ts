/**
 * Authentication Store
 *
 * Holds the Strava session: access token, athlete profile, and stats.
 *
 * Token lifecycle:
 * - Strava access tokens expire after 6 hours. When expired, the user is prompted
 *   to log in again via the Connect with Strava button.
 * - TODO: If seamless background refresh is needed in the future, add an
 *   ensureFreshToken() method here that calls refreshAccessToken() from strava.ts.
 *   The Cloudflare Worker also needs a refresh handler. See strava.ts for details.
 *
 * Storage:
 * - Access token → SecureStorage (device Keychain)
 * - Athlete profile → ApplicationSettings (non-sensitive)
 */

import { writable, get, type Readable } from 'svelte/store'
import { SecureStorage } from '@nativescript/secure-storage'
import { ApplicationSettings } from '@nativescript/core'
import type { StravaAthlete } from './strava'
import { deauthorize } from './strava'

export interface AuthState {
    accessToken: string | null
    athleteId: number | null
    athlete: StravaAthlete | null
    stats: any | null
}

const storage = new SecureStorage()

const STORAGE_KEY_TOKEN      = 'strava_access_token'
const STORAGE_KEY_ATHLETE_ID = 'strava_athlete_id'
const STORAGE_KEY_ATHLETE    = 'strava_athlete_profile'

function createAuthStore() {
    const store = writable<AuthState>({
        accessToken: null,
        athleteId: null,
        athlete: null,
        stats: null,
    })

    const { subscribe, set, update } = store

    return {
        subscribe,

        // Loads any previously saved session from device storage on app start.
        async init() {
            const accessToken  = await storage.get({ key: STORAGE_KEY_TOKEN }) || null
            const athleteIdStr = await storage.get({ key: STORAGE_KEY_ATHLETE_ID })
            const athleteId    = athleteIdStr ? Number(athleteIdStr) : null
            const athleteJson  = ApplicationSettings.getString(STORAGE_KEY_ATHLETE, '')
            const athlete: StravaAthlete | null = athleteJson ? JSON.parse(athleteJson) : null

            set({ accessToken, athleteId, athlete, stats: null })
        },

        // Saves the session after a successful Strava login.
        async login(accessToken: string, athlete: StravaAthlete, stats: any) {
            await storage.set({ key: STORAGE_KEY_TOKEN, value: accessToken })
            await storage.set({ key: STORAGE_KEY_ATHLETE_ID, value: String(athlete.id) })
            ApplicationSettings.setString(STORAGE_KEY_ATHLETE, JSON.stringify(athlete))
            set({ accessToken, athleteId: athlete.id, athlete, stats })
        },

        // Revokes Strava access and clears the full session from the device.
        async logout() {
            const state = get(store)
            if (state.accessToken) {
                // Fire-and-forget — a network failure should never block the user from logging out
                deauthorize(state.accessToken).catch(() => {})
            }
            await storage.remove({ key: STORAGE_KEY_TOKEN })
            await storage.remove({ key: STORAGE_KEY_ATHLETE_ID })
            ApplicationSettings.remove(STORAGE_KEY_ATHLETE)
            set({ accessToken: null, athleteId: null, athlete: null, stats: null })
        },

        // Updates the in-memory stats once they have been loaded from Strava.
        setStats(stats: any) {
            update(state => ({ ...state, stats }))
        },
    }
}

export const authStore: Readable<AuthState> & {
    init(): Promise<void>
    login(accessToken: string, athlete: StravaAthlete, stats: any): Promise<void>
    logout(): Promise<void>
    setStats(stats: any): void
} = createAuthStore()
