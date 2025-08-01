<script>
    // Replacement for an empty scale

    export let id; // Sidebar id (=pane/grid id)
    export let props = {}; // General props
    export let layout = {}; // Grid layout
    export let side; // Left/right side
    console.log(layout)
    let S = side === "right" ? 1 : 0;

    

    $: stubStyle = `
        left: 0px;
        top: ${layout.offset || 0}px;
        bottom: 0px;
        width: 100px;
        height: 100%;
        display:block;
        border: 1px solid;
        border-${side}: none;
        border-bottom: none;
 
        border-top: ${id ? "auto" : "none"};
         
    `;
</script>

 
    <div  style={stubStyle} class="nvjs-sidebar-stub">

        probando
    </div>
 

<style>
</style>
