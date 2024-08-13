<script setup lang="tsx">
import { reactive, ref } from 'vue';

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

function navCallback(id: string) {
  Object.keys(show)
    .filter((key) => key !== id)
    .forEach((key) => {
      show[key] = false;
    });
  show[id] = true;
}
</script>
<template>
  <BContainer>
    <MainHeader :navItems="navItems" :callback="navCallback" />
    <div>APP</div>
  </BContainer>
  <PasswordModal new-password v-model:show="show.changePasswordModal" />
  <DeviceFormOffcanvas v-model="show.addDeviceForm" @submit="(settings) => console.log(settings)" />
  <BToastOrchestrator />
</template>
