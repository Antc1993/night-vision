<script>
    import { onDestroy } from "svelte";
    import Events from "../core/events.js";
    import DataHub from "../core/dataHub.js";

    export let id = 0; // Pane index
    export let props = {};
    export let layout = {};
    export let main = false;

    let events = Events.instance(props.id);
    let hub = DataHub.instance(props.id);
    let updateRR = 0;

    events.on(`pane-ctrls-${id}:update-pane`, () => {
        updateRR++;
    });

    events.on(`pane-ctrls-${id}:update-layout`, () => {
        updateRR++;
    });

    onDestroy(() => {
        events.off(`pane-ctrls-${id}`);
    });

    $: totalPanes = (updateRR, layout, hub.panes() || []).length;
    $: pane = (updateRR, layout, hub.panes()[id] || {});
    $: isMaximized = !!pane.settings?.__maximized;
    $: isCollapsed = !!pane.settings?.__collapsed;
    $: topStyle = `top: ${(layout?.offset || 0) + 6}px; right: ${(layout?.sbMax?.[1] || 50) + 8}px; position: absolute;`;

    function onMoveUp(e) {
        e.stopPropagation();
        if (id > 0) {
            events.emitSpec("hub", "move-pane", {
                paneId: id,
                dir: -1
            });
        }
    }

    function onMoveDown(e) {
        e.stopPropagation();
        if (id < totalPanes - 1) {
            events.emitSpec("hub", "move-pane", {
                paneId: id,
                dir: 1
            });
        }
    }

    function onDelete(e) {
        e.stopPropagation();
        events.emitSpec("hub", "delete-pane", {
            paneId: id
        });
    }

    function onMaximize(e) {
        e.stopPropagation();
        events.emitSpec("hub", "maximize-pane", {
            paneId: id
        });
    }

    function onCollapse(e) {
        e.stopPropagation();
        events.emitSpec("hub", "collapse-pane", {
            paneId: id
        });
    }
</script>

{#if totalPanes > 1}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="nvjs-pane-controls" style={topStyle} on:mousedown|stopPropagation on:click|stopPropagation>
        <!-- 1. Move Up (only if not first pane) -->
        {#if id > 0}
            <button class="nvjs-pane-btn" on:click={onMoveUp} title="Mover panel hacia arriba">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
            </button>
        {/if}

        <!-- 2. Move Down (only if not last pane) -->
        {#if id < totalPanes - 1}
            <button class="nvjs-pane-btn" on:click={onMoveDown} title="Mover panel hacia abajo">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
            </button>
        {/if}

        <!-- 3. Delete Pane (if not main pane) -->
        {#if !main}
            <button class="nvjs-pane-btn nvjs-pane-btn-delete" on:click={onDelete} title="Eliminar panel">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        {/if}

        <!-- 4. Collapse / Minimize Pane -->
        <button class="nvjs-pane-btn" class:active={isCollapsed} on:click={onCollapse} title={isCollapsed ? "Expandir panel" : "Minimizar panel"}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 14 12 8 20 14"></polyline>
                <polyline points="4 19 12 13 20 19"></polyline>
            </svg>
        </button>

        <!-- 5. Maximize / Restore Pane -->
        <button class="nvjs-pane-btn" class:active={isMaximized} on:click={onMaximize} title={isMaximized ? "Restaurar tamaño" : "Maximizar panel"}>
            {#if isMaximized}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 14h6v6m10-10h-6V4M14 10l7-7M10 14l-7 7"></path>
                </svg>
            {:else}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
            {/if}
        </button>
    </div>
{/if}

<style>
    .nvjs-pane-controls {
        position: absolute;
        top: 6px;
        right: 58px;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        background: rgba(30, 34, 45, 0.95);
        border: 1px solid #363c4e;
        border-radius: 6px;
        padding: 2px 3px;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        user-select: none;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease-in-out, background-color 0.15s;
    }

    :global(.nvjs-pane:hover) .nvjs-pane-controls {
        opacity: 1;
        pointer-events: all;
    }

    .nvjs-pane-controls:hover {
        opacity: 1;
        background: #1e222d;
    }

    .nvjs-pane-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 4px;
        color: #9598a1;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        transition: color 0.15s, background-color 0.15s;
    }

    .nvjs-pane-btn:hover {
        color: #ffffff;
        background: #2a2e39;
    }

    .nvjs-pane-btn.active {
        color: #2962ff;
        background: #2a2e39;
    }

    .nvjs-pane-btn-delete:hover {
        color: #f23645;
        background: rgba(242, 54, 69, 0.2);
    }
</style>
