<script lang="ts">
    import CreateProofWizard from "./CreateProofWizard.svelte";
    import UpdateProofWizard from "./UpdateProofWizard.svelte";
    import type { ReputationProof, TypeNFT } from "$lib/ReputationProof";

    export let proofs: Map<string, ReputationProof>;
    export let connected: boolean;
    export let types: Map<string, TypeNFT>;

    let mode: "create" | "update" = "create";
</script>

<div class="submit-container">
    <div class="tabs">
        <button
            class="tab-button"
            class:active={mode === "create"}
            on:click={() => (mode = "create")}
        >
            <i class="fas fa-plus-circle"></i> Create New Proof
        </button>
        <button
            class="tab-button"
            class:active={mode === "update"}
            on:click={() => (mode = "update")}
        >
            <i class="fas fa-edit"></i> Update Existing Proof
        </button>
    </div>

    <div class="tab-content">
        {#if mode === "create"}
            <CreateProofWizard {connected} {types} />
        {:else}
            <UpdateProofWizard {proofs} {connected} />
        {/if}
    </div>
</div>

<style>
    .submit-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }

    .tabs {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        border-bottom: 2px solid hsl(var(--border));
    }

    .tab-button {
        background: none;
        border: none;
        padding: 1rem 1.5rem;
        font-size: 1.1rem;
        color: hsl(var(--muted-foreground));
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
    }

    .tab-button:hover {
        color: hsl(var(--primary));
    }

    .tab-button.active {
        color: hsl(var(--primary));
        border-bottom-color: hsl(var(--primary));
        font-weight: 600;
    }

    .tab-content {
        background: hsl(var(--card));
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        border: 1px solid hsl(var(--border));
    }

    @media (max-width: 600px) {
        .submit-container {
            padding: 1rem;
        }

        .tabs {
            flex-direction: column;
            gap: 0;
        }

        .tab-button {
            width: 100%;
            justify-content: center;
            border-bottom: 1px solid hsl(var(--border));
        }

        .tab-button.active {
            border-bottom-color: hsl(var(--primary));
        }
    }
</style>
