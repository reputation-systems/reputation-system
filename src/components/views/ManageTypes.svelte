<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { digital_public_good_ergo_tree } from "$lib/envs";
    import { SString } from "$lib/utils";
    import {
        TransactionBuilder,
        OutputBuilder,
        SAFE_MIN_BOX_VALUE,
        RECOMMENDED_MIN_FEE_VALUE,
        SInt,
    } from "@fleet-sdk/core";
    import type { TypeNFT } from "$lib/ReputationProof";

    export let types: Map<string, TypeNFT>;

    const dispatch = createEventDispatcher();

    // --- Component State ---
    let isLoading = false; // Types are passed as prop, so initially not loading unless parent says so.
    let error = "";
    let isFormCollapsed = false;

    // --- Form State ---
    let newTypeName = "";
    let newTypeDescription = "";
    let newTypeSchema = "";
    let isReputationProof = false;
    let isCreating = false;
    let creationError = "";
    let creationSuccessMessage = "";

    // --- Logic for Collapsible Form ---
    const handleScroll = () => {
        // This logic is now correct.
        if (window.scrollY > 20) {
            isFormCollapsed = true;
        } else if (window.scrollY < 5) {
            isFormCollapsed = false;
        }
    };

    onMount(() => {
        window.addEventListener("scroll", handleScroll, { passive: true });
    });

    onDestroy(() => {
        window.removeEventListener("scroll", handleScroll);
    });

    // --- Handle Creation of a New Type NFT ---
    async function createNewType() {
        if (!newTypeName || isCreating) return;
        isCreating = true;
        creationError = "";
        creationSuccessMessage = "";

        try {
            // @ts-ignore - ergo is globally available
            const height = await ergo.get_current_height();
            // @ts-ignore
            const inputs = await ergo.get_utxos();
            // @ts-ignore
            const change_address = await ergo.get_change_address();
            const newTypeOutput = new OutputBuilder(
                SAFE_MIN_BOX_VALUE,
                digital_public_good_ergo_tree,
            );
            newTypeOutput.mintToken({ amount: 1n, decimals: 0 });

            newTypeOutput.setAdditionalRegisters({
                R4: SString(newTypeName),
                R5: SString(newTypeDescription),
                R6: SString(newTypeSchema),
                R7: SInt(isReputationProof ? 1 : 0),
            });
            const unsignedTransaction = await new TransactionBuilder(height)
                .from(inputs)
                .to(newTypeOutput)
                .sendChangeTo(change_address)
                .payFee(RECOMMENDED_MIN_FEE_VALUE)
                .build();
            const eip12UnsignedTransaction =
                await unsignedTransaction.toEIP12Object();

            // @ts-ignore
            const signedTransaction = await ergo.sign_tx(
                eip12UnsignedTransaction,
            );
            // @ts-ignore
            const txId = await ergo.submit_tx(signedTransaction);
            creationSuccessMessage = `Type NFT created successfully! Tx ID: ${txId}`;

            newTypeName = newTypeDescription = newTypeSchema = "";
            isReputationProof = false;

            // Notify parent to refresh types
            dispatch("refresh");
        } catch (e: any) {
            console.error("Type creation failed:", e);
            creationError =
                e.message || "An error occurred during transaction creation.";
            if (typeof e.info === "string") {
                creationError += `\nDetails: ${e.info}`;
            }
        } finally {
            isCreating = false;
        }
    }

    function copyToClipboard(text: string) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand("copy");
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
        document.body.removeChild(textArea);
    }
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

<div class="types-container">
    <div class="form-box" class:collapsed={isFormCollapsed}>
        <h2 class="form-title">
            Create a New Type
            <div
                class="info-tooltip"
                title="A Type NFT is a unique, immutable standard on the blockchain. It defines the rules and meaning for reputation boxes that reference it."
            >
                <i class="fas fa-question-circle"></i>
            </div>
        </h2>
        <p class="form-description">
            Define a new, immutable type standard for the ecosystem. This will
            mint a unique NFT.
        </p>
        <form class="form" on:submit|preventDefault={createNewType}>
            <div class="form-grid">
                <input
                    class="form-input full-width"
                    bind:value={newTypeName}
                    placeholder="Type Name (e.g., Web URL)"
                    required
                    disabled={isCreating}
                />
                <textarea
                    class="form-input"
                    bind:value={newTypeDescription}
                    placeholder="Short Description..."
                    required
                    rows="2"
                    disabled={isCreating}
                ></textarea>
                <input
                    class="form-input"
                    bind:value={newTypeSchema}
                    placeholder="Schema URI (optional, e.g., https://...)"
                    disabled={isCreating}
                />
                <div
                    class="info-tooltip"
                    title="The Schema URI links to a machine-readable definition (like JSON-LD or IPFS) of the data structure expected in boxes of this type."
                >
                    <i class="fas fa-question-circle"></i>
                </div>
            </div>

            <div class="checkbox-container">
                <input
                    type="checkbox"
                    id="is-reputation-proof"
                    class="form-checkbox"
                    bind:checked={isReputationProof}
                    disabled={isCreating}
                />
                <label for="is-reputation-proof"
                    >Is this type for a Reputation Proof?
                    <div
                        class="info-tooltip"
                        title="If checked, this type can be used to create reputation boxes (opinions/claims). If unchecked, it's a general-purpose standard NFT."
                    >
                        <i class="fas fa-question-circle"></i>
                    </div>
                </label>
            </div>

            <button class="form-button" type="submit" disabled={isCreating}>
                {#if isCreating}Creating...{:else}Create Type NFT{/if}
            </button>

            {#if creationError}
                <p class="error-message">{creationError}</p>
            {/if}
            {#if creationSuccessMessage}
                <p class="success-message">{creationSuccessMessage}</p>
            {/if}
        </form>
    </div>

    <div class="list-area">
        <h3 class="list-title">Existing Types ({types.size})</h3>
        <div class="list-container">
            {#if isLoading}
                <div class="loader"></div>
                <p>Loading on-chain types...</p>
            {:else if error}
                <p class="error-message">{error}</p>
            {:else if types.size > 0}
                <ul class="types-list">
                    {#each Array.from(types.values()) as type (type.tokenId)}
                        <li class="type-item">
                            <div class="type-header">
                                <span class="type-name">{type.typeName}</span>
                                <div class="version-wrapper">
                                    {#if type.isRepProof}
                                        <span class="proof-tag"
                                            >Reputation Proof</span
                                        >
                                    {/if}
                                </div>
                            </div>
                            <p class="type-description">{type.description}</p>
                            {#if type.schemaURI}
                                <p class="type-schema">
                                    Schema: <a
                                        href={type.schemaURI}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        >{type.schemaURI}</a
                                    >
                                </p>
                            {/if}
                            <div class="type-footer">
                                <span class="type-id" title={type.tokenId}
                                    >ID: {type.tokenId}</span
                                >
                                <button
                                    class="copy-button"
                                    on:click={() =>
                                        copyToClipboard(type.tokenId)}
                                    title="Copy Token ID"
                                >
                                    <i class="far fa-copy"></i>
                                </button>
                            </div>
                        </li>
                    {/each}
                </ul>
            {:else}
                <div class="no-results-box">
                    <p>No types found.</p>
                    <span class="no-results-hint"
                        >Be the first to create one!</span
                    >
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .success-message {
        color: #a7f3d0;
        background-color: rgba(52, 211, 153, 0.1);
        border: 1px solid #34d399;
        padding: 0.75rem;
        border-radius: 6px;
        margin-top: 1rem;
        font-family: monospace;
        word-break: break-all;
    }
    .info-tooltip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fbbf24;
        font-size: 0.9rem;
        cursor: help;
        margin-left: 0.5rem;
        vertical-align: middle;
        transition: transform 0.2s ease;
    }
    .info-tooltip:hover {
        transform: scale(1.2);
    }
    .types-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem 1rem;
        gap: 2rem;
    }

    .form-box {
        width: 100%;
        max-width: 800px;

        /* --- NUEVA ESTRATEGIA DE POSICIONAMIENTO --- */
        position: sticky;
        top: 70px; /* Se pega 70px desde arriba (para dejar espacio a la barra de nav) */
        z-index: 10;

        /* --- NUEVA ESTRATEGIA DE ANIMACIÓN --- */
        transition:
            transform 0.5s ease-in-out,
            opacity 0.5s ease-in-out;

        /* Estilos visuales (sin cambios) */
        padding: 2rem;
        border-radius: 12px;
        background-color: #2a2a2a;
        border: 1px solid #444;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }

    .form-box.collapsed {
        /* Lo deslizamos hacia arriba hasta ocultarlo */
        transform: translateY(-120%);
        opacity: 0;
        pointer-events: none; /* Evita que se pueda interactuar con el formulario oculto */
    }

    .form-title {
        font-size: 1.75rem;
        margin: 0 0 0.5rem 0;
        text-align: center;
        color: #fbbf24;
    }
    .form-description {
        margin: 0 0 1.5rem 0;
        color: #ccc;
        font-size: 0.95rem;
        text-align: center;
    }
    .form-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    .form-input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.75rem;
        font-size: 1rem;
        border-radius: 6px;
        border: 1px solid #666;
        background-color: #333;
        color: #f0f0f0;
    }
    .form-input:disabled {
        background-color: #444;
        cursor: not-allowed;
    }
    textarea.form-input {
        resize: vertical;
    }
    .checkbox-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
        color: #ccc;
    }
    .form-checkbox {
        width: 1.15rem;
        height: 1.15rem;
        accent-color: #fbbf24;
        cursor: pointer;
    }
    .form-button {
        width: 100%;
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        background-color: #fbbf24;
        color: #1a1a1a;
        font-size: 1.1rem;
    }
    .form-button:disabled {
        background-color: #555;
        color: #aaa;
        cursor: not-allowed;
    }
    .list-area {
        width: 100%;
        max-width: 1100px;
        text-align: center;
    }
    .list-title {
        font-size: 1.5rem;
        color: #f0f0f0;
        border-bottom: 1px solid #444;
        padding-bottom: 0.5rem;
        margin-bottom: 1.5rem;
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
    .types-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .type-item {
        background-color: #333;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #444;
        text-align: left;
    }
    .type-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0.5rem;
    }
    .type-name {
        font-size: 1.25rem;
        font-weight: bold;
        color: #fbbf24;
    }
    .type-description {
        color: #ccc;
        margin: 0.5rem 0 1rem 0;
        font-style: italic;
    }
    .type-schema {
        font-size: 0.9rem;
        margin: 0.5rem 0 1rem 0;
    }
    .type-schema a {
        color: #fbbf24;
        text-decoration: none;
    }
    .type-schema a:hover {
        text-decoration: underline;
    }
    .type-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: #2a2a2a;
        padding: 0.5rem 1rem;
        margin: 1rem -1.5rem -1.5rem -1.5rem;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        border-top: 1px solid #444;
    }
    .type-id {
        font-family: monospace;
        font-size: 0.85rem;
        color: #aaa;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 20ch;
    }
    .copy-button {
        background: none;
        border: none;
        color: #ccc;
        cursor: pointer;
        font-size: 1rem;
    }
    .copy-button:hover {
        color: #fbbf24;
    }
    .error-message {
        color: #ff6b6b;
        background-color: rgba(255, 107, 107, 0.1);
        border: 1px solid #ff6b6b;
        padding: 0.75rem;
        border-radius: 6px;
        margin-top: 1rem;
    }
    .no-results-box {
        padding: 2rem;
        background-color: #2a2a2a;
        border-radius: 8px;
    }
    .version-wrapper {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    .proof-tag {
        background-color: #8b5cf6a8;
        color: white;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        line-height: 1.2;
    }
</style>
