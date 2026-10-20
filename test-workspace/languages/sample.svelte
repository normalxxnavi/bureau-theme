<!-- Archivo de prueba del tema: Svelte. -->
<script lang="ts">
  export let items: { code: string; threat: number }[] = [];
  let filter = 2;
  $: dangerous = items.filter((i) => i.threat > filter);

  function contain(code: string) {
    items = items.filter((i) => i.code !== code);
  }
</script>

<section class="registry">
  <h1>{dangerous.length} objetos peligrosos</h1>
  <input type="number" bind:value={filter} min="0" />
  {#each dangerous as item (item.code)}
    <button class:high={item.threat > 5} on:click={() => contain(item.code)}>
      {item.code}
    </button>
  {:else}
    <p>Todo contenido</p>
  {/each}
  {#if filter > 5}
    <p>{@html '<strong>Alerta</strong>'}</p>
  {/if}
</section>

<style>
  .high {
    color: #e0352b;
  }
</style>
