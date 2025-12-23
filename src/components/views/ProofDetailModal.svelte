<script lang="ts">
    import type { ReputationProof, RPBox } from "$lib/ReputationProof";
    import { createEventDispatcher, onMount } from "svelte";

    export let proof: ReputationProof;
    export let showModal: boolean;
    export let proofs: Map<string, ReputationProof>;

    const dispatch = createEventDispatcher();

    // --- Component State ---
    let activeTab: "boxes" | "pointedBy" = "pointedBy";
    let activeView: "list" | "carousel" = "list";
    let carouselIndex = 0;
    let activeProof: ReputationProof;

    // --- Reactivity ---
    $: if (proof) {
        activeProof = proof;
        activeTab = "pointedBy";
        activeView = "list"; // Reset view on new proof
        carouselIndex = 0;
    }

    $: if (activeTab) {
        carouselIndex = 0; // Reset index when switching tabs
    }

    let referringBoxes: { parentProof: ReputationProof; box: RPBox }[] = [];
    $: {
        if (activeProof && proofs) {
            const currentProofId = activeProof.token_id;
            const foundBoxes: { parentProof: ReputationProof; box: RPBox }[] =
                [];

            for (const otherProof of proofs.values()) {
                if (otherProof.token_id === currentProofId) continue;
                for (const box of otherProof.current_boxes) {
                    if (box.object_pointer === currentProofId) {
                        foundBoxes.push({ parentProof: otherProof, box: box });
                    }
                }
            }
            referringBoxes = foundBoxes;
        }
    }

    // --- Event Handlers ---
    function closeModal() {
        dispatch("close");
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            closeModal();
        }
    }

    function viewProofDetails(targetProofId: string) {
        if (!targetProofId) return;
        const newProof = proofs.get(targetProofId);

        if (newProof) {
            activeProof = newProof;
        }
    }

    function handleOpinionClick(box: RPBox) {
        if (!box.object_pointer) return;
        const isProofPointer = box.type.isRepProof;

        if (isProofPointer && proofs.has(box.object_pointer)) {
            viewProofDetails(box.object_pointer);
        } else if (!isProofPointer) {
            dispatch("viewObject", { objectId: box.object_pointer });
        }
    }

    // --- Carousel Functions ---
    function nextItem() {
        const totalItems =
            activeTab === "boxes"
                ? activeProof.current_boxes.length
                : referringBoxes.length;
        if (totalItems > 0) {
            carouselIndex = (carouselIndex + 1) % totalItems;
        }
    }

    function prevItem() {
        const totalItems =
            activeTab === "boxes"
                ? activeProof.current_boxes.length
                : referringBoxes.length;
        if (totalItems > 0) {
            carouselIndex = (carouselIndex - 1 + totalItems) % totalItems;
        }
    }

    // --- Smart Rendering Logic ---
    function calculateProportion(box: RPBox, total_amount: number): string {
        if (total_amount === 0) return "0.00";
        const proportion = (box.token_amount / total_amount) * 100;
        return proportion.toFixed(2);
    }

    function isLikelyMarkdown(text: string): boolean {
        if (!text) return false;
        const markdownPattern =
            /(^#{1,6}\s)|(\*\*|__)|(\*|-|\+)\s|(\[.*\]\(.*\))/;
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
        integrity="sha512-KfkfwYDsLkIlwQp6LFnl8zNdLGxu9YAA1QvwINks4PhcElQSvqcyVLLD9aMhXd13uQjoXtEKNosOWaZqXgel0g=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
    />
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

{#if showModal && activeProof}
    <div class="modal-overlay" on:click|self={closeModal}>
        <article class="proof-card">
            <button class="close-button" on:click={closeModal}>&times;</button>

            <header class="proof-header">
                <div class="header-main-content">
                    <h1 class="proof-title" title={activeProof.token_id}>
                        {activeProof.token_id}
                    </h1>
                    <p class="proof-subtitle">
                        Types: {activeProof.types
                            .map((t) => t.typeName)
                            .join(", ")}
                    </p>
                </div>
                <span class="network-badge">{activeProof.network}</span>
            </header>

            <section class="details-section">
                <div class="details-grid">
                    <strong>Owner:</strong><span
                        class="breakable"
                        title={activeProof.owner_address}
                        >{activeProof.owner_address}</span
                    >
                    <strong>Description:</strong><span
                        >{activeProof.types
                            .map((t) => t.description)
                            .filter((d) => d)
                            .join(" | ")}</span
                    >
                    <strong>Total Amount:</strong><span
                        >{activeProof.total_amount}</span
                    >
                    <strong>Schema:</strong><span class="breakable"
                        >{activeProof.types
                            .map((t) => t.schemaURI)
                            .filter((s) => s)
                            .join(" | ")}</span
                    >
                </div>
            </section>

            <div class="controls-wrapper">
                <div class="tab-switcher">
                    <button
                        class:active={activeTab === "pointedBy"}
                        on:click={() => (activeTab = "pointedBy")}
                    >
                        Pointed By ({referringBoxes.length})
                    </button>
                    <button
                        class:active={activeTab === "boxes"}
                        on:click={() => (activeTab = "boxes")}
                    >
                        Opinions ({activeProof.current_boxes.length})
                    </button>
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
            </div>

            <div class="content-area">
                {#if activeTab === "boxes"}
                    {@const items = activeProof.current_boxes}
                    {#if items.length > 0}
                        {#if activeView === "list"}
                            <div class="detailed-list">
                                {#each items as box (box.box_id)}
                                    <div
                                        class="box-card list-item"
                                        on:click={() => handleOpinionClick(box)}
                                        role="button"
                                        tabindex="0"
                                    >
                                        <header class="box-header">
                                            <div class="header-info">
                                                <h3
                                                    class="box-id clickable-title"
                                                    title={box.object_pointer}
                                                >
                                                    {box.object_pointer}
                                                </h3>
                                                <p class="card-source-id">
                                                    Type: {box.type.typeName}
                                                </p>
                                            </div>
                                            <span
                                                class="polarity-badge"
                                                class:positive={box.polarization}
                                                class:negative={!box.polarization}
                                                >{box.polarization
                                                    ? "POSITIVE"
                                                    : "NEGATIVE"}</span
                                            >
                                        </header>
                                        <div class="details-grid-inner">
                                            <strong>Box ID:</strong><span
                                                >{box.box_id.substring(
                                                    0,
                                                    15,
                                                )}...</span
                                            >
                                            <strong>Weight:</strong><span
                                                >{box.token_amount} / {activeProof.total_amount}
                                                ({calculateProportion(
                                                    box,
                                                    activeProof.total_amount,
                                                )}%)</span
                                            >
                                            <strong>Locked:</strong><span
                                                >{box.is_locked
                                                    ? "Yes"
                                                    : "No"}</span
                                            >
                                        </div>
                                        <div class="content-section">
                                            {#if typeof box.content === "object" && box.content !== null && Object.keys(box.content).length > 0}
                                                <pre
                                                    class="code-font">{JSON.stringify(
                                                        box.content,
                                                        null,
                                                        2,
                                                    )}</pre>
                                            {:else if typeof box.content === "string" && box.content.trim() !== ""}
                                                {#if isLikelyMarkdown(box.content) && window.marked}<div
                                                        class="markdown-content"
                                                    >
                                                        {@html window.marked.parse(
                                                            box.content,
                                                        )}
                                                    </div>{:else}<p
                                                        class="plain-text-content"
                                                    >
                                                        {box.content}
                                                    </p>{/if}{/if}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else if activeView === "carousel"}
                            <div class="carousel-view">
                                <button
                                    class="carousel-nav prev"
                                    on:click={prevItem}
                                    disabled={items.length <= 1}
                                    >&#10094;</button
                                >
                                {#if items[carouselIndex]}
                                    {@const box = items[carouselIndex]}
                                    <div
                                        class="box-card carousel-item"
                                        on:click={() => handleOpinionClick(box)}
                                        role="button"
                                        tabindex="0"
                                    >
                                        <header class="box-header">
                                            <div class="header-info">
                                                <h3
                                                    class="box-id clickable-title"
                                                    title={box.object_pointer}
                                                >
                                                    {box.object_pointer}
                                                </h3>
                                                <p class="card-source-id">
                                                    Type: {box.type.typeName}
                                                </p>
                                            </div>
                                            <span
                                                class="polarity-badge"
                                                class:positive={box.polarization}
                                                class:negative={!box.polarization}
                                                >{box.polarization
                                                    ? "POSITIVE"
                                                    : "NEGATIVE"}</span
                                            >
                                        </header>
                                        <div class="details-grid-inner">
                                            <strong>Box ID:</strong><span
                                                >{box.box_id.substring(
                                                    0,
                                                    15,
                                                )}...</span
                                            >
                                            <strong>Weight:</strong><span
                                                >{box.token_amount} / {activeProof.total_amount}
                                                ({calculateProportion(
                                                    box,
                                                    activeProof.total_amount,
                                                )}%)</span
                                            >
                                            <strong>Locked:</strong><span
                                                >{box.is_locked
                                                    ? "Yes"
                                                    : "No"}</span
                                            >
                                        </div>
                                        <div class="content-section">
                                            {#if typeof box.content === "object" && box.content !== null && Object.keys(box.content).length > 0}
                                                <pre
                                                    class="code-font">{JSON.stringify(
                                                        box.content,
                                                        null,
                                                        2,
                                                    )}</pre>
                                            {:else if typeof box.content === "string" && box.content.trim() !== ""}
                                                {#if isLikelyMarkdown(box.content) && window.marked}<div
                                                        class="markdown-content"
                                                    >
                                                        {@html window.marked.parse(
                                                            box.content,
                                                        )}
                                                    </div>{:else}<p
                                                        class="plain-text-content"
                                                    >
                                                        {box.content}
                                                    </p>{/if}{/if}
                                        </div>
                                    </div>
                                {/if}
                                <button
                                    class="carousel-nav next"
                                    on:click={nextItem}
                                    disabled={items.length <= 1}
                                    >&#10095;</button
                                >
                            </div>
                            <div class="carousel-counter">
                                {carouselIndex + 1} / {items.length}
                            </div>
                        {/if}
                    {:else}
                        <p class="empty-state">
                            This proof does not contain any boxes.
                        </p>
                    {/if}
                {:else}
                    {@const items = referringBoxes}
                    {#if items.length > 0}
                        {#if activeView === "list"}
                            <div class="detailed-list">
                                {#each items as ref (ref.box.box_id)}
                                    <div
                                        class="box-card list-item"
                                        on:click={() =>
                                            viewProofDetails(
                                                ref.parentProof.token_id,
                                            )}
                                        role="button"
                                        tabindex="0"
                                    >
                                        <header class="box-header">
                                            <div class="header-info">
                                                <h3
                                                    class="box-id clickable-title"
                                                    title={ref.parentProof
                                                        .token_id}
                                                >
                                                    {ref.parentProof.token_id}
                                                </h3>
                                                <p class="card-source-id">
                                                    Types: {ref.parentProof.types
                                                        .map((t) => t.typeName)
                                                        .join(", ")}
                                                </p>
                                            </div>
                                            <span
                                                class="polarity-badge"
                                                class:positive={ref.box
                                                    .polarization}
                                                class:negative={!ref.box
                                                    .polarization}
                                                >{ref.box.polarization
                                                    ? "POSITIVE"
                                                    : "NEGATIVE"}</span
                                            >
                                        </header>
                                        <div class="details-grid-inner">
                                            <strong>Source Owner:</strong><span
                                                class="breakable"
                                                title={ref.parentProof
                                                    .owner_address}
                                                >{ref.parentProof
                                                    .owner_address}</span
                                            >
                                            <strong>Weight:</strong><span
                                                >{ref.box.token_amount} / {ref
                                                    .parentProof.total_amount} ({calculateProportion(
                                                    ref.box,
                                                    ref.parentProof
                                                        .total_amount,
                                                )}%)</span
                                            >
                                        </div>
                                        <div class="content-section">
                                            {#if typeof ref.box.content === "object" && ref.box.content !== null && Object.keys(ref.box.content).length > 0}
                                                <pre
                                                    class="code-font">{JSON.stringify(
                                                        ref.box.content,
                                                        null,
                                                        2,
                                                    )}</pre>
                                            {:else if typeof ref.box.content === "string" && ref.box.content.trim() !== ""}
                                                {#if isLikelyMarkdown(ref.box.content) && window.marked}<div
                                                        class="markdown-content"
                                                    >
                                                        {@html window.marked.parse(
                                                            ref.box.content,
                                                        )}
                                                    </div>{:else}<p
                                                        class="plain-text-content"
                                                    >
                                                        {ref.box.content}
                                                    </p>{/if}{/if}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else if activeView === "carousel"}
                            <div class="carousel-view">
                                <button
                                    class="carousel-nav prev"
                                    on:click={prevItem}
                                    disabled={items.length <= 1}
                                    >&#10094;</button
                                >
                                {#if items[carouselIndex]}
                                    {@const ref = items[carouselIndex]}
                                    <div
                                        class="box-card carousel-item"
                                        on:click={() =>
                                            viewProofDetails(
                                                ref.parentProof.token_id,
                                            )}
                                        role="button"
                                        tabindex="0"
                                    >
                                        <header class="box-header">
                                            <div class="header-info">
                                                <h3
                                                    class="box-id clickable-title"
                                                    title={ref.parentProof
                                                        .token_id}
                                                >
                                                    {ref.parentProof.token_id}
                                                </h3>
                                                <p class="card-source-id">
                                                    Types: {ref.parentProof.types
                                                        .map((t) => t.typeName)
                                                        .join(", ")}
                                                </p>
                                            </div>
                                            <span
                                                class="polarity-badge"
                                                class:positive={ref.box
                                                    .polarization}
                                                class:negative={!ref.box
                                                    .polarization}
                                                >{ref.box.polarization
                                                    ? "POSITIVE"
                                                    : "NEGATIVE"}</span
                                            >
                                        </header>
                                        <div class="details-grid-inner">
                                            <strong>Source Owner:</strong><span
                                                class="breakable"
                                                title={ref.parentProof
                                                    .owner_address}
                                                >{ref.parentProof
                                                    .owner_address}</span
                                            >
                                            <strong>Weight:</strong><span
                                                >{ref.box.token_amount} / {ref
                                                    .parentProof.total_amount} ({calculateProportion(
                                                    ref.box,
                                                    ref.parentProof
                                                        .total_amount,
                                                )}%)</span
                                            >
                                        </div>
                                        <div class="content-section">
                                            {#if typeof ref.box.content === "object" && ref.box.content !== null && Object.keys(ref.box.content).length > 0}
                                                <pre
                                                    class="code-font">{JSON.stringify(
                                                        ref.box.content,
                                                        null,
                                                        2,
                                                    )}</pre>
                                            {:else if typeof ref.box.content === "string" && ref.box.content.trim() !== ""}
                                                {#if isLikelyMarkdown(ref.box.content) && window.marked}<div
                                                        class="markdown-content"
                                                    >
                                                        {@html window.marked.parse(
                                                            ref.box.content,
                                                        )}
                                                    </div>{:else}<p
                                                        class="plain-text-content"
                                                    >
                                                        {ref.box.content}
                                                    </p>{/if}{/if}
                                        </div>
                                    </div>
                                {/if}
                                <button
                                    class="carousel-nav next"
                                    on:click={nextItem}
                                    disabled={items.length <= 1}
                                    >&#10095;</button
                                >
                            </div>
                            <div class="carousel-counter">
                                {carouselIndex + 1} / {items.length}
                            </div>
                        {/if}
                    {:else}
                        <p class="empty-state">
                            This proof is not being pointed to by any other
                            proofs.
                        </p>
                    {/if}
                {/if}
            </div>
        </article>
    </div>
{/if}

<style>
    /* --- Variables and Base Styles --- */
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

    /* --- Main Header --- */
    .proof-header {
        display: flex;
        align-items: flex-start;
        gap: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
    }
    .header-main-content {
        flex-grow: 0;
        min-width: 0;
    } /* Changed flex-grow to 0 */
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
        margin: 0.5rem 0 0;
        font-weight: 500;
    }
    .network-badge {
        background-color: #333;
        padding: 0.3rem 0.8rem;
        border-radius: 15px;
        font-size: 0.8rem;
        font-weight: 700;
        border: 1px solid #444;
        flex-shrink: 0;
        margin-top: 0.25rem;
    }

    /* --- Details Section --- */
    .details-section {
        padding: 1rem 0;
        margin-bottom: 1rem;
        border-top: 1px solid var(--border-color);
    }
    .details-grid {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 0.75rem 1.5rem;
        align-items: center;
    }
    .details-grid strong {
        color: var(--text-muted);
        text-align: right;
        font-weight: 400;
    }
    .breakable {
        word-break: break-all;
    }

    /* --- Controls (Tabs & View Switcher) --- */
    .controls-wrapper {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 1rem;
    }
    .tab-switcher {
        display: flex;
        background-color: #222;
        border-radius: 8px;
        padding: 4px;
        gap: 4px;
    }
    .tab-switcher button {
        background: 0 0;
        border: none;
        color: var(--text-muted);
        padding: 0.5rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        transition: all 0.2s ease-in-out;
    }
    .tab-switcher button.active {
        background-color: #444;
        color: #fff;
        font-weight: 600;
    }
    .view-switcher {
        display: flex;
        background-color: #222;
        border-radius: 8px;
        padding: 4px;
        gap: 4px;
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

    /* --- Content Area --- */
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

    /* --- Carousel --- */
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

    /* --- Opinion Box Card --- */
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
        cursor: pointer;
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
    .clickable-title:hover {
        text-decoration: underline;
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

    .details-grid-inner {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 0.5rem 1.5rem;
        align-items: center;
        font-size: 0.9rem;
    }
    .details-grid-inner strong {
        color: var(--text-muted);
        text-align: right;
        font-weight: 400;
    }

    /* --- Content Section inside card --- */
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

    /* --- Scrollbar --- */
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
