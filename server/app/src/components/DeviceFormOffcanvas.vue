<script setup lang="ts">
import { watch } from 'vue';
import { computed, reactive, ref } from 'vue';

import useToast from 'composables/useToast';

import { Address } from 'types/index';
import usePromiseAuth from 'composables/usePromiseAuth';
import useFeedback from 'composables/useFeedback';

type CellSettings = { name: string; shortName?: string; address: string; position: [number, number] };
type Cell = { x: number; y: number; selected: boolean; disabled?: boolean; shortName: string };

const show = defineModel<boolean>({ default: false });
const currentCells = ref<CellSettings[]>([]);
const props = withDefaults(defineProps<{ gridSize?: [number, number] }>(), { gridSize: () => [12, 12] });
const emit = defineEmits<{ submit: [settings: CellSettings] }>();

const toast = useToast();
const auth = usePromiseAuth<Address[]>({
  params: ['/user'],
  onPromise: (v) => {
    currentCells.value = v;
  },
});

const grid = ref<Cell[]>([]);
const gridSize = computed(() => ({
  x: Math.max(...grid.value.map((cell) => cell.x + 1), 1),
  y: Math.max(...grid.value.map((cell) => cell.y + 1), 1),
}));
const settings = useFeedback<CellSettings>({}, (values) => {
  const shortName = values.shortName ?? values.name?.slice(0, 4);
  return {
    name: !!values.name,
    position:
      values.position[0] >= 0 &&
      values.position[0] < gridSize.value.x &&
      values.position[1] >= 0 &&
      values.position[1] < gridSize.value.y,
    address: !!values.address?.replace(/[^0-9A-F]/gi, '').match(/[0-9A-F]{12}/gi),
    shortName: shortName?.length < 5 && shortName?.length > 0,
  };
});

function createGrid(gridX: number, gridY: number) {
  const g: Cell[] = [];
  for (let x = 0; x < Math.max(gridX, 1); x++) {
    for (let y = 0; y < Math.max(gridY, 1); y++) {
      const currentCell = currentCells.value.find((cell) => cell.position[0] === x && cell.position[1] === y);
      g.push({
        x,
        y,
        selected: false,
        disabled: !!currentCell,
        shortName: currentCell?.shortName ?? currentCell?.name ?? '',
      });
    }
  }
  const enabledCells = g.filter((cell) => !cell.disabled);
  const disabledCells = g.filter((cell) => cell.disabled);

  const cells = [
    ...disabledCells,
    ...enabledCells.map((cell, index) => {
      if (index === 0) {
        settings.v.position = [cell.x, cell.y];
        return { ...cell, selected: index === 0 };
      }
      return cell;
    }),
  ];

  grid.value = cells;
}

function onSubmit() {
  if (settings.v.address && settings.v.name && settings.v.position) {
    emit('submit', settings.value as CellSettings);
    settings.reset();
    show.value = false;
  } else {
    toast.show('Not enough data');
  }
}

watch(
  [() => props.gridSize, currentCells],
  ([gridSize]) => {
    createGrid(...gridSize);
  },
  { immediate: true }
);
watch(
  show,
  async (show) => {
    if (show) await auth.promise('/user');
  },
  { immediate: true }
);
</script>
<template>
  <BOffcanvas v-model="show" placement="end" width="50%" header-class="border-bottom" title="Dodaj komputer">
    <BForm class="form" @submit="onSubmit">
      <BFormGroup>
        <BFormText for="device-name">Nazwa</BFormText>
        <BFormInput
          id="device-name"
          v-model.trim="settings.v.name"
          type="text"
          required
          aria-describedby="device-name-feedback"
          placeholder="Podaj nazwę"
          :state="settings.isValid.value.name"
          @blur="() => settings.onTouched('name')" />
        <BFormInvalidFeedback class="feedback" id="device-name-feedback">Nazwa jest wymagana</BFormInvalidFeedback>
      </BFormGroup>
      <BFormGroup>
        <BFormText for="device-shortName">Skrót</BFormText>
        <BFormInput
          id="device-shortName"
          v-model.trim="settings.v.shortName"
          type="text"
          :placeholder="settings.v.name?.slice(0, 4)"
          :state="settings.isValid.value.shortName"
          @blur="() => settings.onTouched('shortName')"
          aria-describedby="device-shortName-feedback" />
        <BFormInvalidFeedback class="feedback" id="device-shortName-feedback">
          Skrót powinien zawierać do 4 znaków
        </BFormInvalidFeedback>
      </BFormGroup>
      <BFormGroup>
        <BFormText for="device-address">Adres MAC</BFormText>
        <BFormInput
          id="device-address"
          v-model.trim="settings.v.address"
          type="text"
          placeholder="00:00:00:00:00:00"
          :lazy-formatter="true"
          :formatter="
            (value) =>
              value
                .replace(/[^0-9A-F:-]/gi, '')
                .slice(0, 17)
                .toUpperCase()
          "
          :min="12"
          required
          :state="settings.isValid.value.address"
          @blur="() => settings.onTouched('address')"
          aria-describedby="device-address-feedback" />
        <BFormInvalidFeedback class="feedback" id="device-address-feedback">
          Adres MAC powinien zawierać maksymalnie 12 cyfr lub liter (A-F)
        </BFormInvalidFeedback>
      </BFormGroup>
      <hr />
      <BFormGroup>
        <small
          class="text-body-secondary form-text"
          :class="
            settings.isValid.value.position !== null
              ? settings.isValid.value.position === true
                ? 'text-success'
                : 'text-danger'
              : ''
          ">
          Pozycja na siatce
        </small>
        <div class="grid" :style="`--size-x: ${gridSize.x}; --size-y: ${gridSize.y}`">
          <button
            class="item"
            type="button"
            v-for="(item, index) in grid"
            :key="`${item.x}-${item.y}`"
            @click="() => (settings.v.position = [item.x, item.y])"
            :style="`--x: ${item.x + 1}; --y: ${item.y + 1}`"
            :data-selected="
              settings.v.position &&
              grid[index].x === settings.v.position[0] &&
              grid[index].y === settings.v.position[1]
            "
            :disabled="item.disabled"
            @blur="() => settings.onTouched('position')">
            {{ item.shortName.slice(0, 4) }}
          </button>
        </div>
      </BFormGroup>
      <hr />
      <BButton class="mt-3" type="submit" variant="outline-primary">Dodaj</BButton>
    </BForm>
  </BOffcanvas>
</template>
<style scoped lang="scss">
.form {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  hr {
    margin: 0.5em 0;
  }
  input::placeholder {
    color: var(--bs-tertiary-color);
  }
  .grid {
    border: 1px solid var(--bs-secondary-bg);
    margin-top: 0.2em;
    width: fit-content;
    // width: 100%;
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
      }
      &:disabled {
        background-color: var(--bs-primary-bg-subtle);
      }
    }
  }
}
</style>
