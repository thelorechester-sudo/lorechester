"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export type CartItem = { variantId: string; qty: number };

const STORAGE_KEY = "lorechester.cart.v1";
const MAX_PER_LINE = 20;

/* -------------------------------------------------------------------------- */
/* The store                                                                   */
/*                                                                             */
/* localStorage IS the source of truth, so the bag is modelled as an external  */
/* store rather than React state mirrored into an effect. That gives correct   */
/* SSR hydration and cross-tab sync for free, and avoids the cascading renders */
/* a setState-in-effect would cause.                                           */
/* -------------------------------------------------------------------------- */

const EMPTY: CartItem[] = [];

/** Cached so getSnapshot returns a stable reference between writes. */
let snapshot: CartItem[] = EMPTY;
let snapshotRaw: string | null = null;

const listeners = new Set<() => void>();

function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter(
      (item): item is CartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as CartItem).variantId === "string" &&
        Number.isInteger((item as CartItem).qty) &&
        (item as CartItem).qty > 0,
    );
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): CartItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  // useSyncExternalStore re-renders whenever this returns a new reference, so
  // only reparse when the stored string actually changed.
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = parse(raw);
  }
  return snapshot;
}

/** There is no bag on the server; the first client render corrects it. */
function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // `storage` only fires in *other* tabs, so local writes notify directly.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(next: CartItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

function update(mutate: (current: CartItem[]) => CartItem[]): void {
  write(mutate(getSnapshot()));
}

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

type CartContextValue = {
  items: CartItem[];
  count: number;
  isOpen: boolean;
  /** False during SSR and the first paint, when the bag is not yet known. */
  hydrated: boolean;
  add: (variantId: string, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const [isOpen, setIsOpen] = useState(false);

  const add = useCallback((variantId: string, qty = 1) => {
    update((current) => {
      const existing = current.find((item) => item.variantId === variantId);
      if (!existing) return [...current, { variantId, qty }];
      return current.map((item) =>
        item.variantId === variantId
          ? { ...item, qty: Math.min(MAX_PER_LINE, item.qty + qty) }
          : item,
      );
    });
    setIsOpen(true);
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    update((current) =>
      qty <= 0
        ? current.filter((item) => item.variantId !== variantId)
        : current.map((item) =>
            item.variantId === variantId
              ? { ...item, qty: Math.min(MAX_PER_LINE, qty) }
              : item,
          ),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    update((current) => current.filter((item) => item.variantId !== variantId));
  }, []);

  const clear = useCallback(() => write([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.qty, 0),
      isOpen,
      hydrated,
      add,
      setQty,
      remove,
      clear,
      open,
      close,
    }),
    [items, isOpen, hydrated, add, setQty, remove, clear, open, close],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
