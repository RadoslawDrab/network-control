import { ComponentPublicInstance, MaybeRef, MaybeRefOrGetter, ref, toValue, watch } from 'vue';

const useHover = <T extends MaybeElement>(element?: MaybeElementRef<T>) => {
  const isHovered = ref<boolean>(false);

  const targetRef = ref(element ?? window?.document.body);
  watch(
    targetRef,
    (elRef) => {
      const target = unrefElement(elRef);
      if (!target || !(target instanceof Element)) return;
      target.addEventListener('pointerenter', () => {
        isHovered.value = true;
      });
      target.addEventListener('pointerleave', () => {
        isHovered.value = false;
      });
    },
    { immediate: true }
  );

  return isHovered;
};
export default useHover;

// From `vueuse`
export type VueInstance = ComponentPublicInstance;
export type MaybeElementRef<T extends MaybeElement = MaybeElement> = MaybeRef<T>;
export type MaybeComputedElementRef<T extends MaybeElement = MaybeElement> = MaybeRefOrGetter<T>;
export type MaybeElement = HTMLElement | SVGElement | VueInstance | undefined | null;
export type UnRefElementReturn<T extends MaybeElement = MaybeElement> = T extends VueInstance
  ? Exclude<MaybeElement, VueInstance>
  : T | undefined;

export function unrefElement<T extends MaybeElement>(elRef: MaybeComputedElementRef<T>): UnRefElementReturn<T> {
  const plain = toValue(elRef);
  return (plain as VueInstance)?.$el ?? plain;
}
