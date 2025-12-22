<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { updateReputationProofList } from "$lib/unspent_proofs";
    import { type ReputationProof, type TypeNFT } from "$lib/ReputationProof";

    export let types: Map<string, TypeNFT>;
    export let connected: boolean;

    const dispatch = createEventDispatcher();

    // --- Search State ---
    let searchMode: "text" | "type" = "text";
    let textInput: string = "";
    let selectedTypeId: string = "";

    let results: Map<string, ReputationProof> = new Map();
    let isLoading = false;
    let error = "";
    let hasSearched = false;

    // --- UI State ---
    let expandedDetails = new Set<string>();

    async function performSearch() {
        if (searchMode === "text" && !textInput) return;
        if (searchMode === "type" && !selectedTypeId) return;

        isLoading = true;
        hasSearched = true;
        error = "";
        results.clear();
        expandedDetails.clear(); // Limpiar detalles al realizar una nueva búsqueda

        try {
            if (searchMode === "text") {
                if (searchMode === "text") {
                    const proofsFromApi = await updateReputationProofList(
                        connected,
                        types,
                        null,
                    ); // todo, should use the search parameter.
                    const filteredResults = new Map<string, ReputationProof>();

                    for (const [key, proof] of proofsFromApi.entries()) {
                        const isMatch = proof.current_boxes.some((box) => {
                            if (
                                box.object_pointer &&
                                box.object_pointer.includes(textInput)
                            ) {
                                return true;
                            }

                            if (box.content) {
                                const contentAsString = JSON.stringify(
                                    box.content,
                                );
                                return contentAsString.includes(textInput);
                            }

                            return false;
                        });

                        if (isMatch) {
                            filteredResults.set(key, proof);
                        }
                    }
                    results = filteredResults;
                }
            } else {
                // searchMode === 'type'
                const proofsFromApi = await updateReputationProofList(
                    connected,
                    types,
                    null,
                );

                const filteredResults = new Map<string, ReputationProof>();
                for (const [key, proof] of proofsFromApi.entries()) {
                    if (proof.type.tokenId === selectedTypeId) {
                        filteredResults.set(key, proof);
                    }

                    if (
                        proof.current_boxes.some(
                            (box) => box.type.tokenId === selectedTypeId,
                        )
                    ) {
                        filteredResults.set(key, proof);
                    }
                }
                results = filteredResults;
            }
        } catch (e) {
            console.error("Search failed:", e);
            error = "An error occurred during the search. Please try again.";
        } finally {
            isLoading = false;
        }
    }

    function viewInGraph(proof: ReputationProof) {
        dispatch("searchGraph", { tokenId: proof.token_id });
    }

    function clear() {
        textInput = "";
        selectedTypeId = "";
        results.clear();
        error = "";
        hasSearched = false;
        expandedDetails.clear();
    }

    function toggleDetails(tokenId: string) {
        if (expandedDetails.has(tokenId)) {
            expandedDetails.delete(tokenId);
        } else {
            expandedDetails.add(tokenId);
        }
        expandedDetails = expandedDetails; // Forzar reactividad de Svelte
    }

    // Helper for dynamic messages
    $: currentQuery =
        searchMode === "text" ? textInput : types.get(selectedTypeId)?.typeName;
</script>

<div class="search-container">
    <div class="search-box">
        <h2 class="search-title">Search Reputation</h2>
        <p class="search-description">
            Find proofs by text/ID, or browse all proofs of a specific type.
        </p>
        <form class="search-form" on:submit|preventDefault={performSearch}>
            <div class="search-mode-selector">
                <select
                    bind:value={searchMode}
                    class="search-input mode-select"
                    title="Select search mode"
                >
                    <option value="text">By Text/ID</option>
                    <option value="type">By Proof Type</option>
                </select>
            </div>

            <div class="search-input-area">
                {#if searchMode === "text"}
                    <input
                        class="search-input"
                        bind:value={textInput}
                        placeholder="Address, token ID, transaction hash..."
                        disabled={isLoading}
                    />
                {:else}
                    <select
                        class="search-input"
                        bind:value={selectedTypeId}
                        disabled={isLoading}
                        required
                    >
                        <option value="" disabled>
                            -- Select a proof type --
                        </option>
                        {#each Array.from(types.values()) as type (type.tokenId)}
                            <option value={type.tokenId}>
                                {type.typeName}
                            </option>
                        {/each}
                    </select>
                {/if}
            </div>

            <button class="search-button" type="submit" disabled={isLoading}
                >Search</button
            >
            {#if (textInput || selectedTypeId) && !isLoading}
                <button class="clear-button" type="button" on:click={clear}
                    >❌</button
                >
            {/if}
        </form>
    </div>

    <div class="results-area">
        {#if isLoading}
            <div class="loader"></div>
            <p>Searching on-chain data...</p>
        {:else if error}
            <p class="error-message">{error}</p>
        {:else if results.size > 0}
            <h3 class="results-title">Search Results ({results.size})</h3>
            <ul class="results-list">
                {#each Array.from(results.values()) as result (result.token_id)}
                    <li class="result-item">
                        <div class="result-main-info">
                            <div class="result-info">
                                <span class="result-type"
                                    >{result.type.typeName}</span
                                >
                                <span class="result-id" title={result.token_id}>
                                    {result.token_id}
                                </span>
                                <span class="result-snippet">
                                    Total amount: {result.total_amount}
                                </span>
                            </div>
                            <div class="result-actions">
                                <button
                                    class="details-button"
                                    on:click={() =>
                                        toggleDetails(result.token_id)}
                                >
                                    {#if expandedDetails.has(result.token_id)}Hide
                                        Details{:else}Details{/if}
                                </button>
                                <button
                                    class="view-graph-button"
                                    on:click={() => viewInGraph(result)}
                                >
                                    View in graph
                                </button>
                            </div>
                        </div>

                        {#if expandedDetails.has(result.token_id)}
                            <div class="result-details">
                                {#if result.data && Object.keys(result.data).length > 0}
                                    <h3>Proof Data (R9)</h3>
                                    <pre><code
                                            >{JSON.stringify(
                                                result.data,
                                                null,
                                                2,
                                            )}</code
                                        ></pre>
                                {/if}

                                {#if result.current_boxes && result.current_boxes.length > 0}
                                    <h3>Boxes</h3>
                                    <div class="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Box ID</th>
                                                    <th>Proportion</th>
                                                    <th>Negative</th>
                                                    <th>Locked</th>
                                                    <th>Object Type</th>
                                                    <th>Object Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {#each result.current_boxes as b}
                                                    <tr>
                                                        <td
                                                            class="td-breakable"
                                                            title={b.box_id}
                                                            >{b.box_id}</td
                                                        >
                                                        <td
                                                            >{parseFloat(
                                                                Number(
                                                                    (b.token_amount /
                                                                        result.total_amount) *
                                                                        100,
                                                                ).toFixed(3),
                                                            )}%</td
                                                        >
                                                        <td
                                                            >{b.polarization
                                                                ? "No"
                                                                : "Yes"}</td
                                                        >
                                                        <td
                                                            >{b.is_locked
                                                                ? "Yes"
                                                                : "No"}</td
                                                        >
                                                        <td
                                                            >{b.type.typeName ??
                                                                "N/A"}</td
                                                        >
                                                        <td
                                                            class="td-breakable"
                                                            title={b.object_pointer}
                                                            >{b.object_pointer ??
                                                                ""}</td
                                                        >
                                                    </tr>
                                                {/each}
                                            </tbody>
                                        </table>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </li>
                {/each}
            </ul>
        {:else if hasSearched}
            <div class="no-results-box">
                <p>No results found for "{currentQuery}".</p>
                <span class="no-results-hint"
                    >Please check your selection or try a different query.</span
                >
            </div>
        {/if}
    </div>
</div>

<style>
    /* --- ESTILOS GENERALES (SIN CAMBIOS) --- */
    .search-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem 1rem;
        gap: 2rem;
    }
    .search-box {
        width: 100%;
        max-width: 1400px;
        padding: 2rem;
        border-radius: 12px;
        background-color: #2a2a2a;
        border: 1px solid #444;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }
    .search-title {
        font-size: 1.75rem;
        margin: 0 0 0.5rem 0;
        text-align: center;
        color: #fbbf24;
    }
    .search-description {
        margin: 0 0 1.5rem 0;
        color: #ccc;
        font-size: 0.95rem;
        text-align: center;
    }
    .search-form {
        display: flex;
        gap: 0.5rem;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        align-items: center;
    }
    .search-mode-selector {
        flex-shrink: 0;
    }
    .search-input-area {
        flex-grow: 1;
    }
    .search-input {
        width: 100%;
        padding: 0.75rem;
        font-size: 1rem;
        border-radius: 6px;
        border: 1px solid #666;
        background-color: #333;
        color: #f0f0f0;
        transition: border-color 0.2s;
        box-sizing: border-box;
    }
    .search-input.mode-select {
        width: auto;
        padding-right: 2rem;
    }
    .search-input:disabled {
        background-color: #444;
        cursor: not-allowed;
    }
    .search-button,
    .clear-button {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.2s;
        flex-shrink: 0;
    }
    .search-button {
        background-color: #fbbf24;
        color: #2a2a2a;
    }
    .search-button:hover:not(:disabled) {
        background-color: #fde047;
    }
    .search-button:disabled {
        background-color: #555;
        color: #aaa;
        cursor: not-allowed;
    }
    .clear-button {
        background: none;
        color: #aaa;
        padding: 0.75rem;
        font-size: 0.8rem;
    }
    .clear-button:hover {
        color: white;
    }
    .results-area {
        width: 100%;
        max-width: 1400px;
        text-align: center;
    }
    .loader {
        margin: 1rem auto;
        border: 4px solid #555;
        border-top: 4px solid #fbbf24;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
    .results-title {
        color: #ccc;
        font-weight: normal;
        border-bottom: 1px solid #444;
        padding-bottom: 1rem;
        margin-bottom: 2rem;
    }
    .no-results-box {
        background-color: #333;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 2rem;
        margin-top: 1rem;
    }
    .no-results-box p {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        color: white;
    }
    .no-results-box span {
        color: #aaa;
    }

    /* --- ESTILOS DE RESULTADOS (MODIFICADOS) --- */
    .results-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .result-item {
        display: flex;
        flex-direction: column;
        background-color: #333;
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid #444;
        text-align: left;
        transition: all 0.2s ease-in-out;
    }
    .result-main-info {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .result-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex-grow: 1;
    }
    .result-type {
        font-size: 0.8rem;
        font-weight: bold;
        color: #fbbf24;
        background-color: rgba(251, 191, 36, 0.15);
        padding: 2px 6px;
        border-radius: 4px;
        align-self: flex-start;
    }
    .result-id {
        font-family: monospace;
        color: #f0f0f0;
        word-break: break-all;
    }
    .result-snippet {
        color: #aaa;
        font-size: 0.9rem;
    }

    .result-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .details-button,
    .view-graph-button {
        padding: 0.5rem 1rem;
        background-color: transparent;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        font-weight: bold;
    }
    .details-button {
        border: 1px solid #888;
        color: #ccc;
    }
    .details-button:hover {
        background-color: #4f4f4f;
        border-color: #aaa;
    }
    .view-graph-button {
        border: 1px solid #fbbf24;
        color: #fbbf24;
    }
    .view-graph-button:hover {
        background-color: rgba(251, 191, 36, 0.1);
    }

    /* --- ESTILOS PARA DETALLES (AÑADIDOS) --- */
    .result-details {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #444;
        width: 100%;
        word-wrap: break-word;
    }
    .result-details h3 {
        color: #fbbf24;
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 1.1rem;
    }
    .result-details pre {
        background-color: #222;
        padding: 1rem;
        border-radius: 6px;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 400px;
        overflow-y: auto;
    }
    .table-container {
        overflow-x: auto;
        border: 1px solid #444;
        border-radius: 6px;
    }
    .result-details table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 0;
        white-space: nowrap;
    }
    .result-details th,
    .result-details td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #444;
    }
    .result-details td:last-child,
    .result-details th:last-child {
        border-right: 0;
    }
    .result-details tr:last-child td {
        border-bottom: 0;
    }
    .result-details th {
        background-color: #2a2a2a;
        font-weight: bold;
        position: sticky;
        top: 0;
    }
    .result-details tr:nth-child(even) {
        background-color: #2e2e2e;
    }
    .td-breakable {
        white-space: pre-wrap;
        word-break: break-all;
    }

    /* --- Media Query para layout en pantallas anchas --- */
    @media (min-width: 768px) {
        .result-main-info {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 1.5rem;
        }
        .result-actions {
            margin-top: 0;
            flex-shrink: 0; /* Evita que los botones se encojan */
        }
    }
</style>
