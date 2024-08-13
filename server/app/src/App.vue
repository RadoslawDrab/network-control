<script setup lang="tsx">
import { reactive, ref } from 'vue';

import usePromiseAuth from 'composables/usePromiseAuth';
import useToast from 'composables/useToast';

import { Address } from 'types/index';

import { NavItem } from 'components/MainHeader.vue';

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

const auth = usePromiseAuth();
const toast = useToast();

function navCallback(id: string) {
  Object.keys(show)
    .filter((key) => key !== id)
    .forEach((key) => {
      show[key] = false;
    });
  show[id] = true;
}

async function onDeviceAdded(settings: Address) {
  try {
    await auth.promise('/user', {}, { method: 'POST', body: JSON.stringify(settings) });
    toast.show('Device added', { variant: 'success' });
  } catch (error) {
    toast.show('Failed', { variant: 'danger', body: error.message });
  }
}
</script>
<template>
  <BContainer>
    <MainHeader :navItems="navItems" :callback="navCallback" />
    <div>APP</div>
  </BContainer>
  <PasswordModal new-password v-model:show="show.changePasswordModal" />
  <DeviceFormOffcanvas v-model="show.addDeviceForm" @submit="onDeviceAdded" />
  <BToastOrchestrator />
</template>
