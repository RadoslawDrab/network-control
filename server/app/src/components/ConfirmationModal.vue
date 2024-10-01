<script setup lang="ts">
export type Options = {
  title: string;
  text?: string;
  cancel: string;
  ok: string;
  default?: 'ok' | 'cancel';
  okVariant?: keyof BaseButtonVariant;
  cancelVariant?: keyof BaseButtonVariant;
};

import { BaseButtonVariant } from 'bootstrap-vue-next';
import { ref } from 'vue';

const defaultOptions: Options = {
  title: '##confirmation##',
  cancel: '##no##',
  ok: '##yes##',
  default: 'cancel',
  cancelVariant: 'outline-secondary',
  okVariant: 'outline-danger',
};
const show = defineModel<boolean>({ default: false });
const options = ref<Options>(defaultOptions);
const accept = ref<() => void | Promise<void>>();
const cancel = ref<() => void | Promise<void>>();

async function setShow(opt: Partial<Options> = {}) {
  show.value = true;

  options.value = {
    ...options.value,
    ...opt,
  };

  return new Promise<void>((resolve, reject) => {
    accept.value = () => {
      show.value = false;
      resolve();
    };
    cancel.value = () => {
      show.value = false;
      reject();
    };
  });
}

defineExpose({ isShown: show, show: setShow, defaultOptions });
</script>
<template>
  <BModal
    v-model="show"
    centered
    size="md"
    header-class="px-3 py-2"
    body-class="p-3"
    footer-class="p-1"
    :autofocus-button="options.default"
    :hide-header="!options.text">
    <template #title>
      <h5 class="m-0" v-html="options.title"></h5>
    </template>
    <template #ok>
      <BButton @click="accept" :variant="options.okVariant">
        <span v-html="options.ok"></span>
      </BButton>
    </template>
    <template #cancel>
      <BButton @click="cancel" :variant="options.cancelVariant">
        <span v-html="options.cancel"></span>
      </BButton>
    </template>
    <h5 v-if="!options.text" class="m-0">
      {{ options.title }}
    </h5>
    <span v-else v-html="options.text"> </span>
  </BModal>
</template>
