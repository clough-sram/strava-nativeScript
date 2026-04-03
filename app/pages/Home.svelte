<!--
    Home Screen

    The app's main screen has two states:

    LOGGED OUT — Shows a welcome message and the "Connect with Strava" button.
                 Tapping it opens the Strava login flow.

    LOGGED IN  — Shows the athlete's profile card (photo, name, location)
                 and a stats card with their biggest ride distance.
                 A "Disconnect Strava" button at the bottom clears the session.

    The screen automatically restores the session on app launch if the user
    has previously connected, so they never have to log in twice.
-->
<page>
    <AppBar />
    <gridLayout rows="*, auto" columns="*">

        {#if auth.accessToken}
            <!-- ── LOGGED IN VIEW ───────────────────────────────────────────── -->
            <scrollView row="0">
                <stackLayout>

                    {#if auth.athlete}
                        <ProfileCard athlete={auth.athlete} />
                    {/if}

                    {#if auth.stats}
                        <StatCard label="BIGGEST RIDE" value={((auth.stats.biggest_ride_distance ?? 0) / 1000).toFixed(1) + ' km'} />
                        <StatCard label="TOTAL RIDES" value={(auth.stats.all_ride_totals?.count ?? 0).toString()} />
                        <StatCard label="TOTAL RIDING DISTANCE" value={((auth.stats.all_ride_totals?.distance ?? 0) / 1000).toFixed(0) + ' km'} />
                        <StatCard label="TOTAL RIDING ELEVATION" value={((auth.stats.all_ride_totals?.elevation_gain ?? 0) / 1000).toFixed(1) + ' km'} />
                        <StatCard label="TOTAL RIDING TIME" value={formatHours(auth.stats.all_ride_totals?.moving_time ?? 0)} />
                        <StatCard label="BIGGEST BIKE CLIMB" value={(auth.stats.biggest_climb_elevation_gain ?? 0).toFixed(0) + ' m'} />
                    {:else if statsError}
                        <!-- Shown when stats fail to load -->
                        <stackLayout class="error-card">
                            <label text="Could not load stats" class="error-title" />
                            <label text={statsError} class="error-body" textWrap="true" />
                            <button
                                text="Retry"
                                on:tap={retryLoadStats}
                                backgroundColor="#FC4C02"
                                color="#ffffff"
                                fontSize="14"
                                borderRadius="4"
                                marginTop="16"
                                width="120"
                            />
                        </stackLayout>
                    {:else}
                        <!-- Shown while stats are loading from Strava -->
                        <activityIndicator busy="true" color="#FC4C02" margin="32" horizontalAlignment="center" />
                    {/if}

                </stackLayout>
            </scrollView>

            <!-- Disconnect button — clears the session and returns to the login screen -->
            <button
                row="1"
                text="Disconnect Strava"
                on:tap={logout}
                backgroundColor="#FC4C02"
                color="#ffffff"
                fontSize="16"
                margin="24"
                borderRadius="4"
            />

        {:else}
            <!-- ── LOGGED OUT VIEW ──────────────────────────────────────────── -->
            <stackLayout row="0" horizontalAlignment="center" verticalAlignment="middle">
                <label
                    class="body"
                    text="Welcome to the Ultimate Strava Flex Profile App"
                    textWrap="true"
                    textAlignment="center"
                    marginBottom="24"
                />
                <!-- Official Strava connect button — tapping opens the login screen -->
                <image
                    row="0"
                    src="~/assets/btn_strava_connect_with_orange_x2.png"
                    horizontalAlignment="center"
                    verticalAlignment="middle"
                    stretch="aspectFit"
                    width="193"
                    height="48"
                    on:tap={connectStrava}
                />
            </stackLayout>
        {/if}

    </gridLayout>
</page>

<script lang="ts">
    import { navigate } from '@nativescript-community/svelte-native'
    import { isIOS } from '@nativescript/core'
    import { onMount } from 'svelte'
    import AppBar from '../components/AppBar.svelte'
    import ProfileCard from '../components/ProfileCard.svelte'
    import StatCard from '../components/StatCard.svelte'
    import StravaAuth from './StravaAuth.svelte'
    import { authStore, type AuthState } from '../services/auth-store'
    import { getAthleteStats } from '../services/strava'

    // Reactive typed alias — re-evaluates whenever the store changes
    $: auth = $authStore as AuthState

    let statsError: string | null = null

    function formatHours(seconds: number): string {
        const hours = Math.floor(seconds / 3600)
        return hours.toLocaleString() + ' hrs'
    }

    async function retryLoadStats() {
        const state = $authStore as AuthState
        if (!state.athlete || !state.accessToken) return
        statsError = null
        try {
            const stats = await getAthleteStats(state.athlete.id, state.accessToken)
            authStore.setStats(stats)
        } catch (error) {
            statsError = 'Could not reach Strava. Check your connection and try again.'
        }
    }

    // Navigates to the Strava login screen
    function connectStrava() {
        navigate({ page: StravaAuth })
    }

    // Clears the Strava session from the device.
    // Also wipes browser cookies so the next login starts fresh
    // rather than auto-approving the previously connected account.
    async function logout() {
        if (isIOS) {
            try {
                const dataStore = WKWebsiteDataStore.defaultDataStore()
                const dataTypes = WKWebsiteDataStore.allWebsiteDataTypes()
                dataStore.removeDataOfTypesModifiedSinceCompletionHandler(
                    dataTypes,
                    new Date(0),
                    () => {}
                )
            } catch (error) {
                console.error('Failed to clear web data on logout:', error)
            }
        }
        await authStore.logout()
    }

    // When the app opens, restore the saved session from device storage.
    // If a session exists but stats haven't been loaded yet (e.g. after a restart),
    // fetch them from Strava automatically.
    onMount(async () => {
        await authStore.init()
        const state = $authStore as AuthState
        if (state.accessToken && state.athlete && !state.stats) {
            try {
                const stats = await getAthleteStats(state.athlete.id, state.accessToken)
                authStore.setStats(stats)
            } catch (error) {
                statsError = 'Could not reach Strava. Check your connection and try again.'
            }
        }
    })
</script>

<style>
    .body {
        font-size: 16;
        color: #888888;
    }

    .error-card {
        margin: 16 16 0 16;
        padding: 20;
        background-color: #1a1a1a;
        border-radius: 12;
        horizontalAlignment: center;
    }

    .error-title {
        font-size: 16;
        font-weight: bold;
        color: #ffffff;
        margin-bottom: 8;
    }

    .error-body {
        font-size: 14;
        color: #888888;
    }
</style>
