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
    import TextStyle from "./toolSettings/styles/TextStyle.svelte";
    import PositionStyle from "./toolSettings/styles/PositionStyle.svelte";

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
    let toolbarEl;

    // Popover state ('border' | 'text' | 'fill' | 'width' | 'style' | null)
    let activePopover = null;

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
        vertical: LineStyle,
        ray: LineStyle,
        "horizontal-ray": LineStyle,
        rectangle: RectangleStyle,
        triangle: RectangleStyle,
        circle: RectangleStyle,
        ellipse: RectangleStyle,
        arc: RectangleStyle,
        path: LineStyle,
        polyline: LineStyle,
        fibonacci: FibonacciStyle,
        measure: MeasureStyle,
        range: MeasureStyle,
        text: TextStyle,
        long: PositionStyle,
        short: PositionStyle,
        position: PositionStyle,
    };

    const colorPalette = [
        ["#ffffff", "#e0e3eb", "#9598a1", "#5d606b", "#2a2e39", "#131722", "#000000"],
        ["#f23645", "#ff9800", "#ffeb3b", "#089981", "#00bcd4", "#2962ff", "#ab47bc"],
        ["#ef9a9a", "#ffcc80", "#fff59d", "#80cbc4", "#80deea", "#90caf9", "#ce93d8"],
        ["#c62828", "#e65100", "#f57f17", "#004d40", "#00838f", "#1565c0", "#6a1b9a"]
    ];

    events.on("floating-toolbar:selection-event", onSelection);

    onMount(() => {
        window.addEventListener("pointerdown", onGlobalPointerDown);
    });

    onDestroy(() => {
        events.off("floating-toolbar");
        window.removeEventListener("pointerdown", onGlobalPointerDown);
    });

    function onGlobalPointerDown(e) {
        if (toolbarEl && !toolbarEl.contains(e.target)) {
            activePopover = null;
        }
    }

    function hasBorder(type) {
        return type !== "text";
    }

    function hasFill(type) {
        return [
            "rectangle",
            "triangle",
            "circle",
            "ellipse",
            "arc",
            "path",
            "polyline",
            "fibonacci",
            "measure",
            "range",
            "position",
            "long",
            "short",
            "text"
        ].includes(type);
    }

    function hasLineWidth(type) {
        return type !== "text";
    }

    function hasLineStyle(type) {
        return type !== "text";
    }

    function hasTextColor(type) {
        return true;
    }

    function togglePopover(name, e) {
        if (e) e.stopPropagation();
        activePopover = activePopover === name ? null : name;
    }

    function getToolTitle(type) {
        switch (type) {
            case "rectangle":
                return "Rectángulo";
            case "triangle":
                return "Triángulo";
            case "circle":
                return "Círculo";
            case "ellipse":
                return "Elipse";
            case "arc":
                return "Arco";
            case "path":
            case "polyline":
                return "Polilínea / Trayectoria";
            case "horizontal":
                return "Línea horizontal";
            case "vertical":
                return "Línea vertical";
            case "ray":
            case "horizontal-ray":
                return "Línea Semirrecta";
            case "segment":
            case "line":
                return "Línea de tendencia";
            case "fibonacci":
                return "Retroceso de Fibonacci";
            case "measure":
            case "range":
                return "Medida (Rango de precio / fecha)";
            case "text":
                return "Texto / Anotación";
            case "long":
                return "Posición Larga";
            case "short":
                return "Posición Corta";
            case "position":
                return "Posición Larga / Corta";
            default:
                return "Configuración";
        }
    }

    function onSelection(data) {
        if (data && data.type != null) {
            selectedTool = data;
            visible = true;
            activePopover = null;

            // Load initial coordinates and settings
            loadToolData(data);

            if (!moved) {
                const grid = (layout.grids || [])[0] || {
                    width: props.width,
                    sbMax: [0, 0],
                };
                x = grid.sbMax[0] + grid.width - 240;
                y = 40;
            }

            if (data.openSettings) {
                settingsOpen = true;
                activeTab = "style";
                const grid = (layout.grids || [])[0] || { width: props.width || 800, height: 500 };
                modalX = Math.max(20, (grid.width - 400) / 2);
                modalY = Math.max(20, 60);
            }
        } else {
            selectedTool = null;
            visible = false;
            settingsOpen = false;
            activePopover = null;
        }
    }

    function loadToolData(data) {
        const sett = data.settings || {};
        toolSettings = JSON.parse(JSON.stringify(sett));
        if (!toolSettings.color) toolSettings.color = "#33ff33";
        if (!toolSettings.lineWidth) toolSettings.lineWidth = 1;
        if (!toolSettings.lineStyle) toolSettings.lineStyle = "solid";
        if (!toolSettings.textColor) toolSettings.textColor = toolSettings.color || "#ffffff";
        if (!toolSettings.backColor && !toolSettings.fillColor) {
            toolSettings.backColor = toolSettings.color || "#33ff33";
            toolSettings.fillColor = toolSettings.color || "#33ff33";
        }

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
            activePopover = null;
            events.emit("chart:layout-changed");
        }
    }

    function onSettings() {
        settingsOpen = !settingsOpen;
        activePopover = null;
        if (settingsOpen && selectedTool) {
            loadToolData(selectedTool);
            activeTab = "style";
            const grid = (layout.grids || [])[0] || { width: props.width || 800, height: 500 };
            modalX = Math.max(20, (grid.width - 400) / 2);
            modalY = Math.max(20, 60);
        }
    }

    function emitUpdate(includeCoords = false) {
        if (!selectedTool) return;
        if (selectedTool.settings) {
            Object.assign(selectedTool.settings, toolSettings);
        }
        const payload = {
            uuid: selectedTool.uuid,
            settings: toolSettings,
            text: toolText,
        };
        if (includeCoords) {
            payload.p1 = [Number(coordP1Bar), Number(coordP1Price)];
            payload.p2 = [Number(coordP2Bar), Number(coordP2Price)];
        }
        events.emitSpec(selectedTool.overlayUuid, "update-settings", payload);
        events.emit("chart:layout-changed");
    }

    function onSelectBorderColor(color) {
        toolSettings.color = color;
        emitUpdate(false);
    }

    function onSelectTextColor(color) {
        toolSettings.textColor = color;
        if (selectedTool && selectedTool.type === "text") {
            toolSettings.color = color;
        }
        emitUpdate(false);
    }

    function onSelectFillColor(color) {
        toolSettings.backColor = color;
        toolSettings.fillColor = color;
        toolSettings.showBackground = true;
        emitUpdate(false);
    }

    function onFillOpacityChange(e) {
        toolSettings.fillOpacity = parseInt(e.target.value);
        toolSettings.showBackground = true;
        emitUpdate(false);
    }

    function onSelectLineWidth(w) {
        toolSettings.lineWidth = w;
        emitUpdate(false);
        activePopover = null;
    }

    function onSelectLineStyle(s) {
        toolSettings.lineStyle = s;
        emitUpdate(false);
        activePopover = null;
    }

    function onAccept() {
        emitUpdate(activeTab === "coordinates");
        settingsOpen = false;
    }

    function onCancel() {
        if (originalSnapshot && selectedTool) {
            const payload = {
                uuid: selectedTool.uuid,
                settings: originalSnapshot.settings,
                text: originalSnapshot.text,
            };
            if (activeTab === "coordinates") {
                payload.p1 = originalSnapshot.p1;
                payload.p2 = originalSnapshot.p2;
            }
            events.emitSpec(selectedTool.overlayUuid, "update-settings", payload);
            loadToolData(selectedTool);
        }
        settingsOpen = false;
    }
</script>

{#if visible && selectedTool}
    <!-- Floating Quick Toolbar -->
    <div
        bind:this={toolbarEl}
        class="nvjs-floating-toolbar"
        style="left: {x}px; top: {y}px;"
        on:mousedown|stopPropagation
        on:pointerdown|stopPropagation
    >
        <!-- Drag Handle -->
        <div class="drag-handle" on:mousedown={onMouseDown} title="Mover barra">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="5" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="9" cy="19" r="1.5"></circle>
                <circle cx="15" cy="5" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle>
            </svg>
        </div>

        <!-- Quick Style / Border Color (Pencil) -->
        {#if hasBorder(selectedTool.type)}
            <div class="btn-popover-anchor">
                <button
                    type="button"
                    class="toolbar-btn"
                    class:active={activePopover === "border"}
                    on:click={(e) => togglePopover("border", e)}
                    title="Color de borde / línea"
                >
                    <div class="icon-with-stripe">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        <span class="color-stripe" style="background-color: {toolSettings.color || '#33ff33'};"></span>
                    </div>
                </button>

                {#if activePopover === "border"}
                    <div class="tv-popover-panel">
                        <div class="popover-title">Color de línea / borde</div>
                        <div class="palette-grid">
                            {#each colorPalette as row}
                                <div class="palette-row">
                                    {#each row as col}
                                        <button
                                            type="button"
                                            class="palette-swatch"
                                            class:selected={toolSettings.color === col}
                                            style="background-color: {col};"
                                            on:click={() => onSelectBorderColor(col)}
                                        ></button>
                                    {/each}
                                </div>
                            {/each}
                        </div>
                        <div class="custom-color-row">
                            <label class="custom-color-label" for="custom-border-color">
                                <span>Personalizado</span>
                                <input
                                    id="custom-border-color"
                                    type="color"
                                    class="custom-color-input"
                                    value={toolSettings.color || "#33ff33"}
                                    on:input={(e) => onSelectBorderColor(e.target.value)}
                                />
                            </label>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Quick Style / Text Color ("T") -->
        {#if hasTextColor(selectedTool.type)}
            <div class="btn-popover-anchor">
                <button
                    type="button"
                    class="toolbar-btn"
                    class:active={activePopover === "text"}
                    on:click={(e) => togglePopover("text", e)}
                    title="Color del texto"
                >
                    <div class="icon-with-stripe">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="4 7 4 4 20 4 20 7"></polyline>
                            <line x1="12" y1="4" x2="12" y2="20"></line>
                            <line x1="8" y1="20" x2="16" y2="20"></line>
                        </svg>
                        <span class="color-stripe" style="background-color: {toolSettings.textColor || (selectedTool.type === 'text' ? toolSettings.color : '#ffffff')};"></span>
                    </div>
                </button>

                {#if activePopover === "text"}
                    <div class="tv-popover-panel">
                        <div class="popover-title">Color del texto</div>
                        <div class="palette-grid">
                            {#each colorPalette as row}
                                <div class="palette-row">
                                    {#each row as col}
                                        <button
                                            type="button"
                                            class="palette-swatch"
                                            class:selected={toolSettings.textColor === col}
                                            style="background-color: {col};"
                                            on:click={() => onSelectTextColor(col)}
                                        ></button>
                                    {/each}
                                </div>
                            {/each}
                        </div>
                        <div class="custom-color-row">
                            <label class="custom-color-label" for="custom-text-color">
                                <span>Personalizado</span>
                                <input
                                    id="custom-text-color"
                                    type="color"
                                    class="custom-color-input"
                                    value={toolSettings.textColor || "#ffffff"}
                                    on:input={(e) => onSelectTextColor(e.target.value)}
                                />
                            </label>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Quick Style / Line Width ("— 2px") -->
        {#if hasLineWidth(selectedTool.type)}
            <div class="btn-popover-anchor">
                <button
                    type="button"
                    class="toolbar-btn width-btn"
                    class:active={activePopover === "width"}
                    on:click={(e) => togglePopover("width", e)}
                    title="Grosor de línea"
                >
                    <span class="dash-symbol">—</span>
                    <span class="px-label">{toolSettings.lineWidth || 1}px</span>
                </button>

                {#if activePopover === "width"}
                    <div class="tv-popover-panel width-popover">
                        <div class="popover-title">Grosor de línea</div>
                        <div class="options-list">
                            {#each [1, 2, 3, 4] as w}
                                <button
                                    type="button"
                                    class="option-item"
                                    class:selected={(toolSettings.lineWidth || 1) === w}
                                    on:click={() => onSelectLineWidth(w)}
                                >
                                    <span class="preview-line-bar" style="height: {w}px;"></span>
                                    <span class="option-label">{w}px</span>
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Quick Style / Line Style (Solid / Dashed / Dotted) -->
        {#if hasLineStyle(selectedTool.type)}
            <div class="btn-popover-anchor">
                <button
                    type="button"
                    class="toolbar-btn style-btn"
                    class:active={activePopover === "style"}
                    on:click={(e) => togglePopover("style", e)}
                    title="Estilo de línea"
                >
                    {#if toolSettings.lineStyle === "dashed"}
                        <span class="line-style-icon dashed"></span>
                    {:else if toolSettings.lineStyle === "dotted"}
                        <span class="line-style-icon dotted"></span>
                    {:else}
                        <span class="line-style-icon solid"></span>
                    {/if}
                </button>

                {#if activePopover === "style"}
                    <div class="tv-popover-panel style-popover">
                        <div class="popover-title">Estilo de línea</div>
                        <div class="options-list">
                            <button
                                type="button"
                                class="option-item"
                                class:selected={!toolSettings.lineStyle || toolSettings.lineStyle === "solid"}
                                on:click={() => onSelectLineStyle("solid")}
                            >
                                <span class="line-style-icon solid wide"></span>
                                <span class="option-label">Línea continua</span>
                            </button>
                            <button
                                type="button"
                                class="option-item"
                                class:selected={toolSettings.lineStyle === "dashed"}
                                on:click={() => onSelectLineStyle("dashed")}
                            >
                                <span class="line-style-icon dashed wide"></span>
                                <span class="option-label">Línea discontinua</span>
                            </button>
                            <button
                                type="button"
                                class="option-item"
                                class:selected={toolSettings.lineStyle === "dotted"}
                                on:click={() => onSelectLineStyle("dotted")}
                            >
                                <span class="line-style-icon dotted wide"></span>
                                <span class="option-label">Línea punteada</span>
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Quick Style / Fill Color (Bucket) -->
        {#if hasFill(selectedTool.type)}
            <div class="btn-popover-anchor">
                <button
                    type="button"
                    class="toolbar-btn"
                    class:active={activePopover === "fill"}
                    on:click={(e) => togglePopover("fill", e)}
                    title="Color de relleno"
                >
                    <div class="icon-with-stripe">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"></path>
                            <path d="m5 2 5 5"></path>
                            <path d="M2 13h15"></path>
                            <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"></path>
                        </svg>
                        <span class="color-stripe" style="background-color: {toolSettings.backColor || toolSettings.fillColor || toolSettings.color || '#33ff33'};"></span>
                    </div>
                </button>

                {#if activePopover === "fill"}
                    <div class="tv-popover-panel fill-popover">
                        <div class="popover-title">Color de relleno / fondo</div>
                        <div class="palette-grid">
                            {#each colorPalette as row}
                                <div class="palette-row">
                                    {#each row as col}
                                        <button
                                            type="button"
                                            class="palette-swatch"
                                            class:selected={toolSettings.backColor === col || toolSettings.fillColor === col}
                                            style="background-color: {col};"
                                            on:click={() => onSelectFillColor(col)}
                                        ></button>
                                    {/each}
                                </div>
                            {/each}
                        </div>

                        <!-- Opacity Slider -->
                        <div class="popover-slider-row">
                            <span class="slider-label">Opacidad</span>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                class="popover-range"
                                value={toolSettings.fillOpacity != null ? toolSettings.fillOpacity : 20}
                                on:input={onFillOpacityChange}
                            />
                            <span class="slider-val">{toolSettings.fillOpacity != null ? toolSettings.fillOpacity : 20}%</span>
                        </div>

                        <div class="custom-color-row">
                            <label class="custom-color-label" for="custom-fill-color">
                                <span>Personalizado</span>
                                <input
                                    id="custom-fill-color"
                                    type="color"
                                    class="custom-color-input"
                                    value={toolSettings.backColor || toolSettings.fillColor || toolSettings.color || "#33ff33"}
                                    on:input={(e) => onSelectFillColor(e.target.value)}
                                />
                            </label>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Divider -->
        <div class="toolbar-divider"></div>

        <!-- Full Options Modal Button (Gear) -->
        <button
            type="button"
            class="toolbar-btn"
            on:click={onSettings}
            title="Opciones avanzadas"
            class:active={settingsOpen}
        >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        </button>

        <!-- Delete Button (Trash) -->
        <button
            type="button"
            class="toolbar-btn delete-btn"
            on:click={onDelete}
            title="Eliminar"
        >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        </button>
    </div>

    <!-- TradingView Style Modal Dialog -->
    {#if settingsOpen && selectedTool}
        <div class="tv-modal" style="left: {modalX}px; top: {modalY}px;" on:mousedown|stopPropagation>
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
                        onUpdate={() => emitUpdate(false)}
                    />
                {:else if activeTab === "coordinates"}
                    <CoordinatesTab
                        bind:p1Price={coordP1Price}
                        bind:p1Bar={coordP1Bar}
                        bind:p2Price={coordP2Price}
                        bind:p2Bar={coordP2Bar}
                        hasP2={selectedTool.type !== "horizontal" && selectedTool.type !== "vertical" && selectedTool.type !== "ray" && selectedTool.type !== "horizontal-ray" && selectedTool.type !== "text"}
                        onUpdate={() => emitUpdate(true)}
                    />
                {:else if activeTab === "text"}
                    <TextTab bind:text={toolText} onUpdate={() => emitUpdate(false)} />
                {:else if activeTab === "visibility"}
                    <VisibilityTab onUpdate={() => emitUpdate(false)} />
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
    /* Quick Floating Toolbar Container */
    .nvjs-floating-toolbar {
        position: absolute;
        z-index: 1000;
        background: #1e222d;
        border: 1px solid #363c4e;
        border-radius: 6px;
        padding: 3px 4px;
        display: flex;
        align-items: center;
        gap: 3px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.65);
        pointer-events: all;
        user-select: none;
        box-sizing: border-box;
    }

    .drag-handle {
        padding: 5px 6px;
        cursor: move;
        color: #787b86;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }
    .drag-handle:hover {
        color: #d1d4dc;
        background: #2a2e39;
    }

    .btn-popover-anchor {
        position: relative;
        display: inline-flex;
        align-items: center;
    }

    .toolbar-btn {
        background: transparent;
        border: none;
        color: #d1d4dc;
        cursor: pointer;
        padding: 4px 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.15s, color 0.15s;
        height: 28px;
        box-sizing: border-box;
    }
    .toolbar-btn:hover,
    .toolbar-btn.active {
        background: #2a2e39;
        color: #ffffff;
    }

    .toolbar-btn.delete-btn:hover {
        background: rgba(242, 54, 69, 0.2);
        color: #f23645;
    }

    .icon-with-stripe {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding-top: 1px;
    }

    .color-stripe {
        width: 15px;
        height: 3px;
        border-radius: 2px;
        display: block;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    /* Width button: "— 2px" */
    .width-btn {
        font-size: 12px;
        font-weight: 500;
        gap: 4px;
        padding: 4px 6px;
    }
    .dash-symbol {
        font-weight: bold;
        color: #787b86;
    }
    .px-label {
        font-size: 11px;
        color: #d1d4dc;
    }

    /* Line Style button & previews */
    .style-btn {
        padding: 4px 8px;
    }
    .line-style-icon {
        display: inline-block;
        width: 18px;
        height: 2px;
        vertical-align: middle;
    }
    .line-style-icon.wide {
        width: 28px;
    }
    .line-style-icon.solid {
        background-color: #d1d4dc;
    }
    .line-style-icon.dashed {
        background-image: repeating-linear-gradient(to right, #d1d4dc 0, #d1d4dc 5px, transparent 5px, transparent 8px);
    }
    .line-style-icon.dotted {
        background-image: repeating-linear-gradient(to right, #d1d4dc 0, #d1d4dc 2px, transparent 2px, transparent 5px);
    }

    .toolbar-divider {
        width: 1px;
        height: 18px;
        background: #363c4e;
        margin: 0 2px;
    }

    /* Popover Panels */
    .tv-popover-panel {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        z-index: 1005;
        background: #1e222d;
        border: 1px solid #363c4e;
        border-radius: 6px;
        padding: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.75);
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 175px;
    }

    .tv-popover-panel.width-popover,
    .tv-popover-panel.style-popover {
        min-width: 140px;
    }

    .popover-title {
        font-size: 11px;
        font-weight: 600;
        color: #787b86;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .palette-grid {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .palette-row {
        display: flex;
        gap: 4px;
    }

    .palette-swatch {
        width: 20px;
        height: 20px;
        border-radius: 3px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
        padding: 0;
        transition: transform 0.1s, border-color 0.1s;
        box-sizing: border-box;
    }
    .palette-swatch:hover {
        transform: scale(1.15);
        border-color: #ffffff;
    }
    .palette-swatch.selected {
        border: 2px solid #ffffff;
        box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
    }

    .custom-color-row {
        border-top: 1px solid #2a2e39;
        padding-top: 6px;
        margin-top: 2px;
    }

    .custom-color-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: #d1d4dc;
        cursor: pointer;
    }

    .custom-color-input {
        width: 24px;
        height: 22px;
        border: 1px solid #363c4e;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        padding: 0;
    }

    /* Slider inside fill popover */
    .popover-slider-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        border-top: 1px solid #2a2e39;
    }
    .slider-label {
        font-size: 11px;
        color: #787b86;
        white-space: nowrap;
    }
    .popover-range {
        flex-grow: 1;
        accent-color: #2962ff;
        cursor: pointer;
        height: 4px;
    }
    .slider-val {
        font-size: 11px;
        color: #d1d4dc;
        min-width: 28px;
        text-align: right;
    }

    /* Dropdown Options List (Width and Style) */
    .options-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .option-item {
        background: transparent;
        border: none;
        color: #d1d4dc;
        padding: 6px 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        text-align: left;
        transition: background 0.15s;
    }
    .option-item:hover,
    .option-item.selected {
        background: #2a2e39;
        color: #ffffff;
    }
    .option-item.selected {
        font-weight: 600;
        border-left: 2px solid #2962ff;
    }

    .preview-line-bar {
        display: inline-block;
        width: 32px;
        background: #d1d4dc;
        border-radius: 1px;
    }

    .option-label {
        flex-grow: 1;
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
