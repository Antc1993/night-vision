<script>
    // Legend block (collection of LegendLines)

    import { onMount, onDestroy } from "svelte";
    import Events from "../core/events.js";
    import DataHub from "../core/dataHub.js";
    import LegendLine from "./LegendLine.svelte";

    export let id; // Legend/pane id
    export let props; // General props
    export let main; // Is this the main Pane
    export let layout; // Pane/grid layout

    let hub = DataHub.instance(props.id);
    let events = Events.instance(props.id);

    let legendRR = 0; // Re-render key
    let collapsed = false;

    $: style = `
    left: ${layout.sbMax[0] + 5}px;
    top: ${(layout.offset || 0) + 5}px;
    position: absolute;
`;

    // EVENT INTERFACE
    events.on(`legend-${id}:update-legend`, update);
    events.on(`legend-${id}:update-pane`, update);
    events.on(`legend-ctrls-${id}:update-pane`, update);
    events.on(`legend-ctrls-${id}:update-layout`, update);
    events.on(`update-legend`, update);

    onDestroy(() => {
        events.off(`legend-${id}`);
        events.off(`legend-ctrls-${id}`);
    });

    function update() {
        legendRR++;
    }

    $: activeOverlays = (legendRR,
    layout,
    props,
    hub.panes()[id]?.overlays || []).filter(
        (ov) => !ov.type?.endsWith("Tool") && ov.settings?.showLegend !== false,
    );

    $: mainOverlays = activeOverlays.filter((ov) => ov.main);
    $: otherOverlays = activeOverlays.filter((ov) => !ov.main);
    $: hiddenCount =
        mainOverlays.length > 0
            ? otherOverlays.length
            : Math.max(0, activeOverlays.length - 1);

    function toggleCollapse(e) {
        e.stopPropagation();
        collapsed = !collapsed;
    }
</script>

{#key legendRR}
    <!-- Full chart re-render -->
    {#if hub.panes()[id]}
        <div class="nvjs-legend" {style}>
            {#if mainOverlays.length > 0}
                {#each mainOverlays as ov}
                    <LegendLine gridId={id} {props} {layout} {ov} />
                {/each}
                {#if !collapsed}
                    {#each otherOverlays as ov}
                        <LegendLine gridId={id} {props} {layout} {ov} />
                    {/each}
                {/if}
                {#if otherOverlays.length > 0}
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <button
                        type="button"
                        class="nvjs-legend-collapse-btn"
                        on:click={toggleCollapse}
                        title={collapsed
                            ? `Mostrar indicadores (${hiddenCount})`
                            : "Ocultar indicadores"}
                    >
                        {#if collapsed}
                            <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                            <span class="nvjs-collapse-count"
                                >{hiddenCount}</span
                            >
                        {:else}
                            <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                        {/if}
                    </button>
                {/if}
            {:else if activeOverlays.length > 0}
                <LegendLine
                    gridId={id}
                    {props}
                    {layout}
                    ov={activeOverlays[0]}
                />
                {#if !collapsed}
                    {#each activeOverlays.slice(1) as ov}
                        <LegendLine gridId={id} {props} {layout} {ov} />
                    {/each}
                {/if}
                {#if activeOverlays.length > 1}
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <button
                        type="button"
                        class="nvjs-legend-collapse-btn"
                        on:click={toggleCollapse}
                        title={collapsed
                            ? `Mostrar indicadores (${hiddenCount})`
                            : "Ocultar indicadores"}
                    >
                        {#if collapsed}
                            <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                            <span class="nvjs-collapse-count"
                                >{hiddenCount}</span
                            >
                        {:else}
                            <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                        {/if}
                    </button>
                {/if}
            {/if}
        </div>
    {/if}
{/key}

<style>
    .nvjs-legend {
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }

    .nvjs-legend-collapse-btn {
        pointer-events: all;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        min-width: 22px;
        height: 18px;
        padding: 0 5px;
        margin-top: 2px;
        margin-left: 2px;
        background: #1e222d;
        border: 1px solid #363c4e;
        border-radius: 4px;
        color: #9598a1;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto,
            Ubuntu, sans-serif;
        font-size: 11px;
        font-weight: 600;
        transition: all 0.15s ease;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    }

    .nvjs-legend-collapse-btn:hover {
        background: #2a2e39;
        color: #ffffff;
        border-color: #475569;
    }

    .nvjs-collapse-count {
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        color: #2962ff;
    }
</style>
