<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import type { ReputationProof, RPBox } from "$lib/ReputationProof";

  export let objectId: string | null;
  export let proofs: Map<string, ReputationProof>;

  const dispatch = createEventDispatcher();

  // --- Estado del Componente ---
  let proofsAboutObject: { parentProof: ReputationProof; box: RPBox }[] = [];
  let activeView: "list" | "carousel" = "list";
  let carouselIndex = 0;

  $: if (objectId) {
    carouselIndex = 0;
  }

  $: if (objectId && proofs) {
    const allProofs = proofs;
    const relevantProofs: { parentProof: ReputationProof; box: RPBox }[] = [];
    allProofs.forEach((proof) => {
      proof.current_boxes.forEach((box) => {
        if (box.object_pointer === objectId) {
          relevantProofs.push({ parentProof: proof, box: box });
        }
      });
    });
    proofsAboutObject = relevantProofs;
  }

  // --- Manejadores de Eventos ---

  // --- Manejadores de Eventos ---
  function handleClose() {
    dispatch("close");
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      handleClose();
    }
  }

  function handleProofClick(proof: ReputationProof) {
    dispatch("viewProof", { proof: proof });
  }

  // --- Funciones del Carrusel ---
  function nextItem() {
    if (proofsAboutObject.length > 0) {
      carouselIndex = (carouselIndex + 1) % proofsAboutObject.length;
    }
  }

  function prevItem() {
    if (proofsAboutObject.length > 0) {
      carouselIndex =
        (carouselIndex - 1 + proofsAboutObject.length) %
        proofsAboutObject.length;
    }
  }

  // --- Lógica para Renderizado Inteligente ---
  function calculateProportion(box: RPBox, total_amount: number): string {
    if (total_amount === 0) return "0.00";
    const proportion = (box.token_amount / total_amount) * 100;
    return proportion.toFixed(2);
  }

  function isLikelyMarkdown(text: string): boolean {
    const markdownPattern = /(^#{1,6}\s)|(\*\*|__)|(\*|-|\+)\s|(\[.*\]\(.*\))/;
    return markdownPattern.test(text);
  }

  onMount(() => {
    if (!window.marked) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
      document.head.appendChild(script);
    }
  });
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css"
    xintegrity="sha512-KfkfwYDsLkIlwQp6LFnl8zNdLGxu9YAA1QvwINks4PhcElQSvqcyVLLD9aMhXd13uQjoXtEKNosOWaZqXgel0g=="
    crossorigin="anonymous"
    referrerpolicy="no-referrer"
  />
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if objectId}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-overlay" on:click|self={handleClose}>
    <article class="proof-card">
      <button class="close-button" on:click={handleClose}>&times;</button>

      <header class="proof-header">
        <div class="header-main-content">
          <p class="proof-subtitle">Details for Object</p>
          <h1 class="proof-title" title={objectId}>{objectId}</h1>
        </div>
        <div class="view-switcher">
          <button
            class:active={activeView === "list"}
            on:click={() => (activeView = "list")}
            title="List View"
          >
            <i class="fas fa-list"></i>
          </button>
          <button
            class:active={activeView === "carousel"}
            on:click={() => (activeView = "carousel")}
            title="Carousel View"
          >
            <i class="fas fa-film"></i>
          </button>
        </div>
      </header>

      <div class="content-area">
        {#if proofsAboutObject.length > 0}
          {#if activeView === "list"}
            <div class="detailed-list">
              {#each proofsAboutObject as ref (ref.box.box_id)}
                {@const { parentProof, box } = ref}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                  class="box-card list-item"
                  on:click={() => handleProofClick(parentProof)}
                  role="button"
                  tabindex="0"
                >
                  <header class="box-header">
                    <div class="header-info">
                      <h3 class="box-id" title={parentProof.token_id}>
                        {parentProof.token_id}
                      </h3>
                      <p class="card-source-id">
                        Types: {parentProof.types
                          .map((t) => t.typeName)
                          .join(", ")}
                      </p>
                    </div>
                    <span
                      class="polarity-badge"
                      class:positive={box.polarization}
                      class:negative={!box.polarization}
                      >{box.polarization ? "POSITIVE" : "NEGATIVE"}</span
                    >
                  </header>
                  <div class="details-grid">
                    <strong>Owner:</strong><span
                      class="breakable"
                      title={parentProof.owner_address}
                      >{parentProof.owner_address}</span
                    >
                    <strong>Weight:</strong><span
                      >{box.token_amount}/{parentProof.total_amount} ({calculateProportion(
                        box,
                        parentProof.total_amount,
                      )}%)</span
                    >
                  </div>
                  <div class="content-section">
                    {#if typeof box.content === "object" && box.content !== null}
                      <pre class="code-font">{JSON.stringify(
                          box.content,
                          null,
                          2,
                        )}</pre>
                    {:else if typeof box.content === "string" && box.content.trim() !== ""}
                      {#if isLikelyMarkdown(box.content) && window.marked}<div
                          class="markdown-content"
                        >
                          {@html window.marked.parse(box.content)}
                        </div>
                      {:else}<p class="plain-text-content">
                          {box.content}
                        </p>{/if}
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {:else if activeView === "carousel"}
            <div class="carousel-view">
              <button
                class="carousel-nav prev"
                on:click={prevItem}
                disabled={proofsAboutObject.length <= 1}>&#10094;</button
              >

              {#if proofsAboutObject[carouselIndex]}
                {@const { parentProof, box } = proofsAboutObject[carouselIndex]}
                <div class="box-card carousel-item">
                  <header class="box-header">
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div class="header-info">
                      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                      <h3
                        class="box-id clickable-title"
                        on:click={() => handleProofClick(parentProof)}
                        title="Click to view this proof"
                      >
                        {parentProof.token_id}
                      </h3>
                      <p class="card-source-id">
                        Types: {parentProof.types
                          .map((t) => t.typeName)
                          .join(", ")}
                      </p>
                    </div>
                    <span
                      class="polarity-badge"
                      class:positive={box.polarization}
                      class:negative={!box.polarization}
                      >{box.polarization ? "POSITIVE" : "NEGATIVE"}</span
                    >
                  </header>
                  <div class="details-grid">
                    <strong>Owner:</strong><span
                      class="breakable"
                      title={parentProof.owner_address}
                      >{parentProof.owner_address}</span
                    >
                    <strong>Weight:</strong><span
                      >{box.token_amount}/{parentProof.total_amount} ({calculateProportion(
                        box,
                        parentProof.total_amount,
                      )}%)</span
                    >
                  </div>
                  <div class="content-section">
                    {#if typeof box.content === "object" && box.content !== null}
                      <pre class="code-font">{JSON.stringify(
                          box.content,
                          null,
                          2,
                        )}</pre>
                    {:else if typeof box.content === "string" && box.content.trim() !== ""}
                      {#if isLikelyMarkdown(box.content) && window.marked}<div
                          class="markdown-content"
                        >
                          {@html window.marked.parse(box.content)}
                        </div>
                      {:else}<p class="plain-text-content">
                          {box.content}
                        </p>{/if}
                    {/if}
                  </div>
                </div>
              {/if}

              <button
                class="carousel-nav next"
                on:click={nextItem}
                disabled={proofsAboutObject.length <= 1}>&#10095;</button
              >
            </div>
            <div class="carousel-counter">
              {carouselIndex + 1} / {proofsAboutObject.length}
            </div>
          {/if}
        {:else}
          <p class="empty-state">No reputation proofs found for this object.</p>
        {/if}
      </div>
    </article>
  </div>
{/if}

<style>
  :root {
    --card-bg: #2a2a2a;
    --border-color: #444;
    --text-color: #e0e0e0;
    --text-muted: #aaa;
    --accent-color: #fbbf24;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 2rem;
    box-sizing: border-box;
  }
  .proof-card {
    position: relative;
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 2rem 2.5rem;
    color: var(--text-color);
    font-family: sans-serif;
    width: 95%;
    max-width: 1200px;
    height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .close-button {
    position: absolute;
    top: 15px;
    right: 20px;
    background: 0 0;
    border: none;
    font-size: 2.5rem;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
    z-index: 10;
    transition: color 0.2s;
  }
  .close-button:hover {
    color: #fff;
  }

  .proof-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  .header-main-content {
    flex-grow: 1;
    min-width: 0;
  }
  .proof-title {
    font-family: monospace;
    font-size: 1.75rem;
    color: #fff;
    margin: 0.25rem 0 0 0;
    line-height: 1.2;
    white-space: normal;
    word-break: break-all;
  }
  .proof-subtitle {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin: 0;
    font-weight: 500;
  }

  .view-switcher {
    display: flex;
    background-color: #222;
    border-radius: 8px;
    padding: 4px;
    gap: 4px;
    margin-right: 3rem;
  }
  .view-switcher button {
    background: 0 0;
    border: none;
    color: var(--text-muted);
    padding: 0.5rem;
    width: 50px;
    height: 40px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  .view-switcher button.active {
    background-color: #444;
    color: #fff;
    font-weight: 600;
  }

  .content-area {
    overflow-y: auto;
    margin-top: 1.5rem;
    padding-right: 1rem;
    flex-grow: 1;
    min-height: 0;
  }
  .detailed-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-top: 1rem;
  }

  .carousel-view {
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: 1rem;
    height: 95%;
  }
  .carousel-nav {
    background: 0 0;
    border: 1px solid #555;
    color: #fff;
    border-radius: 50%;
    width: 45px;
    height: 45px;
    font-size: 1.5rem;
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s;
    flex-shrink: 0;
    align-self: center;
  }
  .carousel-nav:hover:not(:disabled) {
    background-color: #444;
    border-color: var(--accent-color);
  }
  .carousel-nav:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .carousel-counter {
    text-align: center;
    margin-top: 1rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .empty-state {
    color: var(--text-muted);
    text-align: center;
    padding: 3rem;
    background-color: #262626;
    border-radius: 8px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .box-card {
    background-color: #333;
    border: 1px solid #555;
    border-radius: 8px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .box-card.list-item {
    cursor: pointer;
    transition:
      border-color 0.2s,
      transform 0.2s;
  }
  .box-card.list-item:hover {
    border-color: var(--accent-color);
    transform: translateY(-2px);
  }
  .carousel-item {
    border-color: #555;
    width: 90%;
    height: 90%;
  }

  .clickable-title {
    cursor: pointer;
  }
  .clickable-title:hover {
    text-decoration: underline;
  }

  .box-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header-info {
    flex-grow: 1;
    min-width: 0;
  }
  .box-id {
    font-family: monospace;
    font-size: 1rem;
    color: var(--accent-color);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-source-id {
    font-family: monospace;
    color: var(--text-muted);
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }

  .polarity-badge {
    font-weight: 700;
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    font-size: 0.8rem;
    flex-shrink: 0;
    text-transform: uppercase;
  }
  .polarity-badge.positive {
    background-color: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #a7f3d0;
  }
  .polarity-badge.negative {
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fecaca;
  }

  .details-grid {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 0.5rem 1.5rem;
    align-items: center;
    font-size: 0.9rem;
  }
  .details-grid strong {
    color: var(--text-muted);
    text-align: right;
    font-weight: 400;
  }
  .breakable {
    word-break: break-all;
  }

  .content-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #444;
    flex-grow: 1;
    overflow-y: auto;
    min-height: 0;
  }
  .plain-text-content {
    white-space: pre-wrap;
  }
  .code-font,
  pre {
    font-family: "Courier New", Courier, monospace;
    background-color: #222;
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.9em;
    word-break: break-all;
    white-space: pre-wrap;
    height: 100%;
    box-sizing: border-box;
  }

  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3) {
    color: var(--accent-color);
    border-bottom: 1px solid #555;
    padding-bottom: 0.3em;
  }
  .markdown-content :global(p) {
    line-height: 1.6;
  }
  .markdown-content :global(a) {
    color: #6ebff5;
  }
  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    padding-left: 2em;
  }
  .markdown-content :global(li) {
    margin-bottom: 0.5rem;
  }
  .markdown-content :global(blockquote) {
    border-left: 4px solid var(--border-color);
    padding-left: 1em;
    margin-left: 0;
    color: var(--text-muted);
  }
  .markdown-content :global(code) {
    background-color: #3a3a3c;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: "Courier New", Courier, monospace;
  }

  /* Estilos para la barra de scroll en navegadores WebKit */
  .content-area::-webkit-scrollbar,
  .content-section::-webkit-scrollbar {
    width: 8px;
  }
  .content-area::-webkit-scrollbar-track,
  .content-section::-webkit-scrollbar-track {
    background: #222;
    border-radius: 10px;
  }
  .content-area::-webkit-scrollbar-thumb,
  .content-section::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 10px;
  }
  .content-area::-webkit-scrollbar-thumb:hover,
  .content-section::-webkit-scrollbar-thumb:hover {
    background: #777;
  }
</style>
