<script>
    export let onUpdate = () => {};
</script>

<div class="tv-visibility-container">
    <label class="tv-checkbox-row">
        <input type="checkbox" checked on:change={() => onUpdate()} />
        <span>Minutos (1m - 59m)</span>
    </label>
    <label class="tv-checkbox-row">
        <input type="checkbox" checked on:change={() => onUpdate()} />
        <span>Horas (1h - 24h)</span>
    </label>
    <label class="tv-checkbox-row">
        <input type="checkbox" checked on:change={() => onUpdate()} />
        <span>Días (1D - 1M)</span>
    </label>
</div>

<style>
    .tv-visibility-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .tv-checkbox-row {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 13px;
        color: #d1d4dc;
    }

    .tv-checkbox-row input {
        accent-color: #2962ff;
        cursor: pointer;
    }
</style>
