import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type AcademicWeek } from './supabase';
import { useAuth } from './auth';

interface WeekContextValue {
  /** All academic weeks, ordered by week number. */
  weeks: AcademicWeek[];
  /** True while the initial list of weeks is being fetched. */
  loading: boolean;
  /** The globally selected week's id, shared across every page. */
  selectedWeekId: number | null;
  /** The globally selected week object (or null if none/loading). */
  selectedWeek: AcademicWeek | null;
  /** Change the globally selected week (e.g. from any page's week selector). */
  setSelectedWeekId: (weekId: number) => void;
  /** Whether the user has confirmed a week on the entry gate this session. */
  hasChosenWeek: boolean;
  /** Confirm a week on the entry gate, unlocking the rest of the app. */
  confirmWeek: (weekId: number) => void;
}

const WeekContext = createContext<WeekContextValue | undefined>(undefined);

export function WeekProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeekId, setSelectedWeekIdState] = useState<number | null>(null);
  const [hasChosenWeek, setHasChosenWeek] = useState(false);

  useEffect(() => {
    // Wait for a session before querying — academic_weeks is RLS-protected
    // to authenticated users, and re-runs automatically once login completes.
    if (!session) {
      setLoading(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('academic_weeks').select('*').order('week_number');
      if (cancelled) return;
      if (data) {
        const list = data as AcademicWeek[];
        setWeeks(list);
        // Default the picker to the currently open week (or the most recent
        // one if every week has been closed) so the gate screen starts on a
        // sensible choice.
        const open = list.find((w) => !w.is_closed);
        const initial = open || list[list.length - 1] || null;
        setSelectedWeekIdState((prev) => prev ?? initial?.id ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Reset the gate when the user logs out, so a different user logging in
  // on the same tab has to choose a week again.
  useEffect(() => {
    if (!session) {
      setHasChosenWeek(false);
      setWeeks([]);
      setSelectedWeekIdState(null);
    }
  }, [session]);

  const setSelectedWeekId = useCallback((weekId: number) => {
    setSelectedWeekIdState(weekId);
  }, []);

  const confirmWeek = useCallback((weekId: number) => {
    setSelectedWeekIdState(weekId);
    setHasChosenWeek(true);
  }, []);

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId) || null;

  return (
    <WeekContext.Provider
      value={{ weeks, loading, selectedWeekId, selectedWeek, setSelectedWeekId, hasChosenWeek, confirmWeek }}
    >
      {children}
    </WeekContext.Provider>
  );
}

export function useWeek(): WeekContextValue {
  const ctx = useContext(WeekContext);
  if (!ctx) throw new Error('useWeek must be used within a WeekProvider');
  return ctx;
}
