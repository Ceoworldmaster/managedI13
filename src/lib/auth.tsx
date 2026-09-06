import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Profile, type UserRole } from './supabase';

interface AuthContextValue {
  session: { user: { id: string } } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ user: { id: string } } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session as { user: { id: string } } | null);
      if (!data.session) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess as { user: { id: string } } | null);
      if (!sess) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          console.error('Error loading profile:', error.message);
        }
        setProfile((data as Profile) || null);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const refreshProfile = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', session!.user.id);
    await refreshProfile();
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, refreshProfile, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function hasRole(profile: Profile | null, ...roles: UserRole[]): boolean {
  return !!profile && roles.includes(profile.role);
}

export function canRecordPoints(profile: Profile | null): boolean {
  return hasRole(profile, 'gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'to_truong', 'truong_phong_ktx');
}

export function canManageAccounts(profile: Profile | null): boolean {
  return hasRole(profile, 'gvcn');
}

// GVCN acts as the admin/approver for submitted requests (đơn từ, đề xuất,
// nghị quyết) — this app has no separate "admin" role beyond gvcn.
export function canApproveRequests(profile: Profile | null): boolean {
  return hasRole(profile, 'gvcn');
}

export function canSubmitReports(profile: Profile | null): boolean {
  return hasRole(profile, 'gvcn', 'lop_truong', 'lop_pho_hoc_tap', 'lop_pho_ne_nep', 'lop_pho_van_nghe', 'lop_pho_lao_dong', 'truong_phong_ktx', 'to_truong');
}

// GVCN (the homeroom teacher account) is not a student — dashboards, the
// competition ranking table, and the "chọn học sinh" pickers should never
// list them as if they were one.
export function isStudentRole(profile: Profile | null): boolean {
  return !!profile && profile.role !== 'gvcn';
}
