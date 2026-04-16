/**
 * lib/utils.ts
 *
 * Shared utility functions used across Inkognito.
 */

import { clsx, type ClassValue } from "clsx";

/* ── Class merging ─────────────────────────────────────────── */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/* ── Text truncation ───────────────────────────────────────── */
/**
 * Truncate text to a max length with ellipsis.
 * Breaks at word boundaries when possible.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.8 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

/* ── Share URL builder ─────────────────────────────────────── */
/**
 * Build a shareable URL for a confession.
 * Includes a snippet for OG meta preview.
 */
export function buildShareUrl(confessionId: string, content: string): string {
  const snippet = encodeURIComponent(truncate(content, 100));
  return `${typeof window !== "undefined" ? window.location.origin : ""}/c/${confessionId}?preview=${snippet}`;
}

/* ── Social share helpers ──────────────────────────────────── */
export function shareToTwitter(url: string, text: string): void {
  const params = new URLSearchParams({ url, text: truncate(text, 200) });
  window.open(`https://twitter.com/intent/tweet?${params}`, "_blank", "noopener");
}

export function shareToWhatsApp(url: string, text: string): void {
  const msg = encodeURIComponent(`${truncate(text, 150)}\n\n${url}`);
  window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener");
}

export function shareTelegram(url: string, text: string): void {
  const params = new URLSearchParams({ url, text: truncate(text, 200) });
  window.open(`https://t.me/share/url?${params}`, "_blank", "noopener");
}

/* ── Copy to clipboard ─────────────────────────────────────── */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const success = document.execCommand("copy");
    document.body.removeChild(el);
    return success;
  }
}

/* ── Number formatting ─────────────────────────────────────── */
/**
 * Format large numbers compactly: 1200 → "1.2k"
 */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1000000) return `${Math.floor(n / 1000)}k`;
  return `${(n / 1000000).toFixed(1)}m`;
}

/* ── Debounce ──────────────────────────────────────────────── */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ── Random anonymous name generator ──────────────────────── */
const ADJECTIVES = [
  "silent", "shadowed", "hollow", "drifting", "nameless",
  "distant", "obscure", "veiled", "phantom", "fleeting",
];
const NOUNS = [
  "ghost", "ember", "echo", "cipher", "specter",
  "void", "trace", "signal", "whisper", "current",
];

/**
 * Generate a random anonymous display name for chat.
 * Example: "silent_echo_4821"
 */
export function generateAnonHandle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}_${noun}_${num}`;
}
