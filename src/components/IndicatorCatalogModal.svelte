<script>
    import { onMount, onDestroy } from "svelte";
    import Events from "../core/events.js";
    import DataHub from "../core/dataHub.js";
    import Scripts from "../core/scripts.js";

    export let props = {};
    export let layout = {};

    let events = Events.instance(props.id);
    let hub = DataHub.instance(props.id);
    let scriptsHub = Scripts.instance(props.id);

    let open = false;
    let searchQuery = "";
    let selectedCategory = "all";
    let lastAdded = null;
    let customIndicators = [];

    // Draggable position
    let modalX = 0;
    let modalY = 0;
    let modalDragging = false;
    let modalDragStart = { x: 0, y: 0 };

    // Indicators Catalog Database
    const CATALOG = [
        // --- MEDIAS MÓVILES / TENDENCIA ---
        {
            type: "SMA",
            name: "Simple Moving Average",
            category: "trend",
            catLabel: "Tendencia",
            desc: "Media móvil simple calculada promediando los precios de cierre sobre un periodo determinado.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "EMA",
            name: "Exponential Moving Average",
            category: "trend",
            catLabel: "Tendencia",
            desc: "Media móvil exponencial que otorga mayor ponderación a los precios más recientes.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "HMA",
            name: "Hull Moving Average",
            category: "trend",
            catLabel: "Tendencia",
            desc: "Media móvil de Hull diseñada para reducir el retraso mejorando la suavidad.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "ALMA",
            name: "Arnaud Legoux Moving Average",
            category: "trend",
            catLabel: "Tendencia",
            desc: "Filtro gaussiano que reduce el rezago y elimina el ruido de mercado eficientemente.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "VWMA",
            name: "Volume Weighted Moving Average",
            category: "trend",
            catLabel: "Tendencia",
            desc: "Media móvil ponderada por el volumen de negociación de cada barra.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "VWAP",
            name: "Volume Weighted Average Price (VWAP)",
            category: "trend",
            catLabel: "Tendencia / Volumen",
            desc: "Precio promedio ponderado por volumen con reinicio por sesión y bandas de desviación estándar.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "SWMA",
            name: "Symmetrically Weighted Moving Average",
            category: "trend",
            catLabel: "Tendencia",
            desc: "Media móvil simétricamente ponderada sobre un rango de 4 barras.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "SAR",
            name: "Parabolic SAR",
            category: "trend",
            catLabel: "Tendencia",
            desc: "Stop and Reverse parabólico para identificar puntos potenciales de cambio de tendencia.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "Ichimoku",
            name: "Ichimoku Cloud (Kinko Hyo)",
            category: "trend",
            catLabel: "Tendencia",
            desc: "Sistema integral de líneas Tenkan, Kijun, Senkou Span A/B y nube de soporte/resistencia.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "Ribbon",
            name: "EMA Ribbon",
            category: "trend",
            catLabel: "Tendencia",
            desc: "Cinta de múltiples medias móviles exponenciales para evaluar fuerza tendencial.",
            pane: "main",
            isOverlay: false
        },

        // --- OSCILADORES ---
        {
            type: "RSI",
            name: "Relative Strength Index",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Mide la velocidad y cambio de los movimientos de precio para detectar sobrecompra y sobreventa (70/30).",
            pane: "new",
            isOverlay: false
        },
        {
            type: "MACD",
            name: "Moving Average Convergence Divergence",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Diferencia entre medias móviles rápidas y lentas con línea de señal e histograma.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "Stoch",
            name: "Stochastic Oscillator",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Compara el precio de cierre actual con el rango de precios en un periodo dado (%K, %D).",
            pane: "new",
            isOverlay: false
        },
        {
            type: "CCI",
            name: "Commodity Channel Index",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Mide la desviación del precio respecto a su media estadística para detectar ciclos.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "CMO",
            name: "Chande Momentum Oscillator",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Calcula el momentum sobre la suma de ganancias y pérdidas recientes.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "COG",
            name: "Center of Gravity",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Oscilador de centro de gravedad con retraso mínimo para anticipar giros.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "DMI",
            name: "Directional Movement Index (ADX)",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Evalúa la presencia y fuerza de una tendencia direccional (+DI, -DI y ADX).",
            pane: "new",
            isOverlay: false
        },
        {
            type: "MFI",
            name: "Money Flow Index",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "RSI ponderado por volumen, indicando la presión compradora y vendedora de capital.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "MOM",
            name: "Momentum Indicator",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Mide la tasa de aceleración del precio comparando el cierre actual con el de n periodos atrás.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "ROC",
            name: "Rate of Change",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Variación porcentual entre el precio actual y el de hace n periodos.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "TSI",
            name: "True Strength Index",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Oscilador de doble suavizado para capturar el momentum eliminando oscilaciones falsas.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "WilliamsR",
            name: "Williams %R",
            category: "oscillators",
            catLabel: "Oscilador",
            desc: "Oscilador de rango dinámico escalado de 0 a -100 para niveles de sobrecompra y sobreventa.",
            pane: "new",
            isOverlay: false
        },

        // --- VOLATILIDAD ---
        {
            type: "BB",
            name: "Bollinger Bands",
            category: "volatility",
            catLabel: "Volatilidad",
            desc: "Bandas de volatilidad compuestas por una media central y desviaciones estándar superior e inferior.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "BBW",
            name: "Bollinger Bands Width",
            category: "volatility",
            catLabel: "Volatilidad",
            desc: "Mide el ancho porcentual entre las bandas de Bollinger para detectar compresión/expansión.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "ATR",
            name: "Average True Range",
            category: "volatility",
            catLabel: "Volatilidad",
            desc: "Mide la volatilidad promedio del mercado en unidades absolutas de precio.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "ATRp",
            name: "ATR Percentage",
            category: "volatility",
            catLabel: "Volatilidad",
            desc: "Average True Range normalizado como porcentaje del precio.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "KC",
            name: "Keltner Channels",
            category: "volatility",
            catLabel: "Volatilidad",
            desc: "Canales de volatilidad basados en EMA y múltiplos del Average True Range (ATR).",
            pane: "main",
            isOverlay: false
        },
        {
            type: "KCW",
            name: "Keltner Channels Width",
            category: "volatility",
            catLabel: "Volatilidad",
            desc: "Mide el ancho de los canales de Keltner.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "SuperBands",
            name: "SuperBands",
            category: "volatility",
            catLabel: "Volatilidad",
            desc: "Bandas multinivel de alta precisión con zonas sombreadas de soporte y resistencia.",
            pane: "main",
            isOverlay: true
        },

        // --- VOLUMEN Y FLUJO ---
        {
            type: "VolumeMain",
            name: "Volume (Overlay Principal)",
            category: "volume",
            catLabel: "Volumen",
            desc: "Barras de volumen discretas en el fondo del gráfico principal con línea SMA opcional.",
            pane: "main",
            isOverlay: false
        },
        {
            type: "Volume",
            name: "Volume & Volume SMA (Sub-panel)",
            category: "volume",
            catLabel: "Volumen",
            desc: "Panel independiente de volumen con barras alcistas/bajistas y media móvil SMA.",
            pane: "new",
            isOverlay: false
        },
        {
            type: "VolumeDelta",
            name: "Volume Delta",
            category: "volume",
            catLabel: "Volumen",
            desc: "Histograma diferencial de volumen comprador vs vendedor (Order Flow Delta).",
            pane: "new",
            isOverlay: false
        }
    ];

    const BASE_CATEGORIES = [
        { id: "all", label: "Todos" },
        { id: "trend", label: "Medias Móviles / Tendencia" },
        { id: "oscillators", label: "Osciladores" },
        { id: "volatility", label: "Volatilidad" },
        { id: "volume", label: "Volumen" }
    ];

    $: CATEGORIES = customIndicators.length > 0
        ? [
            { id: "all", label: "Todos" },
            { id: "custom", label: `Personalizados (${customIndicators.length})` },
            { id: "trend", label: "Medias Móviles / Tendencia" },
            { id: "oscillators", label: "Osciladores" },
            { id: "volatility", label: "Volatilidad" },
            { id: "volume", label: "Volumen" }
          ]
        : BASE_CATEGORIES;

    events.on("open-indicators-modal", onOpen);

    onDestroy(() => {
        events.off("open-indicators-modal");
        window.removeEventListener("mousemove", onModalMouseMove);
        window.removeEventListener("mouseup", onModalMouseUp);
    });

    function refreshCustomIndicators() {
        if (!scriptsHub) return;
        const catalogTypes = new Set(CATALOG.map(item => item.type.toLowerCase()));
        let found = [];

        // 1. Check indicator scripts registered in scriptsHub
        if (scriptsHub.iScripts) {
            for (let type in scriptsHub.iScripts) {
                if (catalogTypes.has(type.toLowerCase())) continue;
                let info = scriptsHub.iScripts[type];
                let tag = info.tagProps || {};
                found.push({
                    type: type,
                    name: info.name || type,
                    category: "custom",
                    catLabel: "Personalizado",
                    desc: info.desc || tag.desc || `Indicador personalizado NavyJS (${info.author || "Usuario"}).`,
                    author: info.author || "",
                    version: info.version || "1.0.0",
                    pane: tag.pane || (tag.targetPane === "main" ? "main" : "new"),
                    isOverlay: false,
                    isCustom: true
                });
            }
        }

        // 2. Check prefabs for custom overlays (excluding built-in overlays and drawing tools)
        if (scriptsHub.prefabs) {
            const internalPrefabs = new Set([
                "spline", "splines", "range", "band", "histogram", "cloud", "sparse",
                "candles", "candlesplus", "bars", "heikinashi", "baseline", "area",
                "applearea", "pricelabels", "trades", "arrowtrades", "hollowcandles"
            ]);
            for (let type in scriptsHub.prefabs) {
                if (catalogTypes.has(type.toLowerCase())) continue;
                if (internalPrefabs.has(type.toLowerCase())) continue;
                if (type.endsWith("Tool")) continue;
                let info = scriptsHub.prefabs[type];
                let tag = info.tagProps || {};
                found.push({
                    type: type,
                    name: info.name || type,
                    category: "custom",
                    catLabel: "Personalizado",
                    desc: info.desc || tag.desc || `Overlay personalizado NavyJS (${info.author || "Usuario"}).`,
                    author: info.author || "",
                    version: info.version || "1.0.0",
                    pane: tag.pane || (tag.targetPane === "new" ? "new" : "main"),
                    isOverlay: true,
                    isCustom: true
                });
            }
        }

        customIndicators = found;
    }

    function onOpen() {
        searchQuery = "";
        selectedCategory = "all";
        lastAdded = null;
        refreshCustomIndicators();

        let chartW = (layout?.width && layout.width > 200 ? layout.width : window.innerWidth) || 800;
        let chartH = (layout?.height && layout.height > 200 ? layout.height : window.innerHeight) || 600;
        modalX = Math.max(20, Math.floor((chartW - 540) / 2));
        modalY = Math.max(20, Math.floor((chartH - 520) / 2));

        open = true;
    }

    function onClose() {
        open = false;
    }

    function addIndicatorItem(item) {
        events.emitSpec("hub", "add-indicator", {
            type: item.type,
            props: {},
            isOverlay: item.isOverlay,
            targetPane: item.pane === "main" ? 0 : "new"
        });

        lastAdded = item.type;
        setTimeout(() => {
            if (lastAdded === item.type) lastAdded = null;
        }, 2000);
    }

    // Combine custom indicators (at the top) with built-in catalog
    $: allIndicators = [...customIndicators, ...CATALOG];

    // Filter indicators
    $: filteredIndicators = allIndicators.filter(item => {
        const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
        const q = searchQuery.trim().toLowerCase();
        const matchesQuery = !q ||
            item.type.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            (item.author && item.author.toLowerCase().includes(q)) ||
            item.desc.toLowerCase().includes(q);
        return matchesCat && matchesQuery;
    });

    // Drag handlers
    function onModalMouseDown(e) {
        modalDragging = true;
        modalDragStart = {
            x: e.clientX - modalX,
            y: e.clientY - modalY
        };
        window.addEventListener("mousemove", onModalMouseMove);
        window.addEventListener("mouseup", onModalMouseUp);
    }

    function onModalMouseMove(e) {
        if (!modalDragging) return;
        modalX = Math.max(0, e.clientX - modalDragStart.x);
        modalY = Math.max(0, e.clientY - modalDragStart.y);
    }

    function onModalMouseUp() {
        modalDragging = false;
        window.removeEventListener("mousemove", onModalMouseMove);
        window.removeEventListener("mouseup", onModalMouseUp);
    }
</script>

{#if open}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="tv-modal nvjs-indicators-modal" style="left: {modalX}px; top: {modalY}px;">
        <!-- Header -->
        <div class="tv-modal-header" on:mousedown={onModalMouseDown}>
            <div class="tv-title-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2962ff" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span class="tv-title-text">Indicadores, Métricas y Estrategias</span>
            </div>
            <button class="tv-close-btn" on:click={onClose} title="Cerrar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <!-- Search Bar -->
        <div class="tv-search-bar">
            <svg class="tv-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
                type="text"
                class="tv-search-input"
                placeholder="Buscar indicador (ej. RSI, SMA, Bollinger, Volumen...)"
                bind:value={searchQuery}
            />
            {#if searchQuery}
                <button class="tv-clear-search" on:click={() => searchQuery = ""}>✕</button>
            {/if}
        </div>

        <!-- Category Pills -->
        <div class="tv-cat-pills">
            {#each CATEGORIES as cat}
                <button
                    class="tv-cat-pill"
                    class:active={selectedCategory === cat.id}
                    on:click={() => selectedCategory = cat.id}
                >
                    {cat.label}
                </button>
            {/each}
        </div>

        <!-- Indicators List -->
        <div class="tv-ind-list">
            {#if filteredIndicators.length === 0}
                <div class="tv-empty-list">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#787b86" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <span>No se encontraron indicadores para "{searchQuery}"</span>
                </div>
            {:else}
                {#each filteredIndicators as item}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div class="tv-ind-item" on:click={() => addIndicatorItem(item)}>
                        <div class="tv-ind-main">
                            <div class="tv-ind-header">
                                <span class="tv-ind-type">{item.type}</span>
                                <span class="tv-ind-name">{item.name}</span>
                            </div>
                            <div class="tv-ind-desc">{item.desc}</div>
                        </div>

                        <div class="tv-ind-meta">
                            <span class="tv-badge-cat" class:custom={item.isCustom}>{item.catLabel}</span>
                            <span class="tv-badge-pane" class:main={item.pane === "main"}>
                                {item.pane === "main" ? "Panel Principal" : "Sub-panel"}
                            </span>
                            {#if item.author}
                                <span class="tv-badge-author" title="Autor">{item.author}</span>
                            {/if}
                            <button
                                class="tv-add-btn"
                                class:added={lastAdded === item.type}
                                title="Añadir al gráfico"
                                on:click|stopPropagation={() => addIndicatorItem(item)}
                            >
                                {#if lastAdded === item.type}
                                    ✓
                                {:else}
                                    +
                                {/if}
                            </button>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>

        <!-- Footer -->
        <div class="tv-modal-footer">
            <span class="tv-footer-hint">Haz clic en cualquier indicador o en el botón <strong>+</strong> para insertarlo.</span>
            <button class="tv-btn-primary" on:click={onClose}>Listo</button>
        </div>
    </div>
{/if}

<style>
    .nvjs-indicators-modal {
        position: absolute;
        z-index: 10000;
        width: 520px;
        max-width: 90vw;
        background: #1e222d;
        border: 1px solid #2a2e39;
        border-radius: 8px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8);
        color: #d1d4dc;
        font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
        font-size: 13px;
        user-select: none;
        pointer-events: all;
        display: flex;
        flex-direction: column;
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
        gap: 10px;
    }
    .tv-title-text {
        font-size: 15px;
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

    /* Search Bar */
    .tv-search-bar {
        position: relative;
        padding: 12px 18px 8px 18px;
        display: flex;
        align-items: center;
    }
    .tv-search-icon {
        position: absolute;
        left: 30px;
        color: #787b86;
        pointer-events: none;
    }
    .tv-search-input {
        width: 100%;
        background: #131722;
        border: 1px solid #363c4e;
        border-radius: 6px;
        color: #ffffff;
        padding: 8px 32px 8px 36px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.15s;
    }
    .tv-search-input:focus {
        border-color: #2962ff;
    }
    .tv-clear-search {
        position: absolute;
        right: 28px;
        background: transparent;
        border: none;
        color: #787b86;
        cursor: pointer;
        font-size: 12px;
        padding: 4px;
    }
    .tv-clear-search:hover {
        color: #ffffff;
    }

    /* Category Pills */
    .tv-cat-pills {
        display: flex;
        gap: 6px;
        padding: 4px 18px 10px 18px;
        overflow-x: auto;
        border-bottom: 1px solid #2a2e39;
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .tv-cat-pills::-webkit-scrollbar {
        display: none;
    }
    .tv-cat-pill {
        background: #131722;
        border: 1px solid #363c4e;
        color: #787b86;
        padding: 5px 10px;
        border-radius: 14px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s;
    }
    .tv-cat-pill:hover {
        color: #d1d4dc;
        border-color: #787b86;
    }
    .tv-cat-pill.active {
        background: #2962ff;
        border-color: #2962ff;
        color: #ffffff;
    }

    /* Indicators List */
    .tv-ind-list {
        padding: 8px 12px;
        max-height: 340px;
        min-height: 200px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
        scrollbar-width: thin;
        scrollbar-color: #363c4e transparent;
    }
    .tv-ind-list::-webkit-scrollbar {
        width: 6px;
    }
    .tv-ind-list::-webkit-scrollbar-track {
        background: transparent;
    }
    .tv-ind-list::-webkit-scrollbar-thumb {
        background-color: #363c4e;
        border-radius: 4px;
    }
    .tv-ind-list::-webkit-scrollbar-thumb:hover {
        background-color: #505668;
    }

    .tv-ind-item {
        padding: 10px 12px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        transition: background 0.15s;
        gap: 12px;
    }
    .tv-ind-item:hover {
        background: #2a2e39;
    }

    .tv-ind-main {
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;
        min-width: 0;
    }

    .tv-ind-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .tv-ind-type {
        font-weight: 700;
        color: #2962ff;
        font-size: 13.5px;
    }
    .tv-ind-name {
        color: #ffffff;
        font-weight: 600;
        font-size: 13px;
    }
    .tv-ind-desc {
        font-size: 11.5px;
        color: #787b86;
        line-height: 1.35;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .tv-ind-meta {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .tv-badge-cat {
        background: rgba(41, 98, 255, 0.15);
        color: #2962ff;
        border: 1px solid rgba(41, 98, 255, 0.3);
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 10.5px;
        white-space: nowrap;
    }
    .tv-badge-cat.custom {
        background: rgba(168, 85, 247, 0.18);
        color: #c084fc;
        border: 1px solid rgba(168, 85, 247, 0.35);
    }
    .tv-badge-author {
        font-size: 10.5px;
        color: #9ca3af;
        background: rgba(255, 255, 255, 0.05);
        padding: 3px 6px;
        border-radius: 4px;
        white-space: nowrap;
    }

    .tv-badge-pane {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 10.5px;
        white-space: nowrap;
    }
    .tv-badge-pane.main {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
    }

    .tv-add-btn {
        background: #131722;
        border: 1px solid #363c4e;
        color: #d1d4dc;
        width: 26px;
        height: 26px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.15s;
    }
    .tv-add-btn:hover {
        background: #2962ff;
        border-color: #2962ff;
        color: #ffffff;
    }
    .tv-add-btn.added {
        background: #10b981;
        border-color: #10b981;
        color: #ffffff;
    }

    .tv-empty-list {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        color: #787b86;
        gap: 12px;
    }

    /* Modal Footer */
    .tv-modal-footer {
        padding: 12px 18px;
        border-top: 1px solid #2a2e39;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .tv-footer-hint {
        font-size: 11.5px;
        color: #787b86;
    }
    .tv-btn-primary {
        background: #2962ff;
        border: none;
        color: #ffffff;
        padding: 6px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
    }
    .tv-btn-primary:hover {
        background: #1e53e5;
    }
</style>
