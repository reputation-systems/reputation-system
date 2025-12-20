<script lang="ts">
    import CreateProofWizard from './CreateProofWizard.svelte';
    import UpdateProofWizard from './UpdateProofWizard.svelte';

    let mode: 'select' | 'create' | 'update' = 'select';

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            mode = 'select';
        }
    }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="container">
    {#if mode === 'select'}
        <div class="selection-container">
            <div class="intro-text">
                <h1 class="title">Submit a Reputation Proof</h1>
                <p class="subtitle">Choose whether to mint a new proof from scratch or add your opinion to a proof you already own.</p>
            </div>
            <div class="button-islands">
                <button class="island-button" on:click={() => mode = 'create'}>
                    <span class="button-icon">✨</span>
                    <h2 class="button-title">Create a New Proof</h2>
                    <p class="button-description">Mint a completely new proof. The first opinion will be positive and represent the total initial supply.</p>
                </button>
                <button class="island-button" on:click={() => mode = 'update'}>
                    <span class="button-icon">✏️</span>
                    <h2 class="button-title">Update an Existing Proof</h2>
                    <p class="button-description">Select one of your proofs to add a new opinion, point to another object, and assign it a specific weight.</p>
                </button>
            </div>
        </div>
    {:else}
        <div class="wizard-wrapper">
            <button class="back-button" on:click={() => mode = 'select'}>
                &larr; Back to selection
            </button>
            
            {#if mode === 'create'}
                <CreateProofWizard />
            {:else if mode === 'update'}
                <UpdateProofWizard />
            {/if}
        </div>
    {/if}
</div>

<style>
    .container {
        width: 100%;
        padding: 2rem;
        box-sizing: border-box;
    }
    .selection-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        max-width: 900px;
        margin: 4rem auto;
        gap: 3rem;
    }
    .intro-text {
        text-align: center;
    }
    .title {
        font-size: 2.5rem;
        color: #FBBF24;
        margin-bottom: 0.5rem;
    }
    .subtitle {
        font-size: 1.1rem;
        color: #b0b0b0;
        max-width: 600px;
    }
    .button-islands {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        width: 100%;
    }
    .island-button {
        background-color: #2a2a2a;
        border: 1px solid #444;
        border-radius: 12px;
        padding: 2rem;
        text-align: left;
        color: #f0f0f0;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        width: 100%;
    }
    .island-button:hover {
        border-color: #FBBF24;
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }
    .button-icon {
        font-size: 2rem;
        display: block;
        margin-bottom: 1rem;
    }
    .button-title {
        margin: 0;
        font-size: 1.5rem;
        color: #FBBF24;
    }
    .button-description {
        margin: 0.5rem 0 0;
        color: #b0b0b0;
        font-size: 0.95rem;
        line-height: 1.5;
    }

    .wizard-wrapper {
        position: relative;
        width: 100%;
        max-width: 1200px;
        margin: 2rem auto;
        background: #2a2a2a;
        padding: 2.5rem 3rem;
        border-radius: 12px;
        border: 1px solid #444;

        min-height: 650px;
        display: flex;
        flex-direction: column;
    }

    .back-button {
        position: absolute;
        top: 20px;
        left: 30px;
        background: none;
        border: none;
        color: #aaa;
        padding: 0.5rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.9rem;
    }
    .back-button:hover {
        background-color: #333;
        color: #fff;
    }
</style>