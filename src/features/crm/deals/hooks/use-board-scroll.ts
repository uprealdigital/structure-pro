"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

const scrollEdgeSlop = 2;

export function useBoardScroll(scroller: RefObject<HTMLDivElement | null>, layoutKey: string) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;

    function update() {
      const node = scroller.current;
      if (!node) return;
      const max = node.scrollWidth - node.clientWidth;
      const nextLeft = node.scrollLeft > scrollEdgeSlop;
      const nextRight = max > scrollEdgeSlop && node.scrollLeft < max - scrollEdgeSlop;
      setCanScrollLeft((current) => (current === nextLeft ? current : nextLeft));
      setCanScrollRight((current) => (current === nextRight ? current : nextRight));
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scroller, layoutKey]);

  return { canScrollLeft, canScrollRight };
}
