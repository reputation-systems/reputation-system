<script lang="ts">
    export let address: string;
    export let network: string;
    export let fetchAll: boolean;
    export let computeDeepLevel: number;

    let copyButtonText = "Copy";
    function copyAddress() {
        const textToCopy = address;
        if (!textToCopy) return;

        const textArea = document.createElement("textarea");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand("copy");
            copyButtonText = "Copied!";
        } catch (err) {
            console.error("Fallback: Oops, unable to copy", err);
            copyButtonText = "Failed!";
        }
        document.body.removeChild(textArea);

        setTimeout(() => {
            copyButtonText = "Copy";
        }, 2000);
    }
</script>

<div class="settings-container">
    <div class="settings-box">
        <div class="header">
            <h2 class="settings-title">Settings</h2>
            <p class="settings-description">
                Manage network settings and application preferences.
            </p>
        </div>

        <div class="settings-section">
            <h3 class="section-title">Network Configuration</h3>
            <div class="setting-item">
                <label for="address-display">Your Address</label>
                <div class="input-group">
                    <input
                        id="address-display"
                        type="text"
                        readonly
                        value={address}
                        title={address}
                    />
                    <button class="copy-button" on:click={copyAddress}
                        >{copyButtonText}</button
                    >
                </div>
            </div>
            <div class="setting-item">
                <label for="network-select">Current Network</label>
                <div class="input-group">
                    <select id="network-select" disabled bind:value={network}>
                        <option value={"ergo"}>Ergo Mainnet</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="settings-section">
            <h3 class="section-title">Data & Performance</h3>

            <div class="setting-item">
                <label
                    for="fetch-all-check"
                    title="Load all proofs from the entire network on startup. May be slow."
                >
                    Fetch all network proofs
                </label>
                <label class="switch">
                    <input
                        id="fetch-all-check"
                        type="checkbox"
                        bind:checked={fetchAll}
                    />
                    <span class="slider"></span>
                </label>
            </div>
            <div class="setting-item">
                <label
                    for="deep-level-input"
                    title="Sets how many levels deep the graph calculation will go. Higher values are more accurate but slower."
                >
                    Graph Compute Depth
                </label>
                <input
                    id="deep-level-input"
                    class="number-input"
                    type="number"
                    min="0"
                    max="10"
                    bind:value={computeDeepLevel}
                />
            </div>
        </div>
    </div>
</div>

<style>
    .settings-container {
        display: flex;
        justify-content: center;
        padding: 2rem 1rem;
    }
    .settings-box {
        width: 100%;
        max-width: 700px;
        padding: 2rem;
        border-radius: 12px;
        background-color: #2a2a2a;
        border: 1px solid #444;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
    .header {
        text-align: center;
        margin-bottom: 2rem;
        border-bottom: 1px solid #444;
        padding-bottom: 1.5rem;
    }
    .settings-title {
        font-size: 2rem;
        margin: 0 0 0.5rem 0;
        color: #fbbf24;
        font-weight: 600;
    }
    .settings-description {
        margin: 0;
        color: #b0b0b0;
        font-size: 1rem;
    }
    .settings-section {
        margin-bottom: 2.5rem;
    }
    .settings-section:last-child {
        margin-bottom: 0;
    }
    .setting-item {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 1.5rem;
        padding: 1rem 0;
        border-bottom: 1px solid #444;
    }
    .settings-section .setting-item:last-child {
        border-bottom: none;
    }
    .setting-item label {
        color: #f0f0f0;
    }
    .setting-item input[type="text"],
    .setting-item select,
    .setting-item .number-input {
        padding: 0.75rem;
        font-size: 0.9rem;
        border: 1px solid #666;
        background-color: #333;
        color: #f0f0f0;
        width: 100%;
        border-radius: 6px;
        box-sizing: border-box;
    }
    .copy-button {
        padding: 0.75rem 1rem;
        border: 1px solid #fbbf24;
        border-left: none;
        background-color: #fbbf24;
        color: #2a2a2a;
        border-top-right-radius: 6px;
        border-bottom-right-radius: 6px;
        cursor: pointer;
        font-weight: bold;
        transition:
            background-color 0.2s,
            border-color 0.2s;
    }
    .copy-button:hover {
        background-color: #fde047;
        border-color: #fde047;
    }
    .input-group {
        display: flex;
        width: 100%;
    }
    .input-group input[type="text"] {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
    }
    .switch {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 26px;
    }
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #555;
        transition: 0.3s;
        border-radius: 26px;
    }
    .slider:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
    }
    input:checked + .slider {
        background-color: #fbbf24;
    }
    input:focus + .slider {
        box-shadow: 0 0 2px #fbbf24;
    }
    input:checked + .slider:before {
        transform: translateX(22px);
    }
</style>
