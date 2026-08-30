<script>
    export let text = "";
    export let onUpdate = () => {};
</script>

<div class="tv-text-container">
    <div class="tv-field-row full-col">
        <label for="nvjs-tool-text">Texto de la figura</label>
        <input
            id="nvjs-tool-text"
            type="text"
            class="tv-input full-width"
            placeholder="Añadir texto..."
            bind:value={text}
            on:input={() => onUpdate()}
        />
    </div>
</div>

<style>
    .tv-text-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .tv-field-row.full-col {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 13px;
        color: #d1d4dc;
    }

    .tv-input {
        background: #131722;
        border: 1px solid #363c4e;
        border-radius: 6px;
        color: #ffffff;
        padding: 8px 10px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.15s;
    }
    .tv-input:focus {
        border-color: #2962ff;
    }

    .tv-input.full-width {
        width: 100%;
        box-sizing: border-box;
    }
</style>
