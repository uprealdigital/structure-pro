"use client";

import { useLayoutEffect, useState } from "react";

const desktopQuery = "(min-width: 1024px)";

export function useCrmDesktop(): boolean {
  const [desktop, setDesktop] = useState(true);

  useLayoutEffect(() => {
    const query = window.matchMedia(desktopQuery);
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return desktop;
}
