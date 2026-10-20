<!-- Archivo de prueba del tema: Vue. -->
<script setup lang="ts">
import { computed, ref } from 'vue';

interface ObjectOfPower {
  code: string;
  threat: number;
}

const props = defineProps<{ items: ObjectOfPower[] }>();
const filter = ref(2);
const dangerous = computed(() => props.items.filter((i) => i.threat > filter.value));
</script>

<template>
  <section class="registry">
    <h1>{{ dangerous.length }} objetos peligrosos</h1>
    <input v-model.number="filter" type="number" :min="0" />
    <ul>
      <li v-for="item in dangerous" :key="item.code" :class="{ high: item.threat > 5 }" @click="$emit('contain', item)">
        {{ item.code }}
      </li>
    </ul>
    <p v-if="!dangerous.length">Todo contenido</p>
  </section>
</template>

<style scoped>
.registry .high {
  color: #e0352b;
}
</style>
