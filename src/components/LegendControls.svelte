<script>
// Legend control buttons (TradingView style action bar)

import { onMount, onDestroy } from 'svelte'
import Events from '../core/events.js'
import DataHub from '../core/dataHub.js'
import icons from '../assets/icons.json'

export let gridId // gridId
export let ov // Overlay
export let props // General props
export let height = 20 // Legend-line height

let events = Events.instance(props.id)
let hub = DataHub.instance(props.id)
let menuOpen = false

$: totalPanes = (hub.panes() || []).length
$: heightStyle = height ? `height: ${Math.max(18, height)}px;` : ''
$: display = ov.settings.display !== false
$:state = display ? 'open' : 'closed'

export function update() {
    display = ov.settings.display !== false
}

function onDisplayClick(e) {
    e.stopPropagation()
    events.emitSpec('hub', 'display-overlay', {
        paneId: gridId,
        ovId: ov.id,
        flag: ov.settings.display === undefined ?
            false : ! ov.settings.display
    })
}

function onSettingsClick(e) {
    e.stopPropagation()
    menuOpen = false
    events.emit('open-script-settings', {
        paneId: gridId,
        ov: ov,
        tab: 'inputs'
    })
}

function onCodeClick(e) {
    e.stopPropagation()
    menuOpen = false
    events.emit('open-script-settings', {
        paneId: gridId,
        ov: ov,
        tab: 'code'
    })
}

function onDeleteClick(e) {
    e.stopPropagation()
    menuOpen = false
    events.emitSpec('hub', 'delete-script', {
        paneId: gridId,
        ov: ov
    })
}

function toggleMenu(e) {
    e.stopPropagation()
    menuOpen = !menuOpen
}

function onMoveUp(e) {
    e.stopPropagation()
    menuOpen = false
    if (gridId > 0) {
        events.emitSpec('hub', 'move-script', {
            fromPaneId: gridId,
            targetPaneId: gridId - 1,
            ov: ov
        })
    }
}

function onMoveDown(e) {
    e.stopPropagation()
    menuOpen = false
    if (gridId < totalPanes - 1) {
        events.emitSpec('hub', 'move-script', {
            fromPaneId: gridId,
            targetPaneId: gridId + 1,
            ov: ov
        })
    }
}

function onMoveNewPane(e) {
    e.stopPropagation()
    menuOpen = false
    events.emitSpec('hub', 'move-script', {
        fromPaneId: gridId,
        targetPaneId: 'new',
        ov: ov
    })
}

function onReset(e) {
    e.stopPropagation()
    menuOpen = false
    events.emit('open-script-settings', {
        paneId: gridId,
        ov: ov,
        action: 'reset'
    })
}

function onWindowClick() {
    if (menuOpen) menuOpen = false
}

onMount(() => {
    window.addEventListener('click', onWindowClick)
})

onDestroy(() => {
    window.removeEventListener('click', onWindowClick)
})

</script>
<style>
.nvjs-legend-controls {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    float: right;
    margin-left: 8px;
    height: 100%;
    position: relative;
}

.nvjs-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 3px;
    color: #9598a1;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s, background-color 0.15s;
}

.nvjs-btn:hover {
    color: #f0f3fa;
    background: rgba(255, 255, 255, 0.12);
}

.nvjs-btn-delete:hover {
    color: #f23645;
    background: rgba(242, 54, 69, 0.2);
}

.nvjs-more-menu {
    position: absolute;
    top: 24px;
    right: 0;
    background: #1e222d;
    border: 1px solid #363c4e;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
    min-width: 175px;
    z-index: 10005;
    padding: 4px 0;
    display: flex;
    flex-direction: column;
    pointer-events: all;
}

.nvjs-menu-item {
    background: transparent;
    border: none;
    color: #d1d4dc;
    text-align: left;
    padding: 7px 12px;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.15s;
}

.nvjs-menu-item:hover {
    background: #2a2e39;
    color: #ffffff;
}

.nvjs-menu-item.danger:hover {
    background: rgba(242, 54, 69, 0.2);
    color: #f23645;
}

.nvjs-menu-divider {
    height: 1px;
    background: #363c4e;
    margin: 4px 0;
}
</style>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="nvjs-legend-controls" style={heightStyle}>
    <!-- 1. Eye Button (Visibility) -->
    <button class="nvjs-btn" on:click={onDisplayClick} title={display ? "Ocultar" : "Mostrar"}>
        {#if display}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        {:else}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        {/if}
    </button>

    <!-- 2. Settings / Properties Button (Hexagon) -->
    <button class="nvjs-btn" on:click={onSettingsClick} title="Opciones / Propiedades">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></polygon>
            <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="2"></circle>
        </svg>
    </button>

    <!-- 3. Code Button -->
    <button class="nvjs-btn" on:click={onCodeClick} title="Código fuente / Info">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
    </button>

    <!-- 4. Trash Button (Delete) -->
    <button class="nvjs-btn nvjs-btn-delete" on:click={onDeleteClick} title="Eliminar indicador">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    </button>

    <!-- 5. More Options Button -->
    <button class="nvjs-btn" on:click={toggleMenu} title="Más opciones">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.7"></circle>
            <circle cx="12" cy="12" r="1.7"></circle>
            <circle cx="19" cy="12" r="1.7"></circle>
        </svg>
    </button>

    <!-- Context Dropdown Menu -->
    {#if menuOpen}
        <div class="nvjs-more-menu" on:click|stopPropagation>
            {#if gridId > 0}
                <button class="nvjs-menu-item" on:click={onMoveUp}>
                    ↑ Mover a panel superior
                </button>
            {/if}
            {#if gridId < totalPanes - 1}
                <button class="nvjs-menu-item" on:click={onMoveDown}>
                    ↓ Mover a panel inferior
                </button>
            {/if}
            <button class="nvjs-menu-item" on:click={onMoveNewPane}>
                + Crear nuevo panel
            </button>
            <div class="nvjs-menu-divider"></div>
            <button class="nvjs-menu-item" on:click={onSettingsClick}>
                ⚙ Configuración...
            </button>
            <button class="nvjs-menu-item" on:click={onReset}>
                ↺ Restablecer valores
            </button>
            <div class="nvjs-menu-divider"></div>
            <button class="nvjs-menu-item danger" on:click={onDeleteClick}>
                🗑 Eliminar
            </button>
        </div>
    {/if}
</div>
