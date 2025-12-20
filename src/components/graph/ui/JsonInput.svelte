<script>
    export let value = {}; // Bound property for the JSON

    let jsonInput = JSON.stringify(value, null, 2); // Initial JSON string
    let error = null; // Error state

    const handleInputChange = () => {
        try {
            const parsed = JSON.parse(jsonInput); // Attempt to parse the JSON
            error = null; // No errors
            value = parsed; // Update the bound value
        } catch (err) {
            error = 'Invalid JSON'; // Handle errors
        }
    };
</script>

<div>
    <textarea
        class="form-control"
        bind:value={jsonInput}
        on:input={handleInputChange}
        placeholder="Enter a valid JSON here..."
        style="width: 100%;"></textarea>
    {#if error}
        <small class="text-danger">{error}</small>
    {/if}
</div>