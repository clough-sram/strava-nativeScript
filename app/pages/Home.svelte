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
                        <!-- Profile card: circular photo on the left, name and location on the right -->
                        <gridLayout columns="auto, *" rows="auto" class="profile-card">
                            <image
                                col="0"
                                src={auth.athlete.profile}
                                width="80"
                                height="80"
                                borderRadius="40"
                                stretch="aspectFill"
                                verticalAlignment="top"
                            />
                            <stackLayout col="1" marginLeft="16" verticalAlignment="top">
                                <label
                                    text="{auth.athlete.firstname} {auth.athlete.lastname}"
                                    class="profile-name"
                                />
                                <label
                                    text="{auth.athlete.city}, {auth.athlete.state} {auth.athlete.country}"
                                    class="profile-meta"
                                />
                            </stackLayout>
                        </gridLayout>
                    {/if}

                    {#if auth.stats}
                        <!-- Stats card: displays the athlete's longest ever ride -->
                        <stackLayout class="stats-card">
                            <label text="BIGGEST RIDE" class="stat-label" />
                            <label
                                text={((( auth.stats.biggest_ride_distance ?? 0) / 1000).toFixed(1)) + ' km'}
                                class="stat-value"
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
    import StravaAuth from './StravaAuth.svelte'
    import { authStore, type AuthState } from '../services/auth-store'
    import { getAthleteStats } from '../services/strava'

    // Reactive typed alias — re-evaluates whenever the store changes
    $: auth = $authStore as AuthState

    // Navigates to the Strava login screen
    function connectStrava() {
        navigate({ page: StravaAuth })
    }

    // Clears the Strava session from the device.
    // Also wipes browser cookies so the next login starts fresh
    // rather than auto-approving the previously connected account.
    async function logout() {
        if (isIOS) {
            const dataStore = WKWebsiteDataStore.defaultDataStore()
            const dataTypes = WKWebsiteDataStore.allWebsiteDataTypes()
            dataStore.removeDataOfTypesModifiedSinceCompletionHandler(
                dataTypes,
                new Date(0),
                () => {}
            )
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
                console.error('Failed to load stats on mount:', error)
            }
        }
    })
</script>

<style>
    .body {
        font-size: 16;
        color: #888888;
    }

    .profile-card {
        margin: 24 16 0 16;
        padding: 20;
        background-color: #1a1a1a;
        border-radius: 12;
    }

    .profile-name {
        font-size: 26;
        font-weight: bold;
        color: #ffffff;
        margin-bottom: 4;
    }

    .profile-meta {
        font-size: 14;
        color: #888888;
        margin-bottom: 2;
    }

    .stats-card {
        margin: 16 16 0 16;
        padding: 20;
        background-color: #1a1a1a;
        border-radius: 12;
    }

    .stat-label {
        font-size: 11;
        color: #FC4C02;
        font-weight: bold;
        letter-spacing: 1;
        margin-bottom: 4;
    }

    .stat-value {
        font-size: 48;
        font-weight: bold;
        color: #ffffff;
    }
</style>
