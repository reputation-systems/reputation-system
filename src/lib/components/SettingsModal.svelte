<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import {
        web_explorer_uri_tx,
        web_explorer_uri_token,
        web_explorer_uri_addr,
    } from "$lib/common/store";
    import {
        DEFAULT_EXPLORER_URI_TX,
        DEFAULT_EXPLORER_URI_TOKEN,
        DEFAULT_EXPLORER_URI_ADDR,
    } from "$lib/common/constants";
    import { Settings, RotateCcw } from "lucide-svelte";

    export let open = false;

    // Local copies for editing
    let txUri = $web_explorer_uri_tx;
    let tokenUri = $web_explorer_uri_token;
    let addrUri = $web_explorer_uri_addr;

    // Sync with stores when they change
    $: txUri = $web_explorer_uri_tx;
    $: tokenUri = $web_explorer_uri_token;
    $: addrUri = $web_explorer_uri_addr;

    function saveSettings() {
        web_explorer_uri_tx.set(txUri);
        web_explorer_uri_token.set(tokenUri);
        web_explorer_uri_addr.set(addrUri);
        open = false;
    }

    function resetToDefaults() {
        txUri = DEFAULT_EXPLORER_URI_TX;
        tokenUri = DEFAULT_EXPLORER_URI_TOKEN;
        addrUri = DEFAULT_EXPLORER_URI_ADDR;
    }

    function cancel() {
        // Reset to current store values
        txUri = $web_explorer_uri_tx;
        tokenUri = $web_explorer_uri_token;
        addrUri = $web_explorer_uri_addr;
        open = false;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[600px]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <Settings class="h-5 w-5" />
                Web Explorer Configuration
            </Dialog.Title>
            <Dialog.Description>
                Configure the blockchain explorer URLs used to view
                transactions, tokens, and addresses.
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-4">
            <div class="space-y-2">
                <Label for="tx-uri">Transaction URL</Label>
                <Input
                    id="tx-uri"
                    type="url"
                    bind:value={txUri}
                    placeholder={DEFAULT_EXPLORER_URI_TX}
                />
                <p class="text-xs text-muted-foreground">
                    Example: {DEFAULT_EXPLORER_URI_TX}
                </p>
            </div>

            <div class="space-y-2">
                <Label for="token-uri">Token URL</Label>
                <Input
                    id="token-uri"
                    type="url"
                    bind:value={tokenUri}
                    placeholder={DEFAULT_EXPLORER_URI_TOKEN}
                />
                <p class="text-xs text-muted-foreground">
                    Example: {DEFAULT_EXPLORER_URI_TOKEN}
                </p>
            </div>

            <div class="space-y-2">
                <Label for="addr-uri">Address URL</Label>
                <Input
                    id="addr-uri"
                    type="url"
                    bind:value={addrUri}
                    placeholder={DEFAULT_EXPLORER_URI_ADDR}
                />
                <p class="text-xs text-muted-foreground">
                    Example: {DEFAULT_EXPLORER_URI_ADDR}
                </p>
            </div>

            <div class="pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    on:click={resetToDefaults}
                    class="w-full"
                >
                    <RotateCcw class="h-4 w-4 mr-2" />
                    Restore Default Values
                </Button>
            </div>
        </div>

        <Dialog.Footer class="flex gap-2">
            <Button variant="outline" on:click={cancel}>Cancel</Button>
            <Button on:click={saveSettings}>Save Configuration</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<style>
    :global(.settings-modal) {
        max-height: 90vh;
        overflow-y: auto;
    }
</style>
