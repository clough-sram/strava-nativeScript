<stackLayout class="stats-card">
    <label text={label} class="stat-label" />
    <label text={value} class="stat-value" />
</stackLayout>

<script lang="ts">
    export let label: string
    export let value: string
</script>

<style>
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
        letter-spacing: 0;
        margin-bottom: 4;
    }

    .stat-value {
        font-size: 48;
        font-weight: bold;
        color: #ffffff;
    }
</style>
