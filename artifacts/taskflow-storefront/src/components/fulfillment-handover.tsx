import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@workspace/replit-auth-web';
import {
  getGetAccountRoleQueryKey,
  getGetOwnerAutomationsQueryKey,
  getGetPlatformReadinessQueryKey,
  getGetSpecialistAssessmentQueryKey,
  getGetSpecialistTasksQueryKey,
  getGetOrderDeliverablesQueryKey,
  getGetBrandVaultQueryKey,
  useCreateOrderDeliverable,
  useGetAccountRole,
  useGetBrandVault,
  useGetOrderDeliverables,
  useGetOwnerAutomations,
  useGetPlatformReadiness,
  useGetSpecialistAssessment,
  useGetSpecialistTasks,
  useRequestOrderUploadUrl,
  useSubmitSpecialistAssessment,
  useUpdateAccountRole,
  useUpdateOwnerAutomation,
  useUpdatePlatformHandover,
  useUpdateSpecialistTask,
  type AccountRoleInputRole,
  type AccountRoleInputCoreSkillCategory,
  type AutomationInputProvider,
  type ProductionTask,
} from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, BookOpen, BriefcaseBusiness,
  Check, CheckCircle2, ChevronDown, CircleAlert, Clock3, CloudUpload, ExternalLink,
  FileCheck2, FileText, Fingerprint, KeyRound, LockKeyhole, Palette, RefreshCw,
  ShieldCheck, Sparkles, Users, Webhook, X,
} from 'lucide-react';

const panel = 'rounded-2xl border border-border/70 bg-card shadow-[0_8px_28px_rgba(34,48,72,.06)]';
const field = 'w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15';
const solidButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0';
const outlineButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold transition hover:bg-muted disabled:opacity-50';
const skillLabels: Record<Exclude<AccountRoleInputCoreSkillCategory, null>, string> = {
  video: 'Video & motion', social: 'Social content', copy: 'Copywriting', design: 'Visual design',
};
const niceStatus = (status: string) => ({ todo: 'Pending', in_progress: 'In Production', ready_for_review: 'Ready for Review' }[status] ?? status.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase()));

function RoleOnboardingGate() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const roleQuery = useGetAccountRole({ query: { queryKey: getGetAccountRoleQueryKey(), enabled: isAuthenticated } });
  const updateRole = useUpdateAccountRole();
  const [skill, setSkill] = useState<AccountRoleInputCoreSkillCategory>('video');
  const [notice, setNotice] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const role = roleQuery.data;
  if (authLoading || !isAuthenticated || dismissed || !role || role.onboardingCompleted) return null;
  if (roleQuery.isLoading) return null;
  const canAcceptInvite = role.accessStatus === 'invited' && (role.role === 'specialist' || role.role === 'admin');
  const choose = (nextRole: AccountRoleInputRole, category?: AccountRoleInputCoreSkillCategory) => {
    setNotice('');
    updateRole.mutate({ data: { role: nextRole, ...(category ? { coreSkillCategory: category } : {}) } }, {
      onSuccess: (updated) => {
        void roleQuery.refetch();
        if (nextRole === 'client') {
          setDismissed(true);
          setLocation('/account/brand-vault');
        } else if (updated.accessStatus === 'active') setDismissed(true);
        else setNotice('Your invitation is not active yet. Ask the TaskFlow owner who invited you to check access.');
      },
      onError: () => setNotice('We could not update your workspace access. Please try again.'),
    });
  };
  return <div className="fixed inset-0 z-[75] grid place-items-center bg-[#202c3d]/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
    <section className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-white/70 bg-background p-6 shadow-2xl sm:p-9">
      <div className="absolute -right-12 -top-14 size-40 rounded-full bg-primary/15" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><Sparkles size={15}/> TaskFlow welcome</div>
        <h2 id="onboarding-title" className="mt-5 font-display text-3xl font-bold leading-tight">Choose how you’ll work with us.</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Clients can start a project now. Specialist and admin access is granted through an owner-issued invitation.</p>
        {role.accessStatus === 'invited' && <div className="mt-6 rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold"><BadgeCheck size={17} className="text-primary"/> Invitation found · {role.role}</p>
          {role.role === 'specialist' && <label className="mt-4 block text-xs font-bold">Your core skill<select value={skill} onChange={(event) => setSkill(event.target.value as AccountRoleInputCoreSkillCategory)} className={`${field} mt-2`} data-testid="select-invited-skill">{Object.entries(skillLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
          <button className={`${solidButton} mt-4 w-full`} disabled={!canAcceptInvite || updateRole.isPending} onClick={() => choose(role.role, role.role === 'specialist' ? skill : undefined)} data-testid="button-accept-invitation">{updateRole.isPending ? 'Activating access…' : `Accept ${role.role} invitation`}<ArrowRight size={16}/></button>
        </div>}
        {role.accessStatus === 'none' && <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/50 hover:shadow-md" onClick={() => choose('client')} disabled={updateRole.isPending} data-testid="button-choose-client">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><BriefcaseBusiness size={19}/></span>
            <b className="mt-4 block">I’m ordering creative work</b><span className="mt-1 block text-xs leading-5 text-muted-foreground">Create projects and keep briefs, files, and updates together.</span>
          </button>
          <div className="rounded-2xl border border-dashed border-border bg-muted/55 p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-accent/20 text-accent-foreground"><LockKeyhole size={18}/></span>
            <b className="mt-4 block">I’m joining as a specialist</b><span className="mt-1 block text-xs leading-5 text-muted-foreground">Ask a TaskFlow owner for an invitation. Public role selection does not grant fulfillment access.</span>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-muted/55 p-5 sm:col-span-2">
            <span className="grid size-10 place-items-center rounded-xl bg-accent/20 text-accent-foreground"><Fingerprint size={18}/></span>
            <b className="mt-4 block">I’m a Platform Owner / Admin</b><span className="mt-1 block text-xs leading-5 text-muted-foreground">Admin access is granted only to the configured Super Admin or through an owner-issued team invitation.</span>
          </div>
        </div>}
        {role.accessStatus === 'active' && !role.onboardingCompleted && <div className="mt-7 rounded-2xl bg-muted p-5">
          <p className="text-sm font-bold">{role.role === 'specialist' ? 'Your specialist workspace is ready.' : 'Your workspace is ready.'}</p>
          <p className="mt-1 text-xs text-muted-foreground">Your access is confirmed by TaskFlow. Continue to the right place for your work.</p>
          <Link href={role.role === 'specialist' ? '/fulfillment' : role.isSuperAdmin ? '/inbox/handover' : '/account'} onClick={() => setDismissed(true)} className={`${solidButton} mt-4`} data-testid="link-onboarding-continue">Continue <ArrowRight size={16}/></Link>
        </div>}
        {notice && <p className="mt-4 rounded-xl bg-accent/15 px-4 py-3 text-sm text-foreground" role="alert" data-testid="status-onboarding-error">{notice}</p>}
      </div>
    </section>
  </div>;
}

export { RoleOnboardingGate };

function WorkspaceHeading({ label, title, children }: { label: string; title: string; children?: React.ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">{label}</p><h1 className="mt-2 font-display text-3xl font-bold tracking-[-.04em] sm:text-4xl">{title}</h1></div>{children}</div>;
}

function AccessDenied({ admin = false }: { admin?: boolean }) {
  const { isAuthenticated, login } = useAuth();
  return <main className="mx-auto min-h-[70dvh] max-w-4xl px-5 py-20"><div className={`${panel} mx-auto max-w-xl p-8 text-center sm:p-10`}>
    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent-foreground">{admin ? <Fingerprint size={25}/> : <LockKeyhole size={25}/>}</div>
    <h1 className="mt-5 font-display text-3xl font-bold">{admin ? 'Owner access only' : 'Invitation required'}</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">{admin ? 'Platform handover settings are visible only to the account designated as Super Admin.' : 'Fulfillment access is tied to an active specialist role. A TaskFlow owner must issue your invitation first.'}</p>
    {!isAuthenticated && <button onClick={() => login()} className={`${solidButton} mt-6`} data-testid="button-sign-in-access">Sign in to TaskFlow <ArrowRight size={16}/></button>}
    <Link href="/" className={`${outlineButton} mt-6`} data-testid="link-return-storefront"><ArrowLeft size={16}/> Return to TaskFlow</Link>
  </div></main>;
}

export function SpecialistAssessmentPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const roleQuery = useGetAccountRole({ query: { queryKey: getGetAccountRoleQueryKey(), enabled: isAuthenticated } });
  const assessmentQuery = useGetSpecialistAssessment({ query: { queryKey: getGetSpecialistAssessmentQueryKey(), enabled: isAuthenticated && roleQuery.data?.role === 'specialist' && roleQuery.data.accessStatus === 'active' } });
  const submit = useSubmitSpecialistAssessment();
  const client = useQueryClient();
  const assessment = assessmentQuery.data;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  const [refreshedAfterExpiry, setRefreshedAfterExpiry] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const lockedUntil = assessment?.lockoutUntil ? new Date(assessment.lockoutUntil) : null;
  const locked = assessment?.status === 'locked' || Boolean(lockedUntil && lockedUntil.getTime() > now);
  const lockoutSeconds = lockedUntil ? Math.max(0, Math.ceil((lockedUntil.getTime() - now) / 1000)) : 0;
  const lockoutClock = `${String(Math.floor(lockoutSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((lockoutSeconds % 3600) / 60)).padStart(2, '0')}:${String(lockoutSeconds % 60).padStart(2, '0')}`;
  useEffect(() => {
    if (assessment?.status !== 'locked') {
      setRefreshedAfterExpiry(false);
      return;
    }
    if (lockedUntil && lockedUntil.getTime() <= now && !refreshedAfterExpiry) {
      setRefreshedAfterExpiry(true);
      void assessmentQuery.refetch();
    }
  }, [assessment?.status, assessmentQuery, lockedUntil, now, refreshedAfterExpiry]);
  const allowed = roleQuery.data?.role === 'specialist' && roleQuery.data.accessStatus === 'active';
  if (isAuthenticated && roleQuery.isLoading) return <main className="mx-auto min-h-[70dvh] max-w-5xl px-4 py-12"><div className={`${panel} h-40 animate-pulse`}/></main>;
  if (!isAuthenticated || !allowed) return <AccessDenied/>;
  const passed = assessment?.status === 'passed';
  const handleSubmit = () => {
    if (!assessment || Object.keys(answers).length !== assessment.questions.length) return;
    submit.mutate({ data: { answers: assessment.questions.map((question) => ({ questionId: question.id, selectedOption: answers[question.id] })) } }, {
      onSuccess: (result) => {
        setAnswers({});
        void client.invalidateQueries({ queryKey: getGetSpecialistAssessmentQueryKey() });
        if (result.status === 'passed') setLocation('/fulfillment');
      },
    });
  };
  return <main className="mx-auto min-h-[75dvh] max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
    <WorkspaceHeading label="Specialist pathway" title="Show us how you think."/>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className={`${panel} p-5 sm:p-8`}>
        {assessmentQuery.isLoading || roleQuery.isLoading ? <div className="space-y-4" aria-label="Loading assessment"><div className="h-5 w-1/3 animate-pulse rounded bg-muted"/><div className="h-24 animate-pulse rounded-2xl bg-muted"/><div className="h-24 animate-pulse rounded-2xl bg-muted"/></div>
        : assessmentQuery.isError ? <div className="rounded-2xl bg-accent/10 p-6 text-sm"><CircleAlert className="mb-3 text-accent-foreground"/><p>We couldn’t load your assessment.</p><button onClick={() => void assessmentQuery.refetch()} className={`${outlineButton} mt-4`} data-testid="button-retry-assessment"><RefreshCw size={15}/> Try again</button></div>
        : !assessment ? <p className="text-sm text-muted-foreground">Your assessment is not available yet. Ask your inviter to confirm your skill area.</p>
        : passed ? <div className="py-8 text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/15 text-primary"><CheckCircle2 size={30}/></span><h2 className="mt-5 font-display text-3xl font-bold">Assessment passed.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">You’re cleared to pick up assigned work in {skillLabels[assessment.category ?? 'video']}.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/fulfillment" className={solidButton} data-testid="link-open-fulfillment">Open fulfillment portal <ArrowRight size={16}/></Link><span className="rounded-xl bg-muted px-4 py-3 text-sm font-bold">{assessment.scorePercent ?? 0}% score</span></div></div>
        : locked ? <div className="py-8 text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent/20"><LockKeyhole size={28}/></span><h2 className="mt-5 font-display text-3xl font-bold">Assessment paused.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">You did not pass. You can try again tomorrow.</p><p className="mt-5 font-mono-ui text-lg font-bold tabular-nums" aria-live="polite" data-testid="text-assessment-lockout">{lockoutClock}</p><p className="mt-2 text-xs text-muted-foreground">Attempts used: {assessment.attempts}</p></div>
        : <><div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5"><div><span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{skillLabels[assessment.category ?? 'video']} assessment</span><h2 className="mt-4 font-display text-2xl font-bold">A few practical calls</h2></div><span className="font-mono-ui text-xs text-muted-foreground">{Object.keys(answers).length}/{assessment.questions.length} answered</span></div>
           <div className="mt-6 space-y-5">{assessment.questions.map((question, index) => <fieldset key={question.id} className="rounded-2xl border border-border p-4 sm:p-5"><legend className="max-w-full px-1 text-sm font-bold leading-6"><span className="mr-2 font-mono-ui text-xs text-primary">{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend><div className="mt-3 grid gap-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-5 transition ${answers[question.id] === optionIndex ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/60'}`}><input type="radio" name={question.id} value={optionIndex} checked={answers[question.id] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} className="mt-1 accent-[#00C4CC]" data-testid={`input-assessment-${question.id}-${optionIndex}`}/>{option}</label>)}</div></fieldset>)}</div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Responses are scored by TaskFlow. You’ll see your result here.</span><button className={solidButton} onClick={handleSubmit} disabled={submit.isPending || Object.keys(answers).length !== assessment.questions.length} data-testid="button-submit-assessment">{submit.isPending ? 'Scoring…' : 'Submit assessment'} <ArrowRight size={16}/></button></div>
          {submit.isError && <p className="mt-4 text-sm text-accent-foreground" role="alert" data-testid="status-assessment-error">Submission didn’t go through. Review your answers and try again.</p>}
        </>}
      </section>
       <aside className={`${panel} h-fit bg-[#e7f9f8] p-6`}><div className="grid size-11 place-items-center rounded-xl bg-primary text-white"><BookOpen size={20}/></div><h3 className="mt-4 font-display text-xl font-bold">Assessment notes</h3><ul className="mt-4 space-y-3 text-sm leading-5 text-muted-foreground"><li>Take your time; this checks your practical judgment, not speed.</li><li>Your category comes from your owner-issued invitation.</li><li>Passing unlocks your assigned task portal.</li></ul><div className="mt-6 border-t border-primary/15 pt-4 text-xs text-muted-foreground">Attempt {(assessment?.attempts ?? 0) + 1} · {assessment?.attempts ?? 0} submitted</div></aside>
    </div>
  </main>;
}

function TaskCard({ task }: { task: ProductionTask }) {
  const client = useQueryClient();
  const [filterOpen, setFilterOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const vaultQuery = useGetBrandVault({ taskId: task.id }, { query: { queryKey: getGetBrandVaultQueryKey({ taskId: task.id }), enabled: true } });
  const deliverablesQuery = useGetOrderDeliverables(task.orderId, { query: { queryKey: getGetOrderDeliverablesQueryKey(task.orderId) } });
  const uploadUrl = useRequestOrderUploadUrl();
  const createDeliverable = useCreateOrderDeliverable();
  const updateTask = useUpdateSpecialistTask();
  const changeStatus = (status: 'in_progress' | 'blocked' | 'ready_for_review') => updateTask.mutate({ taskId: task.id, data: { status } }, { onSuccess: () => void client.invalidateQueries({ queryKey: getGetSpecialistTasksQueryKey() }) });
  const uploadFile = async (file?: File) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const signed = await uploadUrl.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type || 'application/octet-stream', orderId: task.orderId } });
      const uploaded = await fetch(signed.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!uploaded.ok) throw new Error('File upload failed');
      await createDeliverable.mutateAsync({ orderId: task.orderId, data: { taskId: task.id, deliverableKey: task.templateKey || task.id, title: file.name.replace(/\.[^.]+$/, ''), description: `Submitted for ${task.title}`, objectPath: signed.objectPath, fileName: file.name, contentType: file.type || 'application/octet-stream', fileSize: file.size } });
      await client.invalidateQueries({ queryKey: getGetOrderDeliverablesQueryKey(task.orderId) });
    } catch {
      setUploadError('Upload did not complete. Please try the file again.');
    } finally {
      setUploading(false);
    }
  };
  return <article className={`${panel} overflow-hidden`}>
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
      <div className="min-w-[200px] flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{niceStatus(task.status)}</span><span className="text-xs text-muted-foreground">{task.priority} priority</span></div><h2 className="mt-3 font-display text-xl font-bold">{task.title}</h2><p className="mt-1 text-xs text-muted-foreground">{task.order.company || task.order.customerName} · {task.order.name}</p></div>
      <div className="relative"><button className={outlineButton} onClick={() => setFilterOpen((open) => !open)} data-testid={`button-task-status-${task.id}`} aria-expanded={filterOpen}><ChevronDown size={15}/>{task.status === 'todo' ? 'Start task' : 'Update status'}</button>{filterOpen && <div className="absolute right-0 top-12 z-20 w-52 rounded-xl border border-border bg-card p-1 shadow-lg">{task.status !== 'in_progress' && <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { changeStatus('in_progress'); setFilterOpen(false); }} data-testid={`button-task-progress-${task.id}`}>Mark in production</button>}{task.status !== 'ready_for_review' && <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { changeStatus('ready_for_review'); setFilterOpen(false); }} data-testid={`button-task-review-${task.id}`}>Mark ready for review</button>}<button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { changeStatus('blocked'); setFilterOpen(false); }} data-testid={`button-task-blocked-${task.id}`}>Mark blocked</button></div>}</div>
    </div>
    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_1fr]">
      <div><p className="text-sm leading-6 text-muted-foreground">{task.description || 'Your project brief and production notes will appear here.'}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2"><Clock3 size={14}/>{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : 'No due date'}</span><span className="rounded-lg bg-muted px-3 py-2">Project {task.orderId.slice(0, 8)}</span></div>
        <div className="mt-5 rounded-2xl border border-[#c8eeee] bg-[#f1fbfa] p-4"><div className="flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold"><Palette size={15} className="text-primary"/> Client Brand Vault</p><p className="mt-1 text-xs text-muted-foreground">Only brand details attached to this task.</p></div><button className="rounded-lg p-2 hover:bg-primary/10" onClick={() => void vaultQuery.refetch()} aria-label="Refresh brand vault" data-testid={`button-refresh-vault-${task.id}`}><RefreshCw size={15}/></button></div>
          {vaultQuery.isLoading ? <div className="mt-3 h-10 animate-pulse rounded-lg bg-primary/10"/> : vaultQuery.isError ? <p className="mt-3 text-xs text-muted-foreground">Brand Vault is unavailable for this task.</p> : vaultQuery.data ? <div className="mt-3"><p className="text-sm font-bold">{vaultQuery.data.brandName || task.order.company || 'Client brand'}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{vaultQuery.data.description || vaultQuery.data.voiceGuidelines || 'Brand guidance available.'}</p><div className="mt-2 flex flex-wrap gap-1.5">{vaultQuery.data.colors.slice(0, 5).map((color, index) => <span key={`${color}-${index}`} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 text-[10px]"><i className="size-3 rounded-full border border-black/10" style={{ backgroundColor: color }}/>{color}</span>)}</div>{vaultQuery.data.assets.length > 0 && <div className="mt-3 space-y-1">{vaultQuery.data.assets.slice(0, 3).map((asset) => <a key={asset.id} href={asset.downloadUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"><FileText size={13}/>{asset.displayName}<ExternalLink size={11}/></a>)}</div>}</div> : <p className="mt-3 text-xs text-muted-foreground">No brand kit has been shared for this task.</p>}
        </div>
      </div>
      <div className="rounded-2xl bg-muted/60 p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">Deliverables</h3><span className="rounded-full bg-card px-2.5 py-1 text-xs font-bold">{deliverablesQuery.data?.length ?? 0}</span></div>
        {deliverablesQuery.isLoading ? <div className="mt-3 h-12 animate-pulse rounded-xl bg-background"/> : deliverablesQuery.isError ? <p className="mt-3 text-xs text-muted-foreground">Could not load submissions.</p> : deliverablesQuery.data?.length ? <div className="mt-3 space-y-2">{deliverablesQuery.data.map((item) => <a href={item.downloadUrl} target="_blank" rel="noreferrer" key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-card p-3 text-xs"><span className="flex min-w-0 items-center gap-2 truncate font-semibold"><FileCheck2 size={15} className="shrink-0 text-primary"/>{item.title}</span><span className="shrink-0 text-muted-foreground">{niceStatus(item.status)}</span></a>)}</div> : <div className="mt-3 rounded-xl border border-dashed border-border bg-card/70 p-4 text-center"><CloudUpload className="mx-auto text-muted-foreground" size={20}/><p className="mt-2 text-xs text-muted-foreground">Final files, versions, and notes live here.</p></div>}
        <label className={`${outlineButton} mt-4 w-full cursor-pointer ${uploading ? 'pointer-events-none opacity-60' : ''}`}><input type="file" className="sr-only" accept="image/*,video/*,application/pdf,application/zip" disabled={uploading} onChange={(event) => { void uploadFile(event.target.files?.[0]); event.currentTarget.value = ''; }} data-testid={`input-deliverable-upload-${task.id}`}/>{uploading ? 'Uploading securely…' : <><ArrowDownToLine size={15}/> Upload a deliverable</>}</label>
        {uploadError && <p className="mt-2 text-xs text-accent-foreground" role="alert" data-testid={`status-upload-error-${task.id}`}>{uploadError}</p>}
        {(uploadUrl.isError || createDeliverable.isError) && !uploadError && <p className="mt-2 text-xs text-accent-foreground" role="alert">Submission failed. Please retry.</p>}
      </div>
    </div>
  </article>;
}

export function FulfillmentPortalPage() {
  const { isAuthenticated } = useAuth();
  const client = useQueryClient();
  const roleQuery = useGetAccountRole({ query: { queryKey: getGetAccountRoleQueryKey(), enabled: isAuthenticated } });
  const tasksQuery = useGetSpecialistTasks({ query: { queryKey: getGetSpecialistTasksQueryKey(), enabled: isAuthenticated && roleQuery.data?.role === 'specialist' && roleQuery.data.accessStatus === 'active' } });
  const assessmentQuery = useGetSpecialistAssessment({ query: { queryKey: getGetSpecialistAssessmentQueryKey(), enabled: isAuthenticated && roleQuery.data?.role === 'specialist' && roleQuery.data.accessStatus === 'active' } });
  const [filter, setFilter] = useState('all');
  const allowed = roleQuery.data?.role === 'specialist' && roleQuery.data.accessStatus === 'active';
  const tasks = tasksQuery.data ?? [];
  const visible = useMemo(() => tasks.filter((task) => filter === 'all' || task.status === filter), [tasks, filter]);
  if (isAuthenticated && roleQuery.isLoading) return <main className="mx-auto min-h-[70dvh] max-w-5xl px-4 py-12"><div className={`${panel} h-40 animate-pulse`}/></main>;
  if (!isAuthenticated || !allowed) return <AccessDenied/>;
  if (assessmentQuery.isLoading) return <main className="mx-auto min-h-[70dvh] max-w-5xl px-4 py-12"><div className={`${panel} h-40 animate-pulse`}/></main>;
  if (assessmentQuery.data?.status !== 'passed') return <main className="mx-auto min-h-[70dvh] max-w-5xl px-4 py-12"><div className={`${panel} mx-auto max-w-xl p-8 text-center`}><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><BookOpen size={24}/></span><h1 className="mt-5 font-display text-2xl font-bold">One step before your task desk.</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Complete the skill assessment to unlock assigned work and client brand details.</p><Link href="/fulfillment/assessment" className={`${solidButton} mt-5`} data-testid="link-complete-assessment">Start assessment <ArrowRight size={15}/></Link></div></main>;
  const filters = ['all', 'todo', 'in_progress', 'ready_for_review', 'blocked', 'done'];
  return <main className="mx-auto min-h-[75dvh] max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
    <WorkspaceHeading label="Specialist workspace" title="Your production desk." >
      <Link href="/fulfillment/assessment" className={outlineButton} data-testid="link-assessment-status"><BookOpen size={15}/> Assessment</Link>
    </WorkspaceHeading>
    <section className="mb-6 grid gap-4 sm:grid-cols-[1.25fr_.75fr]">
      <div className={`${panel} flex items-center gap-4 bg-[#e6f8f8] p-5`}><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-white"><BriefcaseBusiness size={21}/></div><div><p className="text-sm font-bold">A focused view of your assigned work.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Use the client brief and Brand Vault, then submit finished files to the right project.</p></div></div>
      <div className={`${panel} flex items-center justify-between p-5`}><div><p className="text-xs text-muted-foreground">Assigned to you</p><p className="mt-1 font-display text-3xl font-bold">{tasks.length} <span className="font-sans text-sm font-medium text-muted-foreground">tasks</span></p></div><span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-foreground"><Users size={19}/></span></div>
    </section>
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter tasks">{filters.map((value) => <button key={value} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${filter === value ? 'bg-secondary text-secondary-foreground' : 'border border-border bg-card text-muted-foreground hover:bg-muted'}`} data-testid={`button-filter-${value}`}>{value === 'all' ? 'All tasks' : niceStatus(value)}</button>)}</div>
    {tasksQuery.isLoading || roleQuery.isLoading ? <div className="space-y-4">{[0, 1].map((index) => <div key={index} className={`${panel} h-56 animate-pulse bg-muted/70`} />)}</div>
    : tasksQuery.isError ? <div className={`${panel} p-8 text-center`}><CircleAlert className="mx-auto text-accent-foreground"/><h2 className="mt-3 font-bold">Tasks didn’t load.</h2><button onClick={() => { void tasksQuery.refetch(); void client.invalidateQueries({ queryKey: getGetSpecialistTasksQueryKey() }); }} className={`${outlineButton} mt-4`} data-testid="button-retry-tasks"><RefreshCw size={14}/> Retry</button></div>
    : visible.length ? <div className="space-y-4">{visible.map((task) => <TaskCard key={task.id} task={task}/>)}</div>
    : <div className={`${panel} px-6 py-16 text-center`}><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Check size={24}/></span><h2 className="mt-4 font-display text-2xl font-bold">{tasks.length ? 'Nothing in this lane.' : 'Your next assignment will appear here.'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{tasks.length ? 'Choose another status filter to see your other work.' : 'The TaskFlow team will assign production tasks that match your skill area.'}</p></div>}
  </main>;
}

export function PlatformHandoverPage() {
  const { isAuthenticated } = useAuth();
  const roleQuery = useGetAccountRole({ query: { queryKey: getGetAccountRoleQueryKey(), enabled: isAuthenticated } });
  const isSuperAdmin = roleQuery.data?.isSuperAdmin === true;
  const readinessQuery = useGetPlatformReadiness({ query: { queryKey: getGetPlatformReadinessQueryKey(), enabled: isAuthenticated && isSuperAdmin } });
  const automationQuery = useGetOwnerAutomations({ query: { queryKey: getGetOwnerAutomationsQueryKey(), enabled: isAuthenticated && isSuperAdmin } });
  const handover = useUpdatePlatformHandover();
  const automationUpdate = useUpdateOwnerAutomation();
  const client = useQueryClient();
  const [masterAdminEmail, setMasterAdminEmail] = useState('');
  const [stripePublicKey, setStripePublicKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [paystackSecretKey, setPaystackSecretKey] = useState('');
  const [webhooks, setWebhooks] = useState('');
  const [saved, setSaved] = useState(false);
  if (isAuthenticated && roleQuery.isLoading) return <main className="mx-auto min-h-[70dvh] max-w-5xl px-4 py-12"><div className={`${panel} h-40 animate-pulse`}/></main>;
  if (!isAuthenticated || !isSuperAdmin) return <AccessDenied admin/>;
  const readiness = readinessQuery.data;
  const exportAudit = () => {
    if (!readiness) return;
    const safeExport = {
      generatedAt: readiness.generatedAt,
      masterAdminEmail: readiness.masterAdminEmail,
      providers: readiness.providers.map(({ provider, publicKeyConfigured, secretKeyConfigured }) => ({ provider, publicKeyConfigured, secretKeyConfigured })),
      webhooks: readiness.webhooks,
      data: readiness.data,
    };
    const blob = new Blob([JSON.stringify(safeExport, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `taskflow-platform-audit-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  };
  const submitHandover = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = {
      masterAdminEmail: masterAdminEmail.trim() || readiness?.masterAdminEmail || '',
      ...(stripePublicKey.trim() ? { stripePublicKey: stripePublicKey.trim() } : {}),
      ...(stripeSecretKey.trim() ? { stripeSecretKey: stripeSecretKey.trim() } : {}),
      ...(paystackPublicKey.trim() ? { paystackPublicKey: paystackPublicKey.trim() } : {}),
      ...(paystackSecretKey.trim() ? { paystackSecretKey: paystackSecretKey.trim() } : {}),
      ...(webhooks.trim() ? { webhookEndpoints: webhooks.split('\n').map((endpoint) => endpoint.trim()).filter(Boolean) } : {}),
    };
    handover.mutate({ data }, { onSuccess: () => { setSaved(true); setStripePublicKey(''); setStripeSecretKey(''); setPaystackPublicKey(''); setPaystackSecretKey(''); setWebhooks(''); void client.invalidateQueries({ queryKey: getGetPlatformReadinessQueryKey() }); } });
  };
  return <main className="mx-auto min-h-[75dvh] max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
    <WorkspaceHeading label="Super Admin · Operations" title="Platform handover." >
      <button onClick={exportAudit} disabled={!readiness} className={outlineButton} data-testid="button-export-audit"><ArrowDownToLine size={15}/> Export Platform Readiness Audit (.json)</button>
    </WorkspaceHeading>
    <section className={`${panel} mb-6 overflow-hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-[#e7f9f8] px-5 py-5 sm:px-7"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-primary"><ShieldCheck size={15}/> Readiness snapshot</p><h2 className="mt-2 font-display text-xl font-bold">A clear view of what’s configured.</h2></div><span className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">{readiness ? `Updated ${new Date(readiness.generatedAt).toLocaleString()}` : 'Awaiting readiness'}</span></div>
      {readinessQuery.isLoading || roleQuery.isLoading ? <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((key) => <div key={key} className="h-24 animate-pulse rounded-xl bg-muted"/>)}</div>
      : readinessQuery.isError ? <div className="p-7 text-center text-sm"><p>Readiness data could not be loaded.</p><button onClick={() => void readinessQuery.refetch()} className={`${outlineButton} mt-3`} data-testid="button-retry-readiness"><RefreshCw size={14}/> Refresh</button></div>
      : readiness && <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {[{ label: 'Clients', value: readiness.data.clients }, { label: 'Projects', value: readiness.data.projects }, { label: 'Team members', value: readiness.data.teamMembers }, { label: 'Webhooks', value: `${readiness.webhooks.active} active / ${readiness.webhooks.configured} configured` }].map((metric) => <div key={metric.label} className="rounded-xl bg-muted/60 p-4" data-testid={`metric-${metric.label.toLowerCase().replaceAll(' ', '-')}`}><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-2 font-display text-2xl font-bold">{metric.value}</p></div>)}
        {readiness.providers.map((provider) => <div key={provider.provider} className="rounded-xl border border-border p-4"><p className="text-sm font-bold capitalize">{provider.provider}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className={`rounded-full px-2.5 py-1 ${provider.publicKeyConfigured ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-accent-foreground'}`}>Public key {provider.publicKeyConfigured ? 'configured' : 'missing'}</span><span className={`rounded-full px-2.5 py-1 ${provider.secretKeyConfigured ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-accent-foreground'}`}>Secret key {provider.secretKeyConfigured ? 'configured' : 'missing'}</span></div></div>)}
      </div>}
    </section>
    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <section className={`${panel} p-5 sm:p-7`}><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-foreground"><KeyRound size={18}/></span><div><h2 className="font-display text-xl font-bold">Handover details</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Secrets are write-only here. Saved credential values are never shown or included in exports.</p></div></div>
        <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground" data-testid="note-master-admin-password">TaskFlow uses your sign-in provider for account passwords. Passwords are never stored or changed in this app; update the master account password with that provider.</div>
        <form onSubmit={submitHandover} className="mt-6 space-y-4"><label className="block text-xs font-bold">Master admin email<input className={`${field} mt-2`} type="email" required value={masterAdminEmail || readiness?.masterAdminEmail || ''} onChange={(event) => setMasterAdminEmail(event.target.value)} placeholder="admin@yourcompany.com" data-testid="input-master-admin-email"/></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">Stripe public key<input className={`${field} mt-2`} value={stripePublicKey} onChange={(event) => setStripePublicKey(event.target.value)} placeholder="Leave blank to keep current" autoComplete="off" data-testid="input-stripe-public-key"/></label>
            <label className="block text-xs font-bold">Stripe secret key<input className={`${field} mt-2`} type="password" value={stripeSecretKey} onChange={(event) => setStripeSecretKey(event.target.value)} placeholder="Write-only · leave blank to keep" autoComplete="new-password" data-testid="input-stripe-secret-key"/></label>
            <label className="block text-xs font-bold">Paystack public key<input className={`${field} mt-2`} value={paystackPublicKey} onChange={(event) => setPaystackPublicKey(event.target.value)} placeholder="Leave blank to keep current" autoComplete="off" data-testid="input-paystack-public-key"/></label>
            <label className="block text-xs font-bold">Paystack secret key<input className={`${field} mt-2`} type="password" value={paystackSecretKey} onChange={(event) => setPaystackSecretKey(event.target.value)} placeholder="Write-only · leave blank to keep" autoComplete="new-password" data-testid="input-paystack-secret-key"/></label>
          </div>
          <label className="block text-xs font-bold">Webhook endpoints <span className="font-normal text-muted-foreground">one per line, up to 20</span><textarea className={`${field} mt-2 min-h-24 resize-y`} value={webhooks} onChange={(event) => setWebhooks(event.target.value)} placeholder="https://your-domain.example/webhooks/payments" data-testid="input-webhook-endpoints"/></label>
          <button className={`${solidButton} w-full`} disabled={handover.isPending} data-testid="button-save-handover">{handover.isPending ? 'Saving securely…' : 'Save handover'} <ArrowRight size={15}/></button>
          {saved && <p className="flex items-center gap-2 text-xs font-semibold text-primary" role="status" data-testid="status-handover-saved"><CheckCircle2 size={15}/> Handover details saved. Secret values were cleared from this form.</p>}
          {handover.isError && <p className="text-xs text-accent-foreground" role="alert" data-testid="status-handover-error">We couldn’t save these settings. Check the details and try again.</p>}
        </form>
      </section>
      <section className={`${panel} p-5 sm:p-7`}><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Webhook size={18}/></span><div><h2 className="font-display text-xl font-bold">Connected automations</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Review connection state. Provider secrets are never displayed here.</p></div></div>
        {automationQuery.isLoading ? <div className="mt-5 space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted"/>)}</div>
        : automationQuery.isError ? <div className="mt-5 rounded-xl bg-accent/10 p-4 text-sm"><p>Automation status isn’t available.</p><button className={`${outlineButton} mt-3`} onClick={() => void automationQuery.refetch()} data-testid="button-retry-automations"><RefreshCw size={14}/> Retry</button></div>
        : <div className="mt-5 space-y-2">{(automationQuery.data ?? []).map((automation) => <div key={automation.provider} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><div className="min-w-0"><p className="text-sm font-bold">{automation.label}</p><p className="mt-1 text-xs text-muted-foreground">{automation.configured ? 'Connected' : 'Not configured'}</p></div><button type="button" role="switch" aria-checked={automation.active} disabled={!automation.configured || automationUpdate.isPending} onClick={() => automationUpdate.mutate({ data: { provider: automation.provider as AutomationInputProvider, active: !automation.active } }, { onSuccess: () => void client.invalidateQueries({ queryKey: getGetOwnerAutomationsQueryKey() }) })} className={`relative h-7 w-12 shrink-0 rounded-full transition ${automation.active ? 'bg-primary' : 'bg-border'}`} data-testid={`switch-automation-${automation.provider}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${automation.active ? 'translate-x-6' : 'translate-x-1'}`}/></button></div>)}</div>}
        {automationUpdate.isError && <p className="mt-3 text-xs text-accent-foreground" role="alert">Automation update failed. Please retry.</p>}
        {automationUpdate.isSuccess && <p className="mt-3 flex items-center gap-2 text-xs text-primary" role="status"><Check size={14}/> Automation preference saved.</p>}
        <div className="mt-6 rounded-xl bg-muted/65 p-4"><p className="flex items-center gap-2 text-xs font-bold"><Fingerprint size={14}/> Safe audit export</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Exports readiness counts, admin email, provider configuration flags, and webhook counts only. No credential values or endpoint contents are included.</p></div>
      </section>
    </div>
  </main>;
}
