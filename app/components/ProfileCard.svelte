<gridLayout columns="auto, *" rows="auto" class="profile-card">
    <image
        col="0"
        src={athlete.profile}
        width="80"
        height="80"
        borderRadius="40"
        stretch="aspectFill"
        verticalAlignment="top"
    />
    <stackLayout col="1" marginLeft="16" verticalAlignment="top">
        <label
            text="{athlete.firstname} {athlete.lastname}"
            class="profile-name"
        />
        <label
            text="{athlete.city}, {athlete.state} {athlete.country}"
            class="profile-meta"
        />
        <label
            text="Since {new Date(athlete.created_at).getFullYear()}"
            class="profile-meta"
        />
        {#if athlete.premium}
            <label text="★ Premium Member" class="profile-premium" />
        {/if}
    </stackLayout>
</gridLayout>

<script lang="ts">
    import type { StravaAthlete } from '../services/strava'

    export let athlete: StravaAthlete
</script>

<style>
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

    .profile-premium {
        font-size: 12;
        color: #FC4C02;
        font-weight: bold;
        margin-top: 4;
    }
</style>
