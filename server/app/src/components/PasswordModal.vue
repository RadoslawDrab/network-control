<script setup lang="ts">
import { onMounted, ref } from 'vue';

import useToken from 'composables/useToken';
import useToast from 'composables/useToast';
import { changePassword } from 'utils/login';

const isValid = defineModel<boolean>({ default: false });
const show = defineModel<boolean>('show', { default: true });
const props = defineProps<{ newPassword?: boolean }>();

const token = useToken();
const { show: showToast } = useToast();
const password = ref<string | null>(null);

onMounted(async () => {
  await check();
});

async function onPasswordSubmit() {
  try {
    if (props.newPassword && token.exists()) {
      await changePassword(password.value, token.currentToken);
      showToast('Changed password', '', { variant: 'success' });
      token.logout();
    } else {
      token.setPassword(password.value);
      await check();
    }
    show.value = false;
  } catch (error) {
    show.value = true;
    showToast(error.message, '', { variant: 'danger' });
  } finally {
    password.value = null;
  }
}
async function check() {
  if (show.value) {
    const check = await token.check(true);
    isValid.value = check;

    showToast(check ? 'Logged in' : 'Failed to log in', '', { time: 5000, variant: check ? 'success' : 'danger' });
  }
}
</script>
<template>
  <BModal v-model="show" cancel-title="Anuluj" hide-header centered @ok="onPasswordSubmit">
    <BForm @submit="onPasswordSubmit">
      <BFormText>Podaj {{ props.newPassword ? 'nowe ' : '' }}hasło:</BFormText>
      <BFormInput v-model="password" type="password"></BFormInput>
    </BForm>
  </BModal>
</template>
