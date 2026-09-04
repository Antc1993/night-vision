<script>
    import { onDestroy } from "svelte";
    import Events from "../core/events.js";
    import DataHub from "../core/dataHub.js";

    export let paneIndex = 0; // Top pane index
    export let nextPaneIndex = 1; // Bottom pane index
    export let layout = {};
    export let props = {};

    let events = Events.instance(props.id);
    let hub = DataHub.instance(props.id);

    let isDragging = false;
    let startY = 0;
    let initialHeights = [];
    let rafId = null;

    $: offset = (layout.grids && layout.grids[nextPaneIndex]) ? layout.grids[nextPaneIndex].offset : 0;
    $: splitterStyle = `top: ${offset}px;`;

    function onPointerDown(e) {
        if (e.button !== 0) return; // Only main mouse button
        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        startY = e.clientY;

        // Capture initial heights of all panes
        let panes = hub.panes();
        initialHeights = panes.map((p, idx) => (layout.grids && layout.grids[idx]) ? layout.grids[idx].height : 50);

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);

        // Prevent unwanted text selection during drag
        document.body.style.userSelect = "none";
        document.body.style.cursor = "row-resize";
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        e.preventDefault();

        let clientY = e.clientY;
        if (!rafId) {
            rafId = requestAnimationFrame(() => {
                rafId = null;
                applyResize(clientY);
            });
        }
    }

    function applyResize(clientY) {
        let dy = clientY - startY;
        let minHeight = 45; // Minimum px height per pane

        let topH = initialHeights[paneIndex] || 50;
        let bottomH = initialHeights[nextPaneIndex] || 50;

        let maxDy = bottomH - minHeight;
        let minDy = -(topH - minHeight);
        let clampedDy = Math.max(minDy, Math.min(maxDy, dy));

        let newTopH = Math.round(topH + clampedDy);
        let newBottomH = Math.round(bottomH - clampedDy);

        let panes = hub.panes();
        for (let idx = 0; idx < panes.length; idx++) {
            let p = panes[idx];
            if (!p.settings) p.settings = {};
            delete p.settings.__maximized;
            delete p.settings.__collapsed;

            if (idx === paneIndex) {
                p.settings.height = newTopH;
            } else if (idx === nextPaneIndex) {
                p.settings.height = newBottomH;
            } else {
                p.settings.height = initialHeights[idx] || (layout.grids && layout.grids[idx] ? layout.grids[idx].height : 50);
            }
        }

        events.emitSpec("chart", "update-layout");
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        document.body.style.userSelect = "";
        document.body.style.cursor = "";

        try {
            if (e.currentTarget && e.currentTarget.releasePointerCapture) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch (err) {}
    }

    function onDoubleClick(e) {
        e.preventDefault();
        e.stopPropagation();

        // Reset pane heights to default auto calculation
        let panes = hub.panes();
        for (let p of panes) {
            if (p.settings) {
                delete p.settings.height;
                delete p.settings.__maximized;
                delete p.settings.__collapsed;
            }
        }

        events.emitSpec("chart", "update-layout");
    }

    onDestroy(() => {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
    });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="nvjs-pane-splitter"
    class:dragging={isDragging}
    style={splitterStyle}
    on:pointerdown={onPointerDown}
    on:dblclick={onDoubleClick}
    title="Arrastrar para redimensionar (doble clic para restablecer)"
>
    <div class="nvjs-splitter-line"></div>
    <div class="nvjs-splitter-handle">
        <span class="nvjs-handle-dot"></span>
        <span class="nvjs-handle-dot"></span>
        <span class="nvjs-handle-dot"></span>
    </div>
</div>

<style>
    .nvjs-pane-splitter {
        position: absolute;
        left: 0;
        width: 100%;
        height: 10px;
        margin-top: -5px;
        cursor: row-resize;
        z-index: 25;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: none;
        user-select: none;
    }

    .nvjs-splitter-line {
        position: absolute;
        left: 0;
        width: 100%;
        height: 1px;
        background-color: #2a2e39;
        transition: background-color 0.15s, height 0.15s, box-shadow 0.15s;
    }

    .nvjs-splitter-handle {
        position: relative;
        z-index: 2;
        width: 36px;
        height: 6px;
        background: #1e222d;
        border: 1px solid #363c4e;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        opacity: 0;
        transition: opacity 0.15s, background-color 0.15s, border-color 0.15s;
    }

    .nvjs-handle-dot {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background-color: #9598a1;
    }

    .nvjs-pane-splitter:hover .nvjs-splitter-line,
    .nvjs-pane-splitter.dragging .nvjs-splitter-line {
        height: 2px;
        background-color: #2962ff;
        box-shadow: 0 0 8px rgba(41, 98, 255, 0.6);
    }

    .nvjs-pane-splitter:hover .nvjs-splitter-handle,
    .nvjs-pane-splitter.dragging .nvjs-splitter-handle {
        opacity: 1;
        background-color: #1e222d;
        border-color: #2962ff;
    }
</style>
