"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { copy } from "@/src/i18n/en";
import { ColorSwatch } from "@/src/components/ui/color-swatch";
import {
  CATALOG,
  formatUsd,
  getColor,
  type ShedConfig,
} from "@/src/config/shed-config";

const CONTROL_SECTIONS = [
  { id: "style", title: copy.style },
  { id: "size", title: copy.size },
  { id: "material", title: copy.material },
  { id: "colors", title: copy.colors },
  { id: "doors-windows", title: copy.doorsWindows },
  { id: "interior", title: copy.interior },
  { id: "flooring", title: copy.flooring },
  { id: "details", title: copy.details },
] as const;

type SectionId = (typeof CONTROL_SECTIONS)[number]["id"];

const ALL_SECTIONS_OPEN = Object.fromEntries(
  CONTROL_SECTIONS.map((section) => [section.id, true]),
) as Record<SectionId, boolean>;

type ShedControlsProps = {
  config: ShedConfig;
  onChange: (next: ShedConfig) => void;
  onSubmit: () => void;
  children?: ReactNode;
  estimate: {
    total: number;
    financeMonthly: number;
    lines: { label: string; amount: number }[];
  };
  zip: string;
};

function isDesktopViewport() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function ShedControls({
  config,
  onChange,
  onSubmit,
  children,
  estimate,
  zip,
}: ShedControlsProps) {
  const sidingColor = getColor(config.sidingColorId);
  const trimColor = getColor(config.trimColorId);
  const roofColor = getColor(config.roofColorId);
  const shutterColor = getColor(config.shutterColorId);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const ignoreScrollUntilRef = useRef(0);
  const pendingScrollRef = useRef<SectionId | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("style");
  const [scrollRequest, setScrollRequest] = useState(0);
  const [quoteBarVisible, setQuoteBarVisible] = useState(false);
  const [openById, setOpenById] =
    useState<Partial<Record<SectionId, boolean>>>(ALL_SECTIONS_OPEN);

  useLayoutEffect(() => {
    if (isDesktopViewport()) {
      setOpenById({ style: true });
    }
  }, []);

  function toggleSection(id: SectionId) {
    setOpenById((current) => ({ ...current, [id]: !current[id] }));
  }

  function getVerticalScroller() {
    return isDesktopViewport() ? listRef.current : panelRef.current;
  }

  function scrollToSection(id: SectionId) {
    const container = getVerticalScroller();
    const target = container?.querySelector<HTMLElement>(`#section-${id}`);
    if (!container || !target) return;

    ignoreScrollUntilRef.current = Date.now() + 700;
    const stickyOffset = isDesktopViewport() ? 0 : (navRef.current?.offsetHeight ?? 0);
    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      stickyOffset;
    container.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  }

  function selectSection(id: SectionId) {
    setActiveSection(id);
    pendingScrollRef.current = id;
    setOpenById((current) => ({ ...current, [id]: true }));
    setScrollRequest((value) => value + 1);
  }

  useEffect(() => {
    const id = pendingScrollRef.current;
    if (!id) return;
    pendingScrollRef.current = null;
    scrollToSection(id);
  }, [openById, scrollRequest]);

  useEffect(() => {
    const panel = panelRef.current;
    const list = listRef.current;

    function syncActiveSection() {
      if (Date.now() < ignoreScrollUntilRef.current) return;
      const scroller = getVerticalScroller();
      if (!scroller) return;

      const stickyOffset = isDesktopViewport()
        ? 24
        : (navRef.current?.offsetHeight ?? 24);
      const marker = scroller.getBoundingClientRect().top + stickyOffset + 1;
      let next: SectionId = CONTROL_SECTIONS[0].id;
      for (const section of CONTROL_SECTIONS) {
        const el = scroller.querySelector<HTMLElement>(`#section-${section.id}`);
        if (el && el.getBoundingClientRect().top <= marker) {
          next = section.id;
        }
      }
      setActiveSection((current) => (current === next ? current : next));
    }

    function syncQuoteBar() {
      if (isDesktopViewport()) {
        setQuoteBarVisible(false);
        return;
      }
      const scroller = panelRef.current;
      const header = scroller?.querySelector("header");
      if (!scroller || !header) {
        setQuoteBarVisible(false);
        return;
      }
      const visible =
        header.getBoundingClientRect().bottom <=
        scroller.getBoundingClientRect().top + 1;
      setQuoteBarVisible((current) => (current === visible ? current : visible));
    }

    function onPanelScroll() {
      syncActiveSection();
      syncQuoteBar();
    }

    panel?.addEventListener("scroll", onPanelScroll, { passive: true });
    list?.addEventListener("scroll", syncActiveSection, { passive: true });
    return () => {
      panel?.removeEventListener("scroll", onPanelScroll);
      list?.removeEventListener("scroll", syncActiveSection);
    };
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={panelRef}
        className={`min-h-0 flex-1 overflow-y-auto lg:overflow-hidden lg:flex lg:flex-col ${
          quoteBarVisible ? "pb-24" : ""
        }`}
      >
        {children}
        <MobileSectionNav
          ref={navRef}
          activeId={activeSection}
          onSelect={selectSection}
        />
      <div
        ref={listRef}
        className="divide-y divide-[#E5E7EB] lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
      >
        <Accordion
          id="style"
          title={copy.style}
          open={Boolean(openById.style)}
          onToggle={() => toggleSection("style")}
        >
          <div className="grid grid-cols-3 gap-2.5">
            {CATALOG.styles.map((style) => {
              const selected = config.styleId === style.id;
              return (
                <button
                  key={style.id}
                  className="group flex w-full flex-col items-center text-left focus:outline-none"
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ ...config, styleId: style.id })}
                >
                  <div
                    className={`relative aspect-[4/3] w-full overflow-hidden rounded-md bg-[#f3f4f6] p-1 ${
                      selected ? "border-2 border-black" : "border border-gray-200"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={style.label}
                      src={style.image}
                      className="h-full w-full object-contain"
                    />
                    {selected ? <SelectedMark /> : null}
                  </div>
                  <span className="mt-1.5 text-center text-xs leading-tight font-semibold text-gray-950">
                    {style.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Accordion>

        <Accordion
          id="size"
          title={copy.size}
          open={Boolean(openById.size)}
          onToggle={() => toggleSection("size")}
        >
          <div className="grid grid-cols-2 gap-2.5">
            {CATALOG.sizes.map((size) => {
              const selected =
                config.width === size.width && config.length === size.length;
              return (
                <button
                  key={`${size.width}x${size.length}`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onChange({
                      ...config,
                      width: size.width,
                      length: size.length,
                    })
                  }
                  className={`relative px-3 py-2 text-left text-xs font-medium transition-all ${
                    selected
                      ? "rounded-sm border-2 border-black bg-gray-50"
                      : "rounded-sm border border-gray-300 hover:border-black"
                  }`}
                >
                  <span className="font-semibold text-gray-900">
                    {size.width} × {size.length} ft
                  </span>
                  {selected ? <SelectedMark /> : null}
                </button>
              );
            })}
          </div>
        </Accordion>

        <Accordion
          id="material"
          title={copy.material}
          open={Boolean(openById.material)}
          onToggle={() => toggleSection("material")}
        >
          <div className="space-y-5">
            <div className="space-y-3">
              <h3 className="font-serif text-sm font-semibold text-gray-900">
                {copy.sidingTrim}
              </h3>
              <div className="flex items-center gap-6">
                {CATALOG.sidingTypes.map((option) => (
                  <TextureSwatch
                    key={option.id}
                    label={option.label}
                    image={option.image}
                    selected={config.sidingTypeId === option.id}
                    onSelect={() =>
                      onChange({ ...config, sidingTypeId: option.id })
                    }
                  />
                ))}
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <h3 className="font-serif text-sm font-semibold text-gray-900">
                {copy.roof}
              </h3>
              <div className="flex items-center gap-6">
                {CATALOG.roofTypes.map((option) => (
                  <TextureSwatch
                    key={option.id}
                    label={option.label}
                    image={option.image}
                    selected={config.roofTypeId === option.id}
                    onSelect={() =>
                      onChange({ ...config, roofTypeId: option.id })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </Accordion>

        <Accordion
          id="colors"
          title={copy.colors}
          open={Boolean(openById.colors)}
          onToggle={() => toggleSection("colors")}
        >
          <ColorSection
            title={copy.sidingColor}
            selectedLabel={sidingColor.label}
            selectedId={config.sidingColorId}
            onSelect={(sidingColorId) =>
              onChange({ ...config, sidingColorId, trimColorId: sidingColorId })
            }
          />
          <ColorSection
            title={copy.trimColor}
            selectedLabel={trimColor.label}
            selectedId={config.trimColorId}
            onSelect={(trimColorId) => onChange({ ...config, trimColorId })}
          />
          <ColorSection
            title={copy.roofColor}
            selectedLabel={roofColor.label}
            selectedId={config.roofColorId}
            extraIds={["coffee-brown"]}
            onSelect={(roofColorId) => onChange({ ...config, roofColorId })}
          />
          <ColorSection
            title={copy.shutterColor}
            selectedLabel={shutterColor.label}
            selectedId={config.shutterColorId}
            onSelect={(shutterColorId) =>
              onChange({ ...config, shutterColorId })
            }
          />
        </Accordion>

        <Accordion
          id="doors-windows"
          title={copy.doorsWindows}
          open={Boolean(openById["doors-windows"])}
          onToggle={() => toggleSection("doors-windows")}
        >
          <p className="text-xs leading-relaxed text-gray-500">{copy.doorsHint}</p>
          <div className="flex items-center space-x-2 border-b border-gray-100 pt-1 pb-3">
            {(["front", "left", "back", "right"] as const).map((face) => (
              <button
                key={face}
                type="button"
                onClick={() => onChange({ ...config, wallFace: face })}
                className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                  config.wallFace === face
                    ? "bg-stone-900 text-white"
                    : "border border-gray-200 bg-white text-gray-700"
                }`}
              >
                {copy[face]}
              </button>
            ))}
          </div>
          <h4 className="mt-3 mb-3 text-xs font-semibold text-gray-800">
            {copy.addItems}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <OpeningTile
              label={copy.door}
              active={config.doorStyle === "single"}
              onClick={() =>
                onChange({
                  ...config,
                  doorStyle: config.doorStyle === "single" ? "none" : "single",
                })
              }
            />
            <OpeningTile
              label={copy.doubleDoor}
              active={config.doorStyle === "double"}
              onClick={() =>
                onChange({
                  ...config,
                  doorStyle: config.doorStyle === "double" ? "none" : "double",
                })
              }
            />
            <OpeningTile
              label={copy.window}
              active={config.hasWindow}
              onClick={() =>
                onChange({ ...config, hasWindow: !config.hasWindow })
              }
            />
            <OpeningTile label={copy.transom} active={false} onClick={() => undefined} />
            <OpeningTile label={copy.rollup} active={false} onClick={() => undefined} />
            <OpeningTile
              label={copy.vent}
              active={config.hasVent}
              onClick={() => onChange({ ...config, hasVent: !config.hasVent })}
            />
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3">
            <h4 className="mb-2 text-xs font-semibold text-gray-800">
              {copy.arrange}
            </h4>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...config,
                  doorStyle: "none",
                  hasWindow: false,
                  hasVent: false,
                })
              }
              className="flex w-full items-center justify-center rounded-full border border-gray-300 py-2 text-xs font-medium text-gray-600"
            >
              {copy.clear}
            </button>
          </div>
        </Accordion>

        <Accordion
          id="interior"
          title={copy.interior}
          open={Boolean(openById.interior)}
          onToggle={() => toggleSection("interior")}
        >
          <p className="text-xs leading-relaxed text-gray-500">
            {copy.interiorHint}
          </p>
          <div className="text-xs text-gray-600">
            <span className="font-semibold text-gray-800">{copy.loftLabel}</span>{" "}
            {copy.loftOption}
          </div>
          <label className="flex cursor-pointer items-center space-x-2.5">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                config.hasLoft ? "border-amber-500" : "border-gray-400"
              }`}
            >
              {config.hasLoft ? (
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              ) : null}
            </span>
            <button
              type="button"
              className="text-xs font-medium text-gray-800"
              onClick={() => onChange({ ...config, hasLoft: !config.hasLoft })}
            >
              {copy.loftOption}
            </button>
          </label>
        </Accordion>

        <Accordion
          id="flooring"
          title={copy.flooring}
          open={Boolean(openById.flooring)}
          onToggle={() => toggleSection("flooring")}
        >
          <p className="border-b border-gray-200 pb-3 text-xs leading-relaxed text-gray-500">
            {copy.flooringHint}
          </p>
          <div className="space-y-3 pt-3">
            {CATALOG.flooring.map((option) => (
              <button
                key={option.id}
                type="button"
                className="flex items-center space-x-3 text-left"
                onClick={() => onChange({ ...config, flooringId: option.id })}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    config.flooringId === option.id
                      ? "border-amber-500"
                      : "border-gray-400"
                  }`}
                >
                  {config.flooringId === option.id ? (
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  ) : null}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </Accordion>

        <Accordion
          id="details"
          title={copy.details}
          open={Boolean(openById.details)}
          onToggle={() => toggleSection("details")}
          className="lg:hidden"
        >
          <EstimateBreakdownBody
            estimate={estimate}
            zip={zip}
            onQuote={onSubmit}
          />
        </Accordion>
      </div>
      <button type="button" className="sr-only" onClick={onSubmit}>
        {copy.submitQuote}
      </button>
      </div>
      <MobileQuoteBar
        visible={quoteBarVisible}
        total={estimate.total}
        onQuote={onSubmit}
        onPriceClick={() => selectSection("details")}
      />
    </div>
  );
}

function MobileQuoteBar({
  visible,
  total,
  onQuote,
  onPriceClick,
}: {
  visible: boolean;
  total: number;
  onQuote: () => void;
  onPriceClick: () => void;
}) {
  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out lg:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl leading-none font-semibold tracking-tight text-gray-950">
            {formatUsd(total)}
          </div>
          <button
            type="button"
            className="mt-1 text-xs font-medium text-slate-500 underline decoration-slate-400 underline-offset-2"
            onClick={onPriceClick}
          >
            {copy.seeDetails}
          </button>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-black px-5 py-3 text-sm leading-none font-medium whitespace-nowrap text-white"
          onClick={onQuote}
        >
          {copy.submitQuote}
        </button>
      </div>
    </div>
  );
}

function MobileSectionNav({
  activeId,
  onSelect,
  ref,
}: {
  activeId: SectionId;
  onSelect: (id: SectionId) => void;
  ref?: Ref<HTMLElement>;
}) {
  const scrollerRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({});

  useEffect(() => {
    const scroller = scrollerRef.current;
    const item = itemRefs.current[activeId];
    if (!scroller || !item) return;

    const spacer = scroller.querySelector<HTMLElement>("[data-nav-end-spacer]");
    if (spacer) {
      spacer.style.width = `${Math.max(scroller.clientWidth - item.offsetWidth, 0)}px`;
    }

    scroller.scrollTo({
      left: Math.max(item.offsetLeft - 24, 0),
      behavior: "smooth",
    });
  }, [activeId]);

  return (
    <nav
      ref={(node) => {
        scrollerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      aria-label={copy.sectionNav}
      className="mobile-section-nav sticky top-0 z-20 flex shrink-0 items-end overflow-x-auto border-b border-[#E5E7EB] bg-white lg:hidden"
    >
      <span className="w-6 shrink-0" aria-hidden="true" />
      {CONTROL_SECTIONS.map((section) => {
        const selected = section.id === activeId;
        return (
          <button
            key={section.id}
            ref={(node) => {
              itemRefs.current[section.id] = node;
            }}
            type="button"
            aria-current={selected ? "true" : undefined}
            className="-mb-px shrink-0 pr-6 text-sm whitespace-nowrap"
            onClick={() => onSelect(section.id)}
          >
            <span
              className={`inline-block border-b-2 py-3 transition-colors ${
                selected
                  ? "border-gray-900 font-medium text-gray-900"
                  : "border-transparent text-gray-400"
              }`}
            >
              {section.title}
            </span>
          </button>
        );
      })}
      <span data-nav-end-spacer className="shrink-0" aria-hidden="true" />
    </nav>
  );
}

function Accordion({
  id,
  title,
  open,
  onToggle,
  children,
  className = "",
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div id={`section-${id}`} className={`select-none ${className}`.trim()}>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between p-6 hover:bg-gray-50/70"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="font-serif text-base font-semibold tracking-normal text-gray-900">
          {title}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="space-y-6 px-6 pt-1 pb-6">{children}</div> : null}
    </div>
  );
}

function EstimateBreakdownBody({
  estimate,
  zip,
  onQuote,
}: {
  estimate: {
    total: number;
    financeMonthly: number;
    lines: { label: string; amount: number }[];
  };
  zip: string;
  onQuote: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700">
            $
          </div>
          <div>
            <span className="block text-base leading-tight font-semibold text-gray-900">
              {copy.estimateBreakdown}
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              {copy.tapItemized}
            </span>
          </div>
        </div>
        <span className="font-mono text-xl font-bold text-gray-900">
          {formatUsd(estimate.total)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200/70 py-2.5 text-xs text-gray-600">
        <span>{copy.paymentOptions}</span>
        <span>{copy.fromAsLowAs}</span>
        <span className="rounded-sm border border-amber-800/80 bg-amber-100/30 px-2 py-0.5 text-[11px] font-semibold text-amber-800/80">
          {formatUsd(estimate.financeMonthly)}/mo
        </span>
        <span>{copy.forMonths}</span>
      </div>
      <div className="divide-y divide-gray-200/70 text-xs">
        {estimate.lines.map((line) => (
          <div key={line.label} className="flex items-center justify-between py-1.5">
            <span className="font-medium text-gray-700">{line.label}</span>
            <span className="font-mono font-semibold text-gray-900">
              {formatUsd(line.amount)}
            </span>
          </div>
        ))}
        <div className="flex items-baseline justify-between pt-2.5 font-bold text-gray-950">
          <span className="text-xs tracking-wide uppercase">{copy.totalEstimate}</span>
          <span className="font-mono text-sm">{formatUsd(estimate.total)}</span>
        </div>
      </div>
      <p className="pt-3 text-[11px] leading-relaxed text-gray-500">
        {copy.quoteDisclaimer}
      </p>
      <p className="text-[11px] leading-relaxed text-gray-500">{copy.satisfaction}</p>
      <button
        type="button"
        onClick={onQuote}
        className="mt-2 block w-full rounded-full bg-black py-3 text-center text-sm font-medium text-white"
      >
        {copy.submitQuote}
      </button>
      <div className="flex items-center space-x-2 pt-3 text-xs text-gray-600">
        <span>
          {copy.deliveryTo}{" "}
          <button type="button" className="font-medium underline">
            {zip}
          </button>
        </span>
      </div>
      <button type="button" className="text-left text-xs font-medium text-gray-800 underline">
        {copy.installation}
      </button>
    </div>
  );
}

function SelectedMark() {
  return (
    <span className="absolute right-1.5 bottom-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white shadow-sm">
      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
    </span>
  );
}

function TextureSwatch({
  label,
  image,
  selected,
  onSelect,
}: {
  label: string;
  image: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className="group flex flex-col items-center focus:outline-none"
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="relative h-14 w-14">
        <div
          className={`h-full w-full overflow-hidden rounded-full bg-stone-100 ${
            selected ? "border-2 border-black" : "border border-gray-200"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={label} src={image} className="h-full w-full object-cover" />
        </div>
        {selected ? (
          <div className="absolute right-0 bottom-0 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white shadow">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </div>
        ) : null}
      </div>
      <span className="mt-1.5 max-w-20 text-center text-xs leading-tight font-semibold text-gray-800">
        {label}
      </span>
    </button>
  );
}

function ColorSection({
  title,
  selectedLabel,
  selectedId,
  onSelect,
  extraIds = [],
}: {
  title: string;
  selectedLabel: string;
  selectedId: string;
  onSelect: (id: string) => void;
  extraIds?: string[];
}) {
  const colors = CATALOG.colors.filter(
    (color) => color.id !== "coffee-brown" || extraIds.includes(color.id),
  );
  const ordered = extraIds.length
    ? [
        ...colors.filter((color) => extraIds.includes(color.id)),
        ...colors.filter((color) => !extraIds.includes(color.id)),
      ]
    : colors;

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-baseline space-x-2">
        <h3 className="font-serif text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-xs font-normal text-gray-500">| {selectedLabel}</span>
      </div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 pt-1">
        {ordered.map((color) => (
          <ColorSwatch
            key={color.id}
            label={color.label}
            hex={color.hex}
            selected={selectedId === color.id}
            onSelect={() => onSelect(color.id)}
          />
        ))}
      </div>
    </div>
  );
}

function OpeningTile({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-24 flex-col items-center justify-center rounded-xl border bg-gray-50 p-2.5 ${
        active ? "border-black" : "border-gray-200"
      }`}
    >
      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full border border-amber-600/80 text-amber-700">
        +
      </span>
      <span className="text-center text-[11px] font-medium text-gray-700">
        {label}
      </span>
    </button>
  );
}
