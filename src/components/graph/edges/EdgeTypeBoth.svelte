<script lang="ts">
    import { type EdgeProps, getBezierPath, BaseEdge, EdgeLabelRenderer, useSvelteFlow } from '@xyflow/svelte';
    import EdgeLabel from './EdgeLabel.svelte';
  
    type $$Props = EdgeProps;
  
    export let sourceX: $$Props['sourceX'];
    export let sourceY: $$Props['sourceY'];
    export let sourcePosition: $$Props['sourcePosition'];
    export let targetX: $$Props['targetX'];
    export let targetY: $$Props['targetY'];
    export let targetPosition: $$Props['targetPosition'];
    export let data: $$Props['data'] = undefined;
  
    // Extract source and target data
    let sourceData = data?.source;
    let targetData = data?.target;
  
    const { viewport } = useSvelteFlow();
  
    let showContent = false;
    $: {
        if ($viewport.zoom > 1.8) {
            showContent = true;
        } else {
            showContent = false;
        }
    }
  
    $: [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
    });
  
    // Function to copy source or target data to clipboard
    const copyToClipboard = (content: string) => {
        if (content) {
            navigator.clipboard.writeText(content).then(() => {
                console.log('Text copied to clipboard:', content);
            }).catch((error) => {
                console.error('Error copying text to clipboard:', error);
            });
        }
    };
  </script>
  
  <BaseEdge path={edgePath} />
  <EdgeLabelRenderer>
    <!-- Main container -->
    <div
        style:transform="translate(-50%, -50%) translate({labelX}px,{labelY}px)"
        class="edge-label-container"
    >
        <!-- Left section: Target -->
        <div
            on:click={() => copyToClipboard(targetData?.box || '')}
            class="edge-label edge-label-left"
            style="background: {targetData?.color || '#CCCCCC'}"
        >
            <!-- Content -->
            <div>{targetData?.negative === true ? '-' : ''}{targetData?.proportion}%</div>
            {#if showContent}
                <div class="box-id">{targetData?.box.slice(0, 10)}</div>
            {/if}
        </div>
        
        <!-- Right section: Source -->
        <div
            on:click={() => copyToClipboard(sourceData?.box || '')}
            class="edge-label edge-label-right"
            style="background: {sourceData?.color || '#CCCCCC'}"
        >
            <!-- Content -->
            <div>{sourceData?.negative === true ? '-' : ''}{sourceData?.proportion}%</div>
            {#if showContent}
                <div class="box-id">{sourceData?.box.slice(0, 10)}</div>
            {/if}
        </div>
    </div>
  </EdgeLabelRenderer>
  
<style>
    .edge-label-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        pointer-events: all;
        position: absolute;
        width: 120px;
    }
  
    .edge-label {
        padding: 5px;
        border-radius: 5px;
        font-size: 8px;
        font-weight: 700;
        position: relative;
        pointer-events: all;
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #111;
    }
  
    .edge-label-left {
        text-align: left;
        position: relative;
    }
  
    .edge-label-right {
        text-align: right;
        position: relative;
    }
  
    .box-id {
        font-size: 7px;
        color: #333333;
        margin-top: 2px;
    }
</style>
