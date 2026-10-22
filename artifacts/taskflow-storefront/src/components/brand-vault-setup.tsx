import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@workspace/replit-auth-web';
import {
  getGetAccountRoleQueryKey,
  getGetBrandVaultQueryKey,
  useGetBrandVault,
  useUpdateBrandVault,
  type BrandVaultInput,
} from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, CheckCircle2, Palette, RefreshCw, Sparkles } from 'lucide-react';

const panel = 'rounded-2xl border border-border/70 bg-card shadow-[0_8px_28px_rgba(34,48,72,.06)]';
const field = 'mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50';
const splitList = (value: string) => value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);

export function BrandVaultSetupPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const vaultQuery = useGetBrandVault(undefined, { query: { queryKey: getGetBrandVaultQueryKey(), enabled: isAuthenticated } });
  const saveVault = useUpdateBrandVault();
  const [step, setStep] = useState(0);
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [colors, setColors] = useState('');
  const [fonts, setFonts] = useState('');
  const [voiceGuidelines, setVoiceGuidelines] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vaultQuery.data) return;
    setBrandName(vaultQuery.data.brandName);
    setDescription(vaultQuery.data.description);
    setColors(vaultQuery.data.colors.join(', '));
    setFonts(vaultQuery.data.fonts.join(', '));
    setVoiceGuidelines(vaultQuery.data.voiceGuidelines);
  }, [vaultQuery.data]);

  const finish = async () => {
    setError('');
    setSaving(true);
    const data: BrandVaultInput = {
      brandName: brandName.trim(),
      description: description.trim(),
      colors: splitList(colors),
      fonts: splitList(fonts),
      voiceGuidelines: voiceGuidelines.trim(),
    };
    try {
      await saveVault.mutateAsync({ data });
      const response = await fetch('/api/account/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIntent: 'long_term' }),
      });
      if (!response.ok) throw new Error('Could not finish onboarding.');
      await queryClient.invalidateQueries({ queryKey: getGetAccountRoleQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetBrandVaultQueryKey() });
      setLocation('/account');
    } catch {
      setError('Your Brand Vault could not be saved completely. Check your details and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) return <main className="mx-auto max-w-3xl px-4 py-16"><section className={`${panel} p-8 text-center`}><h1 className="font-display text-2xl font-bold">Sign in to set up your Brand Vault.</h1><p className="mt-3 text-sm text-muted-foreground">Your brand details are saved to your private TaskFlow account.</p></section></main>;

  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
    <div className="mb-7"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">Client onboarding · Step {step + 1} of 3</p><h1 className="mt-2 font-display text-3xl font-bold tracking-[-.04em] sm:text-4xl">Set up your Brand Vault.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Add your core brand details once so they stay close to every project brief and creative handoff.</p></div>
    <section className={`${panel} p-5 sm:p-8`}>
      <div className="mb-7 flex items-center gap-3 rounded-2xl bg-primary/10 p-4"><span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><Palette size={19}/></span><div><p className="text-sm font-bold">{step === 0 ? 'The basics' : step === 1 ? 'Your visual identity' : 'Your brand voice'}</p><p className="mt-1 text-xs text-muted-foreground">You can update these details any time from your client workspace.</p></div></div>
      {vaultQuery.isLoading ? <div className="space-y-3" aria-label="Loading Brand Vault"><div className="h-12 animate-pulse rounded-xl bg-muted"/><div className="h-24 animate-pulse rounded-xl bg-muted"/></div>
        : vaultQuery.isError ? <div className="rounded-xl bg-accent/10 p-5 text-sm"><p>We couldn’t load your Brand Vault.</p><button className={`${primaryButton} mt-4`} onClick={() => void vaultQuery.refetch()} data-testid="button-retry-brand-vault"><RefreshCw size={15}/> Try again</button></div>
        : <>{step === 0 && <div className="grid gap-5"><label className="text-xs font-bold">Brand name<input required maxLength={160} value={brandName} onChange={(event) => setBrandName(event.target.value)} className={field} placeholder="e.g. Northstar Studio" data-testid="input-brand-name"/></label><label className="text-xs font-bold">Description<textarea maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className={`${field} resize-y`} placeholder="What your organization does, who it serves, and what makes it distinct." data-testid="input-brand-description"/></label></div>}
          {step === 1 && <div className="grid gap-5 sm:grid-cols-2"><label className="text-xs font-bold">Brand colors<textarea maxLength={700} rows={5} value={colors} onChange={(event) => setColors(event.target.value)} className={`${field} resize-y`} placeholder="#00C4CC, #FF6584, #202C3D" data-testid="input-brand-colors"/><span className="mt-2 block font-normal text-muted-foreground">Separate colors with commas or new lines.</span></label><label className="text-xs font-bold">Fonts<textarea maxLength={1000} rows={5} value={fonts} onChange={(event) => setFonts(event.target.value)} className={`${field} resize-y`} placeholder="Manrope, Space Grotesk" data-testid="input-brand-fonts"/><span className="mt-2 block font-normal text-muted-foreground">List your preferred typefaces.</span></label></div>}
          {step === 2 && <label className="block text-xs font-bold">Voice guidelines<textarea required maxLength={5000} rows={9} value={voiceGuidelines} onChange={(event) => setVoiceGuidelines(event.target.value)} className={`${field} resize-y`} placeholder="Describe your tone, words to use or avoid, and how the brand should sound." data-testid="input-brand-voice"/><span className="mt-2 block font-normal text-muted-foreground">Clear guidelines help specialists write in your brand voice.</span></label>}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            {step > 0 ? <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold" onClick={() => setStep((current) => current - 1)} data-testid="button-brand-vault-back"><ArrowLeft size={15}/> Back</button> : <span className="text-xs text-muted-foreground"><Sparkles size={13} className="mr-1 inline text-primary"/> Your details stay private to your account.</span>}
            {step < 2 ? <button className={primaryButton} disabled={step === 0 && !brandName.trim()} onClick={() => setStep((current) => current + 1)} data-testid="button-brand-vault-next">Continue <ArrowRight size={15}/></button> : <button className={primaryButton} disabled={!brandName.trim() || !voiceGuidelines.trim() || saving} onClick={() => void finish()} data-testid="button-save-brand-vault">{saving ? 'Saving…' : 'Save and open dashboard'} {saving ? null : <CheckCircle2 size={15}/>}</button>}
          </div>
          {error && <p className="mt-4 rounded-xl bg-accent/15 p-3 text-sm" role="alert" data-testid="status-brand-vault-error">{error}</p>}
          {saveVault.isError && !error && <p className="mt-4 text-sm text-accent-foreground" role="alert">Brand Vault could not be saved. Try again.</p>}
        </>}
    </section>
  </main>;
}
