<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  PhAlarm,
  PhArrowCircleDown,
  PhArrowCounterClockwise,
  PhCircle,
  PhClockCounterClockwise,
  PhGear,
  PhX,
} from '@phosphor-icons/vue';

import useToken from 'composables/useToken';
import useToast from 'composables/useToast';
import usePromiseAuth from 'composables/usePromiseAuth';
import { promise } from 'utils/server';

import { Device } from 'types/index';
import DeviceGrid from './DeviceGrid.vue';
import ConfirmationModal from './ConfirmationModal.vue';

const device = defineModel<Device | null>({ default: null });
const props = withDefaults(
  defineProps<{
    locks?: { time: number; value: string }[];
    currentUnlocks: string[];
    currentOnline: string[];
    deviceGrid?: InstanceType<typeof DeviceGrid>;
  }>(),
  {
    device: null,
    locks: () => [
      { time: 10, value: '10 min' },
      { time: 30, value: '30 min' },
      { time: 60, value: '1h' },
      { time: 120, value: '2h' },
    ],
  }
);
const emit = defineEmits<{ delete: [device: Device] }>();

const macAddress = computed(() =>
  device.value
    ? device.value.address
        .split('')
        .reduce((str, letter, i) => (str += letter + (i % 2 === 1 ? ':' : '')), '')
        .replace(/:$/, '')
    : ''
);
const isOnline = computed(() =>
  device.value ? props.currentOnline.some((address) => device.value.address === address) : false
);
const editDeviceForm = ref<boolean>(false);
const confirmationModal = ref<InstanceType<typeof ConfirmationModal>>();
const token = useToken();
const toast = useToast();

const auth = usePromiseAuth();

/** @param time Time in minutes */
async function unlock(time: number, type: 'add' | 'change' | 'remove' = 'change') {
  let prefix: string;
  let note: string;
  switch (type) {
    case 'add':
      prefix = '+';
      note = 'Dodano';
      break;
    case 'remove':
      prefix = '-';
      note = 'Odjęto';
      break;
    default:
      prefix = '';
      note = 'Zmieniono';
  }
  try {
    await promise(
      `/status/${device.value.address}`,
      {},
      { body: JSON.stringify({ time: `${prefix}${time * 60 * 1000}` }), method: 'POST' }
    );
    device.value = await promise<Device>(`/device/${device.value.address}`);
    toast.show(`${note} czas`, { variant: 'info' });
    await auth.get();
  } catch (error) {
    toast.show('Błąd', { variant: 'danger', body: error.message });
  }
}
async function set(type: 'restart' | 'shutdown' | 'time') {
  let note: string;
  const options = confirmationModal.value.defaultOptions;
  try {
    switch (type) {
      case 'restart':
        note = 'Rozpoczęto restart urządzenia';
        options.title = 'Rozpocząć restart?';
        break;
      case 'shutdown':
        note = 'Rozpoczęto wyłączenie urządzenia';
        options.title = 'Rozpocząć wyłączenie?';
        break;
      case 'time':
        note = 'Pokazano czas na urządzeniu';
        options.title = 'Pokazać czas?';
        break;
    }
    await confirmationModal.value.show(options);
  } catch (error) {
    return;
  }
  try {
    if (!device.value.address) throw { message: 'No MAC address provided' };

    await promise(
      `/status/set/${device.value.address}`,
      {},
      { method: 'POST', body: JSON.stringify({ [type]: true }) }
    );
    toast.show(note, { variant: 'info' });
    await auth.get();
  } catch (error) {
    toast.show('Błąd', { variant: 'danger', body: error.message });
  }
}
async function deleteDevice() {
  try {
    await confirmationModal.value.show({
      title: 'Potwierdzenie',
      text: `Usunąć <b>${device.value.name}</b>${
        device.value.shortName ? ` (${device.value.shortName})` : ''
      } <small class="text-secondary">${macAddress.value}</small>`,
    });
  } catch (error) {
    return;
  }
  try {
    if (!device.value.address) throw { message: 'No MAC address provided' };

    await auth.promise(`/device/${device.value.address}`, {}, { method: 'DELETE' });
    toast.show('Deleted device', { variant: 'success' });
    emit('delete', device.value);
    device.value = null;
    await auth.get();
  } catch (error) {
    toast.show('Error', { variant: 'danger', body: error.message });
  }
}
async function updateDevice(settings: Device) {
  try {
    await auth.promise(`/device/${device.value.address}`, {}, { method: 'PUT', body: JSON.stringify(settings) });
    toast.show('Updated device', { variant: 'success' });
    await props.deviceGrid?.auth.get();
    const differentPosition =
      device.value.position[0] !== settings.position[0] || device.value.position[1] !== settings.position[1];
    device.value = differentPosition ? null : settings;
    await auth.get();
  } catch (error) {
    toast.show('Error', { variant: 'danger', body: error.message });
  }
}
</script>
<template>
  <aside>
    <BForm v-if="device" class="form">
      <header class="d-flex justify-content-between" :data-unlocked="currentUnlocks.includes(device.address)">
        <div class="header-content">
          <h1>
            {{ device.name }}
            <span v-if="device.shortName">({{ device.shortName }})</span>
          </h1>
          <footer>
            <div class="d-flex align-items-center gap-1">
              <div
                class="icon d-flex justify-content-center align-items-end"
                tooltip
                :aria-label="`Urządzenie jest ${isOnline ? 'włączone' : 'wyłączone'}`">
                <PhCircle weight="fill" size="75%" :data-online="isOnline" />
              </div>
              <span class="fs-6 text-body text-body-tertiary">{{ macAddress }}</span>
            </div>
            <span class="fs-6 text-body text-body-tertiary">
              Odblokowany do:
              {{ new Date(device.lockAfter).toLocaleTimeString([], { timeStyle: 'short' }) }}
              ({{ new Date(device.lockAfter).toLocaleDateString([]) }})
            </span>
          </footer>
        </div>
        <div class="vertical align-self-start" v-if="token.isLoggedIn">
          <BButton @click="deleteDevice" class="p-0" variant="outline-danger" tooltip aria-label="Usuń urządzenie">
            <PhX class="m-1" weight="bold" size="1.25rem" />
          </BButton>
          <BButton
            @click="() => (editDeviceForm = true)"
            class="p-0"
            variant="outline-secondary"
            tooltip
            aria-label="Edytuj urządzenie">
            <PhGear class="m-1" weight="bold" size="1.25rem" />
          </BButton>
        </div>
      </header>
      <div class="content">
        <div class="locks-box">
          <h4>Zmień czas</h4>
          <BButton
            v-for="lock in props.locks"
            :key="`${lock.time}-${lock.value}`"
            @click="() => unlock(lock.time)"
            variant="outline-secondary"
            class="button">
            {{ lock.value }}
          </BButton>
        </div>
        <div class="locks-box">
          <h4>Dodaj czas</h4>
          <BButton
            v-for="lock in props.locks.filter((lock) => lock.time > 0)"
            :key="`${lock.time}-${lock.value}`"
            @click="() => unlock(lock.time, 'add')"
            variant="outline-secondary"
            class="button">
            +{{ lock.value }}
          </BButton>
        </div>
        <div class="locks-box">
          <h4>Usuń czas</h4>
          <BButton
            v-for="lock in props.locks.filter((lock) => lock.time > 0)"
            :key="`${lock.time}-${lock.value}`"
            @click="() => unlock(lock.time, 'remove')"
            variant="outline-secondary"
            class="button">
            -{{ lock.value }}
          </BButton>
        </div>
        <aside>
          <BButton @click="() => set('time')" variant="outline-primary" class="button" :disabled="!isOnline">
            <PhAlarm class="icon" />
            Pokaż czas
          </BButton>
          <BButton @click="() => unlock(0, 'change')" variant="outline-primary" class="button">
            <PhClockCounterClockwise class="icon" />
            Resetuj czas
          </BButton>
          <BButton @click="() => set('shutdown')" variant="outline-danger" class="button" :disabled="!isOnline">
            <PhArrowCircleDown class="icon" />
            Wyłącz
          </BButton>
          <BButton @click="() => set('restart')" variant="outline-danger" class="button" :disabled="!isOnline">
            <PhArrowCounterClockwise class="icon" />
            Uruchom ponownie
          </BButton>
          <ConfirmationModal ref="confirmationModal" />
        </aside>
      </div>
      <DeviceFormOffcanvas v-model="editDeviceForm" :default-settings="device" edit @submit="updateDevice" />
    </BForm>
    <div v-else>Nie wybrano urządzenia</div>
  </aside>
</template>
<style scoped lang="scss">
.form {
  display: flex;
  flex-direction: column;
  gap: 1.5em;
  header {
    border-bottom: 2px solid var(--bs-danger);
    padding-bottom: 1em;
    &[data-unlocked='true'] {
      border-color: var(--bs-success);
    }
    .header-content {
      width: 100%;
      h1 {
        line-height: 1;
      }
      footer {
        display: flex;
        justify-content: space-between;
        gap: 1em;
        margin-right: 1em;
        .icon {
          aspect-ratio: 1 / 1;
          color: var(--bs-danger);
          [data-online='true'] {
            color: var(--bs-success);
          }
        }
      }
    }
  }
  .content {
    $main-size: 70%;
    $vertical-gap: 1em;
    $horizontal-gap: 0.75em;
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: $vertical-gap;
    & > * {
      width: calc($main-size - $horizontal-gap);
    }
    aside {
      position: absolute;
      top: 0;
      right: 0;
      width: calc(100% - $main-size);
      height: 100%;

      display: flex;
      flex-direction: column;
      gap: 0.5em;

      border-left: 1px solid var(--bs-secondary);
      padding-left: $horizontal-gap;
    }
    .locks-box {
      display: grid;
      grid-template-columns: repeat(v-bind('props.locks.length'), 1fr);
      gap: 0 0.5em;
      & > * {
        grid-column: 1 / -1;
      }
    }
    .button {
      grid-column: auto;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.25em;
    }
  }
  .vertical {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
}
</style>
