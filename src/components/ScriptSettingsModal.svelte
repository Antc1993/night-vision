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

    // Modal state
    let open = false;
    let paneId = 0;
    let ov = null;
    let script = null;
    let title = "";
    let scriptType = "";
    let activeTab = "inputs"; // "inputs" | "style" | "visibility" | "code"

    // Props & Schema
    let propsSchema = {};
    let editingProps = {};
    let editingSettings = {};
    let originalSnapshot = null;
    let scriptInfo = null;

    // Draggable position
    let modalX = 0;
    let modalY = 0;
    let modalDragging = false;
    let modalDragStart = { x: 0, y: 0 };

    events.on("open-script-settings", onOpenSettings);

    onDestroy(() => {
        if (liveUpdateTimer) {
            clearTimeout(liveUpdateTimer);
            liveUpdateTimer = null;
        }
        events.off("open-script-settings");
        window.removeEventListener("mousemove", onModalMouseMove);
        window.removeEventListener("mouseup", onModalMouseUp);
    });

    function onOpenSettings(data) {
        paneId = data.paneId ?? 0;
        ov = data.ov;
        activeTab = data.tab || "inputs";

        if (!ov) return;

        let pane = hub.panes()[paneId];
        script = null;
        if (ov.prod) {
            script = (pane?.scripts || []).find(s => s.uuid === ov.prod || s.id === ov.prod);
        } else {
            script = (pane?.scripts || []).find(s => s.uuid === ov.uuid || s.type === ov.type);
        }

        scriptType = script?.type || ov.type || "Indicador";
        title = ov.name || scriptType;
        scriptInfo = scriptsHub.getScriptInfo(scriptType);

        // Fetch schema
        propsSchema = scriptsHub.getSchema(scriptType) || {};

        // Prepare base props
        let baseProps = {};
        if (script) {
            baseProps = Object.assign({}, script.props || {});
        } else {
            baseProps = Object.assign({}, ov.props || {});
        }

        // Ensure all schema props exist in baseProps with defaults
        for (let key in propsSchema) {
            if (!(key in baseProps) || baseProps[key] === undefined) {
                baseProps[key] = propsSchema[key].def;
            }
        }

        editingProps = JSON.parse(JSON.stringify(baseProps));
        editingSettings = JSON.parse(JSON.stringify(Object.assign({}, script?.settings || {}, ov.settings || {})));

        // Ensure lineWidth is available for styling on all line/band/indicator overlays
        if (!('lineWidth' in editingProps) && !scriptType.toLowerCase().includes('candle') && !scriptType.toLowerCase().includes('bar')) {
            editingProps.lineWidth = ov.props?.lineWidth || 1;
        }

        // Save original snapshot for revert
        originalSnapshot = {
            props: JSON.parse(JSON.stringify(editingProps)),
            settings: JSON.parse(JSON.stringify(editingSettings))
        };

        // If action is reset immediately
        if (data.action === "reset") {
            resetDefaults();
            return;
        }

        // Position modal centered in chart
        let chartW = (layout?.width && layout.width > 200 ? layout.width : window.innerWidth) || 800;
        let chartH = (layout?.height && layout.height > 200 ? layout.height : window.innerHeight) || 500;
        modalX = Math.max(20, Math.floor((chartW - 400) / 2));
        modalY = Math.max(20, Math.floor((chartH - 420) / 2));

        open = true;
    }

    let liveUpdateTimer = null;

    function emitLiveUpdate(immediate = false) {
        if (liveUpdateTimer) {
            clearTimeout(liveUpdateTimer);
            liveUpdateTimer = null;
        }
        if (immediate === true) {
            doEmitLiveUpdate();
        } else {
            liveUpdateTimer = setTimeout(() => {
                liveUpdateTimer = null;
                doEmitLiveUpdate();
            }, 60);
        }
    }

    function doEmitLiveUpdate() {
        events.emitSpec("hub", "update-script-props", {
            paneId: paneId,
            ov: ov,
            props: editingProps,
            settings: editingSettings
        });
    }

    function onAccept() {
        emitLiveUpdate(true);
        open = false;
    }

    function onCancel() {
        if (liveUpdateTimer) {
            clearTimeout(liveUpdateTimer);
            liveUpdateTimer = null;
        }
        if (originalSnapshot) {
            editingProps = JSON.parse(JSON.stringify(originalSnapshot.props));
            editingSettings = JSON.parse(JSON.stringify(originalSnapshot.settings));
            doEmitLiveUpdate();
        }
        open = false;
    }

    function resetDefaults() {
        for (let key in propsSchema) {
            editingProps[key] = propsSchema[key].def;
        }
        if ('lineWidth' in editingProps) {
            editingProps.lineWidth = 1;
        }
        editingSettings.precision = undefined;
        editingSettings.zIndex = 0;
        editingSettings.display = true;
        editingSettings.showLegend = true;
        emitLiveUpdate(true);
    }

    // Modal drag handlers
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

    function stepNumber(key, delta, min = -Infinity, max = Infinity, isInt = false) {
        let val = Number(editingProps[key] ?? 0) + delta;
        if (isInt) val = Math.round(val);
        if (val < min) val = min;
        if (val > max) val = max;
        editingProps[key] = val;
        emitLiveUpdate();
    }

    function formatPropLabel(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, s => s.toUpperCase());
    }

    function getPropType(key) {
        if (propsSchema[key]?.type) {
            return propsSchema[key].type.toLowerCase();
        }
        let val = editingProps[key];
        if (typeof val === "boolean") return "boolean";
        if (typeof val === "number") return "number";
        if (typeof val === "string" && (val.startsWith("#") || val.startsWith("rgb"))) return "color";
        return "string";
    }

    const INTERNAL_PROPS = new Set([
        "dataIndex",
        "ctx",
        "ctxType",
        "prod",
        "uuid",
        "id",
        "ovSrc",
        "dataSubset",
        "dataView",
        "name",
        "type",
        "visible",
        "display",
        "showLegend",
        "noLegend",
        "scripts",
        "overlays",
        "settings"
    ]);

    const INPUT_LABELS = {
        length: "Periodo / Longitud",
        stddev: "Desviación Estándar",
        fast: "Periodo Rápido",
        slow: "Periodo Lento",
        smooth: "Suavizado",
        signal: "Señal",
        paramK: "%K Periodo",
        paramD: "%D Periodo",
        upperBand: "Banda Superior",
        lowerBand: "Banda Inferior",
        start: "Inicio",
        step: "Paso",
        inc: "Incremento",
        max: "Máximo",
        maximum: "Máximo",
        mult: "Multiplicador",
        offset: "Desplazamiento",
        sigma: "Sigma",
        number: "Cantidad",
        convLength: "Periodo Conversión (Tenkan)",
        baseLength: "Periodo Base (Kijun)",
        laggingLength: "Periodo Senkou Span B",
        displacement: "Desplazamiento",
        barsHeight: "Altura de Barras",
        avgVolumeSMA: "Periodo Media de Volumen",
        trueRange: "Usar Rango Verdadero (ATR)",
        useTrueRange: "Usar Rango Verdadero (ATR)",
        long: "Periodo Largo",
        short: "Periodo Corto",
        barWidth: "Grosor de Barras",
        anchor: "Periodo de Anclaje (Anchor)"
    };

    const COLOR_LABELS = {
        color: "Color de Línea",
        colorMacd: "Línea MACD",
        colorSignal: "Línea de Señal",
        colorUp: "Histograma Alcista",
        colorDw: "Histograma Bajista",
        colorSemiUp: "Histograma Alcista Débil",
        colorSemiDw: "Histograma Bajista Débil",
        colorVolUp: "Volumen Alcista",
        colorVolDw: "Volumen Bajista",
        colorSMA: "Media de Volumen (SMA)",
        colorAvgVol: "Media de Volumen",
        kColor: "Línea %K",
        dColor: "Línea %D",
        bandColor: "Líneas de Bandas",
        backColor: "Relleno de Fondo",
        cloudUpColor: "Nube Alcista",
        cloudDwColor: "Nube Bajista",
        convColor: "Línea de Conversión (Tenkan)",
        baseColor: "Línea Base (Kijun)",
        laggingColor: "Línea de Retraso (Chikou)",
        colorPos: "Zona Superior / Alcista",
        colorNeg: "Zona Inferior / Bajista",
        colorValue: "Valor de Línea",
        color1: "Línea Principal",
        color2: "Línea de Señal",
        color3: "Línea Secundaria",
        colors: "Color de Cinta"
    };

    function isStyleProp(key) {
        if (!key || typeof key !== "string") return false;
        if (INTERNAL_PROPS.has(key)) return false;
        const lower = key.toLowerCase();
        if (
            lower === "linewidth" ||
            lower === "width" ||
            lower === "barwidth" ||
            lower === "linestyle" ||
            lower === "shape" ||
            lower === "size" ||
            lower === "showmid" ||
            lower === "showsma" ||
            lower === "showavgvolume"
        ) {
            return true;
        }
        if (lower === "prec" || lower === "precision" || lower === "zindex") {
            return true;
        }
        if (lower.includes("color") || lower.includes("colour") || lower === "colors") {
            return true;
        }
        if (propsSchema[key]?.type?.toLowerCase() === "color") {
            return true;
        }
        const val = editingProps[key];
        if (typeof val === "string" && (val.startsWith("#") || val.startsWith("rgb(") || val.startsWith("rgba("))) {
            return true;
        }
        return false;
    }

    function isInputProp(key) {
        if (!key || typeof key !== "string") return false;
        if (INTERNAL_PROPS.has(key)) return false;
        return !isStyleProp(key);
    }

    function isColorProp(key) {
        if (!key || typeof key !== "string") return false;
        if (INTERNAL_PROPS.has(key)) return false;
        const lower = key.toLowerCase();
        if (lower.includes("color") || lower.includes("colour") || lower === "colors") return true;
        if (propsSchema[key]?.type?.toLowerCase() === "color") return true;
        const val = editingProps[key];
        if (typeof val === "string" && (val.startsWith("#") || val.startsWith("rgb(") || val.startsWith("rgba("))) {
            return true;
        }
        return false;
    }

    function getInputLabel(key) {
        if (propsSchema[key]?.title) return propsSchema[key].title;
        if (INPUT_LABELS[key]) return INPUT_LABELS[key];
        return formatPropLabel(key);
    }

    function getColorLabel(key) {
        if (propsSchema[key]?.title) return propsSchema[key].title;
        if (COLOR_LABELS[key]) return COLOR_LABELS[key];
        return formatPropLabel(key);
    }

    function toColorPickerHex(str) {
        if (Array.isArray(str)) str = str[0];
        if (!str || typeof str !== "string") return "#2962ff";
        str = str.trim();
        if (str.startsWith("#")) {
            if (str.length === 9) { // #rrggbbaa -> #rrggbb
                return str.slice(0, 7).toLowerCase();
            }
            if (str.length === 7) { // #rrggbb
                return str.toLowerCase();
            }
            if (str.length === 4 || str.length === 5) { // #rgb or #rgba
                let r = str[1], g = str[2], b = str[3];
                return (`#${r}${r}${g}${g}${b}${b}`).toLowerCase();
            }
        }
        if (str.startsWith("rgb")) {
            let m = str.match(/\d+/g);
            if (m && m.length >= 3) {
                let r = Math.min(255, parseInt(m[0], 10)).toString(16).padStart(2, "0");
                let g = Math.min(255, parseInt(m[1], 10)).toString(16).padStart(2, "0");
                let b = Math.min(255, parseInt(m[2], 10)).toString(16).padStart(2, "0");
                return `#${r}${g}${b}`.toLowerCase();
            }
        }
        return "#2962ff";
    }

    function getAlphaHex(str) {
        if (!str || typeof str !== "string") return "";
        str = str.trim();
        if (str.startsWith("#")) {
            if (str.length === 9) return str.slice(7, 9);
            if (str.length === 5) return str[4] + str[4];
        }
        return "";
    }

    function onColorPickerChange(key, hex6) {
        let current = editingProps[key];
        if (Array.isArray(current)) {
            let alpha = getAlphaHex(current[0]);
            editingProps[key][0] = alpha ? (hex6 + alpha) : hex6;
            editingProps[key] = [...editingProps[key]];
        } else {
            let alpha = getAlphaHex(current);
            editingProps[key] = alpha ? (hex6 + alpha) : hex6;
        }
        emitLiveUpdate();
    }

    $: allVisibleKeys = Object.keys(propsSchema).length > 0
        ? Object.keys(propsSchema)
        : Object.keys(editingProps);

    $: inputKeys = allVisibleKeys.filter(k => isInputProp(k));

    $: colorKeys = Array.from(new Set([
        ...Object.keys(editingProps).filter(k => isColorProp(k)),
        ...Object.keys(propsSchema).filter(k => isColorProp(k))
    ]));
</script>

{#if open && ov}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="tv-modal nvjs-script-modal" style="left: {modalX}px; top: {modalY}px;">
        <!-- Modal Header -->
        <div class="tv-modal-header" on:mousedown={onModalMouseDown}>
            <div class="tv-title-box">
                <span class="tv-title-icon">⬡</span>
                <span class="tv-title-text">{title}</span>
            </div>
            <button class="tv-close-btn" on:click={onCancel} title="Cerrar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <!-- Tabs Navigation -->
        <div class="tv-tabs-nav">
            <button class="tv-tab-item" class:active={activeTab === "inputs"} on:click={() => (activeTab = "inputs")}>
                Entradas
            </button>
            <button class="tv-tab-item" class:active={activeTab === "style"} on:click={() => (activeTab = "style")}>
                Estilo
            </button>
            <button class="tv-tab-item" class:active={activeTab === "visibility"} on:click={() => (activeTab = "visibility")}>
                Visibilidad
            </button>
            <button class="tv-tab-item" class:active={activeTab === "code"} on:click={() => (activeTab = "code")}>
                Info / Código
            </button>
        </div>

        <!-- Modal Body -->
        <div class="tv-modal-body">
            {#if activeTab === "inputs"}
                <div class="tv-inputs-container">
                    {#if inputKeys.length === 0}
                        <div class="tv-empty-msg">
                            Este indicador no tiene entradas de cálculo configurables.
                            <div style="font-size: 11px; opacity: 0.7; margin-top: 6px;">
                                Puedes personalizar sus colores y estilos en la pestaña <strong>Estilo</strong>.
                            </div>
                        </div>
                    {:else}
                        {#each inputKeys as key}
                            {@const type = getPropType(key)}
                            {@const descr = propsSchema[key] || {}}
                            <div class="tv-prop-row">
                                <span class="tv-prop-label">{getInputLabel(key)}</span>
                                
                                <div class="tv-prop-control">
                                    {#if type === "integer" || type === "number"}
                                        <div class="tv-num-stepper">
                                            <button type="button" class="tv-step-btn" on:click={() => stepNumber(key, -(descr.step || 1), descr.min, descr.max, type === "integer")}>−</button>
                                            <input
                                                type="number"
                                                class="tv-input tv-input-num"
                                                bind:value={editingProps[key]}
                                                min={descr.min}
                                                max={descr.max}
                                                step={descr.step || 1}
                                                on:input={emitLiveUpdate}
                                            />
                                            <button type="button" class="tv-step-btn" on:click={() => stepNumber(key, descr.step || 1, descr.min, descr.max, type === "integer")}>+</button>
                                        </div>
                                    {:else if type === "boolean"}
                                        <label class="tv-switch-label">
                                            <input
                                                type="checkbox"
                                                class="tv-checkbox"
                                                bind:checked={editingProps[key]}
                                                on:change={emitLiveUpdate}
                                            />
                                            <span class="tv-switch-custom"></span>
                                        </label>
                                    {:else if type === "opt" || descr.options || key === "anchor"}
                                        <select
                                            class="tv-select"
                                            bind:value={editingProps[key]}
                                            on:change={() => emitLiveUpdate(true)}
                                        >
                                            {#each (descr.options || (key === "anchor" ? [
                                                { value: 'Day', label: 'Día (Sesión)' },
                                                { value: 'Week', label: 'Semana' },
                                                { value: 'Month', label: 'Mes' }
                                            ] : [])) as opt}
                                                {#if typeof opt === 'object' && opt !== null}
                                                    <option value={opt.value}>{opt.label || opt.value}</option>
                                                {:else}
                                                    <option value={opt}>{opt === 'Day' ? 'Día (Sesión)' : opt === 'Week' ? 'Semana' : opt === 'Month' ? 'Mes' : opt}</option>
                                                {/if}
                                            {/each}
                                        </select>
                                    {:else}
                                        <input
                                            type="text"
                                            class="tv-input tv-input-text"
                                            bind:value={editingProps[key]}
                                            on:input={emitLiveUpdate}
                                        />
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>

            {:else if activeTab === "style"}
                <div class="tv-style-container">
                    <!-- Line Width -->
                    {#if 'lineWidth' in editingProps || propsSchema.lineWidth}
                        <div class="tv-prop-row">
                            <span class="tv-prop-label">Grosor de línea</span>
                            <div class="tv-width-picker">
                                {#each [1, 2, 3, 4] as w}
                                    <button
                                        type="button"
                                        class="tv-width-btn"
                                        class:active={Number(editingProps.lineWidth || 1) === w}
                                        on:click={() => { editingProps.lineWidth = w; emitLiveUpdate(); }}
                                        title="{w}px"
                                    >
                                        <div class="tv-width-preview" style="height: {w}px;"></div>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <!-- All Dynamic Color Properties -->
                    {#each colorKeys as cKey}
                        <div class="tv-prop-row">
                            <span class="tv-prop-label">{getColorLabel(cKey)}</span>
                            <div class="tv-color-control">
                                <input
                                    type="color"
                                    class="tv-color-picker"
                                    value={toColorPickerHex(editingProps[cKey])}
                                    on:input={(e) => onColorPickerChange(cKey, e.target.value)}
                                    on:change={(e) => { onColorPickerChange(cKey, e.target.value); emitLiveUpdate(true); }}
                                />
                                {#if Array.isArray(editingProps[cKey])}
                                    <input
                                        type="text"
                                        class="tv-input tv-input-color-hex"
                                        bind:value={editingProps[cKey][0]}
                                        on:input={() => emitLiveUpdate(false)}
                                        on:change={() => emitLiveUpdate(true)}
                                    />
                                {:else}
                                    <input
                                        type="text"
                                        class="tv-input tv-input-color-hex"
                                        bind:value={editingProps[cKey]}
                                        on:input={() => emitLiveUpdate(false)}
                                        on:change={() => emitLiveUpdate(true)}
                                    />
                                {/if}
                            </div>
                        </div>
                    {/each}

                    <!-- Visual Toggles -->
                    {#if 'showSMA' in editingProps}
                        <div class="tv-prop-row">
                            <span class="tv-prop-label">Media de volumen (SMA)</span>
                            <label class="tv-switch-label">
                                <input
                                    type="checkbox"
                                    class="tv-checkbox"
                                    bind:checked={editingProps.showSMA}
                                    on:change={emitLiveUpdate}
                                />
                                <span class="tv-switch-custom"></span>
                            </label>
                        </div>
                    {/if}

                    {#if 'showMid' in editingProps}
                        <div class="tv-prop-row">
                            <span class="tv-prop-label">Línea media (Base)</span>
                            <label class="tv-switch-label">
                                <input
                                    type="checkbox"
                                    class="tv-checkbox"
                                    bind:checked={editingProps.showMid}
                                    on:change={emitLiveUpdate}
                                />
                                <span class="tv-switch-custom"></span>
                            </label>
                        </div>
                    {/if}

                    <!-- Precision setting -->
                    <div class="tv-prop-row">
                        <span class="tv-prop-label">Precisión</span>
                        <select
                            class="tv-select"
                            value={editingSettings.precision ?? (editingProps.prec !== undefined ? editingProps.prec : undefined)}
                            on:change={(e) => {
                                const val = e.target.value === "" ? undefined : Number(e.target.value);
                                editingSettings.precision = val;
                                if ('prec' in editingProps) editingProps.prec = val;
                                emitLiveUpdate();
                            }}
                        >
                            <option value="">Por defecto</option>
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                            <option value={5}>5</option>
                            <option value={6}>6</option>
                            <option value={7}>7</option>
                            <option value={8}>8</option>
                        </select>
                    </div>

                    <!-- Z-Index layer order -->
                    <div class="tv-prop-row">
                        <span class="tv-prop-label">Capa (z-index)</span>
                        <input
                            type="number"
                            class="tv-input tv-input-num"
                            value={editingSettings.zIndex ?? (editingProps.zIndex || 0)}
                            on:input={(e) => {
                                const val = Number(e.target.value);
                                editingSettings.zIndex = val;
                                if ('zIndex' in editingProps) editingProps.zIndex = val;
                                emitLiveUpdate();
                            }}
                        />
                    </div>
                </div>

            {:else if activeTab === "visibility"}
                <div class="tv-visibility-container">
                    <div class="tv-prop-row">
                        <span class="tv-prop-label">Mostrar en gráfico</span>
                        <label class="tv-switch-label">
                            <input
                                type="checkbox"
                                class="tv-checkbox"
                                checked={editingSettings.display !== false}
                                on:change={(e) => { editingSettings.display = e.target.checked; emitLiveUpdate(); }}
                            />
                            <span class="tv-switch-custom"></span>
                        </label>
                    </div>

                    <div class="tv-prop-row">
                        <span class="tv-prop-label">Mostrar en leyenda</span>
                        <label class="tv-switch-label">
                            <input
                                type="checkbox"
                                class="tv-checkbox"
                                checked={editingSettings.showLegend !== false}
                                on:change={(e) => { editingSettings.showLegend = e.target.checked; emitLiveUpdate(); }}
                            />
                            <span class="tv-switch-custom"></span>
                        </label>
                    </div>

                    <div class="tv-prop-row">
                        <span class="tv-prop-label">Panel actual</span>
                        <span class="tv-badge">Panel #{paneId + 1}</span>
                    </div>
                </div>

            {:else if activeTab === "code"}
                <div class="tv-code-container">
                    <div class="tv-info-grid">
                        <div class="tv-info-item">
                            <span class="tv-info-label">Tipo:</span>
                            <span class="tv-info-val">{scriptType}</span>
                        </div>
                        <div class="tv-info-item">
                            <span class="tv-info-label">Versión:</span>
                            <span class="tv-info-val">{scriptInfo?.version || "1.0.0"}</span>
                        </div>
                        <div class="tv-info-item">
                            <span class="tv-info-label">Autor:</span>
                            <span class="tv-info-val">{scriptInfo?.author || "NavyJS"}</span>
                        </div>
                    </div>
                    
                    <div class="tv-code-label">Propiedades actuales (JSON):</div>
                    <pre class="tv-code-preview">{JSON.stringify(editingProps, null, 2)}</pre>
                </div>
            {/if}
        </div>

        <!-- Modal Footer -->
        <div class="tv-modal-footer">
            <div class="tv-footer-left">
                <button class="tv-btn-secondary tv-btn-reset" on:click={resetDefaults}>
                    ↺ Restablecer
                </button>
            </div>
            <div class="tv-footer-right">
                <button class="tv-btn-secondary" on:click={onCancel}>Cancelar</button>
                <button class="tv-btn-primary" on:click={onAccept}>Aceptar</button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* TradingView Style Modal Dialog */
    .tv-modal {
        position: absolute;
        z-index: 10000;
        width: 400px;
        background: #1e222d;
        border: 1px solid #2a2e39;
        border-radius: 8px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75);
        color: #d1d4dc;
        font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
        font-size: 13px;
        user-select: none;
        pointer-events: all;
    }

    .tv-modal-header {
        padding: 12px 16px;
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
    .tv-title-icon {
        color: #2962ff;
        font-size: 16px;
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

    /* Tabs Navigation */
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
        padding: 10px 8px;
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
        padding: 16px 18px;
        min-height: 180px;
        max-height: 380px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #363c4e transparent;
    }
    .tv-modal-body::-webkit-scrollbar {
        width: 6px;
    }
    .tv-modal-body::-webkit-scrollbar-track {
        background: transparent;
    }
    .tv-modal-body::-webkit-scrollbar-thumb {
        background-color: #363c4e;
        border-radius: 4px;
    }
    .tv-modal-body::-webkit-scrollbar-thumb:hover {
        background-color: #505668;
    }

    .tv-inputs-container,
    .tv-style-container,
    .tv-visibility-container,
    .tv-code-container {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .tv-prop-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .tv-prop-label {
        font-size: 13px;
        color: #d1d4dc;
        white-space: nowrap;
    }

    .tv-prop-control {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    /* Inputs */
    .tv-input {
        background: #131722;
        border: 1px solid #363c4e;
        border-radius: 6px;
        color: #ffffff;
        padding: 6px 10px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.15s;
    }
    .tv-input:focus {
        border-color: #2962ff;
    }

    .tv-input-num {
        width: 60px;
        text-align: center;
    }

    .tv-num-stepper {
        display: flex;
        align-items: center;
        background: #131722;
        border: 1px solid #363c4e;
        border-radius: 6px;
        overflow: hidden;
    }

    .tv-num-stepper .tv-input-num {
        border: none;
        border-radius: 0;
        background: transparent;
    }

    .tv-step-btn {
        background: #1e222d;
        border: none;
        color: #d1d4dc;
        padding: 6px 9px;
        cursor: pointer;
        font-weight: bold;
        transition: background 0.15s;
    }
    .tv-step-btn:hover {
        background: #2a2e39;
        color: #ffffff;
    }

    .tv-select {
        background: #131722;
        border: 1px solid #363c4e;
        border-radius: 6px;
        color: #ffffff;
        padding: 6px 12px;
        font-size: 13px;
        outline: none;
        cursor: pointer;
        min-width: 120px;
        transition: border-color 0.15s, box-shadow 0.15s;
    }
    .tv-select:hover {
        border-color: #2962ff;
    }
    .tv-select:focus {
        border-color: #2962ff;
        box-shadow: 0 0 0 2px rgba(41, 98, 255, 0.25);
    }

    .tv-color-control {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .tv-color-picker {
        -webkit-appearance: none;
        border: 1px solid #363c4e;
        border-radius: 4px;
        width: 28px;
        height: 28px;
        padding: 0;
        cursor: pointer;
        background: transparent;
    }
    .tv-color-picker::-webkit-color-swatch-wrapper {
        padding: 0;
    }
    .tv-color-picker::-webkit-color-swatch {
        border: none;
        border-radius: 3px;
    }

    .tv-input-color-hex {
        width: 80px;
        font-family: monospace;
    }

    .tv-width-picker {
        display: flex;
        gap: 6px;
    }
    .tv-width-btn {
        width: 32px;
        height: 28px;
        background: #131722;
        border: 1px solid #363c4e;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
    }
    .tv-width-btn:hover {
        border-color: #787b86;
    }
    .tv-width-btn.active {
        border-color: #2962ff;
        background: #2a2e39;
    }
    .tv-width-preview {
        width: 100%;
        background: #ffffff;
        border-radius: 1px;
    }

    .tv-badge {
        background: #2a2e39;
        color: #2962ff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
    }

    .tv-empty-msg {
        color: #787b86;
        font-style: italic;
        padding: 10px 0;
        text-align: center;
    }

    /* Toggle switch */
    .tv-switch-label {
        position: relative;
        display: inline-block;
        width: 34px;
        height: 20px;
        cursor: pointer;
    }
    .tv-switch-label input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .tv-switch-custom {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #363c4e;
        border-radius: 20px;
        transition: 0.2s;
    }
    .tv-switch-custom:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: #ffffff;
        border-radius: 50%;
        transition: 0.2s;
    }
    .tv-switch-label input:checked + .tv-switch-custom {
        background-color: #2962ff;
    }
    .tv-switch-label input:checked + .tv-switch-custom:before {
        transform: translateX(14px);
    }

    /* Code & info view */
    .tv-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        background: #131722;
        padding: 10px;
        border-radius: 6px;
    }
    .tv-info-item {
        display: flex;
        gap: 6px;
        font-size: 12px;
    }
    .tv-info-label {
        color: #787b86;
    }
    .tv-info-val {
        color: #ffffff;
        font-weight: 600;
    }
    .tv-code-label {
        font-size: 12px;
        color: #787b86;
        margin-top: 4px;
    }
    .tv-code-preview {
        background: #131722;
        padding: 10px;
        border-radius: 6px;
        border: 1px solid #363c4e;
        font-family: monospace;
        font-size: 11px;
        color: #41a376;
        max-height: 150px;
        overflow: auto;
        margin: 0;
    }

    /* Modal Footer */
    .tv-modal-footer {
        padding: 12px 16px;
        border-top: 1px solid #2a2e39;
        display: flex;
        align-items: center;
        justify-content: space-between;
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
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
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
        padding: 6px 14px;
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
