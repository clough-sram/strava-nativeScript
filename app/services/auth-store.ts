/**
 * Authentication Store
 *
 * This is the app's central memory for the current logged-in user.
 * It holds the Strava access token, the athlete's profile, and their stats.
 *
 * When the app is closed and reopened, the store restores the session automatically
 * so the user does not have to log in again.
 *
 * Security note:
 * - The access token (the key that allows reading Strava data) is stored in the
 *   device's secure Keychain — the same encrypted storage used by banking apps.
 * - The athlete's profile info (name, photo, location) is stored in standard
 *   app preferences since it is not sensitive.
 */

import { writable, type Readable } from 'svelte/store'
import { SecureStorage } from '@nativescript/secure-storage'
import { ApplicationSettings } from '@nativescript/core'
import type { StravaAthlete } from './strava'

export interface AuthState {
    accessToken: string | null  // The Strava API key for this user's session
    athleteId: number | null    // Strava's unique ID for this athlete
    athlete: StravaAthlete | null // Profile info: name, photo, location
    stats: any | null           // Lifetime performance totals from Strava
}

const storage = new SecureStorage()

const STORAGE_KEY_TOKEN = 'strava_access_token'
const STORAGE_KEY_ATHLETE_ID = 'strava_athlete_id'
const STORAGE_KEY_ATHLETE = 'strava_athlete_profile'

function createAuthStore() {
    const { subscribe, set, update } = writable<AuthState>({
        accessToken: null,
        athleteId: null,
        athlete: null,
        stats: null,
    })

    return {
        subscribe,

        // Called when the app starts. Loads any previously saved session from
        // device storage so the user is taken straight to their profile.
        async init() {
            const accessToken = await storage.get({ key: STORAGE_KEY_TOKEN }) || null
            const athleteIdStr = await storage.get({ key: STORAGE_KEY_ATHLETE_ID })
            const athleteId = athleteIdStr ? Number(athleteIdStr) : null
            const athleteJson = ApplicationSettings.getString(STORAGE_KEY_ATHLETE, '')
            const athlete: StravaAthlete | null = athleteJson ? JSON.parse(athleteJson) : null
            set({ accessToken, athleteId, athlete, stats: null })
        },

        // Called after a successful Strava login. Saves the session to device
        // storage so it persists across app restarts.
        async login(accessToken: string, athlete: StravaAthlete, stats: any) {
            await storage.set({ key: STORAGE_KEY_TOKEN, value: accessToken })
            await storage.set({ key: STORAGE_KEY_ATHLETE_ID, value: String(athlete.id) })
            ApplicationSettings.setString(STORAGE_KEY_ATHLETE, JSON.stringify(athlete))
            set({ accessToken, athleteId: athlete.id, athlete, stats })
        },

        // Called when the user taps "Disconnect Strava". Wipes all saved data
        // from the device and clears the in-app session.
        async logout() {
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
