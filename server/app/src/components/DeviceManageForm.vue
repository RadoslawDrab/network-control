<script setup lang="ts">
import { computed, ref } from 'vue';
import { PhGear, PhX } from '@phosphor-icons/vue';

import useToken from 'composables/useToken';
import useToast from 'composables/useToast';
import usePromiseAuth from 'composables/usePromiseAuth';
import { promise } from 'utils/server';

import { Address } from 'types/index';

const address = defineModel<Address | null>({ default: null });
const props = withDefaults(defineProps<{ locks?: { time: number; value: string }[]; currentUnlocks: string[] }>(), {
  address: null,
  locks: () => [
    { time: 10, value: '10 min' },
    { time: 30, value: '30 min' },
    { time: 60, value: '1h' },
    { time: 120, value: '2h' },
    { time: 0, value: 'Resetuj' },
  ],
});
const emit = defineEmits<{ delete: [address: Address] }>();

const macAddress = computed(() =>
  address.value
    ? address.value.address
        .split('')
        .reduce((str, letter, i) => (str += letter + (i % 2 === 1 ? ':' : '')), '')
        .replace(/:$/, '')
    : ''
);
const deleteDeviceModal = ref<boolean>(false);
const editDeviceForm = ref<boolean>(false);
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
      `/status/${address.value.address}`,
      {},
      { body: JSON.stringify({ time: `${prefix}${time * 60 * 1000}` }), method: 'POST' }
    );
    address.value = await promise<Address>(`/device/${address.value.address}`);
    toast.show(`${note} czas`, { variant: 'success' });
  } catch (error) {
    toast.show('Błąd', { variant: 'danger', body: error.message });
  }
}
async function deleteDevice() {
  try {
    if (!address.value.address) throw { message: 'No MAC address provided' };

    await auth.promise(`/device/${address.value.address}`, {}, { method: 'DELETE' });
    toast.show('Deleted device', { variant: 'success' });
    emit('delete', address.value);
    address.value = null;
  } catch (error) {
    toast.show('Error', { variant: 'danger', body: error.message });
  }
}
</script>
<template>
  <aside>
    <BForm v-if="address" class="form">
      <header class="d-flex justify-content-between" :data-unlocked="currentUnlocks.includes(address.address)">
        <div class="content">
          <h1>
            {{ address.name }}
            <span v-if="address.shortName">({{ address.shortName }})</span>
          </h1>
          <footer>
            <span class="fs-6 text-body text-body-tertiary">{{ macAddress }}</span>
            <span class="fs-6 text-body text-body-tertiary">
              Odblokowany do:
              {{ new Date(address.lockAfter).toLocaleTimeString([], { timeStyle: 'short' }) }}
              ({{ new Date(address.lockAfter).toLocaleDateString([]) }})
            </span>
          </footer>
        </div>
        <div class="vertical align-self-start" v-if="token.isLoggedIn">
          <BButton
            @click="() => (deleteDeviceModal = true)"
            class="p-0"
            variant="outline-danger"
            tooltip
            aria-label="Usuń urządzenie">
            <PhX class="m-1" weight="bold" size="1.25rem" />
          </BButton>
          <!-- <BButton
            @click="() => (editDeviceForm = true)"
            class="p-0"
            variant="outline-secondary"
            tooltip
            aria-label="Edytuj urządzenie">
            <PhGear class="m-1" weight="bold" size="1.25rem" />
          </BButton> -->
        </div>
      </header>
      <div>
        <h4>Zmień czas</h4>
        <div class="locks-box">
          <BButton
            v-for="lock in props.locks"
            :key="`${lock.time}-${lock.value}`"
            @click="() => unlock(lock.time)"
            variant="outline-secondary"
            class="button">
            {{ lock.value }}
          </BButton>
        </div>
      </div>
      <div>
        <h4>Dodaj czas</h4>
        <div class="locks-box">
          <BButton
            v-for="lock in props.locks.filter((lock) => lock.time > 0)"
            :key="`${lock.time}-${lock.value}`"
            @click="() => unlock(lock.time, 'add')"
            variant="outline-secondary"
            class="button">
            +{{ lock.value }}
          </BButton>
        </div>
      </div>
      <div>
        <h4>Usuń czas</h4>
        <div class="locks-box">
          <BButton
            v-for="lock in props.locks.filter((lock) => lock.time > 0)"
            :key="`${lock.time}-${lock.value}`"
            @click="() => unlock(lock.time, 'remove')"
            variant="outline-secondary"
            class="button">
            -{{ lock.value }}
          </BButton>
        </div>
      </div>
      <BModal
        v-model="deleteDeviceModal"
        hide-header
        centered
        ok-variant="danger"
        ok-title="Usuń"
        cancel-title="Anuluj"
        @ok="deleteDevice">
        Usunąć urządzenie
        <span class="fw-bold">
          {{ address.name }}
          <span v-if="address.shortName">({{ address.shortName }})</span>
        </span>
        <small class="text-secondary"> ({{ macAddress }})</small>
      </BModal>
      <DeviceFormOffcanvas v-model="editDeviceForm" :default-settings="address" edit @submit="(v) => console.log(v)" />
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
    h1 {
      line-height: 1;
    }
    .content {
      width: 100%;
      footer {
        display: flex;
        justify-content: space-between;
        gap: 1em;
        margin-right: 1em;
      }
    }
  }
  .locks-box {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5em;
    .button {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
  .vertical {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
}
</style>
