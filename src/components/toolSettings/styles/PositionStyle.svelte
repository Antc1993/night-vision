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
        <label for="nvjs-pos-profit-color">Zona de Beneficio / Objetivo</label>
        <div class="tv-color-row">
            <input
                id="nvjs-pos-profit-color"
                type="color"
                class="tv-color-swatch"
                value={settings.profitColor || "#089981"}
                on:input={(e) => {
                    update("profitColor", e.target.value);
                    update("profitBg", e.target.value + "33");
                }}
            />
        </div>
    </div>

    <div class="tv-field-row">
        <label for="nvjs-pos-loss-color">Zona de Pérdida / Stop Loss</label>
        <div class="tv-color-row">
            <input
                id="nvjs-pos-loss-color"
                type="color"
                class="tv-color-swatch"
                value={settings.lossColor || "#f23645"}
                on:input={(e) => {
                    update("lossColor", e.target.value);
                    update("lossBg", e.target.value + "33");
                }}
            />
        </div>
    </div>

    <div class="tv-field-row">
        <label for="nvjs-pos-line-color">Línea de Entrada</label>
        <input
            id="nvjs-pos-line-color"
            type="color"
            class="tv-color-swatch"
            value={settings.lineColor || "#787b86"}
            on:input={(e) => update("lineColor", e.target.value)}
        />
    </div>
</div>

<style>
    .tv-style-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .tv-field-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
        color: #d1d4dc;
    }

    .tv-color-row {
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
</style>
