<script lang="ts">
  import { derived, get, writable } from "svelte/store";
  import {
    SvelteFlow,
    Background,
    type Node,
    Controls,
    MiniMap,
    Position,
    type Edge,
    ControlButton,
    type EdgeTypes,
    type NodeTypes,
  } from "@xyflow/svelte";

  import "@xyflow/svelte/dist/style.css";
  import { updateReputationProofList } from "$lib/unspent_proofs";
  import { type ReputationProof } from "$lib/ReputationProof";
  import dagre from "@dagrejs/dagre";

  import {
    advance_mode,
    building_graph,
    connected,
    fetch_all,
    proofs,
    types,
    searchStore,
  } from "$lib/store";
  import { onMount } from "svelte";

  // UI Components
  import EdgeType from "./edges/EdgeType.svelte";
  import NodeCircleType from "./nodes/NodeCircleType.svelte";
  import EdgeContextMenu from "./ui/EdgeContextMenu.svelte";
  import NodeContextMenu from "./ui/NodeContextMenu.svelte";
  import ObjectContextMenu from "./ui/ObjectContextMenu.svelte";
  import NodeProofType from "./nodes/NodeProofType.svelte";
  import UnconfirmedEdgeType from "./edges/UnconfirmedEdgeType.svelte";
  import EdgeTypeBoth from "./edges/EdgeTypeBoth.svelte";
  import PanelContextMenu from "./ui/PanelContextMenu.svelte";
  import ObjectDetailModal from "../views/ObjectDetailModal.svelte";
  import ProofDetailModal from "../views/ProofDetailModal.svelte";

  // --- Component State ---
  let rightNodeForProofMenu: {
    id: string;
    proof?: ReputationProof;
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  } | null;
  let rightNodeForObjectMenu: {
    id: string;
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  } | null;
  let rightEdgeMenu: {
    id: string;
    box_id?: string;
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  } | null;

  // State para manejar la visibilidad de los modales
  let showObjectModal = false;
  let objectIdForModal: string | null = null;
  let showProofModal = false;
  let proofForModal: ReputationProof | null = null;

  let width: number;
  let height: number;

  // --- Context Menu Handlers ---
  function handleNodeContextMenu({ detail: { event, node } }) {
    event.preventDefault();
    rightNodeForProofMenu = null;
    rightNodeForObjectMenu = null;

    const positionProps = {
      top: event.clientY < height - 200 ? event.clientY : undefined,
      left: event.clientX < width - 200 ? event.clientX : undefined,
      right: event.clientX >= width - 200 ? width - event.clientX : undefined,
      bottom:
        event.clientY >= height - 200 ? height - event.clientY : undefined,
    };

    if (node.data.proof) {
      rightNodeForProofMenu = {
        id: node.id,
        proof: node.data.proof,
        ...positionProps,
      };
    } else {
      rightNodeForObjectMenu = {
        id: node.data.label,
        ...positionProps,
      };
    }
  }

  function handleEdgeContextMenu({ detail: { event, edge } }) {
    event.preventDefault();
    if (edge.data.box_id) {
      rightEdgeMenu = {
        id: edge.id,
        box_id: edge.data.box_id,
        top: event.clientY < height - 200 ? event.clientY : undefined,
        left: event.clientX < width - 200 ? event.clientX : undefined,
        right: event.clientX >= width - 200 ? width - event.clientX : undefined,
        bottom:
          event.clientY >= height - 200 ? height - event.clientY : undefined,
      };
    }
  }

  function handlePaneClick() {
    rightNodeForProofMenu = null;
    rightNodeForObjectMenu = null;
    rightEdgeMenu = null;
  }

  // --- Modal Logic Handlers ---
  function onShowObjectDetails(event: CustomEvent) {
    objectIdForModal = event.detail.objectId;
    showObjectModal = true;
    // Nos aseguramos de que el otro modal esté cerrado
    showProofModal = false;
  }

  function onShowProofDetails(event: CustomEvent) {
    proofForModal = event.detail.proof;
    showProofModal = true;
    // Nos aseguramos de que el otro modal esté cerrado
    showObjectModal = false;
  }

  // --- Data Fetching Logic (sin cambios) ---
  let isFetching = false;
  async function fetchReputationProofs() {
    if (isFetching) return;
    isFetching = true;
    try {
      if (!get(connected)) fetch_all.set(true);
      proofs.set(
        await updateReputationProofList(
          get(connected),
          get(types),
          get(searchStore),
        ),
      );
      build_graph(Array.from(get(proofs).values()));
    } catch (error) {
      console.error("Failed to fetch proofs:", error);
    } finally {
      isFetching = false;
    }
  }

  const combinedStore = derived(
    [connected, searchStore, fetch_all],
    ([$connected, $searchStore, $fetch_all]) => ({
      $connected,
      $searchStore,
      $fetch_all,
    }),
  );

  onMount(() => {
    fetchReputationProofs();
  });
  combinedStore.subscribe(() => {
    fetchReputationProofs();
  });

  // --- Graph Layout Logic (sin cambios) ---
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const nodeWidth = 350;
  const nodeHeight = 50;

  function getLayoutedElements(
    nodesToLayout: Node[],
    edgesToLayout: Edge[],
    direction = "TB",
  ) {
    const isHorizontal = direction === "LR";
    dagreGraph.setGraph({ rankdir: direction });

    nodesToLayout.forEach((node) =>
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }),
    );
    edgesToLayout.forEach((edge) =>
      dagreGraph.setEdge(edge.source, edge.target),
    );

    dagre.layout(dagreGraph);

    nodesToLayout.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      node.targetPosition = isHorizontal ? Position.Left : Position.Top;
      node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
      node.position = {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      };
    });

    return { nodes: nodesToLayout, edges: edgesToLayout };
  }

  function onLayout(direction: string) {
    const layouted = getLayoutedElements(get(nodes), get(edges), direction);
    nodes.set(layouted.nodes);
    edges.set(layouted.edges);
  }

  // --- Graph Builder (sin cambios) ---
  const nodes = writable<Node[]>([]);
  const edges = writable<Edge[]>([]);
  const nodeTypes: NodeTypes = {
    proof_type: NodeProofType,
    object_type: NodeCircleType,
  };
  const edgeTypes: EdgeTypes = {
    unconfirmed: UnconfirmedEdgeType,
    edge_type: EdgeType,
    edge_type_both: EdgeTypeBoth,
  };

  function build_graph(_proofs: ReputationProof[]) {
    if (get(building_graph)) {
      return;
    }
    building_graph.set(true);
    const newNodes: Map<string, Node> = new Map();
    const newEdges: Edge[] = [];
    const emptyEdges: Edge[] = [];

    _proofs.forEach((p) => {
      newNodes.set(`proof::${p.token_id}`, {
        id: `proof::${p.token_id}`,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: { label: p.type.typeName, proof: p },
        type: "proof_type",
        position: { x: 0, y: 0 },
      });
    });

    _proofs.forEach((p) => {
      const sourceId = `proof::${p.token_id}`;

      p.current_boxes.forEach((b) => {
        const edgeData = {
          box_id: b.box_id,
          polarization: b.polarization,
          proportion: parseFloat(
            Number((b.token_amount / p.total_amount) * 100).toFixed(3),
          ),
          color: !b.polarization ? "#FF7000" : "#ffcc00",
        };

        if (b.object_pointer) {
          let targetId: string;
          if (b.type.isRepProof) {
            targetId = `proof::${b.object_pointer}`;
          } else {
            targetId = `object::${b.object_pointer}`;
            if (!newNodes.has(targetId)) {
              newNodes.set(targetId, {
                id: targetId,
                data: { label: b.object_pointer },
                type: "object_type",
                sourcePosition: Position.Bottom,
                targetPosition: Position.Top,
                position: { x: 0, y: 0 },
              });
            }
          }
          newEdges.push({
            id: `box-edge::${b.box_id}`,
            source: sourceId,
            target: targetId,
            data: edgeData,
            type: "edge_type",
          });
        } else {
          emptyEdges.push({
            id: `box-edge::${b.box_id}`,
            source: sourceId,
            target: "empty-node",
            data: edgeData,
            type: "edge_type",
          });
        }
      });
    });

    if (emptyEdges.length > 0) {
      newNodes.set("empty-node", {
        id: "empty-node",
        data: { label: "Unassigned" },
        type: "object_type",
        position: { x: 0, y: 0 },
      });
      newEdges.push(...emptyEdges);
    }

    const finalEdges: Edge[] = [];
    const edgeMap = new Map<string, Edge>();
    newEdges.forEach((edge) => {
      const key = `${edge.source}-${edge.target}`;
      const reverseKey = `${edge.target}-${edge.source}`;

      if (edgeMap.has(reverseKey)) {
        const existingEdge = edgeMap.get(reverseKey)!;
        finalEdges.push({
          id: `both-${existingEdge.id}-${edge.id}`,
          source: existingEdge.source,
          target: existingEdge.target,
          data: { source: existingEdge.data, target: edge.data },
          type: "edge_type_both",
        });
        edgeMap.delete(reverseKey);
      } else {
        edgeMap.set(key, edge);
      }
    });
    edgeMap.forEach((edge) => finalEdges.push(edge));

    const layouted = getLayoutedElements(
      Array.from(newNodes.values()),
      finalEdges,
      window.innerWidth < window.innerHeight ? "TB" : "LR",
    );
    nodes.set(layouted.nodes);
    edges.set(layouted.edges);

    building_graph.set(false);
  }
</script>

<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css"
/>

<div style="height:100vh;" bind:clientWidth={width} bind:clientHeight={height}>
  <SvelteFlow
    on:nodecontextmenu={handleNodeContextMenu}
    on:edgecontextmenu={handleEdgeContextMenu}
    on:paneclick={handlePaneClick}
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
    style="background: #1a192bbe"
    fitView
  >
    <Background />
    <Controls
      showLock={$advance_mode}
      showZoom={$advance_mode}
      showFitView={$advance_mode}
    >
      {#if $advance_mode}
        <ControlButton on:click={() => onLayout("TB")} title="Vertical Layout"
          ><i class="fas fa-regular fa-ruler-horizontal"></i></ControlButton
        >
        <ControlButton on:click={() => onLayout("LR")} title="Horizontal Layout"
          ><i class="fas fa-regular fa-ruler-vertical"></i></ControlButton
        >
      {/if}
    </Controls>
    {#if $advance_mode}
      <MiniMap />
    {/if}
  </SvelteFlow>

  {#if rightNodeForProofMenu}
    <NodeContextMenu
      on:showProofDetails={onShowProofDetails}
      onClick={handlePaneClick}
      proof={rightNodeForProofMenu.proof}
      top={rightNodeForProofMenu.top}
      left={rightNodeForProofMenu.left}
      right={rightNodeForProofMenu.right}
      bottom={rightNodeForProofMenu.bottom}
    />
  {/if}

  {#if rightNodeForObjectMenu}
    <ObjectContextMenu
      on:showDetails={onShowObjectDetails}
      onClick={handlePaneClick}
      objectId={rightNodeForObjectMenu.id}
      top={rightNodeForObjectMenu.top}
      left={rightNodeForObjectMenu.left}
      right={rightNodeForObjectMenu.right}
      bottom={rightNodeForObjectMenu.bottom}
    />
  {/if}

  {#if rightEdgeMenu}
    <EdgeContextMenu
      onClick={handlePaneClick}
      box_id={rightEdgeMenu.box_id}
      top={rightEdgeMenu.top}
      left={rightEdgeMenu.left}
      right={rightEdgeMenu.right}
      bottom={rightEdgeMenu.bottom}
    />
  {/if}

  <PanelContextMenu />

  {#if showObjectModal}
    <ObjectDetailModal
      objectId={objectIdForModal}
      proofs={$proofs}
      on:close={() => (showObjectModal = false)}
      on:viewProof={onShowProofDetails}
    />
  {/if}

  {#if showProofModal && proofForModal}
    <ProofDetailModal
      proof={proofForModal}
      proofs={$proofs}
      bind:showModal={showProofModal}
      on:close={() => (showProofModal = false)}
      on:viewObject={onShowObjectDetails}
    />
  {/if}
</div>
