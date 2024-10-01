<script setup lang="ts">
import { ref } from 'vue';

import useToken from 'composables/useToken';
import useToast from 'composables/useToast';
import useFeedback from 'composables/useFeedback';
import { changePassword } from 'utils/login';
import { and } from 'utils/logic';

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
    const lowercaseCharactersRegEx = /[a-z]*/g;
    const uppercaseCharactersRegEx = /[A-Z]*/g;
    const digitsRegEx = /[0-9]*/g;
    const specialCharactersRegEx = /[,.?:;!@#$%^&*(){}[\]-_\\|+=~`]*/g;

    return {
      password:
        password !== null &&
        password.length >= 8 &&
        and(password, lowercaseCharactersRegEx, uppercaseCharactersRegEx, digitsRegEx, specialCharactersRegEx),
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
        await confirmationModal.value.show({ title: '##password.ask.change##' });
        await changePassword(feedback.v.password, token.currentToken);
        showToast('##password.changed##', { variant: 'success' });
        token.logout();
      } else {
        token.setPassword(feedback.v.password);
        await check();
      }
      show.value = false;
    }
  } catch (error) {
    show.value = true;
    showToast(error.message ?? '##error##', { variant: 'danger' });
  } finally {
    await feedback.reset();
  }
}
async function check() {
  try {
    const check = await token.check(true);
    isValid.value = check;

    showToast(check ? '##user.logged-in##' : '##user.error.logged-in##', {
      time: 5000,
      variant: check ? 'success' : 'danger',
    });

    if (!check) {
      token.removeToken();
    }
    return check;
  } catch (error) {
    showToast('##error##', { variant: 'danger', body: error.message });
  }
}
</script>
<template>
  <BModal v-model="show" centered @close="feedback.reset">
    <template #title>
      <span v-if="props.newPassword" data-translate="password.change">Change password</span>
      <span v-else data-translate="user.log-in">Log in</span>
    </template>
    <template #ok>
      <BButton data-translate="ok" variant="primary" @click="onPasswordSubmit">OK</BButton>
    </template>
    <template #cancel>
      <BButton data-translate="cancel" variant="secondary" @click="() => (show = false)"> Cancel </BButton>
    </template>
    <BForm @submit="onPasswordSubmit" class="d-flex flex-column gap-1">
      <BFormGroup>
        <BFormText for="password-input">
          <span v-if="props.newPassword" data-translate="##password.new-enter##:">Enter new password:</span>
          <span v-else data-translate="##password.enter##:">Enter password:</span>
        </BFormText>
        <BFormInput
          id="password-input"
          v-model="feedback.v.password"
          :state="feedback.isValid.value.password"
          @blur="() => feedback.onTouched('password')"
          type="password"
          aria-describedby="password-feedback" />
        <BFormInvalidFeedback id="password-feedback" data-translate="password.info">
          Password has to include lowercase and uppercase letter, digit, special character and must be longer than 7
          characters
        </BFormInvalidFeedback>
      </BFormGroup>
      <BFormGroup>
        <BFormText
          for="confirmation-password-input"
          v-if="props.newPassword"
          data-translate="##password.new-enter-repeat##:">
          Enter new password again:
        </BFormText>
        <BFormInput
          id="confirmation-password-input"
          v-if="props.newPassword"
          v-model="feedback.v.passwordConfirmation"
          :state="feedback.isValid.value.passwordConfirmation"
          @blur="() => feedback.onTouched('passwordConfirmation')"
          type="password"
          aria-describedby="password-confirmation-feedback" />
        <BFormInvalidFeedback id="password-confirmation-feedback" data-translate="password.not-the-same">
          Passwords are not the same
        </BFormInvalidFeedback>
      </BFormGroup>
    </BForm>
    <ConfirmationModal ref="confirmationModal" />
  </BModal>
</template>
