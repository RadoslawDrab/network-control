<script setup lang="tsx">
import { reactive, ref } from 'vue';

import usePromiseAuth from 'composables/usePromiseAuth';
import useToast from 'composables/useToast';

import DeviceGrid from 'components/DeviceGrid.vue';
import { NavItem } from 'components/MainHeader.vue';
import { Device } from 'types/index';

const show = reactive<{ changePasswordModal: boolean; addDeviceForm: boolean }>({
  changePasswordModal: false,
  addDeviceForm: false,
});

const navItems = ref<NavItem<keyof typeof show>[]>([
  {
    id: 'addDeviceForm',
    html: 'Dodaj komputer',
    passwordRequired: true,
  },
  { id: 'changePasswordModal', html: 'Zmień hasło', passwordRequired: true },
]);
const selectedAddress = ref<Device | null>(null);
const currentUnlocks = ref<string[]>([]);

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

async function onDeviceAdded(settings: Device) {
  try {
    await auth.promise('/device', {}, { method: 'POST', body: JSON.stringify(settings) });
    toast.show('Device added', { variant: 'success' });
  } catch (error) {
    toast.show('Failed', { variant: 'danger', body: error.message });
  }
}
async function onDeviceClick(address: Device) {
  selectedAddress.value = address;
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
</script>
<template>
  <BContainer>
    <MainHeader :navItems="navItems" :callback="navCallback" />
    <BRow gutter-y="3" align-v="start">
      <BCol cols="auto" class="d-flex justify-content-center">
        <DeviceGrid
          ref="deviceGrid"
          @click="onDeviceClick"
          :status-interval="3000"
          @lock-change="onLockChange"
          tooltips />
      </BCol>
      <BCol>
        <DeviceManageForm
          :currentUnlocks="currentUnlocks"
          v-model="selectedAddress"
          @delete="onDeviceDelete"
          :device-grid="deviceGrid" />
      </BCol>
    </BRow>
  </BContainer>
  <PasswordModal new-password v-model:show="show.changePasswordModal" />
  <DeviceFormOffcanvas v-model="show.addDeviceForm" @submit="onDeviceAdded" />
  <BToastOrchestrator />
</template>
