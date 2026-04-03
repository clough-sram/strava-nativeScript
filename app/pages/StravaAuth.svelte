<!--
    Strava Login Screen

    This screen handles the full Strava sign-in process:

    1. An embedded browser opens the official Strava login page.
    2. The user enters their Strava credentials and approves access.
    3. Strava redirects back to the app with a one-time authorisation code.
    4. The app exchanges that code for an access token via our secure Cloudflare Worker.
    5. The athlete's profile and stats are fetched and saved.
    6. The screen closes and the user is returned to the home screen, now logged in.

    The user can cancel at any time using the Cancel button.
-->
<page>
    <actionBar title="Connect with Strava" flat="true" backgroundColor="#000000">
        <navigationButton text="Cancel" on:tap={cancel} />
    </actionBar>

    {#if errorMessage}
        <!-- Error state: shown when login fails -->
        <stackLayout horizontalAlignment="center" verticalAlignment="middle" padding="32">
            <label text="⚠" fontSize="48" color="#FC4C02" textAlignment="center" marginBottom="16" />
            <label
                text={errorMessage}
                fontSize="16"
                color="#ffffff"
                textWrap="true"
                textAlignment="center"
                marginBottom="32"
            />
            <button
                text="Try Again"
                on:tap={retry}
                backgroundColor="#FC4C02"
                color="#ffffff"
                fontSize="16"
                borderRadius="4"
                width="160"
            />
        </stackLayout>
    {:else if isLoading}
        <!-- Loading state: shown while exchanging token and fetching stats -->
        <stackLayout horizontalAlignment="center" verticalAlignment="middle">
            <activityIndicator busy="true" color="#FC4C02" width="48" height="48" />
            <label
                text="Connecting to Strava..."
                fontSize="14"
                color="#888888"
                textAlignment="center"
                marginTop="16"
            />
        </stackLayout>
    {:else}
        <!-- Default state: the Strava OAuth web page -->
        <webView src={authUrl} on:loadStarted={onLoadStarted} />
    {/if}
</page>

<script lang="ts">
    import { goBack } from '@nativescript-community/svelte-native'
    import { OAUTH_URL, isRedirectUrl, extractCode, extractError, exchangeToken, getAthleteStats } from '../services/strava'
    import { authStore } from '../services/auth-store'

    // The Strava authorisation page URL, built in strava.ts
    const authUrl = OAUTH_URL

    // Prevents the redirect from being handled more than once if the WebView
    // fires multiple load events for the same URL
    let isHandled = false
    let isLoading = false
    let errorMessage: string | null = null

    function cancel() {
        goBack()
    }

    function retry() {
        errorMessage = null
        isHandled = false
    }

    async function onLoadStarted(event: any) {
        const url: string = event.url || ''

        if (!isRedirectUrl(url) || isHandled) return
        isHandled = true

        const error = extractError(url)
        if (error === 'access_denied') {
            errorMessage = 'You declined the Strava permissions request. Tap "Try Again" and approve access to continue.'
            return
        }

        const code = extractCode(url)
        if (!code) {
            errorMessage = 'Login failed — no authorisation code received. Please try again.'
            return
        }

        isLoading = true

        try {
            const tokenData = await exchangeToken(code)
            const { access_token, athlete } = tokenData

            const stats = await getAthleteStats(athlete.id, access_token)
            await authStore.login(access_token, athlete, stats)

            goBack()
        } catch (error: any) {
            isLoading = false
            isHandled = false

            if (error?.message?.includes('403')) {
                errorMessage = 'This Strava account is not authorised to use this app.'
            } else if (error?.message?.includes('Token exchange failed')) {
                errorMessage = 'Could not connect to Strava. Please check your connection and try again.'
            } else {
                errorMessage = 'Something went wrong during login. Please try again.'
            }
        }
    }
</script>

<style>
    actionBar {
        background-color: #000000;
        color: #ffffff;
    }
</style>
