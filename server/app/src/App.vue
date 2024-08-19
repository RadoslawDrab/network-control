<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { PhAlarm, PhDesktop, PhPassword } from '@phosphor-icons/vue';

import { promise } from 'utils/server';
import usePromiseAuth from 'composables/usePromiseAuth';
import useToast from 'composables/useToast';

import DeviceGrid from 'components/DeviceGrid.vue';
import { NavItem } from 'components/MainHeader.vue';
import { Settings } from 'components/AdminFormOffcanvas.vue';
import { Device } from 'types/index';

const show = reactive<{
  changePasswordModal: boolean;
  addDeviceForm: boolean;
  adminForm: boolean;
  showTimeInfo: boolean;
}>({
  changePasswordModal: false,
  addDeviceForm: false,
  adminForm: false,
  showTimeInfo: false,
});

const navItems = ref<NavItem<keyof typeof show>[]>([
  {
    id: 'addDeviceForm',
    text: 'Dodaj komputer',
    passwordRequired: true,
  },
  { id: 'changePasswordModal', text: 'Zmień hasło', passwordRequired: true },
  { id: 'showTimeInfo', text: 'Pokaż czas', callback: showTimeInfo },
  // { id: 'adminForm', html: 'Ustawienia administracyjne', passwordRequired: true },
]);
const selectedDevice = ref<Device | null>(null);
const currentUnlocks = ref<string[]>([]);
const refreshInterval = ref<number>(3000);

const auth = usePromiseAuth();
const toast = useToast();
const deviceGrid = ref<InstanceType<typeof DeviceGrid>>();

function navCallback(id: string) {
  Object.keys(show)
    .filter((key) => key !== id)
    .forEach((key) => {
      show[key] = false;
    });
  show[id] = true;
}

async function onDeviceAdded(device: Device) {
  try {
    await auth.promise('/device', {}, { method: 'POST', body: JSON.stringify(device) });
    await deviceGrid.value.auth.get();
    toast.show('Device added', { variant: 'success' });
  } catch (error) {
    toast.show('Error', { variant: 'danger', body: error.message });
  }
}
async function onDeviceClick(device: Device) {
  selectedDevice.value = device;
}
async function onLockChange(c: string[]) {
  currentUnlocks.value = c;
}
async function onDeviceDelete() {
  if (deviceGrid.value) {
    deviceGrid.value.resetPosition();
    await deviceGrid.value.auth.get();
  }
}
function onAdminFormSubmit(settings: Settings) {
  refreshInterval.value = settings.intervalTime;
}
async function showTimeInfo() {
  try {
    await promise('/status', {}, { method: 'POST' });
    toast.show('Pokazano pozostały czas', { variant: 'info' });
  } catch (error) {
    toast.show('Błąd', { variant: 'danger', body: error.message });
  }
}
</script>
<template>
  <BContainer class="d-flex flex-column gap-2">
    <MainHeader :navItems="navItems" :callback="navCallback" v-slot="item">
      <PhAlarm v-if="item.id === 'showTimeInfo'" class="icon" />
      <PhDesktop v-if="item.id === 'addDeviceForm'" class="icon" />
      <PhPassword v-if="item.id === 'changePasswordModal'" class="icon" />
    </MainHeader>
    <BRow gutter-y="3" align-v="start">
      <BCol cols="auto" class="d-flex justify-content-center">
        <DeviceGrid
          ref="deviceGrid"
          @click="onDeviceClick"
          v-model:refresh-interval="refreshInterval"
          @lock-change="onLockChange"
          tooltips />
      </BCol>
      <BCol>
        <DeviceManageForm
          :currentUnlocks="currentUnlocks"
          v-model="selectedDevice"
          @delete="onDeviceDelete"
          :device-grid="deviceGrid" />
      </BCol>
    </BRow>
  </BContainer>
  <PasswordModal new-password v-model:show="show.changePasswordModal" />
  <DeviceFormOffcanvas v-model="show.addDeviceForm" @submit="onDeviceAdded" />
  <BToastOrchestrator />
  <AdminFormOffcanvas v-model="show.adminForm" @submit="onAdminFormSubmit" />
</template>
<style lang="scss">
.icon {
  --icon-size: 1.15rem;
  width: var(--icon-size);
  height: var(--icon-size);
}
</style>
