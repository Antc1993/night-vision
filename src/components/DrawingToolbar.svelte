<script>
    import { onMount, onDestroy } from "svelte";
    import Events from "../core/events.js";

    export let props = {};
    export let layout = {};

    let events = Events.instance(props.id);
    let activeTool = "";
    let openFlyout = null; // null | 'line'
    let isCollapsed = false; // For mobile toggle

    events.on("scroll-lock", (locked) => {
        if (!locked) {
            // When tool placement finishes, return toolbar highlight to crosshair
            activeTool = "crosshair";
        }
    });

    function selectTool(type, subtype = "nada", flyoutName = null) {
        activeTool = subtype !== "nada" ? subtype : type;
        openFlyout = null;

        if (type === "line") {
            events.emit("tool-line", subtype);
        } else if (type === "rectangle") {
            events.emit("tool-rectangle", "nada");
        } else if (type === "fibonacci") {
            events.emit("tool-fibos", "horizontal");
        } else if (type === "measure") {
            events.emit("tool-measure", "nada");
        } else if (type === "cursor") {
            events.emit("set-cursor", subtype || "crosshair");
        }
    }

    function toggleFlyout(name, e) {
        e.stopPropagation();
        openFlyout = openFlyout === name ? null : name;
    }

    function clearAllDrawings() {
        events.emit("delete-all-tools");
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

    <!-- 2. Lines (Segment, Horizontal, Ray) with Flyout Arrow -->
    <div class="nvjs-tb-item-wrapper">
        <button
            class="nvjs-tb-btn"
            class:active={activeTool === "segment" || activeTool === "horizontal" || activeTool === "ray"}
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
                    <span class="nvjs-flyout-icon">📏</span>
                    <span>Línea de tendencia</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "horizontal"}
                    on:click={() => selectTool("line", "horizontal")}
                >
                    <span class="nvjs-flyout-icon">➖</span>
                    <span>Línea horizontal</span>
                </button>
                <button
                    class="nvjs-tb-flyout-item"
                    class:selected={activeTool === "ray"}
                    on:click={() => selectTool("line", "ray")}
                >
                    <span class="nvjs-flyout-icon">📐</span>
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
            on:click={() => selectTool("fibonacci", "horizontal")}
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

    <!-- 4. Geometric Shapes / Rectangle -->
    <div class="nvjs-tb-item-wrapper">
        <button
            class="nvjs-tb-btn"
            class:active={activeTool === "rectangle"}
            on:click={() => selectTool("rectangle", "nada")}
            title="Rectángulo"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
            </svg>
        </button>
    </div>

    <!-- 5. Measure / Ruler Tool -->
    <div class="nvjs-tb-item-wrapper">
        <button
            class="nvjs-tb-btn"
            class:active={activeTool === "measure"}
            on:click={() => selectTool("measure", "nada")}
            title="Medida (Rango de precio / fecha)"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.3 8.7l-6-6a1 1 0 0 0-1.4 0l-11.2 11.2a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l11.2-11.2a1 1 0 0 0 0-1.4z"></path>
                <line x1="7.5" y1="10.5" x2="9.5" y2="8.5"></line>
                <line x1="10.5" y1="13.5" x2="12.5" y2="11.5"></line>
                <line x1="13.5" y1="16.5" x2="15.5" y2="14.5"></line>
            </svg>
        </button>
    </div>

    <div class="nvjs-tb-divider"></div>

    <!-- 6. Delete all tools -->
    <div class="nvjs-tb-item-wrapper">
        <button
            class="nvjs-tb-btn danger"
            on:click={clearAllDrawings}
            title="Eliminar todos los dibujos"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        </button>
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
        width: 40px;
        height: 38px;
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
        bottom: 2px;
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.6;
        transition: opacity 0.15s;
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

    /* Responsive Mobile styles - auto hide toolbar on mobile */
    @media (max-width: 768px) {
        .nvjs-drawing-toolbar {
            display: none !important;
        }
    }
</style>
