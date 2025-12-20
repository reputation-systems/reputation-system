<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let objectId: string;
  export let onClick: () => void; // Para cerrar el menú
  export let top: number | undefined = undefined;
  export let left: number | undefined = undefined;
  export let right: number | undefined = undefined;
  export let bottom: number | undefined = undefined;

  const dispatch = createEventDispatcher();

  // Ahora esta función solo despacha un evento hacia el padre
  function showDetails() {
    dispatch('showDetails', { objectId: objectId });
  }

  const menuItems = [
    { name: "openInfo", onClick: showDetails, displayText: "Details", class: "fa-solid fa-info" },
  ];

  function getContextMenuDimension(node: HTMLElement) {
    if (right !== undefined) node.style.left = `${window.innerWidth - node.offsetWidth - right}px`;
    if (bottom !== undefined) node.style.top = `${window.innerHeight - node.offsetHeight - bottom}px`;
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css"/>
</svelte:head>

{#if true} <nav use:getContextMenuDimension style:top="{top ? `${top}px` : ''}" style:left="{left ? `${left}px` : ''}" style:right="{right ? `${right}px` : ''}" style:bottom="{bottom ? `${bottom}px` : ''}" style="position: fixed; z-index: 2000;">
  <div class="navbar">
    <div class="info-block">
      <p>
          <span class="label">Object ID:</span>
          <!-- svelte-ignore a11y-missing-attribute -->
          <a title={objectId}>{objectId.length > 20 ? `${objectId.slice(0, 20)}...` : objectId}</a>
      </p>
    </div>  
    <ul>
      {#each menuItems as item}
        <li>
            <button on:click={() => { item.onClick(); onClick(); }}>
                <i class={item.class}></i>{item.displayText}
            </button>
        </li>
      {/each}
    </ul>
  </div>
</nav>
{/if}

<style>
    .navbar {
        display: inline-flex;
        border: 1px #555 solid;
        width: 250px;
        background-color: #2a2a2a;
        border-radius: 10px;
        overflow: hidden;
        flex-direction: column;
        color: #f0f0f0;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }
    .info-block {
        padding: 10px;
        margin: 6px;
        margin-bottom: 0;
        background-color: #333;
        border-bottom: 1px solid #444;
        border-radius: 5px 5px 0 0;
    }
    .info-block p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.6;
    }
    .label {
        font-weight: bold;
        color: #aaa;
    }
    .info-block a {
        color: #ccc;
        text-decoration: none;
        word-break: break-all;
    }

    .navbar ul {
        margin: 6px;
        padding: 0;
    }
    ul li {
        display: block;
        list-style-type: none;
    }
    ul li button {
        font-size: 1rem;
        color: #f0f0f0;
        width: 100%;
        padding: 0;
        height: 32px;
        text-align: left;
        border: 0;
        background-color: transparent;
        border-radius: 5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: background-color 0.2s, color 0.2s;
    }
    ul li button:hover {
        background-color: #FBBF24;
        color: white;
    }
    ul li button i {
        padding: 0 15px 0 10px;
        width: 18px;
        text-align: center;
        margin-right: 5px;
    }
</style>