<script lang="ts">
    let isMouseOver = false;

    function handleMouseOver() {
        console.log("check this.")
        isMouseOver = true;
    }

    function handleMouseOut() {
        console.log("chekck this other.")
        isMouseOver = false;
    }

    export let label: string;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div 
    on:dragenter={handleMouseOver}
    on:dragleave={handleMouseOut}
    style="pointer-events: all; font-weight: 500;"
    hidden={isMouseOver}
>{label}</div> <!-- hidden should be negated. (but don't works.) -->