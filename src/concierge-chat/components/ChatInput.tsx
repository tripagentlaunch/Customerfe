import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

export default function ChatInput({
  onSend,
  disabled,
  initialValue,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  initialValue?: string;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Pre-filled message (e.g. from a "Plan a trip" button): shown in the box for the
  // visitor to edit and send; never auto-sent. Only fills an empty box.
  useEffect(() => {
    if (!initialValue) return;
    setValue((v) => v || initialValue);
    const el = textareaRef.current;
    if (el) {
      window.requestAnimationFrame(() => {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
        el.focus();
      });
    }
  }, [initialValue]);

  function resize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  return (
    <form className="ta-cc-input" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          resize(e.target);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Tell me about the trip you're dreaming of…"
        autoComplete="off"
        aria-label="Message Aanya"
        rows={1}
      />
      <button type="submit" className="ta-cc-send" disabled={disabled}>
        Send
      </button>
    </form>
  );
}
