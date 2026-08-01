import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Ctx = {
  selected: string[];
  toggle: (offerId: string) => void;
  clear: () => void;
  isSelected: (offerId: string) => boolean;
};

const CompareContext = createContext<Ctx>({
  selected: [],
  toggle: () => {},
  clear: () => {},
  isSelected: () => false,
});

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((offerId: string) => {
    setSelected((prev) =>
      prev.includes(offerId) ? prev.filter((id) => id !== offerId) : [...prev, offerId].slice(-4),
    );
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      selected,
      toggle,
      clear: () => setSelected([]),
      isSelected: (id: string) => selected.includes(id),
    }),
    [selected, toggle],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export const useCompare = () => useContext(CompareContext);
