<script>
    import { onMount, onDestroy } from "svelte";
    import Events from "../core/events.js";

    // Common Tabs
    import CoordinatesTab from "./toolSettings/common/CoordinatesTab.svelte";
    import TextTab from "./toolSettings/common/TextTab.svelte";
    import VisibilityTab from "./toolSettings/common/VisibilityTab.svelte";

    // Style Tabs
    import LineStyle from "./toolSettings/styles/LineStyle.svelte";
    import RectangleStyle from "./toolSettings/styles/RectangleStyle.svelte";
    import FibonacciStyle from "./toolSettings/styles/FibonacciStyle.svelte";
    import MeasureStyle from "./toolSettings/styles/MeasureStyle.svelte";

    export let props = {};
    export let layout = {};

    let events = Events.instance(props.id);
    let selectedTool = null;
    let visible = false;
    let x = 0;
    let y = 0;
    let moved = false;
    let dragging = false;
    let dragStart = { x: 0, y: 0 };

    // Modal state
    let settingsOpen = false;
    let activeTab = "style"; // "style" | "text" | "coordinates" | "visibility"
    let toolSettings = {};
    let coordP1Price = 0;
    let coordP1Bar = 0;
    let coordP2Price = 0;
    let coordP2Bar = 0;
    let toolText = "";
    let originalSnapshot = null;

    // Modal drag state
    let modalX = 0;
    let modalY = 0;
    let modalDragging = false;
    let modalDragStart = { x: 0, y: 0 };

    const styleComponents = {
        line: LineStyle,
        segment: LineStyle,
        horizontal: LineStyle,
        rectangle: RectangleStyle,
        fibonacci: FibonacciStyle,
        measure: MeasureStyle,
        range: MeasureStyle,
    };

    events.on("floating-toolbar:selection-event", onSelection);

    onMount(() => {});

    onDestroy(() => {
        events.off("floating-toolbar");
    });

    function getToolTitle(type) {
        switch (type) {
            case "rectangle":
                return "Rectángulo";
            case "horizontal":
                return "Línea horizontal";
            case "segment":
            case "line":
                return "Línea de tendencia";
            case "fibonacci":
                return "Retroceso de Fibonacci";
            case "measure":
            case "range":
                return "Medida (Rango de precio / fecha)";
            default:
                return "Configuración";
        }
    }

    function onSelection(data) {
        if (data && data.type != null) {
            selectedTool = data;
            visible = true;

            // Load initial coordinates and settings
            loadToolData(data);

            if (!moved) {
                const grid = (layout.grids || [])[0] || {
                    width: props.width,
                    sbMax: [0, 0],
                };
                x = grid.sbMax[0] + grid.width - 90;
                y = 40;
            }
        } else {
            selectedTool = null;
            visible = false;
            settingsOpen = false;
        }
    }

    function loadToolData(data) {
        const sett = data.settings || {};
        toolSettings = JSON.parse(JSON.stringify(sett));
        if (!toolSettings.color) toolSettings.color = "#33ff33";
        if (!toolSettings.lineWidth) toolSettings.lineWidth = 1;

        const d = data.data || {};
        const p1 = d.p1 || [0, 0];
        const p2 = d.p2 || p1;

        coordP1Bar = p1[0] || 0;
        coordP1Price = p1[1] != null ? Number(p1[1].toFixed(2)) : 0;
        coordP2Bar = p2[0] || 0;
        coordP2Price = p2[1] != null ? Number(p2[1].toFixed(2)) : 0;
        toolText = d.text || sett.text || "";

        originalSnapshot = {
            settings: JSON.parse(JSON.stringify(toolSettings)),
            p1: [...p1],
            p2: [...p2],
            text: toolText,
        };
    }

    // Floating toolbar drag
    function onMouseDown(e) {
        dragging = true;
        dragStart = {
            x: e.clientX,
            y: e.clientY,
            initialX: x,
            initialY: y,
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!dragging) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        x = dragStart.initialX + dx;
        y = dragStart.initialY + dy;
        moved = true;
    }

    function onMouseUp() {
        dragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
    }

    // Modal dialog drag
    function onModalMouseDown(e) {
        modalDragging = true;
        modalDragStart = {
            x: e.clientX,
            y: e.clientY,
            initialX: modalX,
            initialY: modalY,
        };
        window.addEventListener("mousemove", onModalMouseMove);
        window.addEventListener("mouseup", onModalMouseUp);
        e.preventDefault();
    }

    function onModalMouseMove(e) {
        if (!modalDragging) return;
        const dx = e.clientX - modalDragStart.x;
        const dy = e.clientY - modalDragStart.y;
        modalX = modalDragStart.initialX + dx;
        modalY = modalDragStart.initialY + dy;
    }

    function onModalMouseUp() {
        modalDragging = false;
        window.removeEventListener("mousemove", onModalMouseMove);
        window.removeEventListener("mouseup", onModalMouseUp);
    }

    function onDelete() {
        if (selectedTool) {
            events.emitSpec(
                selectedTool.overlayUuid,
                "delete-tool",
                selectedTool.uuid,
            );
            visible = false;
            selectedTool = null;
            settingsOpen = false;
        }
    }

    function onSettings() {
        settingsOpen = !settingsOpen;
        if (settingsOpen && selectedTool) {
            loadToolData(selectedTool);
            activeTab = "style";
            const grid = (layout.grids || [])[0] || { width: props.width || 800, height: 500 };
            modalX = Math.max(20, (grid.width - 400) / 2);
            modalY = Math.max(20, 60);
        }
    }

    function emitUpdate() {
        if (!selectedTool) return;
        events.emitSpec(selectedTool.overlayUuid, "update-settings", {
            uuid: selectedTool.uuid,
            settings: toolSettings,
            p1: [Number(coordP1Bar), Number(coordP1Price)],
            p2: [Number(coordP2Bar), Number(coordP2Price)],
            text: toolText,
        });
    }

    function onAccept() {
        emitUpdate();
        settingsOpen = false;
    }

    function onCancel() {
        if (originalSnapshot && selectedTool) {
            events.emitSpec(selectedTool.overlayUuid, "update-settings", {
                uuid: selectedTool.uuid,
                settings: originalSnapshot.settings,
                p1: originalSnapshot.p1,
                p2: originalSnapshot.p2,
                text: originalSnapshot.text,
            });
        }
        settingsOpen = false;
    }
</script>

{#if visible}
    <!-- Floating Quick Toolbar -->
    <div class="nvjs-floating-toolbar" style="left: {x}px; top: {y}px;">
        <div class="drag-handle" on:mousedown={onMouseDown} title="Mover barra">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
                <circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
            </svg>
        </div>

        <button on:click={onSettings} title="Opciones" class:active={settingsOpen}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        </button>

        <button on:click={onDelete} title="Eliminar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        </button>
    </div>

    <!-- TradingView Style Modal Dialog -->
    {#if settingsOpen && selectedTool}
        <div class="tv-modal" style="left: {modalX}px; top: {modalY}px;">
            <!-- Modal Header -->
            <div class="tv-modal-header" on:mousedown={onModalMouseDown}>
                <div class="tv-title-box">
                    <span class="tv-title-text">{getToolTitle(selectedTool.type)}</span>
                </div>
                <button class="tv-close-btn" on:click={() => (settingsOpen = false)} title="Cerrar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <!-- Tabs Navigation -->
            <div class="tv-tabs-nav">
                <button class="tv-tab-item" class:active={activeTab === "style"} on:click={() => (activeTab = "style")}>
                    Estilo
                </button>
                <button class="tv-tab-item" class:active={activeTab === "coordinates"} on:click={() => (activeTab = "coordinates")}>
                    Coordenadas
                </button>
                <button class="tv-tab-item" class:active={activeTab === "text"} on:click={() => (activeTab = "text")}>
                    Texto
                </button>
                <button class="tv-tab-item" class:active={activeTab === "visibility"} on:click={() => (activeTab = "visibility")}>
                    Visibilidad
                </button>
            </div>

            <!-- Tab Contents -->
            <div class="tv-modal-body">
                {#if activeTab === "style"}
                    <svelte:component
                        this={styleComponents[selectedTool.type] || LineStyle}
                        bind:settings={toolSettings}
                        onUpdate={emitUpdate}
                    />
                {:else if activeTab === "coordinates"}
                    <CoordinatesTab
                        bind:p1Price={coordP1Price}
                        bind:p1Bar={coordP1Bar}
                        bind:p2Price={coordP2Price}
                        bind:p2Bar={coordP2Bar}
                        hasP2={selectedTool.type !== "horizontal"}
                        onUpdate={emitUpdate}
                    />
                {:else if activeTab === "text"}
                    <TextTab bind:text={toolText} onUpdate={emitUpdate} />
                {:else if activeTab === "visibility"}
                    <VisibilityTab onUpdate={emitUpdate} />
                {/if}
            </div>

            <!-- Modal Footer -->
            <div class="tv-modal-footer">
                <div class="tv-footer-left">
                    <button class="tv-btn-template">
                        Plantilla <span class="tv-arrow-down">⌵</span>
                    </button>
                </div>
                <div class="tv-footer-right">
                    <button class="tv-btn-secondary" on:click={onCancel}>Cancelar</button>
                    <button class="tv-btn-primary" on:click={onAccept}>Aceptar</button>
                </div>
            </div>
        </div>
    {/if}
{/if}

<style>
    /* Quick Floating Toolbar */
    .nvjs-floating-toolbar {
        position: absolute;
        z-index: 1000;
        background: #1e222d;
        border: 1px solid #363c4e;
        border-radius: 6px;
        padding: 2px 4px;
        display: flex;
        align-items: center;
        gap: 4px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
        pointer-events: all;
        user-select: none;
    }

    .drag-handle {
        padding: 5px 6px;
        cursor: move;
        color: #787b86;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .drag-handle:hover {
        color: #d1d4dc;
    }

    .nvjs-floating-toolbar button {
        background: transparent;
        border: none;
        color: #d1d4dc;
        cursor: pointer;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.15s;
    }
    .nvjs-floating-toolbar button:hover,
    .nvjs-floating-toolbar button.active {
        background: #2a2e39;
        color: #2962ff;
    }
    .nvjs-floating-toolbar button:last-child:hover {
        background: rgba(242, 54, 69, 0.2);
        color: #f23645;
    }

    /* TradingView Style Modal Dialog */
    .tv-modal {
        position: absolute;
        z-index: 10000;
        width: 380px;
        background: #1e222d;
        border: 1px solid #2a2e39;
        border-radius: 8px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75);
        color: #d1d4dc;
        font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
        font-size: 14px;
        user-select: none;
        pointer-events: all;
    }

    .tv-modal-header {
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
        border-bottom: 1px solid #2a2e39;
    }

    .tv-title-box {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .tv-title-text {
        font-size: 16px;
        font-weight: 700;
        color: #ffffff;
    }
    .tv-edit-icon {
        color: #787b86;
        cursor: pointer;
    }

    .tv-close-btn {
        background: transparent;
        border: none;
        color: #787b86;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }
    .tv-close-btn:hover {
        color: #ffffff;
        background: #2a2e39;
    }

    /* Tab navigation */
    .tv-tabs-nav {
        display: flex;
        padding: 0 16px;
        border-bottom: 1px solid #2a2e39;
        gap: 8px;
    }

    .tv-tab-item {
        background: transparent;
        border: none;
        color: #787b86;
        font-size: 13px;
        font-weight: 600;
        padding: 10px 10px;
        cursor: pointer;
        position: relative;
        transition: color 0.15s;
    }
    .tv-tab-item:hover {
        color: #d1d4dc;
    }
    .tv-tab-item.active {
        color: #ffffff;
    }
    .tv-tab-item.active::after {
        content: "";
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: #2962ff;
    }

    /* Modal Body */
    .tv-modal-body {
        padding: 20px 18px;
        min-height: 140px;
    }

    /* Coordinates tab */
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
        width: 100px;
    }

    .tv-input-bar {
        width: 80px;
    }

    .tv-input.full-width {
        width: 100%;
        box-sizing: border-box;
    }

    /* Style tab */
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

    .tv-checkbox-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 13px;
        color: #d1d4dc;
    }

    .tv-checkbox-inline input {
        accent-color: #2962ff;
        cursor: pointer;
    }

    .tv-field-row.full-col {
        flex-direction: column;
        align-items: flex-start;
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
        gap: 10px;
        width: 160px;
    }

    .tv-range {
        flex-grow: 1;
        accent-color: #2962ff;
        cursor: pointer;
    }

    .tv-val-badge {
        font-size: 12px;
        color: #787b86;
        min-width: 28px;
        text-align: right;
    }

    /* Visibility tab */
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

    /* Modal Footer */
    .tv-modal-footer {
        padding: 14px 18px;
        border-top: 1px solid #2a2e39;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .tv-btn-template {
        background: #2a2e39;
        border: 1px solid #363c4e;
        color: #d1d4dc;
        padding: 7px 12px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .tv-btn-template:hover {
        background: #363c4e;
    }

    .tv-arrow-down {
        font-size: 10px;
        color: #787b86;
    }

    .tv-footer-right {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .tv-btn-secondary {
        background: transparent;
        border: 1px solid #363c4e;
        color: #d1d4dc;
        padding: 7px 14px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
    }
    .tv-btn-secondary:hover {
        background: #2a2e39;
    }

    .tv-btn-primary {
        background: #2962ff;
        border: none;
        color: #ffffff;
        padding: 7px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
    }
    .tv-btn-primary:hover {
        background: #1e53e5;
    }
</style>

