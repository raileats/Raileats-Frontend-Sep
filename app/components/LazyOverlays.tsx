"use client";

import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { CART_OPEN_EVENT } from "../lib/cartEvents";

type OverlayComponent = ComponentType<Record<string, never>>;

export default function LazyOverlays() {
  const [LoginOverlay, setLoginOverlay] = useState<OverlayComponent | null>(null);
  const [FeedbackOverlay, setFeedbackOverlay] =
    useState<OverlayComponent | null>(null);
  const [CartOverlay, setCartOverlay] = useState<OverlayComponent | null>(null);

  const loginLoading = useRef(false);
  const feedbackLoading = useRef(false);
  const cartLoading = useRef(false);

  const loginReady = useRef(false);
  const feedbackReady = useRef(false);
  const cartReady = useRef(false);

  const pendingLoginDetail = useRef<any>(null);

  useEffect(() => {
    let active = true;

    const loadLogin = (event: Event) => {
      if (loginReady.current) return;

      pendingLoginDetail.current = (event as CustomEvent).detail ?? {};

      if (loginLoading.current) return;
      loginLoading.current = true;

      void import("./LoginModal").then((module) => {
        if (active) setLoginOverlay(() => module.default);
      });
    };

    const loadFeedback = () => {
      if (feedbackReady.current || feedbackLoading.current) return;
      feedbackLoading.current = true;

      void import("./FeedbackModal").then((module) => {
        if (active) setFeedbackOverlay(() => module.default);
      });
    };

    const loadCart = () => {
      if (cartReady.current || cartLoading.current) return;
      cartLoading.current = true;

      void import("./CartPopup").then((module) => {
        if (active) setCartOverlay(() => module.default);
      });
    };

    window.addEventListener("raileats:open-login", loadLogin);
    window.addEventListener("raileats:open-feedback", loadFeedback);
    document.addEventListener(CART_OPEN_EVENT, loadCart);

    return () => {
      active = false;
      window.removeEventListener("raileats:open-login", loadLogin);
      window.removeEventListener("raileats:open-feedback", loadFeedback);
      document.removeEventListener(CART_OPEN_EVENT, loadCart);
    };
  }, []);

  useEffect(() => {
    if (!LoginOverlay || loginReady.current) return;

    loginReady.current = true;
    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("raileats:open-login", {
          detail: pendingLoginDetail.current ?? {},
        })
      );
      pendingLoginDetail.current = null;
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [LoginOverlay]);

  useEffect(() => {
    if (!FeedbackOverlay || feedbackReady.current) return;

    feedbackReady.current = true;
    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("raileats:open-feedback"));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [FeedbackOverlay]);

  useEffect(() => {
    if (!CartOverlay || cartReady.current) return;

    cartReady.current = true;
    const timeoutId = window.setTimeout(() => {
      document.dispatchEvent(new Event(CART_OPEN_EVENT));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [CartOverlay]);

  return (
    <>
      {LoginOverlay && <LoginOverlay />}
      {FeedbackOverlay && <FeedbackOverlay />}
      {CartOverlay && <CartOverlay />}
    </>
  );
}
