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

  // Function to copy data.box to clipboard
  const copyToClipboard = () => {
      if (data && data.box) {
          navigator.clipboard.writeText(data.box).then(() => {
              console.log('Text copied to clipboard:', data.box);
          }).catch((error) => {
              console.error('Error copying text to clipboard:', error);
          });
      }
  };
</script>

<BaseEdge path={edgePath} />
<EdgeLabelRenderer>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
      on:click={copyToClipboard}
      style:transform="translate(-50%, -50%) translate({labelX}px,{labelY}px)"
      class="edge-label"
      style="background: {data.color}"
  >
      <!-- class="edge-label nodrag nopan" For no drag over it. -->
      {data.negative === true ? '-' : ''}{data.proportion}%
      {#if showContent}
          <EdgeLabel label={data.box_id.slice(0, 6)}... />
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

    text-shadow: 0px 0px 2px rgba(255, 255, 255, 0.2);
  }
</style>
