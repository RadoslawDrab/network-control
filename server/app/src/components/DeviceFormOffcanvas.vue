<script setup lang="ts">
import { computed, watch } from 'vue';
import { ref } from 'vue';

import useToast from 'composables/useToast';
import useFeedback from 'composables/useFeedback';

import DeviceGrid from './DeviceGrid.vue';
import ConfirmationModal from './ConfirmationModal.vue';

export type CellSettings = { name: string; shortName?: string; address: string; position: [number, number] };

const props = withDefaults(
  defineProps<{ gridSize?: [number, number]; defaultSettings?: Partial<CellSettings>; edit?: boolean }>(),
  {
    gridSize: () => [12, 12],
    defaultSettings: () => ({}),
    edit: false,
  }
);
const show = defineModel<boolean>({ default: false });
const emit = defineEmits<{ submit: [settings: CellSettings] }>();

const toast = useToast();
const deviceGrid = ref<InstanceType<typeof DeviceGrid>>();
const confirmationModal = ref<InstanceType<typeof ConfirmationModal>>();

const settings = useFeedback<CellSettings>(
  props.defaultSettings,
  (values) => {
    const shortName = values.shortName ?? values.name?.slice(0, 4);
    return {
      name: !!values.name,
      position: values.position
        ? values.position[0] >= 0 &&
          values.position[0] < deviceGrid.value?.gridSize.x &&
          values.position[1] >= 0 &&
          values.position[1] < deviceGrid.value?.gridSize.y
        : false,
      address: !!values.address?.replace(/[^0-9A-F]/gi, '').match(/[0-9A-F]{12}/gi),
      shortName: shortName ? shortName.length > 0 && shortName.length < 5 : values.name?.length > 0,
    };
  },
  props.defaultSettings ? (Object.keys(props.defaultSettings) as (keyof CellSettings)[]) : ['position']
);

const enabledAddresses = computed(() => {
  return props.edit && settings.v.address ? [settings.v.address] : [];
});

async function onSubmit(event: SubmitEvent) {
  if (settings.allValid.value) {
    try {
      await confirmationModal.value.show({
        title: props.edit ? '##device.confirmation.edit##' : '##device.confirmation.add##',
        okVariant: 'outline-success',
        cancelVariant: 'outline-danger',
      });
      emit('submit', settings.v as CellSettings);
      const form = event.target as HTMLFormElement;
      form.reset();
      show.value = false;
      if (!props.edit && props.defaultSettings) await settings.reset();
    } catch (error) {
      toast.show('##canceled##', { variant: 'info' });
    }
  } else {
    toast.show('##error##', { variant: 'danger', body: '##error.not-enough-data##' });
  }
}

watch(
  show,
  async (show) => {
    if (show) await deviceGrid.value?.auth.get();
  },
  { immediate: true }
);
</script>
<template>
  <BOffcanvas
    v-model="show"
    placement="end"
    width="50%"
    header-class="border-bottom"
    :title="props.edit ? '##device.edit##' : '##device.add##'">
    <BForm class="form" @submit="onSubmit">
      <BFormGroup>
        <BFormText for="device-name" data-translate="name">Name</BFormText>
        <BFormInput
          id="device-name"
          v-model.trim="settings.v.name"
          type="text"
          required
          aria-describedby="device-name-feedback"
          placeholder-translate="##name.ask##"
          :state="settings.isValid.value.name"
          @blur="() => settings.onTouched('name')" />
        <BFormInvalidFeedback class="feedback" id="device-name-feedback" data-translate="name.required">
          Name is required
        </BFormInvalidFeedback>
      </BFormGroup>
      <BFormGroup>
        <BFormText for="device-shortName" data-translate="shortcut">Shortcut</BFormText>
        <BFormInput
          id="device-shortName"
          v-model.trim="settings.v.shortName"
          type="text"
          :placeholder="settings.v.name?.slice(0, 4)"
          :state="settings.isValid.value.shortName"
          @blur="() => settings.onTouched('shortName')"
          aria-describedby="device-shortName-feedback" />
        <BFormInvalidFeedback class="feedback" id="device-shortName-feedback" data-translate="shortcut.info">
          Shortcut has to contain maximum of 4 characters
        </BFormInvalidFeedback>
      </BFormGroup>
      <BFormGroup>
        <BFormText for="device-address" data-translate="mac-address">MAC Address</BFormText>
        <BFormInput
          id="device-address"
          v-model.trim="settings.v.address"
          type="text"
          placeholder="00:00:00:00:00:00"
          :lazy-formatter="true"
          :formatter="
            (value) =>
              value
                .replace(/[^0-9A-F:-]/gi, '')
                .slice(0, 17)
                .toUpperCase()
          "
          :min="12"
          required
          :state="settings.isValid.value.address"
          @blur="() => settings.onTouched('address')"
          aria-describedby="device-address-feedback" />
        <BFormInvalidFeedback class="feedback" id="device-address-feedback" data-translate="mac-address.info">
          MAC address has to contain maximum of 12 digits or letters (A-F)
        </BFormInvalidFeedback>
      </BFormGroup>
      <hr />
      <BFormGroup>
        <small class="text-body-secondary form-text" data-translate="grid-position">Grid position</small>
        <BFormInvalidFeedback :state="settings.isValid.value.position" data-translate="grid-position.error">
          Position is required
        </BFormInvalidFeedback>
        <DeviceGrid
          ref="deviceGrid"
          v-model:position="settings.v.position"
          :enabled-addresses="enabledAddresses"
          @blur="() => settings.onTouched('position')"
          :grid-size="props.gridSize"
          disable-used
          select-by-default />
      </BFormGroup>
      <hr />
      <BButton class="mt-3" type="submit" variant="primary">{{ props.edit ? '##update##' : '##add##' }}</BButton>
    </BForm>
  </BOffcanvas>
  <ConfirmationModal ref="confirmationModal" />
</template>
<style scoped lang="scss">
.form {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  hr {
    margin: 0.5em 0;
  }
  input::placeholder {
    color: var(--bs-tertiary-color);
  }
}
</style>
