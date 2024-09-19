<script setup lang="ts">
export type Options = { title: string; text?: string; cancel: string; ok: string; default?: 'ok' | 'cancel' };

import { ref } from 'vue';

const defaultOptions: Options = {
  title: 'Potwierdzenie',
  cancel: 'Nie',
  ok: 'Tak',
  default: 'cancel',
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
    accept.value = resolve;
    cancel.value = reject;
  });
}

defineExpose({ isShown: show, show: setShow, defaultOptions });
</script>
<template>
  <BModal
    v-model="show"
    centered
    cancel-variant="outline-secondary"
    ok-variant="outline-danger"
    :title="options.title"
    :ok-title="options.ok"
    :cancel-title="options.cancel"
    size="sm"
    header-class="px-3 py-2"
    body-class="p-3"
    footer-class="p-1"
    :autofocus-button="options.default"
    :hide-header="!options.text"
    @ok="accept"
    @cancel="cancel">
    <h5 v-if="!options.text" class="m-0">
      {{ options.title }}
    </h5>
    <span v-else>
      {{ options.text }}
    </span>
  </BModal>
</template>
