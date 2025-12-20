<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { address, proofs } from '$lib/store';

	const dispatch = createEventDispatcher();

	$: userProofCount = $proofs.size;

	function handleNavigation(path: string) {
		dispatch('navigate', path);
	}
</script>

<div class="dashboard-container">
	<h1 class="dashboard-title">Dashboard de Reputación</h1>
	<p class="dashboard-subtitle">Gestiona tu confianza en el ecosistema descentralizado.</p>

	<div class="main-cards-container">
		<!-- Tarjeta de Reputación del Usuario -->
		<div class="dashboard-card my-reputation-card">
			<h2>Mi Reputación</h2>
			<div class="reputation-details">
				<span class="detail-label">Tu Dirección:</span>
				<span class="detail-value address">{$address}</span>
				<span class="detail-label">Pruebas Emitidas:</span>
				<span class="detail-value">{userProofCount}</span>
			</div>
		</div>

		<!-- Tarjeta de Acciones Rápidas -->
		<div class="dashboard-card quick-actions-card">
            <h2>Quick Actions</h2>
            <div class="actions-grid">
                <button class="action-button" on:click={() => handleNavigation('create-proof')}>
                    <span class="icon">➕</span>
                    <span>Create Proof</span>
                </button>
                <button class="action-button" on:click={() => handleNavigation('explore')}>
                    <span class="icon">🔍</span>
                    <span>Explore Proofs</span>
                </button>
                <button class="action-button" on:click={() => handleNavigation('calculate')}>
                    <span class="icon">🧮</span>
                    <span>Calculate Reputation</span>
                </button>
		</div>
	</div>
</div>

<style>
    .dashboard-container { padding: 2rem; max-width: 1200px; margin: auto; }
    .dashboard-title { font-size: 2.5rem; text-align: center; color: #FBBF24; }
    .dashboard-subtitle { text-align: center; font-size: 1.2rem; margin-bottom: 3rem; color: #b0b0b0; }
    .main-cards-container { display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap; }
    .dashboard-card { background: #2a2a2a; border: 1px solid #444; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); }
    .dashboard-card h2 { margin-top: 0; border-bottom: 2px solid #FBBF24; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
    .my-reputation-card { flex-basis: 400px; }
    .reputation-details { display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: center; }
    .detail-label { font-weight: bold; }
    .detail-value { background: #333; padding: 0.25rem 0.5rem; border-radius: 6px; font-family: monospace; word-break: break-all; }
    .quick-actions-card { flex-grow: 1; max-width: 500px; }
    .actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
    .action-button { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #333; border: 1px solid #555; border-radius: 8px; padding: 1.5rem 1rem; text-align: center; color: white; cursor: pointer; transition: background-color 0.2s, border-color 0.2s; }
    .action-button:hover { background-color: #444; border-color: #FBBF24; }
    .action-button .icon { font-size: 2rem; }
    .action-button span { font-weight: bold; margin-top: 0.5rem; }
</style>
