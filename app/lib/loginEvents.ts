let listener: any = null;

export const openLogin = (data?: any) => {
  window.dispatchEvent(
    new CustomEvent("raileats:open-login", { detail: data || {} })
  );
};

export const onOpenLogin = (fn: any) => {
  listener = fn;
};

export const triggerOpenLogin = (data: any) => {
  listener && listener(data);
};