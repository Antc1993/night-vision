<script>
    import { onMount, onDestroy } from "svelte";
    import Events from "../core/events.js";
    import DataHub from "../core/dataHub.js";

    export let props = {};
    export let layout = {};

    let events = Events.instance(props.id);
    let hub = DataHub.instance(props.id);
    let activeTool = "";
    let openFlyout = null; // null | 'line' | 'trash'
    let isCollapsed = false; // For mobile toggle

    events.on("scroll-lock", (locked) => {
        if (!locked) {
            // When tool placement finishes, return toolbar highlight to crosshair
            activeTool = "crosshair";
            events.emit("chart:layout-changed");
        }
    });

    function getCounts() {
        let drawings = 0;
        let indicators = 0;
        if (hub && hub.data && hub.data.panes) {
            const toolTypes = ["RectTool", "TriangleTool", "CircleTool", "EllipseTool", "ArcTool", "PathTool", "LineTool", "FibonacciRetracementTool", "MeasureTool", "TextTool", "PositionTool"];
            for (var pane of hub.data.panes) {
                for (var ov of pane.overlays || []) {
                    if (ov.dataExt) {
                        if (ov.dataExt.lines) drawings += ov.dataExt.lines.length;
                        if (ov.dataExt.rectangles) drawings += ov.dataExt.rectangles.length;
                        if (ov.dataExt.triangles) drawings += ov.dataExt.triangles.length;
                        if (ov.dataExt.circles) drawings += ov.dataExt.circles.length;
                        if (ov.dataExt.ellipses) drawings += ov.dataExt.ellipses.length;
                        if (ov.dataExt.arcs) drawings += ov.dataExt.arcs.length;
                        if (ov.dataExt.paths) drawings += ov.dataExt.paths.length;
                        if (ov.dataExt.fibos) drawings += ov.dataExt.fibos.length;
                        if (ov.dataExt.measures) drawings += ov.dataExt.measures.length;
                        if (ov.dataExt.texts) drawings += ov.dataExt.texts.length;
                        if (ov.dataExt.positions) drawings += ov.dataExt.positions.length;
                    }
                    if (!ov.main && !toolTypes.includes(ov.type)) {
                        indicators++;
                    }
                }
            }
        }
        return { drawings, indicators };
    }

    $: counts = (openFlyout === "trash" || true) ? getCounts() : { drawings: 0, indicators: 0 };

    function selectTool(type, subtype = "nada", flyoutName = null) {
        activeTool = subtype !== "nada" ? subtype : type;
        openFlyout = null;

        if (type === "cursor") {
            events.emit("hub:set-drawing-tool", null);
            events.emit("hub:set-drawing-in-progress", false);
            events.emit("set-cursor", subtype || "crosshair");
            return;
        }

        events.emit("hub:set-drawing-tool", type);

        if (type === "line") {
            events.emit("tool-line", subtype);
        } else if (type === "rectangle") {
            events.emit("tool-rectangle", "nada");
        } else if (type === "circle") {
            events.emit("tool-circle", "nada");
        } else if (type === "ellipse") {
            events.emit("tool-ellipse", "nada");
        } else if (type === "arc") {
            events.emit("tool-arc", "nada");
        } else if (type === "triangle") {
            events.emit("tool-triangle", "nada");
        } else if (type === "path") {
            events.emit("tool-path", "nada");
        } else if (type === "text") {
            events.emit("tool-text", "nada");
        } else if (type === "price-label") {
            events.emit("tool-price-label", "nada");
        } else if (type === "long") {
            events.emit("tool-long", "nada");
        } else if (type === "short") {
            events.emit("tool-short", "nada");
        } else if (type === "fibonacci") {
            events.emit("tool-fibos", "horizontal");
        } else if (type === "measure") {
            events.emit("tool-measure", "nada");
        }
    }

    function toggleFlyout(name, e) {
        e.stopPropagation();
        openFlyout = openFlyout === name ? null : name;
    }

    function clearAllDrawings() {
        events.emit("delete-all-tools");
        events.emit("chart:layout-changed");
        openFlyout = null;
    }

    function clearAllIndicators() {
        if (hub && hub.data && hub.data.panes) {
            const toolTypes = ["RectTool", "TriangleTool", "CircleTool", "EllipseTool", "ArcTool", "PathTool", "LineTool", "FibonacciRetracementTool", "MeasureTool", "TextTool", "PositionTool"];
            if (hub.data.panes[0]) {
                hub.data.panes[0].overlays = (hub.data.panes[0].overlays || []).filter(
                    ov => ov.main || toolTypes.includes(ov.type)
                );
            }
            hub.data.panes = hub.data.panes.slice(0, 1);
            events.emit("full-update");
            events.emit("remake-grid");
            events.emit("update-layout");
            events.emit("chart:layout-changed");
        }
        openFlyout = null;
    }

    function clearAllDrawingsAndIndicators() {
        clearAllDrawings();
        clearAllIndicators();
    }

    function closeFlyouts() {
        openFlyout = null;
    }
</script>

<svelte:window on:click={closeFlyouts} />

<aside class="nvjs-drawing-toolbar">
    <!-- 1. Cursor / Crosshair -->
    <div class="nvjs-tb-item-wrapper">
        <button
            class="nvjs-tb-btn"
            class:active={activeTool === "cursor" || activeTool === "crosshair" || !activeTool}
            on:click={() => selectTool("cursor", "crosshair")}
            title="Cruce / Puntero"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="2" x2="12" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
        </button>
    </div>

    <!-- 2. Lines (Segment, Horizontal, Vertical, Ray) with Flyout Arrow -->
    <div class="nvjs-tb-item-wrapper has-arrow">
        <button
            class="nvjs-tb-btn"
            class:active={activeTool === "segment" || activeTool === "horizontal" || activeTool === "vertical" || activeTool === "ray"}
            on:click={() => selectTool("line", "segment")}
            title="Líneas de tendencia"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="4" y1="20" x2="20" y2="4"></line>
                <circle cx="4" cy="20" r="2" fill="currentColor"></circle>
                <circle cx="20" cy="4" r="2" fill="currentColor"></circle>
            </svg>
        </button>
        <button
            class="nvjs-tb-arrow-btn"
            class:active={openFlyout === "line"}
            on:click={(e) => toggleFlyout("line", e)}
            title="Más opciones de línea"
        >
            <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="0,0 24,12 0,24"></polygon>
            </svg>
        </button>

        {#if openFlyout === "line"}
            <div class="nvjs-tb-flyout">
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "segment"}
                    on:click={() => selectTool("line", "segment")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="4" y1="20" x2="20" y2="4"></line>
                            <circle cx="4" cy="20" r="2.5" fill="currentColor"></circle>
                            <circle cx="20" cy="4" r="2.5" fill="currentColor"></circle>
                        </svg>
                    </span>
                    <span>Línea de tendencia</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "horizontal"}
                    on:click={() => selectTool("line", "horizontal")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <circle cx="12" cy="12" r="2.5" fill="currentColor"></circle>
                        </svg>
                    </span>
                    <span>Línea horizontal</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "vertical"}
                    on:click={() => selectTool("line", "vertical")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="2" x2="12" y2="22"></line>
                            <circle cx="12" cy="12" r="2.5" fill="currentColor"></circle>
                        </svg>
                    </span>
                    <span>Línea vertical</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "ray"}
                    on:click={() => selectTool("line", "ray")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="4" y1="20" x2="20" y2="4"></line>
                            <circle cx="4" cy="20" r="2.5" fill="currentColor"></circle>
                            <polyline points="14,4 20,4 20,10"></polyline>
                        </svg>
                    </span>
                    <span>Línea Semirrecta / Rayo</span>
                </button>
            </div>
        {/if}
    </div>

    <!-- 3. Fibonacci Retracement -->
    <div class="nvjs-tb-item-wrapper">
        <button
            class="nvjs-tb-btn"
            class:active={activeTool === "fibonacci"}
            on:click={() => selectTool("fibonacci", "nada")}
            title="Retroceso de Fibonacci"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="5" x2="21" y2="5"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
                <line x1="3" y1="20" x2="21" y2="20"></line>
                <line x1="5" y1="20" x2="19" y2="5" stroke-dasharray="2 2"></line>
            </svg>
        </button>
    </div>

    <!-- 4. Geometric Shapes (Rectangle, Circle, Ellipse, Arc, Triangle) with Flyout Arrow -->
    <div class="nvjs-tb-item-wrapper has-arrow">
        <button
            class="nvjs-tb-btn"
            class:active={["rectangle", "circle", "ellipse", "arc", "triangle"].includes(activeTool)}
            on:click={() => selectTool(["circle", "ellipse", "arc", "triangle"].includes(activeTool) ? activeTool : "rectangle", "nada")}
            title="Figuras geométricas"
        >
            {#if activeTool === "triangle"}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12,4 21,20 3,20"></polygon>
                </svg>
            {:else if activeTool === "circle"}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="8"></circle>
                </svg>
            {:else if activeTool === "ellipse"}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <ellipse cx="12" cy="12" rx="9" ry="5"></ellipse>
                </svg>
            {:else if activeTool === "arc"}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 17 A 9 9 0 0 1 20 17"></path>
                    <circle cx="4" cy="17" r="1.5" fill="currentColor"></circle>
                    <circle cx="12" cy="8" r="1.5" fill="currentColor"></circle>
                    <circle cx="20" cy="17" r="1.5" fill="currentColor"></circle>
                </svg>
            {:else}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                </svg>
            {/if}
        </button>
        <button
            class="nvjs-tb-arrow-btn"
            class:active={openFlyout === "shapes"}
            on:click={(e) => toggleFlyout("shapes", e)}
            title="Más figuras geométricas"
        >
            <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="0,0 24,12 0,24"></polygon>
            </svg>
        </button>

        {#if openFlyout === "shapes"}
            <div class="nvjs-tb-flyout">
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "rectangle"}
                    on:click={() => selectTool("rectangle", "nada")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                        </svg>
                    </span>
                    <span>Rectángulo</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "circle"}
                    on:click={() => selectTool("circle", "nada")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="8"></circle>
                        </svg>
                    </span>
                    <span>Círculo</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "ellipse"}
                    on:click={() => selectTool("ellipse", "nada")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <ellipse cx="12" cy="12" rx="9" ry="5"></ellipse>
                        </svg>
                    </span>
                    <span>Elipse</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "arc"}
                    on:click={() => selectTool("arc", "nada")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 17 A 9 9 0 0 1 20 17"></path>
                            <circle cx="4" cy="17" r="1.5" fill="currentColor"></circle>
                            <circle cx="12" cy="8" r="1.5" fill="currentColor"></circle>
                            <circle cx="20" cy="17" r="1.5" fill="currentColor"></circle>
                        </svg>
                    </span>
                    <span>Arco (3 puntos)</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "triangle"}
                    on:click={() => selectTool("triangle", "nada")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12,4 21,20 3,20"></polygon>
                        </svg>
                    </span>
                    <span>Triángulo (3 puntos)</span>
                </button>
            </div>
        {/if}
    </div>

    <!-- 5. Path / Polyline Tool -->
    <div class="nvjs-tb-item-wrapper">
        <button
            class="nvjs-tb-btn"
            class:active={activeTool === "path"}
            on:click={() => selectTool("path", "nada")}
            title="Polilínea / Trayectoria (Doble clic o Enter para finalizar)"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4,19 8,8 14,14 20,4"></polyline>
                <line x1="20" y1="4" x2="15" y2="4"></line>
                <line x1="20" y1="4" x2="20" y2="9"></line>
                <circle cx="4" cy="19" r="1.5" fill="currentColor"></circle>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"></circle>
                <circle cx="14" cy="14" r="1.5" fill="currentColor"></circle>
            </svg>
        </button>
    </div>

    <!-- 5. Text & Price Label Tools (Grouped) with Flyout Arrow -->
    <div class="nvjs-tb-item-wrapper has-arrow">
        <button
            class="nvjs-tb-btn"
            class:active={activeTool === "text" || activeTool === "price-label"}
            on:click={() => selectTool(activeTool === "price-label" ? "price-label" : "text", "nada")}
            title={activeTool === "price-label" ? "Etiqueta de precio" : "Texto / Anotación"}
        >
            {#if activeTool === "price-label"}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    <line x1="8" y1="9" x2="16" y2="9"></line>
                    <line x1="8" y1="13" x2="13" y2="13"></line>
                </svg>
            {:else}
                <span style="font-size: 16px; font-weight: 700; font-family: sans-serif;">T</span>
            {/if}
        </button>
        <button
            class="nvjs-tb-arrow-btn"
            class:active={openFlyout === "text-group"}
            on:click={(e) => toggleFlyout("text-group", e)}
            title="Opciones de texto y etiquetas"
        >
            <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="0,0 24,12 0,24"></polygon>
            </svg>
        </button>

        {#if openFlyout === "text-group"}
            <div class="nvjs-tb-flyout">
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "text"}
                    on:click={() => selectTool("text", "nada")}
                >
                    <span class="nvjs-flyout-icon">
                        <span style="font-size: 14px; font-weight: 700; font-family: sans-serif;">T</span>
                    </span>
                    <span>Texto</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "price-label"}
                    on:click={() => selectTool("price-label", "nada")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            <line x1="8" y1="9" x2="16" y2="9"></line>
                            <line x1="8" y1="13" x2="13" y2="13"></line>
                        </svg>
                    </span>
                    <span>Etiqueta de precio</span>
                </button>
            </div>
        {/if}
    </div>

    <!-- 6. Position Tool (Long / Short) with Flyout Arrow -->
    <div class="nvjs-tb-item-wrapper has-arrow">
        <button
            class="nvjs-tb-btn"
            class:active={activeTool === "long" || activeTool === "short"}
            on:click={() => selectTool(activeTool === "short" ? "short" : "long", activeTool === "short" ? "short" : "long")}
            title={activeTool === "short" ? "Posición corta" : "Posición larga"}
        >
            {#if activeTool === "short"}
                <!-- Posición Corta: Stop Loss arriba (rojo) / Take Profit abajo (verde) con flecha bajista -->
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6H3z" fill="#f23645"></path>
                    <path d="M3 12h18v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-6z" fill="#089981"></path>
                    <line x1="3" y1="12" x2="21" y2="12" stroke="#ffffff" stroke-width="1.5"></line>
                    <path d="M12 18.5l-3.5-4h7L12 18.5z" fill="#ffffff"></path>
                    <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"></rect>
                </svg>
            {:else}
                <!-- Posición Larga: Take Profit arriba (verde) con flecha alcista / Stop Loss abajo (rojo) -->
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6H3z" fill="#089981"></path>
                    <path d="M3 12h18v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-6z" fill="#f23645"></path>
                    <line x1="3" y1="12" x2="21" y2="12" stroke="#ffffff" stroke-width="1.5"></line>
                    <path d="M12 5.5l-3.5 4h7L12 5.5z" fill="#ffffff"></path>
                    <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"></rect>
                </svg>
            {/if}
        </button>
        <button
            class="nvjs-tb-arrow-btn"
            class:active={openFlyout === "position"}
            on:click={(e) => toggleFlyout("position", e)}
            title="Opciones de posición"
        >
            <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="0,0 24,12 0,24"></polygon>
            </svg>
        </button>

        {#if openFlyout === "position"}
            <div class="nvjs-tb-flyout">
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "long"}
                    on:click={() => selectTool("long", "long")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 12V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6H3z" fill="#089981"></path>
                            <path d="M3 12h18v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-6z" fill="#f23645"></path>
                            <line x1="3" y1="12" x2="21" y2="12" stroke="#ffffff" stroke-width="1.5"></line>
                            <path d="M12 5.5l-3.5 4h7L12 5.5z" fill="#ffffff"></path>
                            <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"></rect>
                        </svg>
                    </span>
                    <span>Posición larga</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "short"}
                    on:click={() => selectTool("short", "short")}
                >
                    <span class="nvjs-flyout-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 12V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6H3z" fill="#f23645"></path>
                            <path d="M3 12h18v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-6z" fill="#089981"></path>
                            <line x1="3" y1="12" x2="21" y2="12" stroke="#ffffff" stroke-width="1.5"></line>
                            <path d="M12 18.5l-3.5-4h7L12 18.5z" fill="#ffffff"></path>
                            <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"></rect>
                        </svg>
                    </span>
                    <span>Posición corta</span>
                </button>
            </div>
        {/if}
    </div>

    <!-- 7. Measure / Ruler Tool -->
    <div class="nvjs-tb-item-wrapper">
        <button
            class="nvjs-tb-btn"
            class:active={activeTool === "measure"}
            on:click={() => selectTool("measure", "nada")}
            title="Medida (Rango de precio / fecha)"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 3.5L3.5 14.5a1.4 1.4 0 0 0 0 2l4 4a1.4 1.4 0 0 0 2 0L20.5 9.5a1.4 1.4 0 0 0 0-2l-4-4a1.4 1.4 0 0 0-2 0z"></path>
                <line x1="13" y1="5" x2="15.5" y2="7.5"></line>
                <line x1="11" y1="7" x2="12.5" y2="8.5"></line>
                <line x1="9" y1="9" x2="11.5" y2="11.5"></line>
                <line x1="7" y1="11" x2="8.5" y2="12.5"></line>
                <line x1="5" y1="13" x2="7.5" y2="15.5"></line>
            </svg>
        </button>
    </div>

    <div class="nvjs-tb-divider"></div>

    <!-- 6. Delete all tools / TradingView Style Flyout -->
    <div class="nvjs-tb-item-wrapper has-arrow">
        <button
            class="nvjs-tb-btn danger"
            class:active={openFlyout === "trash"}
            on:click={(e) => toggleFlyout("trash", e)}
            title="Eliminar dibujos e indicadores"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        </button>
        <button
            class="nvjs-tb-arrow-btn"
            class:active={openFlyout === "trash"}
            on:click={(e) => toggleFlyout("trash", e)}
            title="Opciones de eliminación"
        >
            <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="0,0 24,12 0,24"></polygon>
            </svg>
        </button>

        {#if openFlyout === "trash"}
            <div class="nvjs-tb-flyout nvjs-tb-trash-flyout">
                <button
                    class="nvjs-tb-flyout-item danger-item"
                    on:click={clearAllDrawings}
                >
                    <span class="nvjs-flyout-icon">🗑️</span>
                    <span>{counts.drawings > 0 ? `Eliminar ${counts.drawings} dibujos` : 'Eliminar dibujos'}</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item danger-item"
                    on:click={clearAllIndicators}
                >
                    <span class="nvjs-flyout-icon">📊</span>
                    <span>{counts.indicators > 0 ? `Eliminar ${counts.indicators} indicadores` : 'Eliminar indicadores'}</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item danger-item"
                    on:click={clearAllDrawingsAndIndicators}
                >
                    <span class="nvjs-flyout-icon">🧹</span>
                    <span>{counts.drawings > 0 && counts.indicators > 0 ? `Eliminar ${counts.drawings} dibujos y ${counts.indicators} indicadores` : 'Eliminar dibujos e indicadores'}</span>
                </button>
            </div>
        {/if}
    </div>
</aside>

<style>
    .nvjs-drawing-toolbar {
        position: relative;
        width: 48px;
        height: 100%;
        flex-shrink: 0;
        background: #14171c;
        border-right: 1px solid #23272f;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 8px;
        gap: 4px;
        z-index: 20;
        user-select: none;
        box-sizing: border-box;
    }

    .nvjs-tb-item-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 38px;
    }

    .nvjs-tb-item-wrapper.has-arrow .nvjs-tb-btn svg,
    .nvjs-tb-item-wrapper:has(.nvjs-tb-arrow-btn) .nvjs-tb-btn svg {
        transform: translateX(-3px);
    }

    .nvjs-tb-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.15s ease;
        width: 36px;
        height: 36px;
    }

    .nvjs-tb-btn:hover {
        background: #20242e;
        color: #f1f5f9;
    }

    .nvjs-tb-btn.active {
        background: #2962ff22;
        color: #2962ff;
    }

    .nvjs-tb-btn.danger:hover {
        background: #ef444422;
        color: #ef4444;
    }

    .nvjs-tb-arrow-btn {
        position: absolute;
        right: 1px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 4px 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.6;
        transition: opacity 0.15s, color 0.15s;
    }

    .nvjs-tb-arrow-btn:hover,
    .nvjs-tb-arrow-btn.active {
        opacity: 1;
        color: #2962ff;
    }

    .nvjs-tb-divider {
        width: 24px;
        height: 1px;
        background: #23272f;
        margin: 6px 0;
    }

    /* Flyout Menu */
    .nvjs-tb-flyout {
        position: absolute;
        left: 48px;
        top: 0;
        background: #181b22;
        border: 1px solid #2d3340;
        border-radius: 6px;
        padding: 4px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 180px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
        z-index: 100;
    }

    .nvjs-tb-flyout-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: transparent;
        border: none;
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        border-radius: 4px;
        text-align: left;
        transition: background 0.15s;
    }

    .nvjs-tb-flyout-item:hover {
        background: #232834;
        color: #ffffff;
    }

    .nvjs-tb-flyout-item.selected {
        background: #2962ff22;
        color: #2962ff;
    }

    .nvjs-flyout-icon {
        font-size: 14px;
    }

    .nvjs-tb-trash-flyout {
        min-width: 220px;
        top: -60px;
    }

    .nvjs-tb-flyout-item.danger-item:hover {
        background: #ef444422;
        color: #fca5a5;
    }

    /* Responsive Mobile styles - auto hide toolbar on mobile */
    @media (max-width: 768px) {
        .nvjs-drawing-toolbar {
            display: none !important;
        }
    }
</style>
