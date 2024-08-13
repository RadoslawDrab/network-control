<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import usePromiseAuth from 'composables/usePromiseAuth';

import { CellSettings } from './DeviceFormOffcanvas.vue';
import { Address } from 'types/index';

type Cell = { address: string | null; x: number; y: number; selected: boolean; disabled?: boolean; shortName: string };

const props = withDefaults(defineProps<{ gridSize?: [number, number]; disableUsed?: boolean }>(), {
  gridSize: () => [12, 12],
  disableUsed: false,
});

const position = defineModel<[number, number]>('position', { default: [0, 0] });
const emit = defineEmits<{ blur: [cell: Cell]; click: [item: Address | null] }>();

const auth = usePromiseAuth<Address[]>({
  params: ['/user'],
  onPromise: (v) => {
    currentCells.value = v;
  },
});

const grid = ref<Cell[]>([]);
const currentCells = ref<CellSettings[]>([]);

const gridSize = computed(() => ({
  x: Math.max(...grid.value.map((cell) => cell.x + 1), 1),
  y: Math.max(...grid.value.map((cell) => cell.y + 1), 1),
}));

defineExpose({ auth, gridSize });

function createGrid(gridX: number, gridY: number) {
  const g: Cell[] = [];
  for (let x = 0; x < Math.max(gridX, 1); x++) {
    for (let y = 0; y < Math.max(gridY, 1); y++) {
      const currentCell = currentCells.value.find((cell) => cell.position[0] === x && cell.position[1] === y);
      g.push({
        x,
        y,
        selected: false,
        disabled: props.disableUsed ? !!currentCell : !currentCell,
        shortName: currentCell?.shortName ?? currentCell?.name ?? '',
        address: currentCell?.address ?? null,
      });
    }
  }
  const enabledCells = g.filter((cell) => !cell.disabled);
  const disabledCells = g.filter((cell) => cell.disabled);

  const cells = [
    ...disabledCells,
    ...enabledCells.map((cell, index) => {
      if (index === 0) {
        position.value = [cell.x, cell.y];
        return { ...cell, selected: index === 0 };
      }
      return cell;
    }),
  ];

  grid.value = cells;
}

watch(
  [() => props.gridSize, currentCells],
  ([gridSize]) => {
    createGrid(...gridSize);
  },
  { immediate: true }
);

onMounted(async () => await auth.get());
</script>
<template>
  <div class="grid" :style="`--size-x: ${gridSize.x}; --size-y: ${gridSize.y}`">
    <button
      class="item"
      type="button"
      v-for="(item, index) in grid"
      :key="`${item.x}-${item.y}`"
      @click="
        () => {
          emit('click', currentCells.find((cell) => cell.address === item.address) ?? null);
          position = [item.x, item.y];
        }
      "
      :style="`--x: ${item.x + 1}; --y: ${item.y + 1}`"
      :data-selected="position && grid[index].x === position[0] && grid[index].y === position[1]"
      :disabled="item.disabled"
      @blur="() => emit('blur', item)">
      {{ item.shortName.slice(0, 4) }}
    </button>
  </div>
</template>
<style scoped lang="scss">
.grid {
  border: 1px solid var(--bs-secondary-bg);
  margin-top: 0.2em;
  width: fit-content;
  display: grid;
  grid-template-columns: repeat(var(--size-x), 1fr);
  grid-template-rows: repeat(var(--size-y), 1fr);
  justify-items: center;
  justify-content: center;
  .item {
    margin: 0;
    width: 2rem;
    aspect-ratio: 1 / 1;
    border: inherit;
    background-color: transparent;
    grid-column: var(--x);
    grid-row: var(--y);

    text-align: center;
    padding: 0.2em;
    font-size: 0.6rem;
    overflow: hidden;

    &[data-selected='true'] {
      background-color: var(--bs-primary);
      color: var(--bs-body-bg);
    }
    &:disabled {
      background-color: var(--bs-tertiary-bg);
    }
  }
}
</style>
