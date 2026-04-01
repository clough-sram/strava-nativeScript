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
    <webView src={authUrl} on:loadStarted={onLoadStarted} />
</page>

<script lang="ts">
    import { goBack } from '@nativescript-community/svelte-native'
    import { OAUTH_URL, isRedirectUrl, extractCode, exchangeToken, getAthleteStats } from '../services/strava'
    import { authStore } from '../services/auth-store'

    // The Strava authorisation page URL, built in strava.ts
    const authUrl = OAUTH_URL

    // Prevents the redirect from being handled more than once if the WebView
    // fires multiple load events for the same URL
    let isHandled = false

    function cancel() {
        goBack()
    }

    // Fires every time the embedded browser starts loading a new URL.
    // We watch for the redirect back to our app, which signals that the
    // user has completed (or declined) the Strava login.
    async function onLoadStarted(event: any) {
        const url: string = event.url || ''

        if (!isRedirectUrl(url) || isHandled) return
        isHandled = true

        // Extract the one-time code Strava includes in the redirect URL
        const code = extractCode(url)
        if (!code) {
            console.error('No code found in redirect URL:', url)
            goBack()
            return
        }

        try {
            // Send the code to our Cloudflare Worker, which swaps it for an
            // access token using our app's secret key (stored securely server-side)
            console.log('Exchanging code for token...')
            const tokenData = await exchangeToken(code)
            const accessToken = tokenData.access_token
            const athlete = tokenData.athlete
            console.log('Got access token for athlete:', athlete.id)

            // Fetch the athlete's lifetime stats from Strava
            console.log('Fetching athlete stats...')
            const stats = await getAthleteStats(athlete.id, accessToken)
            console.log('Athlete Stats:', JSON.stringify(stats, null, 2))

            // Save the session to the device so the user stays logged in
            await authStore.login(accessToken, athlete, stats)
        } catch (error) {
            console.error('Strava auth error:', error)
        } finally {
            // Return to the home screen whether login succeeded or failed
            goBack()
        }
    }
</script>
