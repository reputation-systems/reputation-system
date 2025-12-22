<script lang="ts">
	import type { ReputationProof } from "$lib/ReputationProof";
	import ReputationCard from "./ReputationCard.svelte";

	export let proofs: Map<string, ReputationProof>;
</script>

<div class="explorer-container">
	<h2>Explorador de Pruebas</h2>
	{#if proofs.size > 0}
		{#each [...proofs] as [tokenId, proof] (tokenId)}
			<div class="proof-group">
				<h3 title={tokenId}>
					Token: {proof.tag || tokenId.substring(0, 20) + "..."}
				</h3>
				<div class="cards-grid">
					{#each proof.current_boxes as box (box.box_id)}
						<ReputationCard
							{box}
							totalAmount={proof.total_amount}
						/>
					{/each}
				</div>
			</div>
		{/each}
	{:else}
		<p class="no-proofs">
			No reputation proofs were found. Connect your wallet and make sure
			"Fetch All" is enabled to see the network's proofs.
		</p>
	{/if}
</div>

<style>
	.explorer-container {
		padding: 2rem;
		max-width: 1200px;
		margin: auto;
	}
	.explorer-container h2 {
		color: #fbbf24;
		text-align: center;
		font-size: 2rem;
		margin-bottom: 2rem;
	}
	.proof-group {
		margin-bottom: 3rem;
	}
	.proof-group h3 {
		border-bottom: 2px solid #444;
		padding-bottom: 0.5rem;
		word-break: break-all;
	}
	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-top: 1rem;
	}
	.no-proofs {
		text-align: center;
		padding: 2rem;
		background: #2a2a2a;
		border-radius: 8px;
	}
</style>
