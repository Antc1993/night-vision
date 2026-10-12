<script>
    export let settings = {};
    export let onUpdate = () => {};

    function update(key, value) {
        settings[key] = value;
        onUpdate();
    }
</script>

<div class="tv-style-container">
    <div class="tv-field-row">
        <label for="nvjs-text-color">Color del texto</label>
        <input
            id="nvjs-text-color"
            type="color"
            class="tv-color-swatch"
            value={settings.textColor || settings.color || "#ffffff"}
            on:input={(e) => {
                update("color", e.target.value);
                update("textColor", e.target.value);
            }}
        />
    </div>

    <div class="tv-field-row">
        <label for="nvjs-text-size">Tamaño de fuente</label>
        <div class="tv-slider-box">
            <input
                id="nvjs-text-size"
                type="range"
                min="10"
                max="32"
                step="1"
                class="tv-range"
                value={settings.fontSize || 13}
                on:input={(e) => update("fontSize", parseInt(e.target.value))}
            />
            <span class="tv-val-badge">{settings.fontSize || 13}px</span>
        </div>
    </div>

    <div class="tv-field-row">
        <label for="nvjs-text-font-options">Estilo de fuente</label>
        <div class="tv-btn-group" id="nvjs-text-font-options">
            <button
                type="button"
                class="tv-toggle-btn"
                class:active={settings.bold}
                on:click={() => update("bold", !settings.bold)}
            >
                <b>B</b>
            </button>
            <button
                type="button"
                class="tv-toggle-btn"
                class:active={settings.italic}
                on:click={() => update("italic", !settings.italic)}
            >
                <i>I</i>
            </button>
        </div>
    </div>

    <div class="tv-field-row">
        <label for="nvjs-text-bg-toggle">Fondo</label>
        <div class="tv-check-row">
            <input
                id="nvjs-text-bg-toggle"
                type="checkbox"
                checked={settings.showBackground === true}
                on:change={(e) => update("showBackground", e.target.checked)}
            />
            {#if settings.showBackground === true}
                <input
                    type="color"
                    class="tv-color-swatch"
                    value={settings.backColor || "#121622"}
                    on:input={(e) => update("backColor", e.target.value)}
                />
            {/if}
        </div>
    </div>
</div>

<style>
    .tv-style-container {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .tv-field-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
        color: #d1d4dc;
    }

    .tv-check-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .tv-color-swatch {
        width: 32px;
        height: 28px;
        border: 1px solid #363c4e;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        padding: 0;
    }

    .tv-slider-box {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .tv-range {
        accent-color: #2962ff;
        cursor: pointer;
    }

    .tv-val-badge {
        font-size: 11px;
        color: #787b86;
        min-width: 32px;
    }

    .tv-btn-group {
        display: flex;
        gap: 6px;
    }

    .tv-toggle-btn {
        background: #1e222d;
        border: 1px solid #363c4e;
        color: #d1d4dc;
        border-radius: 4px;
        width: 32px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s;
    }

    .tv-toggle-btn.active {
        background: #2962ff;
        color: #ffffff;
        border-color: #2962ff;
    }
</style>
