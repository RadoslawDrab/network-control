<script setup lang="tsx">
import { reactive, ref, watch } from 'vue';
import { PhAlarm, PhArrowCounterClockwise, PhDesktop, PhPassword } from '@phosphor-icons/vue';

import { promise } from 'utils/server';
import usePromiseAuth from 'composables/usePromiseAuth';
import useToast from 'composables/useToast';
import useLanguage from 'composables/useLanguage';

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
type NavItemKeys = keyof typeof show | 'refreshInfo' | 'language';

const lang = useLanguage();
const navItems = ref<NavItem<NavItemKeys>[]>([
  {
    id: 'addDeviceForm',
    text: '##device.add##',
    passwordRequired: true,
  },
  { id: 'changePasswordModal', text: '##password.change##', passwordRequired: true },
  { id: 'showTimeInfo', text: '##time.show##', callback: showTimeInfo },
  { id: 'refreshInfo', text: '##refresh##', callback: refreshInfo },
  ...lang.languages.map<NavItem<NavItemKeys>>((language) => ({
    id: 'language',
    text: language.toUpperCase(),
    callback: lang.setLanguage,
    type: 'language',
    value: language,
    active: lang.isCurrentLanguage(language),
  })),
  // { id: 'adminForm', html: 'Ustawienia administracyjne', passwordRequired: true },
]);
const selectedDevice = ref<Device | null>(null);
const currentUnlocks = ref<string[]>([]);
const currentOnline = ref<string[]>([]);
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
    toast.show('##device.added##', { variant: 'success' });
  } catch (error) {
    toast.show('##error##', { variant: 'danger', body: error.message });
  }
}
async function onDeviceClick(device: Device) {
  selectedDevice.value = device;
}
async function onLockChange(c: string[]) {
  currentUnlocks.value = c;
}
async function onOnlineChange(c: string[]) {
  currentOnline.value = c;
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
    toast.show('##device.confirmation.time-shown##', { variant: 'info' });
  } catch (error) {
    toast.show('##error##', { variant: 'danger', body: error.message });
  }
}
async function refreshInfo() {
  try {
    await deviceGrid.value.auth.get();
    toast.show('##refreshed##', { variant: 'info' });
  } catch (error) {
    toast.show('##error##', { variant: 'danger', body: error.message });
  }
}
watch(lang.language, (language) => {
  navItems.value = navItems.value.map((item) => {
    if (item.type === 'language') {
      return { ...item, active: item.value === language };
    }
    return item;
  });
});
</script>
<template>
  <BContainer class="d-flex flex-column gap-2">
    <MainHeader :navItems="navItems" :callback="navCallback" v-slot="item">
      <PhAlarm v-if="item.id === 'showTimeInfo'" class="icon" />
      <PhDesktop v-if="item.id === 'addDeviceForm'" class="icon" />
      <PhPassword v-if="item.id === 'changePasswordModal'" class="icon" />
      <PhArrowCounterClockwise v-if="item.id === 'refreshInfo'" class="icon" />
    </MainHeader>
    <BRow gutter-y="3" align-v="start">
      <BCol cols="auto" class="d-flex justify-content-center">
        <DeviceGrid
          ref="deviceGrid"
          @click="onDeviceClick"
          v-model:refresh-interval="refreshInterval"
          @lock-change="onLockChange"
          @online-change="onOnlineChange"
          tooltips />
      </BCol>
      <BCol>
        <DeviceManageForm
          :current-unlocks="currentUnlocks"
          :current-online="currentOnline"
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
