import { ColorVariant, OrchestratedToast, useToast } from 'bootstrap-vue-next';

const useT = () => {
  const toast = useToast();
  function show(
    title: string,
    body: string,
    options?: { time?: number; variant?: ColorVariant },
    toastOptions?: OrchestratedToast
  ) {
    const time = options?.time ?? 0;
    const variant = options?.variant ?? 'secondary';

    if (toast.show)
      toast.show({
        props: {
          title,
          body,
          value: time,
          interval: 100,
          pos: 'bottom-center',
          progressProps: {
            variant,
          },
          noHoverPause: true,
          ...getClass(variant),
          ...toastOptions,
        },
      });
    function getClass(variant: ColorVariant): { bodyClass: string; headerClass: string } {
      switch (variant) {
        case 'primary':
          return { bodyClass: 'bg-primary text-light', headerClass: 'bg-primary text-light' };
        case 'secondary':
          return {
            bodyClass: 'bg-secondary text-light',
            headerClass: 'bg-secondary text-light',
          };
        case 'danger':
          return {
            bodyClass: 'bg-danger text-light',
            headerClass: 'bg-danger text-light',
          };
        case 'success':
          return {
            bodyClass: 'bg-success text-light',
            headerClass: 'bg-success text-light',
          };
        case 'warning':
          return {
            bodyClass: 'bg-warning text-light',
            headerClass: 'bg-warning text-light',
          };
        case 'info':
          return {
            bodyClass: 'bg-info text-light',
            headerClass: 'bg-info text-light',
          };
        case 'dark':
          return {
            bodyClass: 'bg-dark text-light',
            headerClass: 'bg-dark text-light',
          };
        case 'light':
          return {
            bodyClass: 'bg-light text-dark',
            headerClass: 'bg-light text-dark',
          };

        default:
          return { bodyClass: '', headerClass: '' };
      }
    }
  }

  return { show };
};
export default useT;
