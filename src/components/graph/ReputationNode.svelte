<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  export let data: { 
      label: string; 
      tokenId: string; 
  };
</script>

<div class="reputation-node">
  <Handle type="target" position={Position.Top} />
  <div class="node-header"><strong>{data.label}</strong></div>
  <div class="node-body">
      <p title={data.tokenId}>ID: {data.tokenId.substring(0, 10)}...</p>
  </div>
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
    dialog {
        max-width: 100rem;
        border-radius: 1em;
        padding: 1.5em;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        background-color: #2a2a2a;
        color: #f0f0f0;
        border: 1px solid #444;
    }

    dialog::backdrop {
        background: rgba(0, 0, 0, 0.7);
    }

    h2.modal-title {
        font-size: 1.5rem;
        margin: 0;
        color: #FBBF24;
    }

    hr {
        border: none;
        border-top: 1px solid #444;
        margin: 1em 0;
    }

    .mb-3 {
        margin-bottom: 1.5em;
    }

    .form-label {
        font-weight: bold;
        color: #ccc;
        display: block;
        margin-bottom: 0.5em;
    }

    .form-select,
    .form-control {
        width: 100%;
        padding: 0.75em;
        font-size: 1rem;
        border: 1px solid #666;
        border-radius: 6px;
        background-color: #333;
        color: #f0f0f0;
        box-sizing: border-box;
    }

    .modal-content {
        width: 90%;
        max-width: 900px;
        margin: auto;
    }

    .hash-pair {
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .tag {
        color: #aaa;
    }

    .form-select {
        height: 3em;
    }

    .required {
        color: #ff8a8a;
    }

    .row {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.5rem;
    }

    button {
        padding: 0.75em 1.5em;
        font-size: 1rem;
        background-color: #FBBF24;
        color: #fff;
        border: none;
        cursor: pointer;
        border-radius: 6px;
        font-weight: bold;
        transition: background-color 0.2s;
    }

    button:hover {
        background-color: #d87112;
    }

    .reputation-node { 
        width: 220px; 
        background: #3a3a3a; 
        border: 1px solid #666; 
        border-radius: 8px; 
        padding: 10px; 
        text-align: center; 
        color: white; 
    }
    .node-header { 
        font-size: 1rem; 
        padding-bottom: 5px; 
        margin-bottom: 5px; 
        border-bottom: 1px solid #555; 
    }
    .node-body p { 
        font-size: 0.8rem; 
        margin: 4px 0; 
        word-break: break-all; 
    }
</style>
