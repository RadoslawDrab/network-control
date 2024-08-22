<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import usePromiseAuth from 'composables/usePromiseAuth';
import useDeviceStatus from 'composables/useDeviceStatus';

import { Device } from 'types/index';

export type Cell = {
  address: string | null;
  x: number;
  y: number;
  selected: boolean;
  disabled?: boolean;
  name: string;
  shortName: string;
  unlocked: boolean;
  online: boolean;
};

const props = withDefaults(
  defineProps<{
    gridSize?: [number, number];
    disableUsed?: boolean;
    checkAuth?: boolean;
    tooltips?: boolean;
    enabledAddresses?: string[];
    selectByDefault?: boolean;
  }>(),
  {
    gridSize: () => [12, 12],
    disableUsed: false,
    checkAuth: false,
    tooltips: false,
    enabledAddresses: () => [],
    selectByDefault: false,
  }
);

const position = defineModel<[number, number] | null>('position', { default: null });
const refreshInterval = defineModel<number>('refreshInterval', {
  default: 0,
  validator: (value: number) => value >= 100 || value === 0,
});

const emit = defineEmits<{
  blur: [cell: Cell];
  click: [item: Device | null];
  'lock-change': [currentUnlocks: string[]];
  'online-change': [currentOnline: string[]];
  'time-change': [devices: Device[]];
}>();

const auth = usePromiseAuth<Device[]>({
  params: ['/device'],
  onPromise: (v) => {
    currentDevices.value = v;
  },
  checkAuth: props.checkAuth,
});
const grid = ref<Cell[]>([]);
const currentDevices = ref<Device[]>([]);

const gridSize = computed(() => ({
  x: Math.max(...grid.value.map((cell) => cell.x + 1), 1),
  y: Math.max(...grid.value.map((cell) => cell.y + 1), 1),
}));

const status = useDeviceStatus(null, {
  statusInterval: refreshInterval.value,
  startOnMounted: refreshInterval.value > 0,
  onMounted: auth.get,
  filter: (address, isLocked, isOnline) => {
    grid.value = grid.value.map((cell) => {
      if (address !== null && cell.address === address) {
        return {
          ...cell,
          unlocked: !isLocked,
          online: isOnline,
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
      const currentCell = currentDevices.value.find((cell) => cell.position[0] === x && cell.position[1] === y) ?? null;
      const isFound = currentCell ? props.enabledAddresses.some((cell) => currentCell?.address === cell) : false;

      g.push({
        x,
        y,
        selected: false,
        disabled: isFound ? false : props.disableUsed ? !!currentCell : !currentCell,
        name: currentCell?.name ?? '',
        shortName: currentCell?.shortName ?? currentCell?.name ?? '',
        address: currentCell?.address ?? null,
        unlocked: false,
        online: false,
      });
    }
  }
  const enabledCells = g.filter((cell) => !cell.disabled);
  const disabledCells = g.filter((cell) => cell.disabled);

  const cells = props.selectByDefault
    ? [
        ...disabledCells,
        ...enabledCells.map((cell, index) => {
          if (index === 0 && position.value === null) {
            position.value = [cell.x, cell.y];
            return { ...cell, selected: index === 0 };
          }
          return cell;
        }),
      ]
    : [...disabledCells, ...enabledCells];

  grid.value = cells;
}
function resetPosition() {
  position.value = null;
}

watch(
  [() => props.gridSize, currentDevices],
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
watch(
  () => grid.value.filter((cell) => cell.online),
  (cells) => {
    emit(
      'online-change',
      cells.map((cell) => cell.address)
    );
  }
);
watch(refreshInterval, (interval) => status.startInterval(interval));

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
          emit('click', currentDevices.find((cell) => cell.address === item.address) ?? null);
          position = [item.x, item.y];
        }
      "
      :style="`--x: ${item.x + 1}; --y: ${item.y + 1}`"
      :data-used="item.address !== null"
      :data-selected="position && grid[index].x === position[0] && grid[index].y === position[1]"
      :data-unlocked="item.unlocked"
      :data-online="item.online"
      :disabled="item.disabled"
      @blur="() => emit('blur', item)"
      :tooltip="props.tooltips"
      :aria-label="`${item.name} (${item.shortName}): ${item.online ? 'online' : 'offline'}`"
      tooltip-fixed>
      {{ item.shortName?.slice(0, 4) ?? 'PC' }}
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

    --pulse-bg-color-1: var(--bs-body-bg);
    --pulse-border-color-1: var(--bs-border-color);
    --pulse-color-1: var(--bs-body);

    --pulse-bg-color-2: var(--pulse-bg-color-1);
    --pulse-border-color-2: var(--pulse-border-color-1);
    --pulse-color-2: var(--pulse-color-1);
    &:not(:disabled) {
      border: 2px solid var(--bs-tertiary-bg);
      animation: pulse 2s infinite ease;

      &[data-used='true'] {
        --pulse-border-color-1: var(--bs-tertiary-color);
        &[data-unlocked='true'] {
          --pulse-bg-color-1: var(--bs-success);
          --pulse-border-color-1: var(--bs-success);
          --pulse-color-1: var(--bs-body-bg);
        }
        &[data-online='false'] {
          --pulse-bg-color-1: var(--bs-tertiary-bg);
          --pulse-border-color-1: var(--bs-danger);
          --pulse-border-color-2: var(--bs-danger-bg-subtle);
          --pulse-color-1: var(--bs-body);
        }
      }
      &[data-selected='true'] {
        --pulse-bg-color-1: var(--bs-primary);
        --pulse-border-color-1: var(--bs-primary);
        --pulse-color-1: var(--bs-body-bg);

        &[data-used='true'] {
          &[data-unlocked='true'] {
            --pulse-border-color-1: var(--bs-success-text-emphasis);
          }
          &[data-online='false'] {
            --pulse-border-color-1: var(--bs-danger);
            --pulse-bg-color-1: var(--bs-danger);
            --pulse-bg-color-2: var(--bs-danger-bg-subtle);
            --pulse-color-1: var(--bs-body-bg);
          }
        }
      }
    }
    &:disabled {
      --pulse-bg-color-1: var(--bs-tertiary-bg);
    }
  }
}
@keyframes pulse {
  0% {
    border-color: var(--pulse-border-color-1);
    background-color: var(--pulse-bg-color-1);
    color: var(--pulse-color-1);
  }
  50% {
    border-color: var(--pulse-border-color-2);
    background-color: var(--pulse-bg-color-2);
    color: var(--pulse-color-2);
  }
  100% {
    border-color: var(--pulse-border-color-1);
    background-color: var(--pulse-bg-color-1);
    color: var(--pulse-color-1);
  }
}
</style>
