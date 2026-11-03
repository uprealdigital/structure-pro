"use client";

import { createContext, useContext, useLayoutEffect } from "react";

export const CrmMobileNavHiddenContext = createContext<(hidden: boolean) => void>(() => {});

export const CrmMobileContentInsetContext = createContext<(reserve: boolean) => void>(() => {});

export function useReserveCrmMobileNavSpace(reserve: boolean) {
  const setReserve = useContext(CrmMobileContentInsetContext);

  useLayoutEffect(() => {
    setReserve(reserve);
    return () => setReserve(true);
  }, [reserve, setReserve]);
}

export function useHideCrmMobileNav(hidden: boolean) {
  const setHidden = useContext(CrmMobileNavHiddenContext);

  useLayoutEffect(() => {
    setHidden(hidden);
    return () => setHidden(false);
  }, [hidden, setHidden]);
}
