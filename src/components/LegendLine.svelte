<script>
    // Overlay's legend line
    // TODO: For legendHtml formatter - create web-components
    // and macros to make code easier & more compact
    // TODO: prevent trackpad events from scrolling the
    // browser page back
    // TODO: combining (& linking) several overlays. Will allow to
    // collapse several lines into one. Need to add 'group' field

    import { onMount, onDestroy } from "svelte";
    import LegendControls from "./LegendControls.svelte";
    import Events from "../core/events.js";
    import MetaHub from "../core/metaHub.js";
    import logo from "../assets/logo.json";
    import icons from "../assets/icons.json";

    export let gridId; // gridId
    export let ov; // Overlay
    export let props; // General props
    export let layout; // Pane/grid layout

    let meta = MetaHub.instance(props.id);
    let events = Events.instance(props.id);

    let hover = false;
    let ref; // Reference to the legend-line div
    let nRef; // Reference to the legend-name span
    let ctrlRef; // Reference to the legend controls
    let selected = false;
    let show = true;
    let metaVersion = 0;

    $: updId = `ll-${gridId}-${ov.id}`;

    onMount(() => {
        // EVENT INTERFACE
        events.on(`${updId}:update-ll`, update);
        events.on(`${updId}:grid-mousedown`, onDeselect);
        events.on(`${updId}:select-overlay`, onDeselect);
        events.on(`${updId}:update-legend`, onMetaUpdate);
    });

    onDestroy(() => {
        events.off(updId);
    });

    function onMetaUpdate() {
        metaVersion++;
    }

    $: name = ov.name ?? `${ov.type || "Overlay"}-${ov.id}`;
    $: fontSz = parseInt(props.config.FONT.split("px").shift());
    $: layoutWidth = layout?.width ?? 0;
    $: styleBase = `
    font: ${props.config.FONT};
    font-size: ${fontSz + (ov.main ? 5 : 3)}px;
    font-weight: 300;
    color: ${props.colors.textLG};
    background: ${selected ? props.colors.back : props.colors.llBack};
    border: 1px solid ${selected ? props.colors.llSelect : "transparent"};
    margin-right: 30px;
    max-width: ${layoutWidth - 20}px;
    overflow: visible;
    white-space: nowrap;
    text-overflow: ellipsis;
`;

    $: styleHover = `
    background: ${props.colors.back};
    border-color: ${selected ? props.colors.llSelect : props.colors.grid};
`;

    $: dataStyle = `
    font-size: ${fontSz + (ov.main ? 3 : 3)}px;
    color: ${props.colors.llValue}
`;

    $: logoStyle = `
    background-image: url(${logo[0]});
    background-size: contain;
    background-repeat: no-repeat;
`;

    $: eyeStyle = `
    background-image: url(${icons[state + "-eye"]});
    background-size: contain;
    background-repeat: no-repeat;
    margin-bottom: -2px;
`;

    $: kingStyle = `
    background-image: url(${icons["king3"]});
    background-size: contain;
    background-repeat: no-repeat;
    margin-left: 4px;
`;

    let boundary = {};
    $: style = styleBase + (hover ? styleHover : "");
    $: legendFns = (metaVersion, meta.getLegendFns(gridId, ov.id)) || {};
    $: legend = legendFns.legend;
    $: legendHtml = legendFns.legendHtml;
    $: lastDataPoint =
        ov.dataSubset && ov.dataSubset.length
            ? ov.dataSubset[ov.dataSubset.length - 1]
            : ov.data && ov.data.length
              ? ov.data[ov.data.length - 1]
              : [];
    $: cursorData =
        props.cursor?.values && props.cursor.values[gridId]
            ? props.cursor.values[gridId][ov.id]
            : null;
    $: data =
        cursorData && cursorData.length ? cursorData : lastDataPoint || [];
    $: scale = findOverlayScale(layout?.scales);
    $: prec = scale?.prec ?? 2;
    $: display = ov.settings.display !== false;
    $: state = display ? "open" : "closed";

    let renderedHtml = "";

    function computeLegendHtml(d, p) {
        if (!d || !d.length) return "";
        if (ov.settings.legendHtml) return ov.settings.legendHtml;
        if (legendHtml) return legendHtml(d, p, formatter);
        if (legend) {
            let items = legend(d, p);
            if (!items || !items.length) return "";
            let res = "";
            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                if (!item) continue;
                res += `<span class="nvjs-ll-value" style="color: ${item[1]}">${formatter(item[0], p)}</span>`;
            }
            return res;
        }
        let res = "";
        for (let i = 1; i < d.length; i++) {
            let v = d[i];
            if (v != null) {
                res += `<span class="nvjs-ll-value">${formatter(v, p)}</span>`;
            } else {
                res += `<span class="nvjs-ll-x">x</span>`;
            }
        }
        return res;
    }

    $: {
        let nextHtml = computeLegendHtml(data, prec);
        if (nextHtml !== renderedHtml) {
            renderedHtml = nextHtml;
            if (legend && data && data.length && !renderedHtml) {
                show = false;
            } else if (!show && renderedHtml) {
                show = true;
            }
        }
    }

    function update() {
        display = ov.settings.display !== false;
        metaVersion++;
        renderedHtml = "";
        if (ctrlRef) ctrlRef.update();
    }

    let isMenuOpen = false;

    function onMouseMove(e) {
        if (!hover) {
            updateBoundaries();
            hover = true;
        }
    }

    function onMouseLeave(e) {
        if (isMenuOpen) return;
        updateBoundaries();
        hover = false;
    }

    function onClick() {
        events.emit("select-overlay", {
            index: [gridId, ov.id],
        });
        selected = true;
    }

    function onDblClick(e) {
        e.stopPropagation();
        events.emit("open-script-settings", {
            paneId: gridId,
            ov: ov,
            tab: "inputs",
        });
    }

    function onDeselect(event) {
        selected = false;
    }

    // Format legend value
    function formatter(x, $prec = prec) {
        if (x == undefined) return "x";
        if (typeof x !== "number") return x;
        return x.toFixed($prec);
    }

    // Find overlay's scale (by searching in ovIdxs)
    function findOverlayScale(scales) {
        if (!scales) return null;
        return (
            Object.values(scales).find((x) =>
                x.scaleSpecs.ovIdxs.includes(ov.id),
            ) || scales[layout?.scaleIndex]
        );
    }

    function updateBoundaries() {
        if (!ref) return;
        boundary = ref.getBoundingClientRect();
    }

    function disableLegend() {
        console.log("here");
    }
</script>

{#if !ov.type?.endsWith("Tool") && !legendFns.noLegend && ov.settings.showLegend !== false && show}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="nvjs-legend-line"
        {style}
        on:mousemove={onMouseMove}
        on:mouseleave={onMouseLeave}
        on:click={onClick}
        on:dblclick={onDblClick}
        on:keypress={null}
        bind:this={ref}
    >
        {#if ov.main && props.showLogo}
            <div class="nvjs-logo" style={logoStyle}></div>
        {/if}
        <div class="nvjs-ll-content">
            <span class="nvjs-ll-name" bind:this={nRef}>
                {@html name}
                {#if ov.main}
                    <span class="king-icon" style={kingStyle}> </span>
                {/if}
            </span>
            {#if display && !hover}
                <span class="nvjs-ll-data" style={dataStyle}>
                    {@html renderedHtml}
                </span>
            {/if}
        </div>
        {#if !display && !hover && !isMenuOpen}
            <div class="nvjs-eye" style={eyeStyle}></div>
        {/if}
        {#if hover || isMenuOpen}
            <LegendControls
                bind:this={ctrlRef}
                bind:menuOpen={isMenuOpen}
                {gridId}
                {ov}
                {props}
            />
        {/if}
    </div>
{/if}

<style>
    .nvjs-legend-line {
        pointer-events: all;
        position: relative;
        user-select: none;
        border-radius: 4px;
        padding: 2px 6px;
        margin-bottom: 2px;
        min-height: 24px;
        width: fit-content;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        line-height: 1.2;
        box-sizing: border-box;
    }
    .nvjs-logo {
        width: 35px;
        height: 18px;
        margin-left: -3px;
        margin-right: 2px;
        opacity: 0.85;
        display: inline-block;
        align-self: center;
    }
    .nvjs-ll-content {
        display: inline-flex;
        align-items: baseline;
        gap: 6px;
        line-height: 1.2;
    }
    .nvjs-ll-name {
        display: inline-flex;
        align-items: baseline;
        line-height: 1.2;
    }
    .nvjs-ll-data {
        font-variant-numeric: tabular-nums;
        display: inline-flex;
        align-items: baseline;
        line-height: 1.2;
    }
    :global(.nvjs-ll-value) {
        margin-left: 3px;
    }
    :global(.nvjs-ll-value:first-child) {
        margin-left: 0;
    }
    :global(.nvjs-ll-x) {
        margin-left: 3px;
    }
    .nvjs-eye {
        width: 18px;
        height: 18px;
        margin-left: 6px;
        display: inline-block;
        align-self: center;
    }
    .nvjs-eye:hover {
        filter: brightness(1.25);
    }
    .king-icon {
        display: inline-block;
        width: 14px;
        height: 14px;
        margin-left: 4px;
        margin-right: 2px;
        filter: grayscale();
        vertical-align: -2px;
    }
</style>
