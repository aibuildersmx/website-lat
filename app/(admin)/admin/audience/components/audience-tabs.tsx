"use client";

import { Children, useId, useState } from "react";

export function AudienceTabs({
  labels,
  panelClassName = "",
  children,
}: {
  labels: string[];
  panelClassName?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const panels = Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="mt-6">
      <div className="border-b border-black/5 dark:border-white/10">
        <div role="tablist" className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {labels.map((label, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`${id}-panel-${index}`}
                id={`${id}-tab-${index}`}
                onClick={() => setActiveIndex(index)}
                className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition ${
                  active
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                    : "bg-white text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:bg-neutral-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            );
        })}
      </div>
    </div>
      <div
        role="tabpanel"
        id={`${id}-panel-${activeIndex}`}
        aria-labelledby={`${id}-tab-${activeIndex}`}
        className={panelClassName}
      >
        {panels[activeIndex]}
      </div>
    </div>
  );
}
