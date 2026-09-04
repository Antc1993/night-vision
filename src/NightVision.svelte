<svelte:options accessors={true} />

<script>
    import Chart from "./components/Chart.svelte";
    import Const from "./stuff/constants.js";

    let chart; // Chart reference

    export function getChart() {
        return chart;
    }

    // Title text
    export let showLogo = false;

    // Unique html id (when multiple instances used)
    export let id = "nvjs";

    // Width of the chart
    export let width = 800;

    // Height of the chart
    export let height = 420;

    // Colors (modify specific colors)
    export let colors = {}; // TODO: default colors

    // Enable toolbar or not
    export let toolbar = true;

    // User-defined scripts (overlays & studies)
    export let scripts = [];

    // Override the default values
    export let config = {};

    // Index-based mode of rendering (for stocks)
    export let indexBased = false;

    // Timezone (Shift from UTC, hours)
    export let timezone = 0;

    // Dummy prop stubs
    export let data = {};
    export let autoResize = false;

    $: configMerge = Object.assign(Const.ChartConfig, config);
    $: isMobile = width < 768;
    $: showToolbar = toolbar && !isMobile;
    $: toolbarWidth = showToolbar ? configMerge.TOOLBAR || 48 : 0;
    $: offset = toolbarWidth;
    $: colorsUser = Object.assign(Const.COLORS, colors);
    $: props = {
        showLogo,
        id,
        width: Math.max(100, width - offset),
        height,
        colors: colorsUser,
        toolbar: showToolbar,
        scripts,
        config: configMerge,
        timezone,
        indexBased,
    };
    $: style = `
    width: ${width}px;
    height: ${props.height}px;
`;
</script>

<!-- Main component  -->
<div class="night-vision" {id} {style}>
    <Chart {props} bind:this={chart} />
</div>

<style>
    /* Anit-boostrap tactix */
    .night-vision *,
    ::after,
    ::before {
        box-sizing: content-box;
    }
    .night-vision img {
        vertical-align: initial;
    }
    .night-vision {
        position: relative;
        direction: ltr; /* TODO: Explore */
    }

    /* Global modern dark scrollbars */
    :global(.night-vision *) {
        scrollbar-width: thin;
        scrollbar-color: #363c4e transparent;
    }
    :global(.night-vision *::-webkit-scrollbar) {
        width: 6px;
        height: 6px;
    }
    :global(.night-vision *::-webkit-scrollbar-track) {
        background: transparent;
    }
    :global(.night-vision *::-webkit-scrollbar-thumb) {
        background-color: #363c4e;
        border-radius: 4px;
        transition: background-color 0.15s ease;
    }
    :global(.night-vision *::-webkit-scrollbar-thumb:hover) {
        background-color: #505668;
    }
    :global(.night-vision *::-webkit-scrollbar-corner) {
        background: transparent;
    }
</style>
