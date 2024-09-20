<script setup lang="ts">
import { ref } from 'vue';

import useToken from 'composables/useToken';
import useToast from 'composables/useToast';
import useFeedback from 'composables/useFeedback';
import { changePassword } from 'utils/login';

import ConfirmationModal from './ConfirmationModal.vue';

const isValid = defineModel<boolean>({ default: false });
const show = defineModel<boolean>('show', { default: true });
const props = defineProps<{ newPassword?: boolean }>();

const token = useToken();
const { show: showToast } = useToast();

const confirmationModal = ref<InstanceType<typeof ConfirmationModal>>();

const feedback = useFeedback<{ password: string | null; passwordConfirmation: string | null }>(
  {
    password: null,
    passwordConfirmation: null,
  },
  ({ password, passwordConfirmation }) => {
    return {
      password: password !== null && password.length >= 3,
      passwordConfirmation: props.newPassword
        ? password !== null && passwordConfirmation !== null && passwordConfirmation === password
        : true,
    };
  }
);

async function onPasswordSubmit() {
  try {
    if (feedback.allValid) {
      if (props.newPassword && token.exists()) {
        await confirmationModal.value.show({ title: 'Zmienić hasło?' });
        await changePassword(feedback.v.password, token.currentToken);
        showToast('Changed password', { variant: 'success' });
        token.logout();
      } else {
        token.setPassword(feedback.v.password);
        await check();
      }
      show.value = false;
    }
  } catch (error) {
    show.value = true;
    showToast(error.message ?? 'Error', { variant: 'danger' });
  } finally {
    await feedback.reset();
  }
}
async function check() {
  try {
    const check = await token.check(true);
    isValid.value = check;

    showToast(check ? 'Logged in' : 'Failed to log in', { time: 5000, variant: check ? 'success' : 'danger' });

    if (!check) {
      token.removeToken();
    }
    return check;
  } catch (error) {
    showToast('Error', { variant: 'danger', body: error.message });
  }
}
</script>
<template>
  <BModal
    v-model="show"
    cancel-title="Anuluj"
    :title="`${props.newPassword ? 'Zmiana hasła' : 'Logowanie'} administratora`"
    centered
    @close="feedback.reset"
    @ok="onPasswordSubmit">
    <BForm @submit="onPasswordSubmit" class="d-flex flex-column gap-1">
      <BFormGroup>
        <BFormText for="password-input">Podaj {{ props.newPassword ? 'nowe ' : '' }}hasło:</BFormText>
        <BFormInput
          id="password-input"
          v-model="feedback.v.password"
          :state="feedback.isValid.value.password"
          @blur="() => feedback.onTouched('password')"
          type="password"
          aria-describedby="password-feedback" />
        <BFormInvalidFeedback id="password-feedback"> Hasło musi mieć więcej niż 2 znaki </BFormInvalidFeedback>
      </BFormGroup>
      <BFormGroup>
        <BFormText for="confirmation-password-input" v-if="props.newPassword">Powtórz hasło:</BFormText>
        <BFormInput
          id="confirmation-password-input"
          v-if="props.newPassword"
          v-model="feedback.v.passwordConfirmation"
          :state="feedback.isValid.value.passwordConfirmation"
          @blur="() => feedback.onTouched('passwordConfirmation')"
          type="password"
          aria-describedby="password-confirmation-feedback" />
        <BFormInvalidFeedback id="password-confirmation-feedback"> Hasła nie są takie same </BFormInvalidFeedback>
      </BFormGroup>
    </BForm>
    <ConfirmationModal ref="confirmationModal" />
  </BModal>
</template>
