"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function SearchInputClearButton({ inputId }: { inputId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;
    const update = () => setVisible(Boolean(input.value));
    update();
    input.addEventListener("input", update);
    input.addEventListener("change", update);
    return () => {
      input.removeEventListener("input", update);
      input.removeEventListener("change", update);
    };
  }, [inputId]);

  return (
    <button
      type="button"
      aria-label="キーワードを消す"
      onClick={() => {
        const input = document.getElementById(inputId) as HTMLInputElement | null;
        if (!input) return;
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      }}
      className={`absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-sub/60 transition hover:bg-cream hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <X size={16} />
    </button>
  );
}
