<script>
    export let p1Price = 0;
    export let p1Bar = 0;
    export let p2Price = 0;
    export let p2Bar = 0;
    export let hasP2 = true;
    export let onUpdate = () => {};

    function handleInput() {
        onUpdate();
    }
</script>

<div class="tv-coord-container">
    <div class="tv-coord-row">
        <span class="tv-coord-label">#1 (precio, barra)</span>
        <div class="tv-coord-inputs">
            <div class="tv-input-num-wrapper">
                <input
                    type="number"
                    step="any"
                    class="tv-input tv-input-price"
                    bind:value={p1Price}
                    on:input={handleInput}
                />
            </div>
            <input
                type="number"
                step="1"
                class="tv-input tv-input-bar"
                bind:value={p1Bar}
                on:input={handleInput}
            />
        </div>
    </div>

    {#if hasP2}
        <div class="tv-coord-row">
            <span class="tv-coord-label">#2 (precio, barra)</span>
            <div class="tv-coord-inputs">
                <div class="tv-input-num-wrapper">
                    <input
                        type="number"
                        step="any"
                        class="tv-input tv-input-price"
                        bind:value={p2Price}
                        on:input={handleInput}
                    />
                </div>
                <input
                    type="number"
                    step="1"
                    class="tv-input tv-input-bar"
                    bind:value={p2Bar}
                    on:input={handleInput}
                />
            </div>
        </div>
    {/if}
</div>

<style>
    .tv-coord-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .tv-coord-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .tv-coord-label {
        font-size: 13px;
        color: #d1d4dc;
        white-space: nowrap;
    }

    .tv-coord-inputs {
        display: flex;
        gap: 8px;
    }

    .tv-input-num-wrapper {
        position: relative;
        display: flex;
        align-items: center;
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

    .tv-input-price {
        width: 110px;
    }

    .tv-input-bar {
        width: 85px;
    }
</style>
