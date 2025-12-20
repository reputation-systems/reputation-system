<script lang="ts">
    import { type EdgeProps, getBezierPath, BaseEdge, EdgeLabelRenderer, useSvelteFlow } from '@xyflow/svelte';
  
    type $$Props = EdgeProps;
  
    export let sourceX: $$Props['sourceX'];
    export let sourceY: $$Props['sourceY'];
    export let sourcePosition: $$Props['sourcePosition'];
    export let targetX: $$Props['targetX'];
    export let targetY: $$Props['targetY'];
    export let targetPosition: $$Props['targetPosition'];
    export let data: $$Props['data'] = undefined;

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
  </script>
  
  <BaseEdge path={edgePath} />
  <EdgeLabelRenderer>
    <div
      style:transform="translate(-50%, -50%) translate({labelX}px,{labelY}px)"
      class="edge-label"
      style="background: {data.color}"
    > <!-- class="edge-label nodrag nopan"     For no drag over it. -->
    <a target="_blank" href="https://sigmaspace.io/transaction/{data.tx_id}">{data.tx_id.slice(0, 10)}</a> unconfirmed
        {#if showContent}
          , this could be taken from the explorer getUnconfirmed endpoint.
          <br>
        {/if}
    </div>
  </EdgeLabelRenderer>
  
<style>
  .edge-label {
    pointer-events: all;
    position: absolute;
    padding: 5px;
    border-radius: 5px;
    font-size: 8px;
    font-weight: 700;

    color: #111;
  }
</style>
