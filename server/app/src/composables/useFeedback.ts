import { computed, nextTick, reactive, ref, toValue } from 'vue';

const useFeedback = <T extends Record<string, any>>(
  defaultValue: Partial<T>,
  validity?: (values: Partial<T>) => Partial<Record<keyof T, boolean>>
) => {
  const value = reactive<Partial<T>>({ ...defaultValue });
  const isTouched = ref<Partial<Record<keyof T, boolean>>>({});
  const isValid = computed<Partial<Record<keyof T, boolean | null>>>(() => {
    if (!validity) return {};

    const valid = validity(toValue(value));
    return Object.keys(valid).reduce((obj, key) => {
      return { ...obj, [key]: isTouched.value && isTouched.value[key] ? valid[key] : null };
    }, valid);
  });

  function onTouched(name: keyof T) {
    // @ts-expect-error Is correct key
    isTouched.value[name] = true;
  }

  async function reset() {
    Object.assign(value, { ...defaultValue });
    isTouched.value = {};
    await nextTick();
  }

  return { onTouched, value, isValid, isTouched, v: value, reset };
};
export default useFeedback;
