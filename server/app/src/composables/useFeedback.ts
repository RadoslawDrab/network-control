import { computed, nextTick, reactive, ref, toValue } from 'vue';

const useFeedback = <T extends Record<string, any>>(
  defaultValue: Partial<T>,
  validity?: (values: Partial<T>) => Partial<Record<keyof T, boolean>>,
  isTouchedAlready: (keyof T)[] = []
) => {
  const isTouchedAlreadyObj = isTouchedAlready.reduce((obj, key) => ({ ...obj, [key]: true }), {});
  const value = reactive<Partial<T>>({ ...defaultValue });
  const isTouched = ref<Partial<Record<keyof T, boolean>>>(isTouchedAlreadyObj);
  const isValid = computed<Partial<Record<keyof T, boolean | null>>>(() => {
    const valid = validity ? validity(toValue(value)) : toValue(value);
    return Object.keys(valid).reduce((obj, key) => {
      return { ...obj, [key]: isTouched.value && isTouched.value[key] ? valid[key] : null };
    }, valid);
  });
  const allValid = computed<boolean>(() => {
    return Object.keys(isValid.value).every((key) => isValid.value[key] === true);
  });

  function onTouched(name: keyof T) {
    // @ts-expect-error Is correct key
    isTouched.value[name] = true;
  }

  async function reset() {
    Object.keys(value).forEach((key) => (value[key] = defaultValue[key]));
    isTouched.value = {};
    await nextTick();
  }

  return { onTouched, value, isValid, isTouched, v: value, reset, allValid };
};
export default useFeedback;
