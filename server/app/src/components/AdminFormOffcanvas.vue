<script setup lang="ts">
import { computed } from 'vue';

import useFeedback from 'composables/useFeedback';
import usePromiseAuth from 'composables/usePromiseAuth';
import useToast from 'composables/useToast';

import { AdminSettings } from 'types/index';

const show = defineModel<boolean>({ default: false, required: true });

export type Settings = AdminSettings & { intervalTime: number };
const settings = useFeedback<Settings>(
  {
    adminPasswordCacheTime: 60 * 60,
    reminderTime: 5 * 60,
    intervalTime: 3000,
  },
  (values) => {
    return {
      adminPasswordCacheTime: values.adminPasswordCacheTime > 60 && values.adminPasswordCacheTime <= 60 * 60 * 24,
      reminderTime: values.reminderTime > 0 && values.reminderTime <= 60 * 60,
      intervalTime: values.intervalTime >= 100 && values.intervalTime <= 60 * 1000,
    };
  }
);
const emit = defineEmits<{ submit: [settings: Partial<Settings>] }>();
const auth = usePromiseAuth<AdminSettings>({
  params: ['/admin'],
  onInit: (value) => {
    settings.v = { ...settings.v, ...value };
  },
});
const toast = useToast();

const passwordCacheTimeString = computed(() => toTime(settings.v.adminPasswordCacheTime));
const reminderTimeString = computed(() => toTime(settings.v?.reminderTime));
const intervalTimeString = computed(() => toTime(settings.v?.intervalTime, true));

function toTime(time: number, inMs: boolean = false) {
  if (!time) return '';
  const t = inMs ? time / 1000 : time;
  const hours = Math.floor(t / 60 / 60);
  const minutes = t / 60 - hours * 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} h ${minutes} min`;
  } else if (hours > 0) {
    return `${hours} h`;
  } else if (inMs && minutes < 1) {
    return `${(time / 1000).toFixed(1)} s`;
  }

  return `${Math.floor(t / 60)} min`;
}
async function onSubmit() {
  try {
    await auth.promise('/admin', {}, { method: 'PUT', body: JSON.stringify(settings.v) });
    emit('submit', settings.v);
    toast.show('Updated', { variant: 'success' });
  } catch (error) {
    toast.show('Failed', { variant: 'danger', body: error.message });
  } finally {
    show.value = false;
  }
}
</script>
<template>
  <BOffcanvas v-model="show" placement="end" width="50%" title="Administrator" header-class="border-bottom">
    <BForm class="form" @submit="onSubmit">
      <BFormGroup>
        <BFormText
          for="password-cache"
          aria-label="Czas po jakim token straci ważność (s)"
          tooltip="true"
          tooltip-fixed>
          Czas ważności tokena
        </BFormText>
        <BInputGroup :prepend="passwordCacheTimeString">
          <BFormInput
            id="password-cache"
            v-model="settings.v.adminPasswordCacheTime"
            type="number"
            :min="60"
            :max="60 * 60 * 24"
            :state="settings.isValid.value.adminPasswordCacheTime"
            aria-describedby="password-cache-feedback"
            @blur="() => settings.onTouched('adminPasswordCacheTime')"
            @change="() => settings.onTouched('adminPasswordCacheTime')" />
          <BFormInvalidFeedback id="password-cache-feedback">
            Czas ważności musi być większy niż 1 minuta i mniejszy niż 24 godziny
          </BFormInvalidFeedback>
        </BInputGroup>
      </BFormGroup>
      <BFormGroup>
        <BFormText
          for="reminder-time"
          aria-label="Wyświetl ile pozostało czasu przed końcem blokady (s)"
          tooltip="true"
          tooltip-fixed>
          Czas do wyświetlenia komunikatu
        </BFormText>
        <BInputGroup :prepend="reminderTimeString">
          <BFormInput
            id="reminder-time"
            v-model="settings.v.reminderTime"
            type="number"
            :min="1"
            :max="60 * 60"
            :state="settings.isValid.value.reminderTime"
            aria-describedby="reminder-time-feedback"
            @blur="() => settings.onTouched('reminderTime')"
            @change="() => settings.onTouched('reminderTime')" />
          <BFormInvalidFeedback id="reminder-time-feedback">
            Czas komunikatu musi być większy niż 1 minuta i mniejszy niż 1 godzina
          </BFormInvalidFeedback>
        </BInputGroup>
      </BFormGroup>
      <BFormGroup>
        <BFormText for="interval-time" aria-label="Czas odświeżania siatki (ms)" tooltip="true" tooltip-fixed>
          Czas odświeżania
        </BFormText>
        <BInputGroup :prepend="intervalTimeString">
          <BFormInput
            id="interval-time"
            v-model="settings.v.intervalTime"
            type="number"
            :min="100"
            :max="60 * 1000"
            :state="settings.isValid.value.intervalTime"
            aria-describedby="interval-time-feedback"
            @blur="() => settings.onTouched('intervalTime')"
            @change="() => settings.onTouched('intervalTime')" />
          <BFormInvalidFeedback id="interval-time-feedback">
            Czas odświeżania musi być większy niż 100 ms i mniejszy niż 1 minuta
          </BFormInvalidFeedback>
        </BInputGroup>
      </BFormGroup>
      <BButton type="submit" variant="primary">Aktualizuj</BButton>
    </BForm>
  </BOffcanvas>
</template>
<style scoped lang="scss">
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75em;

  button[type='submit'] {
    margin-top: 1em;
  }
}
</style>
