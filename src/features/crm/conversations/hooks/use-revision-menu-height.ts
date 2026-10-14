"use client";

import { useLayoutEffect, useRef, useState } from "react";

const screenFraction = 0.75;

type MenuLimits = {
  menu: number;
  draft?: number;
  sent?: number;
};

function halfCutHeight(list: HTMLElement, maxHeight: number) {
  const rows = [...list.querySelectorAll<HTMLElement>(":scope > li")];
  const listTop = list.getBoundingClientRect().top;
  let best = 0;
  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    const mid = rect.top - listTop + list.scrollTop + rect.height / 2;
    if (mid > maxHeight) break;
    best = Math.floor(mid);
  }
  return best > 0 ? best : Math.floor(maxHeight);
}

function chromeHeight(panel: HTMLElement, lists: Array<HTMLElement | null>) {
  const style = getComputedStyle(panel);
  const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  let chrome = padding + border;
  for (const child of panel.children) {
    if (lists.some((list) => list === child)) continue;
    const childStyle = getComputedStyle(child);
    chrome +=
      child.getBoundingClientRect().height +
      parseFloat(childStyle.marginTop) +
      parseFloat(childStyle.marginBottom);
  }
  return chrome;
}

function limitFor(list: HTMLElement | null, listMax: number) {
  if (!list || list.scrollHeight <= listMax + 1) return undefined;
  return halfCutHeight(list, listMax);
}

function revealRevision(list: HTMLElement | null, revisionId: string) {
  if (!list) return false;
  const row = list.querySelector<HTMLElement>(`[data-revision-id="${CSS.escape(revisionId)}"]`);
  if (!row) return false;
  if (list.scrollHeight <= list.clientHeight + 1) return true;
  const listRect = list.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const visible = rowRect.top >= listRect.top - 1 && rowRect.bottom <= listRect.bottom + 1;
  if (visible) return true;
  list.scrollTop += rowRect.top - listRect.top - (list.clientHeight - rowRect.height) / 2;
  return true;
}

export function useRevisionMenuHeight(open: boolean, draftCount: number, sentCount: number, revisionId: string) {
  const panelRef = useRef<HTMLDivElement>(null);
  const draftListRef = useRef<HTMLUListElement>(null);
  const sentListRef = useRef<HTMLUListElement>(null);
  const [limits, setLimits] = useState<MenuLimits>({ menu: 0 });

  useLayoutEffect(() => {
    if (!open) return;

    function measure() {
      const panel = panelRef.current;
      if (!panel) return;
      const top = panel.getBoundingClientRect().top;
      const menu = Math.floor(Math.max(0, window.innerHeight * screenFraction - top));
      const draftList = draftListRef.current;
      const sentList = sentListRef.current;
      const listMax = Math.floor(Math.max(0, (menu - chromeHeight(panel, [draftList, sentList])) / 2));
      let draft = limitFor(draftList, listMax);
      let sent = limitFor(sentList, listMax);
      if (draft !== undefined && sent !== undefined) {
        const shared = Math.min(draft, sent);
        draft = shared;
        sent = shared;
      }
      setLimits((current) =>
        current.menu === menu && current.draft === draft && current.sent === sent ? current : { menu, draft, sent },
      );
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, draftCount, sentCount]);

  useLayoutEffect(() => {
    if (!open) return;
    if (revealRevision(draftListRef.current, revisionId)) return;
    revealRevision(sentListRef.current, revisionId);
  }, [open, limits.draft, limits.sent, revisionId]);

  return { panelRef, draftListRef, sentListRef, limits };
}
