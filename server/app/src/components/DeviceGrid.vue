<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import usePromiseAuth from 'composables/usePromiseAuth';
import useDeviceStatus from 'composables/useDeviceStatus';

import { Address } from 'types/index';

export type Cell = {
  address: string | null;
  x: number;
  y: number;
  selected: boolean;
  disabled?: boolean;
  name: string;
  shortName: string;
  unlocked: boolean;
};

const props = withDefaults(
  defineProps<{
    gridSize?: [number, number];
    disableUsed?: boolean;
    checkAuth?: boolean;
    statusInterval?: number;
    tooltips?: boolean;
  }>(),
  {
    gridSize: () => [12, 12],
    disableUsed: false,
    checkAuth: false,
    statusInterval: 0,
    tooltips: false,
  }
);

const position = defineModel<[number, number] | null>('position', { default: null });
const emit = defineEmits<{
  blur: [cell: Cell];
  click: [item: Address | null];
  'lock-change': [currentUnlocks: string[]];
  'time-change': [address: Address[]];
}>();

const auth = usePromiseAuth<Address[]>({
  params: ['/user'],
  onPromise: (v) => {
    currentAddresses.value = v;
  },
  checkAuth: props.checkAuth,
});

const grid = ref<Cell[]>([]);
const currentAddresses = ref<Address[]>([]);

const gridSize = computed(() => ({
  x: Math.max(...grid.value.map((cell) => cell.x + 1), 1),
  y: Math.max(...grid.value.map((cell) => cell.y + 1), 1),
}));

useDeviceStatus(null, {
  statusInterval: props.statusInterval,
  startOnMounted: props.statusInterval > 0,
  onMounted: auth.get,
  filter: (address, isLocked) => {
    grid.value = grid.value.map((cell) => {
      if (address !== null && cell.address === address) {
        return {
          ...cell,
          unlocked: !isLocked,
        };
      }
      return cell;
    });
  },
});

function createGrid(gridX: number, gridY: number) {
  const g: Cell[] = [];
  for (let x = 0; x < Math.max(gridX, 1); x++) {
    for (let y = 0; y < Math.max(gridY, 1); y++) {
      const currentCell = currentAddresses.value.find((cell) => cell.position[0] === x && cell.position[1] === y);
      g.push({
        x,
        y,
        selected: false,
        disabled: props.disableUsed ? !!currentCell : !currentCell,
        name: currentCell?.name ?? '',
        shortName: currentCell?.shortName ?? currentCell?.name ?? '',
        address: currentCell?.address ?? null,
        unlocked: false,
      });
    }
  }
  const enabledCells = g.filter((cell) => !cell.disabled);
  const disabledCells = g.filter((cell) => cell.disabled);

  const cells = [
    ...disabledCells,
    ...enabledCells.map((cell, index) => {
      if (index === 0 && position.value !== null) {
        position.value = [cell.x, cell.y];
        return { ...cell, selected: index === 0 };
      }
      return cell;
    }),
  ];

  grid.value = cells;
}
function resetPosition() {
  position.value = null;
}

watch(
  [() => props.gridSize, currentAddresses],
  ([gridSize]) => {
    createGrid(...gridSize);
  },
  { immediate: true }
);

watch(
  () => grid.value.filter((cell) => cell.unlocked),
  (cells) => {
    emit(
      'lock-change',
      cells.map((cell) => cell.address)
    );
  }
);
defineExpose({ auth, gridSize, resetPosition });
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
          emit('click', currentAddresses.find((cell) => cell.address === item.address) ?? null);
          position = [item.x, item.y];
        }
      "
      :style="`--x: ${item.x + 1}; --y: ${item.y + 1}`"
      :data-selected="position && grid[index].x === position[0] && grid[index].y === position[1]"
      :data-unlocked="item.unlocked"
      :disabled="item.disabled"
      @blur="() => emit('blur', item)"
      :tooltip="props.tooltips"
      :aria-label="`${item.name} (${item.shortName})`"
      tooltip-fixed>
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
      border: 2px solid var(--bs-primary);
      &[data-unlocked='true'] {
        border: 2px solid var(--bs-success-border-subtle);
      }
    }
    &[data-unlocked='true'] {
      background-color: var(--bs-success);
      color: var(--bs-body-bg);
    }
    &:disabled {
      background-color: var(--bs-tertiary-bg);
    }
  }
}
</style>
