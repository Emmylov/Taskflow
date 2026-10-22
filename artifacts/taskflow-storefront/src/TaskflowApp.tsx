import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Archive, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCircle2, CheckCheck, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Copy, Download, File, FileImage, FileText, Filter, Grid2X2, HeartHandshake, History, Layers3, ListTodo, LogIn, Menu, MessageCircle, Minus, MonitorPlay, Palette, Paperclip, Plus, ReceiptText, Search, Send, Settings2, ShoppingBag, SmilePlus, Sparkles, Star, ThumbsUp, Trash2, Upload, UserCircle, UsersRound, WandSparkles, X, CreditCard, RefreshCw, Webhook, CircleCheck, CircleX, Link2Off } from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { getGetAccountCreditsQueryKey, getGetBillingPlansQueryKey, getGetConversationMessagesQueryKey, getGetOrderActivityQueryKey, getGetOrderDeliverablesQueryKey, getGetOrderStatusQueryKey, getGetOrdersQueryKey, getGetOwnerAutomationsQueryKey, useApproveOrderPrice, useCreateBillingCheckout, useCreateConversationMessage, useCreateOrderDeliverable, useCreateOrderRequest, useGetAccountCredits, useGetBillingPlans, useGetConversationMessages, useGetOrderActivity, useGetOrderDeliverables, useGetOrders, useGetOwnerAutomations, useGetOrderStatus, useRequestOrderPriceChange, useReviewOrderDeliverable, useToggleMessageReaction, useUpdateOwnerAutomation, type ActivityEvent, type CheckoutInput, type Deliverable, type Message, type OrderStatus, type AutomationStatus } from '@workspace/api-client-react';
import { AuthProvider, useAuth } from '@workspace/replit-auth-web';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FulfillmentPortalPage, PlatformHandoverPage, RoleOnboardingGate, SpecialistAssessmentPage } from '@/components/fulfillment-handover';
import { BrandVaultSetupPage } from '@/components/brand-vault-setup';
import DemoWorkspace from '@/components/demo-workspace';
import { getGetAccountRoleQueryKey, getGetSpecialistAssessmentQueryKey, useGetAccountRole, useGetSpecialistAssessment } from '@workspace/api-client-react';

const queryClient = new QueryClient();
type TaskflowRole = {
  role: 'client' | 'specialist' | 'admin';
  accessStatus: 'none' | 'invited' | 'active';
  coreSkillCategory: 'video' | 'social' | 'copy' | 'design' | null;
  onboardingCompleted: boolean;
  isSuperAdmin: boolean;
};
const TaskflowRoleContext = createContext<{ role: TaskflowRole | null; loading: boolean }>({ role: null, loading: true });
function TaskflowRoleProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const accountRole = useGetAccountRole({ query: { queryKey: getGetAccountRoleQueryKey(), enabled: isAuthenticated } });
  const value = useMemo(() => ({
    role: (accountRole.data as TaskflowRole | undefined) ?? null,
    loading: authLoading || (isAuthenticated && accountRole.isLoading),
  }), [accountRole.data, accountRole.isLoading, authLoading, isAuthenticated]);
  return <TaskflowRoleContext.Provider value={value}>{children}</TaskflowRoleContext.Provider>;
}
function useTaskflowRole() { return useContext(TaskflowRoleContext); }
type Category = 'All work' | 'Video & ads' | 'Content' | 'Design' | 'Automation';
type Service = { slug: string; name: string; category: Exclude<Category, 'All work'>; description: string; price: number; days: number; icon: typeof MonitorPlay; color: string; options: string[]; deliverables: string[]; soon?: boolean };
type CartItem = Service & { id: string; option: string; brief: string; quantity: number };
type ProjectInfo = { name: string; website: string; industry: string; audience: string };
type PortfolioKind = 'video' | 'social' | 'brand' | 'landing' | 'before-after' | 'automation';
type PortfolioExample = { title: string; label: string; description: string; kind: PortfolioKind; accent: string };
const services: Service[] = [
  { slug: 'paid-social-video-kit', name: 'Paid social video kit', category: 'Video & ads', description: 'Scroll-stopping ad cuts built for testing, not just looking good.', price: 680, days: 7, icon: MonitorPlay, color: 'bg-[#f59b82]', options: ['Starter · 3 concepts', 'Growth · 6 concepts', 'Scale · 10 concepts'], deliverables: ['3 vertical ad concepts', '9:16, 1:1 and 4:5 exports', 'Hook + CTA variations', 'Editable project files'] },
  { slug: 'ugc-style-ad', name: 'UGC-style product ad', category: 'Video & ads', description: 'A native-feeling product story built for the way people actually scroll.', price: 420, days: 6, icon: MonitorPlay, color: 'bg-[#f4ad9f]', options: ['One concept', 'Three concepts', 'Five concepts'], deliverables: ['Script + shot list', 'Vertical edited ad', 'Caption and CTA variants', 'Usage-ready export'] },
  { slug: 'youtube-shorts-pack', name: 'YouTube Shorts pack', category: 'Video & ads', description: 'Short-form episodes with a repeatable hook, edit rhythm, and finish.', price: 260, days: 5, icon: MonitorPlay, color: 'bg-[#e9947e]', options: ['3 Shorts', '5 Shorts', '10 Shorts'], deliverables: ['Short-form edits', 'Captions and sound mix', 'Hook variations', 'Publishing notes'] },
  { slug: 'founder-content-sprint', name: 'Founder content sprint', category: 'Content', description: 'A month of sharp, on-brand content from one focused working session.', price: 540, days: 6, icon: FileText, color: 'bg-[#f6c35f]', options: ['12 posts', '20 posts', '30 posts'], deliverables: ['12 social posts', '4 thought-leadership threads', 'Content calendar', 'Voice & angle guide'] },
  { slug: 'social-post-pack', name: 'Social post pack', category: 'Content', description: 'A focused batch of posts that gives the next campaign a clear cadence.', price: 180, days: 4, icon: FileText, color: 'bg-[#f2cf7c]', options: ['5 posts', '10 posts', '20 posts'], deliverables: ['Platform-ready copy', 'Creative direction per post', 'Hashtag and CTA notes', 'One revision round'] },
  { slug: 'content-calendar', name: 'Content calendar', category: 'Content', description: 'A practical month of topics, formats, and publishing prompts.', price: 240, days: 4, icon: FileText, color: 'bg-[#e8c06b]', options: ['2 weeks', '1 month', '3 months'], deliverables: ['Publishing schedule', 'Topic and format mix', 'Campaign moments', 'Briefs for each idea'] },
  { slug: 'caption-copy-pack', name: 'Caption copy pack', category: 'Content', description: 'Clear, on-brand captions that make every post easier to publish.', price: 120, days: 3, icon: FileText, color: 'bg-[#f3d99f]', options: ['10 captions', '25 captions', '50 captions'], deliverables: ['Platform-ready captions', 'CTA variations', 'Tone calibration', 'Suggested post order'] },
  { slug: 'conversion-landing-page', name: 'Conversion landing page', category: 'Design', description: 'A focused landing page that turns a clear offer into the next step.', price: 1250, days: 10, icon: Palette, color: 'bg-[#8bbce8]', options: ['Single page', 'Page + thank-you', 'Page + 2 variants'], deliverables: ['Wireframe + visual design', 'Conversion-led copy', 'Responsive Figma file', 'Handoff notes'], soon: true },
  { slug: 'brand-starter-system', name: 'Brand starter system', category: 'Design', description: 'A nimble visual system for teams who need to look consistent tomorrow.', price: 980, days: 9, icon: WandSparkles, color: 'bg-[#b7a7eb]', options: ['Essential', 'Standard', 'Extended'], deliverables: ['Logo direction', 'Color + type system', 'Social templates', 'Mini brand guide'] },
  { slug: 'sales-deck-design', name: 'Sales deck design', category: 'Design', description: 'A crisp, persuasive deck that makes the important part easy to understand.', price: 760, days: 7, icon: Grid2X2, color: 'bg-[#a8d7bd]', options: ['Up to 12 slides', 'Up to 20 slides', 'Up to 30 slides'], deliverables: ['Up to 12 slides', 'Story structure pass', 'Presentation-ready PDF', 'Editable source file'] },
  { slug: 'social-graphics-set', name: 'Social graphics set', category: 'Design', description: 'A flexible set of visual assets that keeps the feed recognizably yours.', price: 320, days: 5, icon: Palette, color: 'bg-[#98c4e5]', options: ['5 graphics', '10 graphics', '20 graphics'], deliverables: ['Platform-ready graphics', 'Two layout directions', 'Exported source files', 'Usage notes'] },
  { slug: 'thumbnail-pack', name: 'Thumbnail pack', category: 'Design', description: 'High-contrast thumbnails designed to make the next click easier.', price: 95, days: 3, icon: Palette, color: 'bg-[#a9bde0]', options: ['2 thumbnails', '5 thumbnails', '10 thumbnails'], deliverables: ['Click-oriented concepts', 'Desktop and mobile checks', 'Editable source files', 'Title treatment options'] },
  { slug: 'workflow-automation-map', name: 'Workflow automation map', category: 'Automation', description: 'A practical map of repetitive work worth handing to software.', price: 880, days: 8, icon: Settings2, color: 'bg-[#8fc9cf]', options: ['One workflow', 'Three workflows', 'Team-wide audit'], deliverables: ['Process audit', 'Automation opportunity map', 'Tool recommendations', 'Build-ready specs'] },
  { slug: 'lead-enquiry-workflow', name: 'Lead enquiry workflow', category: 'Automation', description: 'A simple system for capturing, sorting, and responding to new enquiries.', price: 640, days: 7, icon: Settings2, color: 'bg-[#83c1c5]', options: ['Form + inbox', 'Form + CRM handoff', 'Full follow-up flow'], deliverables: ['Enquiry form structure', 'Routing rules', 'Response templates', 'Launch checklist'] },
  { slug: 'spreadsheet-automation', name: 'Spreadsheet automation', category: 'Automation', description: 'A cleaner operating sheet that removes repetitive manual updates.', price: 520, days: 6, icon: Settings2, color: 'bg-[#9fd6cb]', options: ['One sheet', 'Three sheets', 'Team dashboard'], deliverables: ['Workflow audit', 'Automated formulas', 'Input and output views', 'Handoff documentation'] },
  { slug: 'document-processing-flow', name: 'Document processing flow', category: 'Automation', description: 'A repeatable way to intake, sort, and move business documents forward.', price: 720, days: 8, icon: Settings2, color: 'bg-[#86c6b8]', options: ['One document type', 'Three document types', 'Full intake flow'], deliverables: ['Process map', 'File naming and routing rules', 'Review checklist', 'Implementation brief'] },
  { slug: 'website-build', name: 'Website build', category: 'Design', description: 'A high-conviction marketing site, planned around your next milestone.', price: 3200, days: 20, icon: Grid2X2, color: 'bg-[#aeb6bf]', options: ['Marketing site', 'Site + CMS', 'Site + CMS + motion'], deliverables: ['Structure + UX direction', 'Responsive design', 'CMS-ready handoff', 'Launch checklist'], soon: true },
];

const serviceBySlug = new Map(services.map((service) => [service.slug, service]));
const scopePrice = (service: Service, optionIndex: number) => Math.round(service.price * [1, 1.45, 2][optionIndex] / 5) * 5;
const priceForOption = (service: Service, option: string) => scopePrice(service, Math.max(0, service.options.indexOf(option)));
function portfolioFor(service: Service): PortfolioExample[] {
  if (service.category === 'Video & ads') return [
    { title: `${service.name} · Hook test`, label: 'Short video preview', description: 'Fast opening frames built to earn the next second.', kind: 'video', accent: service.color },
    { title: `${service.name} · Product story`, label: 'Vertical cut', description: 'A clean, captioned edit ready for the feed.', kind: 'video', accent: 'bg-[#e9c56d]' },
    { title: `${service.name} · CTA variations`, label: 'Performance creative', description: 'Multiple endings that make testing easier.', kind: 'video', accent: 'bg-[#9ecbd0]' },
  ];
  if (service.category === 'Content') return [
    { title: `${service.name} · Campaign carousel`, label: 'Sample social post', description: 'A strong first slide, useful middle, clear next step.', kind: 'social', accent: service.color },
    { title: `${service.name} · Founder voice`, label: 'Thought-leadership post', description: 'A point of view shaped for a real publishing rhythm.', kind: 'social', accent: 'bg-[#b9a9e8]' },
    { title: `${service.name} · Weekly cadence`, label: 'Content system', description: 'A repeatable set of formats, prompts, and calls to action.', kind: 'social', accent: 'bg-[#f2b08d]' },
  ];
  if (service.category === 'Automation') return [
    { title: `${service.name} · Current state`, label: 'Automation map', description: 'The manual handoffs that slow the work down today.', kind: 'automation', accent: service.color },
    { title: `${service.name} · Future state`, label: 'Workflow architecture', description: 'Clear triggers, owners, tools, and outputs.', kind: 'automation', accent: 'bg-[#e9c56d]' },
    { title: `${service.name} · Handoff rules`, label: 'Build-ready spec', description: 'The decisions an implementation needs before it ships.', kind: 'automation', accent: 'bg-[#b9a9e8]' },
  ];
  if (service.slug === 'brand-starter-system') return [
    { title: 'Northstar · Core identity', label: 'Brand system preview', description: 'A compact identity with a point of view and room to grow.', kind: 'brand', accent: service.color },
    { title: 'Northstar · Social toolkit', label: 'Template preview', description: 'The same visual logic carried into everyday content.', kind: 'brand', accent: 'bg-[#f2b08d]' },
    { title: 'Northstar · Usage guide', label: 'Mini brand guide', description: 'Practical rules that keep the team consistent.', kind: 'brand', accent: 'bg-[#9ecbd0]' },
  ];
  if (service.slug === 'conversion-landing-page' || service.slug === 'website-build') return [
    { title: `${service.name} · Above the fold`, label: 'Landing page screenshot', description: 'A clear promise, proof, and next step in one screen.', kind: 'landing', accent: service.color },
    { title: `${service.name} · Proof section`, label: 'Responsive screen', description: 'The detail that turns interest into confidence.', kind: 'landing', accent: 'bg-[#f2b08d]' },
    { title: `${service.name} · Conversion path`, label: 'Page flow preview', description: 'A page structure built around the decision users need to make.', kind: 'landing', accent: 'bg-[#9ecbd0]' },
  ];
  return [
    { title: `${service.name} · Before`, label: 'Before / after', description: 'A clearer visual direction starts with seeing what is not working.', kind: 'before-after', accent: service.color },
    { title: `${service.name} · After`, label: 'Refined output', description: 'Sharper hierarchy, stronger contrast, easier scanning.', kind: 'before-after', accent: 'bg-[#e9c56d]' },
    { title: `${service.name} · Final system`, label: 'Handoff preview', description: 'A polished output that stays useful after delivery.', kind: 'before-after', accent: 'bg-[#9ecbd0]' },
  ];
}
const categories: { label: Category; icon: typeof Grid2X2 }[] = [{ label: 'All work', icon: Grid2X2 }, { label: 'Video & ads', icon: MonitorPlay }, { label: 'Content', icon: FileText }, { label: 'Design', icon: Palette }, { label: 'Automation', icon: Settings2 }];
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
function readStorage<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}
const emptyProject: ProjectInfo = { name: '', website: '', industry: '', audience: '' };
type CartValue = { items: CartItem[]; add: (s: Service, option: string, brief: string, quantity: number) => void; remove: (id: string) => void; adjust: (id: string, delta: number) => void; subtotal: number; count: number; project: ProjectInfo; setProject: (project: ProjectInfo) => void; deliveryOption: 'standard' | 'express'; setDeliveryOption: (option: 'standard' | 'express') => void; customPrice: string; setCustomPrice: (value: string) => void; customPriceReason: string; setCustomPriceReason: (value: string) => void };
const CartContext = createContext<CartValue | null>(null);
function useCart() { const value = useContext(CartContext); if (!value) throw new Error('Cart context missing'); return value; }
function Eyebrow({ children }: { children: ReactNode }) { return <p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">{children}</p>; }
function Logo() { return <Link href="/" className="group inline-flex items-center gap-2" data-testid="link-logo"><span className="grid size-8 place-items-center rounded-lg bg-primary shadow-[3px_3px_0_hsl(222_39%_14%)] group-hover:-rotate-6"><ArrowUpRight size={18} strokeWidth={3}/></span><span className="font-display text-xl font-bold tracking-[-.06em]">taskflow<span className="text-accent">.</span></span></Link>; }
function RoleWorkspaceLinks({ onNavigate }: { onNavigate?: () => void }) { const { isAuthenticated } = useAuth(); const { role } = useTaskflowRole(); const isSpecialist = role?.role === 'specialist' && role.accessStatus === 'active'; const isAdmin = role?.role === 'admin' && role.accessStatus === 'active'; const assessment = useGetSpecialistAssessment({ query: { queryKey: getGetSpecialistAssessmentQueryKey(), enabled: Boolean(isAuthenticated && isSpecialist) } }); return <>{isAdmin && <Link href="/inbox" onClick={onNavigate} className="text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-admin-workspace">Admin workspace</Link>}{isSpecialist && assessment.data?.status === 'passed' && <Link href="/fulfillment" onClick={onNavigate} className="text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-fulfillment">Fulfillment</Link>}{isSpecialist && assessment.data?.status !== 'passed' && <Link href="/fulfillment/assessment" onClick={onNavigate} className="text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-specialist-assessment">Assessment</Link>}{role?.isSuperAdmin === true && <Link href="/inbox/handover" onClick={onNavigate} className="text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-platform-handover">Platform handover</Link>}</>; }
function Header() {
  const { count } = useCart(); const { isAuthenticated, login } = useAuth(); const [open, setOpen] = useState(false); const nav = [['/services', 'Services'], ['/demo', 'Demo'], ['/how-it-works', 'How it works'], ['/faq', 'FAQ']];
  const { role } = useTaskflowRole();
  const owner = role?.role === 'admin' && role.accessStatus === 'active';
  return <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md"><div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between px-5 lg:px-8"><Logo/><nav className="hidden gap-7 md:flex">{nav.map(([href, label]) => <Link key={href} href={href} className="text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</Link>)}<RoleWorkspaceLinks/></nav><div className="flex items-center gap-2"><Link href="/cart" className="relative grid size-10 place-items-center rounded-full border border-border" data-testid="link-cart"><ShoppingBag size={17}/>{count > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-accent px-1 text-center text-[10px] font-bold">{count}</span>}</Link>{isAuthenticated ? <Link href={owner ? '/inbox' : '/account'} className="hidden items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-bold md:inline-flex" data-testid="link-account"><UserCircle size={15}/>{owner ? 'Inbox' : 'Account'}</Link> : <button onClick={() => login()} className="hidden items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-bold md:inline-flex" data-testid="button-sign-in"><LogIn size={14}/> Sign in</button>}<Link href="/services" className="hidden rounded-full bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground lg:inline-flex" data-testid="link-start-project">Start a project <ArrowRight size={14} className="ml-2"/></Link><button onClick={() => setOpen(!open)} className="grid size-10 place-items-center rounded-full border border-border md:hidden" data-testid="button-toggle-menu">{open ? <X size={18}/> : <Menu size={18}/>}</button></div></div>{open && <div className="border-t border-border px-5 py-5 md:hidden"><div className="flex flex-col gap-4">{nav.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="font-semibold">{label}</Link>)}<RoleWorkspaceLinks onNavigate={() => setOpen(false)}/>{isAuthenticated ? <Link href={owner ? '/inbox' : '/account'} onClick={() => setOpen(false)} className="font-semibold">{owner ? 'Admin workspace' : 'My account'}</Link> : <button onClick={() => login()} className="text-left font-semibold" data-testid="button-mobile-sign-in">Sign in</button>}</div></div>}</header>;
}
function Footer() { return <footer className="mt-20 border-t border-border bg-secondary py-12 text-secondary-foreground"><div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-3 lg:px-8"><div><Logo/><p className="mt-4 max-w-xs text-sm leading-6 text-secondary-foreground/65">Digital work, coordinated. Choose what you need, give one brief, and keep the project moving.</p></div><div><Eyebrow>Explore</Eyebrow><div className="mt-3 flex flex-col gap-2 text-sm"><Link href="/services">Services</Link><Link href="/how-it-works">How it works</Link><Link href="/faq">FAQ</Link></div></div><div><Eyebrow>Good to know</Eyebrow><p className="mt-3 max-w-xs text-sm leading-6 text-secondary-foreground/65">USD estimates · Request first · Agree the scope before payment.</p></div></div></footer>; }
function Shell({ children }: { children: ReactNode }) { return <div className="taskflow-noise min-h-[100dvh] overflow-x-hidden bg-background text-foreground"><Header/>{children}<Footer/></div>; }
type WorkspaceTab = 'overview' | 'messages' | 'settings' | 'services' | 'inbox' | 'tasks' | 'revenue' | 'templates' | 'credits' | 'automations' | 'handover' | 'brandVault';
function WorkspaceShell({ children, activeTab, unreadCount = 0, owner = false }: { children: ReactNode; activeTab: WorkspaceTab; unreadCount?: number; owner?: boolean }) {
  const { isAuthenticated } = useAuth();
  const { role } = useTaskflowRole();
  const tabs = owner
    ? [{ href: '/inbox', label: 'Inbox', key: 'inbox' as WorkspaceTab, icon: MessageCircle }, { href: '/inbox/tasks', label: 'Tasks', key: 'tasks' as WorkspaceTab, icon: ListTodo }, { href: '/inbox/revenue', label: 'Revenue', key: 'revenue' as WorkspaceTab, icon: CircleDollarSign }, { href: '/inbox/templates', label: 'Templates', key: 'templates' as WorkspaceTab, icon: ClipboardList }, { href: '/inbox/messages', label: 'Messages', key: 'messages' as WorkspaceTab, icon: MessageCircle }, { href: '/inbox/automations', label: 'Automations', key: 'automations' as WorkspaceTab, icon: Webhook }, { href: '/services', label: 'Services', key: 'services' as WorkspaceTab, icon: Grid2X2 }, { href: '/inbox/settings', label: 'Settings', key: 'settings' as WorkspaceTab, icon: Settings2 }, ...(role?.isSuperAdmin ? [{ href: '/inbox/handover', label: 'Platform Handover', key: 'handover' as WorkspaceTab, icon: Settings2 }] : [])]
    : [{ href: '/account', label: 'Overview', key: 'overview' as WorkspaceTab, icon: Grid2X2 }, { href: '/account/brand-vault', label: 'Brand Vault', key: 'brandVault' as WorkspaceTab, icon: Palette }, { href: '/account/messages', label: 'Messages', key: 'messages' as WorkspaceTab, icon: MessageCircle }, { href: '/account/credits', label: 'Credits', key: 'credits' as WorkspaceTab, icon: CreditCard }, { href: '/services', label: 'Services', key: 'services' as WorkspaceTab, icon: ShoppingBag }, { href: '/account/settings', label: 'Settings', key: 'settings' as WorkspaceTab, icon: Settings2 }];
  return <div className="min-h-[100dvh] bg-[#F4F5F7] text-foreground"><div className="border-b border-border/80 bg-background/80 backdrop-blur-md"><div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6"><Logo/><div className="hidden items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs font-semibold md:flex"><span className="size-2 rounded-full bg-primary"/>{owner ? 'Owner workspace' : 'Your project workspace'}</div><div className="flex items-center gap-2"><Link href="/" className="hidden text-xs font-bold text-muted-foreground hover:text-foreground sm:inline">Back to storefront</Link><Link href={owner ? '/inbox' : '/account'} className="grid size-10 place-items-center rounded-full border border-border bg-card"><UserCircle size={18}/></Link></div></div></div><div className="mx-auto flex min-h-[calc(100dvh-72px)] max-w-[1500px]"><aside className="hidden w-60 shrink-0 border-r border-border/80 bg-background/45 px-4 py-6 lg:block"><p className="px-3 font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">Workspace</p><nav className="mt-4 space-y-1">{tabs.map(({ href, label, key, icon: Icon }) => <Link key={href} href={href} data-testid={`link-workspace-${key}`} className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold ${activeTab === key ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><span className="flex items-center gap-3"><Icon size={16}/>{label}</span>{label === 'Messages' && unreadCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-foreground">{unreadCount}</span>}</Link>)}</nav><div className="mt-10 rounded-2xl bg-primary/15 p-4"><HeartHandshake size={20} className="text-primary"/><p className="mt-3 font-display text-lg font-bold">{owner ? 'Keep projects moving.' : 'A calmer project starts here.'}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{owner ? 'Review, reply, and set the next useful step.' : 'Everything important stays connected to the work.'}</p></div></aside><div className="min-w-0 flex-1"><nav className="flex gap-1 overflow-x-auto border-b border-border/70 bg-background/65 px-4 py-3 lg:hidden">{tabs.map(({ href, label, key }) => <Link key={href} href={href} data-testid={`link-workspace-mobile-${key}`} className={`relative shrink-0 rounded-full px-4 py-2 text-xs font-bold ${activeTab === key ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'}`}>{label}{label === 'Messages' && unreadCount > 0 && <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px]">{unreadCount}</span>}</Link>)}</nav><main className="mx-auto w-full max-w-[1240px] p-4 sm:p-6 lg:p-10">{activeTab === 'settings' && <div className="mb-5"><ProfileSettingsPanel/></div>}{children}</main></div></div></div>;
}
function OnboardingGate() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<'one_off' | 'long_term' | 'not_sure'>('long_term');
  const finish = (selectedIntent: typeof intent) => { setIntent(selectedIntent); setOpen(false); };
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-secondary/55 p-4 backdrop-blur-sm"><section className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl"><div className="absolute -right-16 -top-16 size-40 rounded-full bg-primary/30"/><div className="absolute -bottom-20 -left-16 size-44 rounded-full bg-accent/20"/><div className="relative p-7 sm:p-10"><div className="flex items-center justify-between"><span className="rounded-full bg-primary/15 px-3 py-1.5 font-mono-ui text-[10px] uppercase tracking-[.14em] text-primary">Tiny welcome tour · {step + 1}/3</span><Sparkles className="text-accent"/></div>{step === 0 && <><h2 className="mt-10 max-w-sm font-display text-4xl font-bold leading-[.95]">Let’s make this feel like your space.</h2><p className="mt-5 text-sm leading-7 text-muted-foreground">A couple of quick choices help us make your project workspace feel more useful from the first hello.</p><button onClick={() => setStep(1)} className="mt-8 rounded-full bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground">Let’s go <ArrowRight size={15} className="ml-2 inline"/></button></>}{step === 1 && <><h2 className="mt-10 font-display text-3xl font-bold">How do you see us fitting in?</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">There’s no wrong answer. This just helps us understand the rhythm you’re planning for.</p><div className="mt-7 grid gap-3"><button onClick={() => { setIntent('long_term'); setStep(2); }} className={`rounded-2xl border p-4 text-left ${intent === 'long_term' ? 'border-foreground bg-muted' : 'border-border bg-card'}`}><b>I’m planning ongoing work</b><span className="mt-1 block text-xs text-muted-foreground">A reliable creative partner for launches, content, and the work between.</span></button><button onClick={() => { setIntent('one_off'); setStep(2); }} className={`rounded-2xl border p-4 text-left ${intent === 'one_off' ? 'border-foreground bg-muted' : 'border-border bg-card'}`}><b>I have one project in mind</b><span className="mt-1 block text-xs text-muted-foreground">Let’s get this specific thing moving, then see what’s next.</span></button><button onClick={() => { setIntent('not_sure'); setStep(2); }} className="rounded-2xl border border-border bg-card p-4 text-left"><b>I’m still figuring it out</b><span className="mt-1 block text-xs text-muted-foreground">That’s fine. We’ll start with a useful conversation.</span></button></div></>}{step === 2 && <><div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Check size={26}/></div><h2 className="mt-8 font-display text-4xl font-bold leading-[.95]">You’re all set.</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">Your workspace is ready. Browse services when you’re ready, or open your messages when a project is underway.</p><button onClick={() => void finish(intent)} className="mt-8 rounded-full bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground">Open my workspace <ArrowRight size={15} className="ml-2 inline"/></button></>}{step > 0 && step < 2 && <button onClick={() => setStep(0)} className="mt-7 text-xs font-bold text-muted-foreground underline">Back</button>}<button onClick={() => void finish('not_sure')} className="absolute bottom-7 right-7 text-xs font-bold text-muted-foreground underline">Skip</button></div></section></div>;
}
function ServiceMark({ service, large = false }: { service?: Service; large?: boolean }) { const resolvedService = services.find((candidate) => candidate.slug === service?.slug) ?? services[0]; const Icon = resolvedService.icon; return <div className={`${large ? 'size-16 rounded-2xl' : 'size-11 rounded-xl'} ${resolvedService.color} grid place-items-center text-secondary`}><Icon size={large ? 28 : 19}/></div>; }
function ServiceCard({ service }: { service: Service }) { return <Link href={`/services/${service.slug}`} className="group flex min-h-[340px] flex-col rounded-[1.35rem] border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-foreground/30 hover:shadow-[0_14px_34px_hsl(222_39%_14%/.1)] md:p-6" data-testid={`card-service-${service.slug}`}><div className="flex items-start justify-between gap-4"><ServiceMark service={service} large/>{service.soon ? <span className="rounded-full bg-muted px-2.5 py-1 font-mono-ui text-[9px] uppercase">Coming soon</span> : <div className="rounded-2xl bg-primary/20 px-4 py-2.5 text-right"><span className="block font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">Starting at</span><span className="font-display text-3xl font-bold leading-none">{money(service.price)}</span></div>}</div><div className="mt-7"><Eyebrow>{service.category}</Eyebrow><h3 className="mt-2 max-w-[15rem] font-display text-[1.7rem] font-bold leading-[1.05] tracking-[-.04em]">{service.name}</h3><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{service.description}</p></div><div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-5 text-xs"><span className="flex items-center gap-1.5 text-muted-foreground"><Clock3 size={14}/>{service.days} business days</span><span className="font-bold group-hover:translate-x-1">View scope <ArrowRight size={14} className="inline"/></span></div></Link>; }
function PortfolioPreview({ example }: { example: PortfolioExample }) {
  if (example.kind === 'video') return <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${example.accent}`}><div className="absolute inset-4 rounded-xl bg-secondary/90 p-4 text-secondary-foreground"><div className="flex items-center justify-between text-[8px] uppercase tracking-[.16em]"><span>Preview</span><span>00:12</span></div><div className="grid h-full place-items-center"><span className="grid size-12 place-items-center rounded-full bg-primary text-secondary"><span className="ml-1 text-lg">▶</span></span></div><div className="absolute bottom-3 left-4 right-4"><div className="h-1 rounded-full bg-secondary-foreground/20"><div className="h-1 w-2/3 rounded-full bg-primary"/></div><div className="mt-2 flex justify-between font-mono-ui text-[8px] text-secondary-foreground/60"><span>HOOK</span><span>CTA</span></div></div></div></div>;
  if (example.kind === 'social') return <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${example.accent} p-4`}><div className="h-full rounded-xl bg-card p-3 shadow-lg"><div className="flex items-center gap-2"><span className="size-6 rounded-full bg-secondary"/><span className="h-2 w-20 rounded-full bg-muted"/><span className="ml-auto text-muted-foreground">•••</span></div><div className="mt-3 grid aspect-[1.45/1] place-items-center rounded-lg bg-secondary px-4 text-center text-primary"><span className="font-display text-2xl font-bold leading-none">MAKE THE<br/>NEXT MOVE.</span></div><div className="mt-3 flex gap-2 text-xs text-muted-foreground"><span>♡</span><span>◌</span><span>⌁</span></div><div className="mt-2 h-2 w-4/5 rounded-full bg-muted"/></div></div>;
  if (example.kind === 'brand') return <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${example.accent} p-5`}><div className="flex h-full flex-col justify-between rounded-xl bg-card p-4"><div className="flex items-start justify-between"><span className="font-display text-2xl font-bold">Aa</span><span className="font-mono-ui text-[8px] uppercase tracking-[.16em]">Identity</span></div><div><p className="font-display text-xl font-bold">A system<br/>with a point<br/>of view.</p><div className="mt-4 flex gap-2"><span className="size-6 rounded-full bg-secondary"/><span className="size-6 rounded-full bg-primary"/><span className="size-6 rounded-full bg-accent"/><span className="size-6 rounded-full bg-[#9ecbd0]"/></div></div></div></div>;
  if (example.kind === 'landing') return <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${example.accent} p-4`}><div className="h-full overflow-hidden rounded-xl bg-card shadow-lg"><div className="flex h-6 items-center gap-1 border-b border-border px-3"><span className="size-2 rounded-full bg-accent"/><span className="size-2 rounded-full bg-primary"/><span className="size-2 rounded-full bg-[#9ecbd0]"/><span className="ml-auto h-2 w-20 rounded-full bg-muted"/></div><div className="p-4"><span className="font-mono-ui text-[8px] uppercase tracking-[.15em] text-muted-foreground">A better next step</span><p className="mt-4 max-w-[160px] font-display text-2xl font-bold leading-none">Make the work easier to choose.</p><div className="mt-4 h-2 w-24 rounded-full bg-secondary"/><div className="mt-5 grid grid-cols-3 gap-2"><span className="h-14 rounded-lg bg-muted"/><span className="h-14 rounded-lg bg-primary/50"/><span className="h-14 rounded-lg bg-secondary/80"/></div></div></div></div>;
  if (example.kind === 'automation') return <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${example.accent} p-4`}><div className="relative h-full rounded-xl bg-secondary p-4 text-secondary-foreground"><div className="flex justify-between font-mono-ui text-[8px] uppercase tracking-[.14em]"><span>Workflow map</span><span>v1.0</span></div><div className="absolute left-7 right-7 top-1/2 h-px bg-secondary-foreground/30"/><div className="relative mt-12 flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-primary text-[9px] font-bold text-secondary">TRIGGER</span><span className="grid size-10 place-items-center rounded-xl border border-secondary-foreground/30 text-[9px] font-bold">ROUTE</span><span className="grid size-10 place-items-center rounded-xl bg-accent text-[9px] font-bold text-secondary">OUTPUT</span></div><div className="absolute bottom-4 left-4 right-4 flex justify-between font-mono-ui text-[8px] text-secondary-foreground/60"><span>FORM</span><span>RULES</span><span>CRM</span></div></div></div>;
  return <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${example.accent} p-4`}><div className="grid h-full grid-cols-2 gap-2"><div className="rounded-xl border border-secondary/10 bg-card/50 p-3"><span className="font-mono-ui text-[8px] uppercase text-muted-foreground">Before</span><div className="mt-4 space-y-3"><span className="block h-3 w-3/4 rounded bg-secondary/20"/><span className="block h-12 rounded bg-secondary/10"/><span className="block h-3 w-1/2 rounded bg-secondary/20"/></div></div><div className="rounded-xl bg-card p-3 shadow-lg"><span className="font-mono-ui text-[8px] uppercase text-primary">After</span><div className="mt-4 space-y-3"><span className="block h-3 w-3/4 rounded bg-primary"/><span className="block h-12 rounded bg-secondary"/><span className="block h-3 w-1/2 rounded bg-accent"/></div></div></div></div>;
}
function ServicePortfolio({ service }: { service: Service }) {
  const examples = portfolioFor(service);
  return <section className="mt-20 border-t border-border pt-10" data-testid={`portfolio-${service.slug}`}><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><Eyebrow>See the output</Eyebrow><h2 className="mt-2 font-display text-3xl font-bold">A feel for the finish.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Representative examples of what this service can look like in the hands of a focused team.</p></div><span className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground">{examples.length} sample outputs</span></div><div className="mt-7 grid gap-4 md:grid-cols-3">{examples.map((example) => <article key={example.title} className="group overflow-hidden rounded-3xl border border-border bg-card"><PortfolioPreview example={example}/><div className="p-5"><Eyebrow>{example.label}</Eyebrow><h3 className="mt-2 font-display text-xl font-bold">{example.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{example.description}</p></div></article>)}</div></section>;
}

function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [activeDemoItem, setActiveDemoItem] = useState('3 Short-Form Videos');
  const steps = [
    { title: 'Connect Your Brand Vault', copy: 'Enter your brand guidelines, voice, fonts, and assets once.', detail: 'Your team’s references stay connected to every request, so the right context travels with the work.' },
    { title: 'Bundle Your Services', copy: 'Select multiple deliverables (video, social graphics, ad creative) inside a single project brief.', detail: 'One clear brief gives the delivery team the full picture across formats, deadlines, and campaign goals.' },
    { title: 'Track in Real Time', copy: 'Monitor progress across all services through a unified client status center.', detail: 'See what is moving, what needs review, and what is coming next without chasing separate threads.' },
    { title: 'Receive Coordinated Assets', copy: 'Get finished, on-brand files delivered on time with frame-accurate review tools.', detail: 'Review each deliverable in context and keep feedback close to the asset it belongs to.' },
  ];
  const catalog = [
    { title: 'Video Production & Editing', copy: 'Short-form Reels/Shorts/TikToks, promo videos, footage repurposing.', icon: MonitorPlay },
    { title: 'Social Media Content', copy: 'Carousel graphics, promotional posts, social packages, custom captions.', icon: FileText },
    { title: 'Performance Marketing', copy: 'High-converting ad creatives, promo banners, campaign launch kits.', icon: WandSparkles },
    { title: 'E-Commerce & Digital Storefronts', copy: 'Product listing assets, storefront media, feature highlights.', icon: ShoppingBag },
  ];
  const plans = [
    { name: 'Starter Capacity', price: '$299', credits: '10 Priority Task Credits', audience: 'Ideal for solo creators and small brands.' },
    { name: 'Growth Retainer', price: '$799', credits: '30 Priority Task Credits + Express Coordination Queue', audience: '' },
    { name: 'Scale Unlimited', price: '$1,499', credits: '75 Priority Task Credits + Dedicated Project Coordinator + 5-day express SLA', audience: '' },
  ];
  return <Shell><main>
    <section className="relative overflow-hidden bg-secondary text-secondary-foreground"><div className="absolute inset-0 bg-grid opacity-20"/><div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
      <div><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-secondary-foreground/20 px-3 py-1.5 font-mono-ui text-[10px] uppercase tracking-[.14em]"><span className="size-1.5 rounded-full bg-primary"/>A better way to buy digital work</div><h1 className="font-display text-[clamp(2rem,4.25vw,3.5rem)] font-bold leading-[.9] tracking-[-.085em]">Your Digital Work.<br/><span className="text-primary">One Coordinated Flow.</span></h1><p className="mt-8 max-w-[470px] text-lg leading-7 text-secondary-foreground/70">Stop managing five different freelancers. Order multi-service digital campaigns—from video editing and social graphics to ad creative—packaged into a single, coordinated project.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/services" className="inline-flex items-center rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground" data-testid="hero-cta-build-project">Build Your First Project <ArrowRight size={16} className="ml-2"/></Link><Link href="/demo" className="inline-flex items-center rounded-full border border-secondary-foreground/25 px-5 py-3.5 text-sm font-bold hover:bg-secondary-foreground/10" data-testid="hero-cta-live-demo">Explore all account roles <ArrowRight size={15} className="ml-2"/></Link></div></div>
      <div id="sample-project" className="relative scroll-mt-24 rounded-[2rem] border border-secondary-foreground/20 bg-background p-5 text-foreground shadow-xl sm:p-7" data-testid="sample-project-demo" aria-label="Interactive sample project data demo"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><div><Eyebrow>Sample project data · Demo only</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">New Product Launch</h2></div><span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1.5 font-mono-ui text-[10px] uppercase tracking-wide"><span className="size-2 rounded-full bg-primary"/>Coordinating</span></div><p className="mt-4 text-sm leading-6 text-muted-foreground">A single shared brief keeps each launch asset connected to the same goals and brand context.</p><div className="mt-5 flex flex-wrap gap-2">{['3 Short-Form Videos', '5 Social Graphics', '1 Ad Creative', 'Brand Vault Linked'].map((item, index) => <button key={item} type="button" onClick={() => setActiveDemoItem(item)} aria-pressed={activeDemoItem === item} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${activeDemoItem === item ? 'border-foreground bg-muted text-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`} data-testid={`demo-chip-${index}`}><Check size={13} className={activeDemoItem === item ? 'text-primary' : 'opacity-50'}/>{item}</button>)}</div><div className="mt-6 rounded-2xl bg-muted/70 p-4"><div className="flex items-center justify-between gap-3"><span className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-muted-foreground">Selected demo item</span><span className="rounded-full bg-primary/20 px-2.5 py-1 text-[10px] font-bold">In coordination</span></div><p className="mt-2 font-display text-lg font-bold" aria-live="polite" data-testid="demo-selected-item">{activeDemoItem}</p><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-primary"/><span>Brief aligned</span><span className="h-px flex-1 bg-border"/><span className="size-2 rounded-full bg-accent"/><span>Production</span><span className="h-px flex-1 bg-border"/><span className="size-2 rounded-full bg-border"/><span>Review</span></div></div></div>
    </div></section>

    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8" aria-labelledby="problem-solution-title"><div className="mb-9 max-w-2xl"><Eyebrow>The difference</Eyebrow><h2 id="problem-solution-title" className="mt-3 font-display text-4xl font-bold md:text-5xl">The Problem vs. The TaskFlow Solution</h2><p className="mt-4 text-sm leading-6 text-muted-foreground">Multiple services should move like one project—not become another job to manage.</p></div><div className="grid gap-4 md:grid-cols-2"><article className="rounded-3xl border border-border bg-card p-6 md:p-8" data-testid="comparison-old-way"><div className="flex items-center justify-between gap-3"><div><Eyebrow>The Old Way</Eyebrow><h3 className="mt-1 font-display text-xl font-bold">Fragmented Chaos</h3></div><span className="rounded-full bg-muted px-3 py-1 font-mono-ui text-[10px] uppercase">Scattered</span></div><div className="mt-6 rounded-2xl bg-muted/70 p-4 text-sm font-bold">Customer</div><div className="ml-5 mt-3 border-l border-border pl-4"><p className="text-xs text-muted-foreground">separate handoffs to</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-xl border border-border bg-background p-3 text-xs font-bold">Freelancer A <span className="mt-1 block font-normal text-muted-foreground">(Video)</span></div><div className="rounded-xl border border-border bg-background p-3 text-xs font-bold">Freelancer B <span className="mt-1 block font-normal text-muted-foreground">(Graphics)</span></div><div className="rounded-xl border border-border bg-background p-3 text-xs font-bold">Freelancer C <span className="mt-1 block font-normal text-muted-foreground">(Copy)</span></div></div></div><ul className="mt-6 space-y-2 text-sm text-muted-foreground"><li className="flex gap-2"><X size={15} className="mt-0.5 shrink-0 text-accent"/>Three separate briefs</li><li className="flex gap-2"><X size={15} className="mt-0.5 shrink-0 text-accent"/>Repeated brand explanations</li><li className="flex gap-2"><X size={15} className="mt-0.5 shrink-0 text-accent"/>Inconsistent output</li><li className="flex gap-2"><X size={15} className="mt-0.5 shrink-0 text-accent"/>Project-manager fatigue</li></ul></article><article className="rounded-3xl border border-border bg-secondary p-6 text-secondary-foreground md:p-8" data-testid="comparison-taskflow-way"><div className="flex items-center justify-between gap-3"><div><Eyebrow>The TaskFlow Way</Eyebrow><h3 className="mt-1 font-display text-xl font-bold">Coordinated Clarity</h3></div><span className="rounded-full bg-primary px-3 py-1 font-mono-ui text-[10px] uppercase text-primary-foreground">One flow</span></div><div className="mt-6 rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/5 p-4 text-sm font-bold">Customer</div><div className="my-3 flex items-center gap-2 pl-4 text-primary"><span className="h-5 w-px bg-secondary-foreground/30"/><ArrowRight size={15}/></div><div className="rounded-2xl bg-primary p-4 text-primary-foreground"><span className="font-display text-lg font-bold">Brand Vault</span><span className="mt-1 block text-xs">Enter Assets Once</span></div><div className="my-3 flex items-center gap-2 pl-4 text-primary"><span className="h-5 w-px bg-secondary-foreground/30"/><ArrowRight size={15}/></div><div className="rounded-2xl border border-secondary-foreground/20 p-4"><p className="font-display text-lg font-bold">One Coordinated TaskFlow Project</p></div><div className="mt-5 flex items-center gap-2 rounded-xl bg-secondary-foreground/10 p-3 text-sm font-semibold"><CheckCircle2 size={17} className="shrink-0 text-primary"/>Seamless, cross-format deliverables</div></article></div></section>

    <section className="bg-muted/55 py-20" aria-labelledby="how-it-works-home-title"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-8 md:grid-cols-[.7fr_1.3fr]"><div><Eyebrow>One brief, clear milestones</Eyebrow><h2 id="how-it-works-home-title" className="mt-3 max-w-md font-display text-4xl font-bold md:text-5xl">How it works</h2><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Four considered steps take your request from brand context to coordinated delivery.</p></div><div><div aria-label="How TaskFlow works" className="grid gap-2 sm:grid-cols-2">{steps.map((step, index) => <button key={step.title} type="button" aria-pressed={activeStep === index} aria-controls="how-step-detail" onClick={() => setActiveStep(index)} className={`rounded-2xl border p-4 text-left transition-colors ${activeStep === index ? 'border-foreground bg-card shadow-sm' : 'border-border bg-background/50 hover:bg-card'}`} data-testid={`how-step-tab-${index + 1}`}><span className="font-mono-ui text-xs text-primary">0{index + 1}</span><span className="mt-3 block font-display text-lg font-bold">{step.title}</span><span className="mt-2 block text-xs leading-5 text-muted-foreground">{step.copy}</span></button>)}</div><div id="how-step-detail" aria-live="polite" aria-label="Selected How it works step" className="mt-3 rounded-2xl bg-secondary p-5 text-secondary-foreground" data-testid="how-step-detail"><Eyebrow>Step 0{activeStep + 1} detail</Eyebrow><p className="mt-2 text-sm leading-6">{steps[activeStep].detail}</p></div></div></div></div></section>

    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8" aria-labelledby="catalog-home-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Eyebrow>Multi-service catalog</Eyebrow><h2 id="catalog-home-title" className="mt-3 max-w-2xl font-display text-4xl font-bold md:text-5xl">The right mix for your next move.</h2></div><Link href="/services" className="inline-flex items-center gap-2 text-sm font-bold" data-testid="link-home-catalog">Explore all services <ArrowUpRight size={16}/></Link></div><div className="mt-9 grid gap-3 sm:grid-cols-2">{catalog.map(({ title, copy, icon: Icon }, index) => <Link key={title} href="/services" className="group flex min-h-44 flex-col justify-between rounded-3xl border border-border bg-card p-5 transition-colors hover:bg-muted/60 md:p-7" data-testid={`home-catalog-${index}`}><div className="flex items-start justify-between"><span className="grid size-11 place-items-center rounded-xl bg-primary/20 text-secondary"><Icon size={20}/></span><ArrowUpRight size={17} className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"/></div><div><h3 className="font-display text-xl font-bold">{title}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{copy}</p></div></Link>)}</div></section>

    <section className="bg-secondary py-20 text-secondary-foreground" aria-labelledby="capacity-plans-title"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><Eyebrow>Monthly capacity tiers</Eyebrow><h2 id="capacity-plans-title" className="mt-3 max-w-xl font-display text-4xl font-bold md:text-5xl">Keep good work in motion.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-secondary-foreground/70">Choose monthly capacity for a steady delivery rhythm, or build custom multi-service projects whenever you need them.</p></div><Link href="/services" className="inline-flex w-fit items-center rounded-full border border-secondary-foreground/25 px-4 py-2.5 text-sm font-bold" data-testid="link-custom-project">Build a custom project <ArrowRight size={15} className="ml-2"/></Link></div><div className="mt-9 grid gap-3 lg:grid-cols-3">{plans.map((plan, index) => <article key={plan.name} className={`flex flex-col rounded-3xl border p-6 ${index === 1 ? 'border-primary/70 bg-secondary-foreground/10' : 'border-secondary-foreground/20 bg-secondary-foreground/[.04]'}`} data-testid={`capacity-plan-${index}`}><Eyebrow>{index === 1 ? 'Most flexible' : 'Monthly capacity'}</Eyebrow><h3 className="mt-4 font-display text-2xl font-bold">{plan.name}</h3><p className="mt-4 font-display text-4xl font-bold">{plan.price}<span className="ml-1 text-sm font-semibold text-secondary-foreground/65">/mo</span></p><p className="mt-4 min-h-12 text-sm font-semibold leading-6">{plan.credits}</p>{plan.audience && <p className="mt-2 text-sm leading-6 text-secondary-foreground/65">{plan.audience}</p>}<Link href="/account/credits" className="mt-7 inline-flex w-fit items-center rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid={`link-capacity-plan-${index}`}>Explore capacity <ArrowRight size={15} className="ml-2"/></Link></article>)}</div><p className="mt-5 text-xs leading-5 text-secondary-foreground/60">Capacity options are presented as monthly tiers; existing billing and checkout flows remain unchanged.</p></div></section>

    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="rounded-3xl bg-primary p-8 text-primary-foreground md:p-12"><Eyebrow>Ready when you are</Eyebrow><h2 className="mt-4 max-w-xl font-display text-4xl font-bold md:text-6xl">Bring the project.<br/>We’ll bring the flow.</h2><p className="mt-4 max-w-lg text-sm leading-6 text-primary-foreground/75">Start with one coordinated brief, then bring in the right mix of digital services.</p><Link href="/services" className="mt-8 inline-flex rounded-full bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground" data-testid="cta-browse-services">Build Your First Project <ArrowRight size={16} className="ml-2"/></Link></div></section>
  </main></Shell>;
}

function ServicesPage() {
  const [search, setSearch] = useState(''); const [category, setCategory] = useState<Category>('All work');
  const filtered = services.filter((s) => (category === 'All work' || s.category === category) && `${s.name} ${s.description}`.toLowerCase().includes(search.toLowerCase()));
  return <Shell><main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20"><Eyebrow>The catalog</Eyebrow><h1 className="mt-4 font-display text-5xl font-bold md:text-7xl">Useful work,<br/><span className="text-accent">ready to order.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">Pick one piece or build a coordinated project. Every service starts with an outcome, a clear price, and a delivery window.</p><div className="mt-9 grid gap-3 rounded-[1.5rem] border border-border bg-secondary p-5 text-secondary-foreground md:grid-cols-[1.35fr_repeat(3,.65fr)] md:items-center md:p-6"><div><Eyebrow>How to read the prices</Eyebrow><p className="mt-2 max-w-md text-sm leading-6 text-secondary-foreground/75">Each amount is a starting estimate for the smallest scope. Pick the shape you need, then confirm the final total with us before payment.</p></div><div className="border-t border-secondary-foreground/15 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0"><span className="font-display text-xl font-bold">From</span><p className="mt-1 text-xs text-secondary-foreground/65">Smallest listed scope</p></div><div className="border-t border-secondary-foreground/15 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0"><span className="font-display text-xl font-bold">3 scopes</span><p className="mt-1 text-xs text-secondary-foreground/65">Choose your level of support</p></div><div className="border-t border-secondary-foreground/15 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0"><span className="font-display text-xl font-bold">No payment</span><p className="mt-1 text-xs text-secondary-foreground/65">Request first, invoice later</p></div></div><div className="mt-10 flex flex-col gap-4 border-y border-border py-4 lg:flex-row lg:justify-between"><div className="flex gap-2 overflow-x-auto">{categories.map(({ label, icon: Icon }) => <button key={label} onClick={() => setCategory(label)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold ${category === label ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted'}`} data-testid={`filter-${label.toLowerCase().replace(/\W/g, '-')}`}><Icon size={14}/>{label}</button>)}</div><div className="relative w-full lg:w-64"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the catalog" className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/30" data-testid="input-service-search"/></div></div>{filtered.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{filtered.map((service) => <ServiceCard key={service.slug} service={service}/>)}</div> : <div className="mt-8 rounded-3xl border border-dashed border-border bg-card px-6 py-20 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted"><Search size={22}/></div><h2 className="mt-5 font-display text-2xl font-bold">Nothing in that lane yet.</h2><button onClick={() => { setSearch(''); setCategory('All work'); }} className="mt-6 rounded-full bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground" data-testid="button-clear-filters">Clear filters</button></div>}</main></Shell>;
}

function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>(); const service = services.find((s) => s.slug === slug); const { add } = useCart(); const [option, setOption] = useState(service?.options[0] ?? ''); const [brief, setBrief] = useState(''); const [quantity, setQuantity] = useState(1); const [added, setAdded] = useState(false);
  if (!service) return <Shell><div className="mx-auto max-w-3xl px-5 py-24 text-center"><h1 className="font-display text-5xl font-bold">That service moved.</h1><Link href="/services" className="mt-6 inline-flex rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground">Back to catalog</Link></div></Shell>;
  const submit = () => { add(service, option, brief, quantity); setAdded(true); window.setTimeout(() => setAdded(false), 2000); };
  return <Shell><main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16"><Link href="/services" className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground"><ArrowLeft size={15}/> All services</Link><div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]"><div><ServiceMark service={service} large/><Eyebrow>{service.category} · {service.days} business days</Eyebrow><h1 className="mt-4 font-display text-5xl font-bold leading-none md:text-7xl">{service.name}</h1><p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">{service.description}</p><div className="mt-10 border-t border-border pt-6"><Eyebrow>Starting estimate</Eyebrow><div className="mt-2 flex flex-wrap items-baseline gap-3"><span className="font-display text-6xl font-bold tracking-[-.06em]">{money(service.price)}</span><span className="text-sm text-muted-foreground">USD · final scope confirmed before invoice</span></div></div></div><div className="rounded-3xl border border-border bg-card p-5 md:p-8"><Eyebrow>Configure your order</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Make it yours.</h2><label className="mt-7 block text-sm font-bold">Choose your scope</label><div className="mt-3 grid gap-2">{service.options.map((item, index) => <button key={item} onClick={() => setOption(item)} className={`flex justify-between rounded-xl border p-4 text-left text-sm ${option === item ? 'border-foreground bg-muted' : 'border-border'}`} data-testid={`option-scope-${index}`}><span>{item}<small className="mt-1 block text-xs font-normal text-muted-foreground">{money(scopePrice(service, index))} starting estimate</small></span>{option === item && <Check size={16}/>}</button>)}</div><div className="mt-5 rounded-2xl bg-primary/15 p-4"><div className="flex items-center justify-between gap-4 text-sm font-bold"><span>Current scope estimate</span><span className="font-display text-xl">{money(priceForOption(service, option))}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">We’ll confirm the final total after reviewing your brief and selected scope.</p></div><label className="mt-7 block text-sm font-bold">What are we making?<textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={4} className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-4 text-sm outline-none focus:ring-4 focus:ring-primary/30" placeholder="Tell us about the business, audience, and outcome." data-testid="textarea-service-brief"/></label><div className="mt-7 flex items-center justify-between border-t border-border pt-6"><div className="inline-flex items-center rounded-full border border-border"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="grid size-9 place-items-center" data-testid="button-decrease-quantity"><Minus size={14}/></button><span className="w-8 text-center font-mono-ui text-sm">{quantity}</span><button onClick={() => setQuantity(quantity + 1)} className="grid size-9 place-items-center" data-testid="button-increase-quantity"><Plus size={14}/></button></div><button onClick={submit} disabled={service.soon} className="rounded-full bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground disabled:opacity-40" data-testid="button-add-service">{added ? 'Added to project' : 'Add to project'}</button></div></div></div><ServicePortfolio service={service}/><div className="mt-20 border-t border-border pt-10"><Eyebrow>What this can include</Eyebrow><h2 className="mt-2 font-display text-3xl font-bold">The output, made specific.</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{service.deliverables.map((item) => <div key={item} className="flex gap-3 rounded-xl bg-muted/60 p-4 text-sm font-semibold"><Check size={16} className="shrink-0 text-[#4a9c88]"/>{item}</div>)}</div></div></main>{added && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground shadow-xl">Added · <Link href="/cart" className="text-primary underline">View project</Link></div>}</Shell>;
}

type PromotionPreview = {
  eligible: boolean;
  isFirstOrder: boolean;
  discountCents: number;
  discountPercent: number;
  code: string | null;
  label: string;
  message: string;
};

function usePromotionPreview(subtotal: number, customPrice: boolean) {
  const { isAuthenticated } = useAuth();
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  useEffect(() => {
    setPreview(null);
    if (!isAuthenticated || subtotal <= 0) {
      return;
    }
    const query = new URLSearchParams({ subtotalCents: String(Math.round(subtotal * 100)), customPrice: String(customPrice) });
    let active = true;
    void fetch(`/api/account/promotion-preview?${query.toString()}`)
      .then((response) => response.ok ? response.json() as Promise<PromotionPreview> : null)
      .then((data) => { if (active) setPreview(data); })
      .catch(() => { if (active) setPreview(null); });
    return () => { active = false; };
  }, [isAuthenticated, subtotal, customPrice]);
  return preview;
}

function SurpriseOffer({ preview, authenticated, open, revealed, onClose, onReveal, onSignIn }: { preview: PromotionPreview | null; authenticated: boolean; open: boolean; revealed: boolean; onClose: () => void; onReveal: () => void; onSignIn: () => void }) {
  if (!open) return null;
  const signedIn = authenticated;
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-secondary/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="surprise-offer-title">
    <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl">
      <div className="absolute -right-20 -top-24 size-56 rounded-full bg-primary/20"/>
      <div className="absolute -bottom-24 -left-20 size-56 rounded-full bg-accent/15"/>
      <button type="button" onClick={onClose} className="absolute right-5 top-5 z-10 grid size-9 place-items-center rounded-full border border-border bg-background/80 text-muted-foreground" aria-label="Close surprise offer"><X size={16}/></button>
      <div className="relative p-7 text-center sm:p-10">
        <Eyebrow>Something extra for this project</Eyebrow>
        <h2 id="surprise-offer-title" className="mt-3 font-display text-4xl font-bold leading-none">There’s a box for that.</h2>
        <div className={`relative mx-auto mt-7 grid h-32 w-44 place-items-center ${revealed ? 'surprise-box-open' : ''}`}>
          <div className="surprise-rays pointer-events-none absolute inset-0 text-accent" aria-hidden="true"><Sparkles className="absolute left-2 top-2" size={20}/><Sparkles className="absolute right-3 top-5" size={16}/><Sparkles className="absolute bottom-4 left-8" size={14}/><Sparkles className="absolute bottom-2 right-8" size={20}/></div>
          <div className="surprise-box relative mt-5 h-20 w-32 rounded-xl bg-primary shadow-[7px_8px_0_hsl(13_82%_63%)]">
            <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 bg-accent"/>
            <div className="surprise-lid absolute -left-2 -top-3 h-7 w-36 rounded-lg bg-[#f6b39e] shadow-[0_4px_0_hsl(13_82%_63%)]"/>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-3xl font-bold text-primary-foreground">?</span>
          </div>
        </div>
        {!revealed ? <><p className="mt-3 text-sm leading-6 text-muted-foreground">{signedIn ? preview ? 'Open the box to see the saving we picked for this order.' : 'Checking the saving for this order…' : 'Sign in at checkout and we’ll reveal the saving that matches your project.'}</p><button type="button" disabled={signedIn && !preview} onClick={signedIn ? (preview ? onReveal : undefined) : onSignIn} className="mt-6 rounded-full bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground disabled:cursor-wait disabled:opacity-60">{signedIn ? preview ? 'Open my surprise' : 'Checking your offer…' : 'Sign in to reveal it'} <ArrowRight size={15} className="ml-2 inline"/></button></> : preview ? <div className="rise-in mt-2"><p className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-primary">{preview.label}</p><p className="mt-2 font-display text-5xl font-bold">{preview.discountPercent}% off</p><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">{preview.message}</p>{preview.discountCents > 0 && <p className="mt-3 text-lg font-bold text-primary">You save {money(preview.discountCents / 100)}</p>}<button type="button" onClick={onClose} className="mt-6 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground">Keep the saving <Check size={15} className="ml-2 inline"/></button></div> : <div className="rise-in mt-2"><p className="font-display text-2xl font-bold">Your offer is still loading.</p><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Close this box and try again in a moment.</p><button type="button" onClick={onClose} className="mt-6 rounded-full border border-border px-5 py-3.5 text-sm font-bold">Close</button></div>}
      </div>
    </section>
  </div>;
}

function CartPage() {
  const { items, remove, adjust, subtotal, project, setProject, deliveryOption, setDeliveryOption, customPrice, setCustomPrice, customPriceReason, setCustomPriceReason } = useCart(); const { isAuthenticated, login } = useAuth(); const count = items.reduce((sum, i) => sum + i.quantity, 0); const large = count > 5 || subtotal > 3000; const fee = deliveryOption === 'express' ? 180 : 0; const hasCustomPrice = Number(customPrice) > 0; const promotion = usePromotionPreview(subtotal, hasCustomPrice); const discount = promotion?.eligible ? promotion.discountCents / 100 : 0; const requestedTotal = hasCustomPrice ? Number(customPrice) : subtotal + fee - discount; const [offerOpen, setOfferOpen] = useState(false); const [offerRevealed, setOfferRevealed] = useState(false);
  useEffect(() => { if (!items.length) return; try { if (!window.sessionStorage.getItem('taskflow-surprise-seen')) { setOfferOpen(true); window.sessionStorage.setItem('taskflow-surprise-seen', '1'); } } catch { setOfferOpen(true); } }, [items.length]);
  const updateProject = (key: keyof ProjectInfo, value: string) => setProject({ ...project, [key]: value });
  const deliveryDays = large ? null : Math.max(5, Math.max(...items.map((i) => i.days)) + (deliveryOption === 'express' ? 0 : 0));
  return <Shell><main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16"><Eyebrow>Your project</Eyebrow><h1 className="mt-4 font-display text-5xl font-bold md:text-7xl">The work, together.</h1><p className="mt-5 max-w-xl text-muted-foreground">One brief, one coordinated delivery plan. Add another service whenever the project grows.</p>{!items.length ? <div className="mt-14 rounded-3xl border border-dashed border-border bg-card px-6 py-24 text-center"><Layers3 size={32} className="mx-auto text-accent"/><h2 className="mt-6 font-display text-3xl font-bold">Your project is a blank page.</h2><p className="mt-3 text-sm text-muted-foreground">Start with one useful thing.</p><Link href="/services" className="mt-7 inline-flex rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground" data-testid="link-empty-browse">Browse services</Link></div> : <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_.8fr]"><div><div className="mb-6 rounded-3xl border border-border bg-card p-5 md:p-7"><Eyebrow>Shared project context</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Tell us who this work is for.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Add this once and it will travel with every service in the project.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Business or brand name<input value={project.name} onChange={(e) => updateProject('name', e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-4 focus:ring-primary/30" placeholder="Northstar Studio" data-testid="input-project-name"/></label><label className="text-sm font-bold">Website or profile<input value={project.website} onChange={(e) => updateProject('website', e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-4 focus:ring-primary/30" placeholder="northstar.co" data-testid="input-project-website"/></label><label className="text-sm font-bold">Industry<input value={project.industry} onChange={(e) => updateProject('industry', e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-4 focus:ring-primary/30" placeholder="Wellness, SaaS, retail…" data-testid="input-project-industry"/></label><label className="text-sm font-bold">Who are you speaking to?<input value={project.audience} onChange={(e) => updateProject('audience', e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-4 focus:ring-primary/30" placeholder="Your target audience" data-testid="input-project-audience"/></label></div></div><div className="space-y-3">{items.map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex gap-4"><ServiceMark service={item}/><div className="flex-1"><div className="flex justify-between"><div><p className="font-display text-xl font-bold">{item.name}</p><p className="text-xs text-muted-foreground">{item.option} · {money(priceForOption(item, item.option))} each</p></div><button onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-${item.id}`}><Trash2 size={16}/></button></div><div className="mt-4 flex justify-between"><div className="inline-flex rounded-full border border-border"><button onClick={() => adjust(item.id, -1)} className="grid size-8 place-items-center" data-testid={`button-minus-${item.id}`}><Minus size={13}/></button><span className="grid w-8 place-items-center font-mono-ui text-xs">{item.quantity}</span><button onClick={() => adjust(item.id, 1)} className="grid size-8 place-items-center" data-testid={`button-plus-${item.id}`}><Plus size={13}/></button></div><span className="font-mono-ui text-sm">{money(priceForOption(item, item.option) * item.quantity)}</span></div></div></div></div>)}</div><Link href="/services" className="mt-5 inline-flex text-xs font-bold underline">+ Add another</Link><div className="mt-7 rounded-3xl border border-primary/30 bg-primary/10 p-5"><div className="flex items-start gap-3"><Copy size={18} className="mt-1 text-primary"/><div><Eyebrow>Need a different fit?</Eyebrow><h2 className="mt-2 font-display text-xl font-bold">Propose your own project price.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Tell us what works for your budget and why. You can still submit the request without changing the listed scope.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Your proposed total (USD)<input type="number" min="1" step="1" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-4 focus:ring-primary/30" placeholder={String(subtotal + fee)} data-testid="input-custom-price"/></label><label className="text-sm font-bold md:col-span-2">Why would this price work better?{Number(customPrice) > 0 && <span className="ml-1 text-accent">(required)</span>}<textarea required={Number(customPrice) > 0} value={customPriceReason} onChange={(e) => setCustomPriceReason(e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm font-normal outline-none focus:ring-4 focus:ring-primary/30" placeholder="Share your budget, timing, or context so we can make a fair decision." data-testid="textarea-custom-price-reason"/></label></div></div></div><aside className="rounded-3xl border border-border bg-card p-5 md:p-7"><Eyebrow>Delivery pace</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">When should it land?</h2><button onClick={() => setDeliveryOption('standard')} className={`mt-5 w-full rounded-2xl border p-4 text-left ${deliveryOption === 'standard' ? 'border-foreground bg-muted' : 'border-border'}`} data-testid="button-delivery-standard"><b>Standard · Included</b><p className="mt-2 text-xs text-muted-foreground">{deliveryDays ? `Coordinated delivery in ${deliveryDays} business days.` : 'Custom schedule required for this project load.'}</p></button><button disabled={large} onClick={() => setDeliveryOption('express')} className={`mt-3 w-full rounded-2xl border p-4 text-left ${deliveryOption === 'express' ? 'border-foreground bg-muted' : 'border-border'} ${large ? 'opacity-50' : ''}`} data-testid="button-delivery-express"><b>Express · + {money(180)}</b><p className="mt-2 text-xs text-muted-foreground">{large ? 'Custom schedule required for this project load.' : 'Never shorter than 5 business days combined.'}</p></button>{large && <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-4 text-xs leading-5"><b>Large project load</b><p className="mt-1 text-muted-foreground">We’ll map a custom schedule instead of promising an unrealistic deadline.</p></div>}{promotion?.eligible && !hasCustomPrice && <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm"><span><b>{promotion.discountPercent}% surprise saving</b><small className="mt-1 block text-xs text-muted-foreground">{promotion.isFirstOrder ? 'Welcome to TaskFlow.' : 'Welcome back.'}</small></span><span className="font-bold text-primary">−{money(discount)}</span></div>}<div className="mt-7 space-y-3 border-t border-border pt-5 text-sm"><div className="flex justify-between"><span>Project subtotal</span><span>{money(subtotal)}</span></div>{discount > 0 && !hasCustomPrice && <div className="flex justify-between text-primary"><span>Surprise saving</span><span>−{money(discount)}</span></div>}<div className="flex justify-between"><span>Delivery</span><span>{fee ? money(fee) : 'Included'}</span></div>{hasCustomPrice && <div className="flex justify-between text-primary"><span>Your proposed total</span><span>{money(Number(customPrice))}</span></div>}<div className="flex justify-between border-t border-border pt-4 text-lg font-bold"><span>{hasCustomPrice ? 'Requested total' : 'Total estimate'}</span><span data-testid="text-cart-total">{money(requestedTotal)}</span></div></div><Link href="/checkout" className="mt-6 flex justify-center rounded-full bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground" data-testid="button-continue-checkout">{hasCustomPrice ? 'Send price proposal' : large ? 'Request custom quote' : 'Review project request'} <ArrowRight size={15} className="ml-2"/></Link><button type="button" onClick={() => { setOfferRevealed(false); setOfferOpen(true); }} className="mx-auto mt-4 flex items-center gap-2 text-xs font-bold text-primary underline"><Sparkles size={14}/> {promotion?.eligible ? 'Open surprise offer again' : 'Reveal surprise offer'}</button><p className="mt-3 text-center text-[11px] text-muted-foreground">No payment today · We’ll review your scope and proposed price before requesting a bank transfer.</p></aside></div>} </main><SurpriseOffer preview={promotion} authenticated={isAuthenticated} open={offerOpen && Boolean(items.length)} revealed={offerRevealed} onClose={() => setOfferOpen(false)} onReveal={() => setOfferRevealed(true)} onSignIn={() => login('/cart')}/></Shell>;
}

function Checkout() {
  const { items, subtotal, project, deliveryOption, customPrice, customPriceReason } = useCart();
  const { user, isLoading: authLoading, isAuthenticated, login } = useAuth();
  const [, setLocation] = useLocation();
  const fee = deliveryOption === 'express' ? 180 : 0;
  const hasCustomPrice = Number(customPrice) > 0;
  const promotion = usePromotionPreview(subtotal, hasCustomPrice);
  const discount = promotion?.eligible ? promotion.discountCents / 100 : 0;
  const total = subtotal + fee - discount;
  const [form, setForm] = useState({ name: '', email: '', company: '', notes: '' });
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const orderRequest = useCreateOrderRequest();
  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || [user.firstName, user.lastName].filter(Boolean).join(' '),
      email: user.email || current.email,
    }));
  }, [user]);

  if (!items.length) return <Shell><div className="mx-auto max-w-2xl px-5 py-24 text-center"><ShoppingBag size={30} className="mx-auto"/><h1 className="mt-6 font-display text-4xl font-bold">Nothing to review yet.</h1><Link href="/services" className="mt-7 inline-flex rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground">Browse services</Link></div></Shell>;
  if (authLoading) return <Shell><div className="mx-auto max-w-2xl px-5 py-24 text-center"><div className="mx-auto size-8 animate-pulse rounded-full bg-primary"/><p className="mt-5 text-sm text-muted-foreground">Checking your account…</p></div></Shell>;
  if (!isAuthenticated) return <Shell><main className="mx-auto max-w-3xl px-5 py-16 lg:py-24"><div className="rounded-3xl bg-secondary p-8 text-secondary-foreground md:p-12"><UserCircle size={30} className="text-primary"/><Eyebrow>One small step</Eyebrow><h1 className="mt-5 font-display text-5xl font-bold">Sign in to submit your project.</h1><p className="mt-5 max-w-xl leading-7 text-secondary-foreground/70">Your account keeps the brief, order history, and project chat together. There is no payment at this step.</p><button onClick={() => login('/checkout')} className="mt-8 inline-flex items-center rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground" data-testid="button-checkout-sign-in"><LogIn size={16} className="mr-2"/> Sign in to continue</button></div></main></Shell>;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data: CheckoutInput = {
      customerName: form.name,
      customerEmail: user?.email || form.email,
      company: form.company,
      notes: form.notes,
      project,
      deliveryOption,
      items: items.map(({ slug, option, brief, quantity }) => ({ slug, option, brief, quantity })),
      ...(Number(customPrice) > 0 ? { requestedCustomPriceCents: Math.round(Number(customPrice) * 100), requestedCustomPriceReason: customPriceReason.trim() } : {}),
    };
    orderRequest.mutate({ data }, {
      onSuccess: (result) => setLocation(`/account?submitted=${result.orderId}`),
    });
  };

  return <Shell><main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16"><Eyebrow>Project request</Eyebrow><h1 className="mt-4 font-display text-5xl font-bold md:text-7xl">Let’s make it real.</h1><p className="mt-5 max-w-2xl text-muted-foreground">Send the brief first. We’ll review the scope, reply in your project chat, and agree the final plan before any bank transfer is requested.</p><div className="mt-12 grid gap-8 lg:grid-cols-[1fr_.72fr]"><form onSubmit={submit} className="rounded-3xl border border-border bg-card p-5 md:p-8"><div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm"><p className="font-bold">No payment today</p><p className="mt-1 text-muted-foreground">Your request creates a project thread. We’ll send bank-transfer instructions only after the scope and final amount are agreed.</p></div><div className="grid gap-5 md:grid-cols-2">{(['name', 'email', 'company'] as const).map((key) => <label key={key} className="text-sm font-bold">{key === 'name' ? 'Your name' : key === 'email' ? 'Account email' : 'Company or project'}<input required={key !== 'company'} readOnly={key === 'email'} type={key === 'email' ? 'email' : 'text'} value={form[key]} onChange={(e) => set(key, e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-4 focus:ring-primary/30 read-only:bg-muted" placeholder={key === 'email' ? 'you@company.com' : key === 'name' ? 'Your name' : 'What are we working on?'} data-testid={`input-customer-${key}`}/></label>)}</div><label className="mt-5 block text-sm font-bold">Anything else we should know?<textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={5} className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm font-normal outline-none focus:ring-4 focus:ring-primary/30" placeholder="Timelines, links, constraints, context…" data-testid="textarea-checkout-notes"/></label>{hasCustomPrice ? <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm"><b>Price proposal included</b><p className="mt-1 text-muted-foreground">You proposed {money(Number(customPrice))}. Your reason will be shared privately with the owner for review; surprise offers do not stack with proposals.</p></div> : promotion?.eligible && <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm"><b>{promotion.discountPercent}% surprise saving is ready.</b><p className="mt-1 text-muted-foreground">{promotion.message}</p></div>}{orderRequest.isError && <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">We couldn’t submit the project request. Please try again.</p>}<button type="submit" disabled={orderRequest.isPending} className="mt-7 w-full rounded-full bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground disabled:opacity-50" data-testid="button-submit-project">{orderRequest.isPending ? 'Sending request…' : 'Send project request'} <ArrowRight size={15} className="ml-2 inline"/></button></form><aside className="rounded-3xl border border-border bg-card p-5 md:p-7"><Eyebrow>Request summary</Eyebrow>{items.map((item) => <div key={item.id} className="mt-4 flex justify-between text-sm"><span className="font-bold">{item.name}<small className="block font-normal text-muted-foreground">{item.quantity} × {item.option}</small></span><span>{money(priceForOption(item, item.option) * item.quantity)}</span></div>)}{discount > 0 && !hasCustomPrice && <div className="mt-4 flex justify-between text-sm font-bold text-primary"><span>Surprise saving</span><span>−{money(discount)}</span></div>}{fee > 0 && <div className="mt-4 flex justify-between text-sm"><span>Express delivery</span><span>{money(fee)}</span></div>}{hasCustomPrice && <div className="mt-4 flex justify-between text-sm text-primary"><span>Proposed total</span><span>{money(Number(customPrice))}</span></div>}<div className="mt-6 flex justify-between border-t border-border pt-5 font-bold"><span>{hasCustomPrice ? 'Requested total' : 'Estimated total'}</span><span data-testid="text-checkout-total">{money(hasCustomPrice ? Number(customPrice) : total)}</span></div><div className="mt-6 rounded-2xl bg-muted/70 p-4"><div className="flex items-center gap-2 text-sm font-bold"><MessageCircle size={16}/> Review in your project chat</div><p className="mt-2 text-xs leading-5 text-muted-foreground">We’ll use this thread for questions, files, progress updates, and the bank-transfer step when you’re ready.</p></div></aside></div></main></Shell>;
}

function OrderStatusPage({ cancelled = false }: { cancelled?: boolean }) {
  const orderId = new URLSearchParams(window.location.search).get('order_id') ?? '';
  const statusQuery = useGetOrderStatus(orderId, { query: { queryKey: [`/api/orders/${orderId}`], enabled: Boolean(orderId), refetchInterval: cancelled ? false : 2500 } });
  const status = statusQuery.data?.paymentStatus;
  const title = cancelled ? 'Checkout cancelled.' : status === 'paid' ? 'Payment received.' : status === 'payment_failed' ? 'Payment needs attention.' : status === 'cancelled' ? 'Checkout expired.' : 'Payment is processing.';
  const copy = cancelled ? 'Your project is still saved in this browser if you want to return to it.' : status === 'paid' ? 'Your bank transfer has been recorded. We’ll use the shared brief and delivery option to coordinate the next step.' : status === 'payment_failed' ? 'The payment could not be confirmed. Return to your account or project chat for the next step.' : status === 'cancelled' ? 'The payment request is no longer active. Return to your account for the current project status.' : 'Payment status updates appear in your account after the owner requests a bank transfer.';
  return <Shell><main className="mx-auto max-w-3xl px-5 py-16 lg:py-24"><Eyebrow>{cancelled ? 'Payment request' : 'Payment status'}</Eyebrow><div className="mt-6 rounded-3xl bg-primary p-8 text-primary-foreground md:p-12"><Check size={28}/><h1 className="mt-8 font-display text-5xl font-bold">{title}</h1><p className="mt-5 max-w-xl leading-7 text-primary-foreground/80">{copy}</p>{statusQuery.isLoading && <p className="mt-6 text-sm font-semibold">Loading project status…</p>}{statusQuery.isError && <p className="mt-6 text-sm font-semibold">We couldn’t load this project status. Open your account to try again.</p>}<div className="mt-8 flex flex-wrap gap-3"><Link href={status === 'paid' ? '/account' : '/cart'} className="inline-flex rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground">{status === 'paid' ? 'Open my account' : 'Return to project'}</Link><Link href="/services" className="inline-flex rounded-full border border-primary-foreground/30 px-5 py-3 text-sm font-bold">Browse services</Link></div></div></main></Shell>;
}

function requestStatusLabel(status: string) {
  return status.replaceAll('_', ' ');
}

function formatBytes(size?: number | null) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type SharedAttachment = { url: string; name?: string | null; contentType?: string | null; size?: number | null };

function AttachmentPreviewCard({ attachment, id }: { attachment: SharedAttachment; id?: string }) {
  const image = attachment.contentType?.startsWith('image/');
  const video = attachment.contentType?.startsWith('video/');
  const audio = attachment.contentType?.startsWith('audio/');
  const pdf = attachment.contentType === 'application/pdf';
  return <div className="mt-3 overflow-hidden rounded-2xl border border-current/10 bg-background/15">
    {image && <img src={attachment.url} alt={attachment.name || 'Shared image'} className="max-h-72 w-full bg-black/10 object-contain"/>}
    {video && <video controls preload="metadata" className="max-h-72 w-full bg-black/10" aria-label={attachment.name || 'Shared video'}><source src={attachment.url} type={attachment.contentType || undefined}/></video>}
    {audio && <audio controls preload="metadata" className="w-full px-3 pt-3" aria-label={attachment.name || 'Shared audio'}><source src={attachment.url} type={attachment.contentType || undefined}/></audio>}
    {pdf && <object data={attachment.url} type="application/pdf" className="h-48 w-full" aria-label={attachment.name || 'Shared PDF'}/>}
    <a href={attachment.url} target="_blank" rel="noreferrer" download={attachment.name || undefined} className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-bold hover:bg-background/20" data-testid={id ? `link-attachment-${id}` : undefined}>
      <span className="flex min-w-0 items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">{image ? <FileImage size={15}/> : pdf ? <FileText size={15}/> : <File size={15}/>}</span><span className="truncate">{attachment.name || 'Shared file'}{attachment.size ? ` · ${formatBytes(attachment.size)}` : ''}</span></span><Download size={14}/>
    </a>
  </div>;
}

function AttachmentPreview({ message }: { message: Message }) {
  if (!message.attachmentUrl) return null;
  return <AttachmentPreviewCard attachment={{ url: message.attachmentUrl, name: message.attachmentName, contentType: message.attachmentContentType, size: message.attachmentSize }} id={message.id}/>;
}

function ProjectChat({ orderId, ownerMode = false, fullScreen = false }: { orderId: string; ownerMode?: boolean; fullScreen?: boolean }) {
  const messagesQuery = useGetConversationMessages(orderId, { query: { queryKey: getGetConversationMessagesQueryKey(orderId), refetchInterval: 3000 } });
  const sendMessage = useCreateConversationMessage();
  const reactToMessage = useToggleMessageReaction();
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<{ url: string; name: string; contentType: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [typingStatus, setTypingStatus] = useState({ customerTyping: false, ownerTyping: false });
  const [sendError, setSendError] = useState('');
  const otherPersonTyping = ownerMode ? typingStatus.customerTyping : typingStatus.ownerTyping;
  useEffect(() => {
    void fetch(`/api/conversations/${orderId}/read`, { method: 'POST' }).catch(() => undefined);
    const refreshTyping = async () => {
      try {
        const response = await fetch(`/api/conversations/${orderId}/typing`);
        if (response.ok) setTypingStatus(await response.json() as typeof typingStatus);
      } catch {
        setTypingStatus({ customerTyping: false, ownerTyping: false });
      }
    };
    void refreshTyping();
    const timer = window.setInterval(() => void refreshTyping(), 2000);
    return () => window.clearInterval(timer);
  }, [orderId]);
  useEffect(() => {
    const typing = Boolean(body.trim());
    const updateTyping = () => void fetch(`/api/conversations/${orderId}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typing }),
    }).catch(() => undefined);
    void updateTyping();
    if (!typing) return;
    const timer = window.setInterval(updateTyping, 2000);
    return () => {
      window.clearInterval(timer);
      void fetch(`/api/conversations/${orderId}/typing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typing: false }) }).catch(() => undefined);
    };
  }, [Boolean(body.trim()), orderId]);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim() && !attachment) return;
    setSendError('');
    sendMessage.mutate({ orderId, data: {
      body: body.trim() || `Shared file: ${attachment?.name || 'file'}`,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      attachmentContentType: attachment?.contentType,
      attachmentSize: attachment?.size,
    } }, {
      onSuccess: () => {
        setBody('');
        setAttachment(null);
        void queryClient.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(orderId) });
      },
      onError: (error) => setSendError(error instanceof Error ? error.message : 'That message could not be sent. Try again.'),
    });
  };
  const upload = async (file: globalThis.File) => {
    setUploading(true);
    setUploadError('');
    try {
      const response = await fetch('/api/storage/uploads/request-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, name: file.name, size: file.size, contentType: file.type || 'application/octet-stream' }) });
      const responseBody = await response.json().catch(() => ({})) as { uploadURL?: string; objectPath?: string; error?: string };
      if (!response.ok || !responseBody.uploadURL || !responseBody.objectPath) throw new Error(responseBody.error || 'Could not prepare the file upload.');
      const uploadResponse = await fetch(responseBody.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!uploadResponse.ok) throw new Error('The file upload did not finish. Try again.');
      setAttachment({ url: `/api/storage${responseBody.objectPath}`, name: file.name, contentType: file.type || 'application/octet-stream', size: file.size });
    } catch (error) {
      setAttachment(null);
      setUploadError(error instanceof Error ? error.message : 'The file could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };
  const messages = messagesQuery.data ?? [];
  const panelClass = fullScreen
    ? 'fixed inset-0 z-[70] flex h-[100dvh] flex-col rounded-none border-0 bg-background p-4 sm:p-6 lg:p-8'
    : 'rounded-3xl border border-border bg-card p-5 md:p-7';
  return <section className={panelClass} data-testid={`panel-project-chat-${orderId}`}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><MessageCircle size={20}/></div>
        <div><Eyebrow>Project chat</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">{ownerMode ? 'Reply with the next useful step.' : 'Keep everything in one thread.'}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{ownerMode ? 'Ask for missing detail, share progress, files, or payment instructions.' : 'Questions, files, progress updates, and final handoff notes stay with this project.'}</p></div>
      </div>
      {fullScreen ? <Link href={ownerMode ? '/inbox' : '/account'} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-bold"><ArrowLeft size={14}/> Exit full screen</Link> : <MessageCircle className="text-primary"/>}
    </div>
    <div className={`${fullScreen ? 'min-h-0 flex-1' : 'max-h-[360px]'} mt-6 space-y-4 overflow-y-auto rounded-[2rem] bg-[#ebe5da] p-4 sm:p-6`}>
      {messagesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading conversation…</p> : messagesQuery.isError ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"><p className="font-bold">We couldn’t load this conversation.</p><p className="mt-1">Refresh the page and try again. If the project was never submitted, return to the project request first.</p></div> : messages.length ? messages.map((message) => {
        const own = message.authorRole === (ownerMode ? 'owner' : 'customer');
        const initials = message.authorName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
        return <div key={message.id} className={`flex gap-3 ${own ? 'ml-4 flex-row-reverse sm:ml-16' : 'mr-4 sm:mr-16'}`} data-testid={`message-${message.id}`}>
          <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-background bg-primary/20 text-[10px] font-bold text-primary shadow-sm">{message.authorImageUrl ? <img src={`${message.authorImageUrl}${message.authorImageUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(message.createdAt)}`} alt="" className="size-full object-cover"/> : initials}</div>
          <div className={`relative max-w-[min(760px,88%)] p-4 text-sm shadow-sm ${own ? 'rounded-[1.6rem_1.6rem_.45rem_1.6rem] bg-[#18243f] text-[#fffaf0]' : 'rounded-[1.6rem_1.6rem_1.6rem_.45rem] border border-[#ded6c8] bg-[#fffdf8] text-foreground'}`}>
            <div className="flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-[.12em] opacity-60"><span>{message.authorName}</span><span>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
            <p className="mt-2 whitespace-pre-wrap leading-6">{message.body}</p>
            <AttachmentPreview message={message}/>
            <div className={`mt-3 flex flex-wrap items-center gap-1 ${own ? 'justify-end' : 'justify-start'}`}>
              {(message.reactions ?? []).map((reaction) => <button key={reaction.emoji} type="button" onClick={() => reactToMessage.mutate({ orderId, messageId: message.id, data: { emoji: reaction.emoji as '👍' } }, { onSuccess: () => void queryClient.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(orderId) }) })} className={`rounded-full border px-2 py-1 text-xs ${reaction.reacted ? 'border-primary bg-primary/20' : 'border-current/15 bg-background/10'}`} data-testid={`button-reaction-${message.id}-${reaction.emoji}`}>{reaction.emoji} {reaction.count}</button>)}
              <button type="button" onClick={() => reactToMessage.mutate({ orderId, messageId: message.id, data: { emoji: '👍' } }, { onSuccess: () => void queryClient.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(orderId) }) })} className="grid size-7 place-items-center rounded-full border border-current/15 opacity-70 hover:opacity-100" aria-label="React with thumbs up" data-testid={`button-add-reaction-${message.id}`}><SmilePlus size={14}/></button>
              {own && <span className="ml-1 inline-flex items-center gap-1 text-[10px] opacity-60">{message.readAt ? <><CheckCheck size={14}/>Seen</> : <><Check size={13}/>Sent</>}</span>}
            </div>
          </div>
        </div>;
      }) : <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Send the first note when you’re ready.</p>}
      {otherPersonTyping && <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground" data-testid="typing-indicator"><span className="inline-flex gap-1"><i className="size-1.5 animate-bounce rounded-full bg-current"/><i className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]"/><i className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]"/></span>{ownerMode ? 'Customer is typing…' : 'TaskFlow is typing…'}</div>}
    </div>
    {attachment && <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-2"><div className="flex items-center justify-between px-1 py-1 text-xs"><span className="flex min-w-0 items-center gap-2"><Paperclip size={14}/><span className="truncate">{attachment.name} · {formatBytes(attachment.size)}</span></span><button type="button" onClick={() => setAttachment(null)} className="font-bold underline">Remove</button></div><AttachmentPreviewCard attachment={attachment}/></div>}
    {(uploadError || sendError) && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{uploadError || sendError}</p>}
    <form onSubmit={submit} className="mt-4 flex gap-2"><label className="grid size-12 shrink-0 cursor-pointer place-items-center self-end rounded-2xl border border-border bg-card hover:bg-muted"><Upload size={16}/><input type="file" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} disabled={uploading} /></label><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} placeholder={uploading ? 'Uploading file…' : ownerMode ? 'Write a question, update, or delivery note…' : 'Ask a question or add project context…'} className="min-h-12 flex-1 resize-none rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:ring-4 focus:ring-primary/30" data-testid="textarea-project-message"/><button type="submit" disabled={sendMessage.isPending || uploading || (!body.trim() && !attachment)} className="grid size-12 shrink-0 place-items-center self-end rounded-2xl bg-primary text-primary-foreground shadow-[4px_4px_0_hsl(222_39%_14%)] disabled:opacity-40" data-testid="button-send-project-message"><Send size={16}/></button></form>
  </section>;
}

const projectStatuses = ['request_received', 'in_review', 'awaiting_approval', 'in_progress', 'delivered', 'closed'];

function StatusTimeline({ status }: { status: string }) {
  const current = Math.max(0, projectStatuses.indexOf(status));
  return <div className="grid gap-2 sm:grid-cols-3">{projectStatuses.map((item, index) => <div key={item} className={`rounded-xl border p-3 text-xs ${index <= current ? 'border-primary/50 bg-primary/10' : 'border-border bg-card'}`}><div className="flex items-center gap-2 font-bold"><span className={`grid size-5 place-items-center rounded-full text-[10px] ${index <= current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{index < current ? '✓' : index + 1}</span><span className="capitalize">{requestStatusLabel(item)}</span></div></div>)}</div>;
}

function PriceDecisionPanel({ orderId, order }: { orderId: string; order: OrderStatus }) {
  const approve = useApproveOrderPrice();
  const requestChange = useRequestOrderPriceChange();
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState('');
  const pending = approve.isPending || requestChange.isPending;
  if (order.customPriceStatus !== 'accepted' || order.customerPriceDecision !== 'pending') return null;
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetOrderStatusQueryKey(orderId) }),
    queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetOrderActivityQueryKey(orderId) }),
  ]);
  return <section className="rounded-3xl border border-primary/40 bg-primary/10 p-5 md:p-7"><div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground"><Check size={18}/></div><div><Eyebrow>Price proposal</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Your project total is ready.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The owner proposed {money(order.totalCents / 100)}. Approve it to keep the project moving, or send a change request.</p></div></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={pending} onClick={() => approve.mutate({ orderId }, { onSuccess: () => { void refresh(); setMessage('Price approved.'); }, onError: () => setMessage('Could not approve this proposal.') })} className="rounded-full bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground disabled:opacity-50" data-testid="button-approve-price">{pending ? 'Saving…' : 'Approve price'}</button><button type="button" disabled={pending} onClick={() => { if (!feedback.trim()) { setMessage('Add a short note about what should change.'); return; } requestChange.mutate({ orderId, data: { feedback: feedback.trim() } }, { onSuccess: () => { void refresh(); setMessage('Change request sent.'); setFeedback(''); }, onError: () => setMessage('Could not send the change request.') }); }} className="rounded-full border border-border bg-background px-4 py-3 text-sm font-bold disabled:opacity-50" data-testid="button-request-price-change">Request a change</button></div><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={2} placeholder="What would you like to adjust?" className="mt-4 w-full resize-none rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:ring-4 focus:ring-primary/30" data-testid="textarea-price-change"/>{message && <p className="mt-3 text-xs text-muted-foreground" role="status">{message}</p>}</section>;
}

function ActivityTimeline({ orderId }: { orderId: string }) {
  const activityQuery = useGetOrderActivity(orderId, { query: { queryKey: getGetOrderActivityQueryKey(orderId), refetchInterval: 10000 } });
  const events = activityQuery.data ?? [];
  return <section className="rounded-3xl border border-border bg-card p-5 md:p-7"><div className="flex items-center justify-between gap-3"><div><Eyebrow>Project history</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Every important step, together.</h2></div><History className="text-primary"/></div>{activityQuery.isLoading ? <p className="mt-5 text-sm text-muted-foreground">Loading project history…</p> : events.length ? <div className="mt-6 space-y-4">{events.slice().reverse().map((event: ActivityEvent) => <div key={event.id} className="flex gap-3" data-testid={`activity-event-${event.id}`}><div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><CircleActivityIcon type={event.eventType}/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{event.summary}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p></div></div>)}</div> : <p className="mt-5 text-sm text-muted-foreground">Project history will appear here as the work moves forward.</p>}</section>;
}

function deliverableStatusLabel(status: string) {
  return status === 'changes_requested' ? 'Changes requested' : status === 'approved' ? 'Approved' : 'Awaiting review';
}

function deliverableStatusClass(status: string) {
  return status === 'approved' ? 'bg-primary/20 text-primary' : status === 'changes_requested' ? 'bg-accent/25 text-foreground' : 'bg-muted text-muted-foreground';
}

function DeliverablesPanel({ orderId, ownerMode = false }: { orderId: string; ownerMode?: boolean }) {
  const deliverablesQuery = useGetOrderDeliverables(orderId, { query: { queryKey: getGetOrderDeliverablesQueryKey(orderId), refetchInterval: 8000 } });
  const createDeliverable = useCreateOrderDeliverable();
  const reviewDeliverable = useReviewOrderDeliverable();
  const [deliverableKey, setDeliverableKey] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const deliverables = deliverablesQuery.data ?? [];
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetOrderDeliverablesQueryKey(orderId) }),
    queryClient.invalidateQueries({ queryKey: getGetOrderActivityQueryKey(orderId) }),
  ]);
  const submitUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || !deliverableKey.trim() || !title.trim()) {
      setMessage('Add a deliverable name, title, and file.');
      return;
    }
    setUploading(true);
    setMessage('');
    try {
      const response = await fetch('/api/storage/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, name: selectedFile.name, size: selectedFile.size, contentType: selectedFile.type || 'application/octet-stream' }),
      });
      const responseBody = await response.json().catch(() => ({})) as { uploadURL?: string; objectPath?: string; error?: string };
      if (!response.ok || !responseBody.uploadURL || !responseBody.objectPath) throw new Error(responseBody.error || 'Could not prepare the deliverable upload.');
      const uploadResponse = await fetch(responseBody.uploadURL, { method: 'PUT', headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' }, body: selectedFile });
      if (!uploadResponse.ok) throw new Error('The deliverable upload did not finish.');
      await createDeliverable.mutateAsync({
        orderId,
        data: {
          deliverableKey: deliverableKey.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          objectPath: responseBody.objectPath,
          fileName: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
          fileSize: selectedFile.size,
        },
      });
      await refresh();
      setDeliverableKey('');
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setMessage('Deliverable submitted for customer review.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not submit the deliverable.');
    } finally {
      setUploading(false);
    }
  };
  const review = (deliverable: Deliverable, status: 'approved' | 'changes_requested') => {
    const feedback = feedbackById[deliverable.id]?.trim() || '';
    if (status === 'changes_requested' && !feedback) {
      setMessage('Add feedback before requesting changes.');
      return;
    }
    setMessage('');
    reviewDeliverable.mutate({ orderId, deliverableId: deliverable.id, data: { status, feedback: feedback || undefined } }, {
      onSuccess: () => {
        void refresh();
        setFeedbackById((current) => ({ ...current, [deliverable.id]: '' }));
        setMessage(status === 'approved' ? 'Deliverable approved.' : 'Change request sent.');
      },
      onError: (error) => setMessage(error instanceof Error ? error.message : 'Could not save the deliverable review.'),
    });
  };
  return <section className="rounded-3xl border border-border bg-card p-5 md:p-7" data-testid={`panel-deliverables-${orderId}`}>
    <div className="flex items-start justify-between gap-4"><div><Eyebrow>Deliverables library</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">{ownerMode ? 'Drop work here, keep every version.' : 'Review the work in one place.'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{ownerMode ? 'Upload a new version without burying the handoff in chat.' : 'Preview each file, approve the current version, or request a focused change.'}</p></div><Layers3 className="shrink-0 text-primary"/></div>
    {ownerMode && <form onSubmit={submitUpload} className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4">
      <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-bold">Deliverable name<input value={deliverableKey} onChange={(event) => setDeliverableKey(event.target.value)} placeholder="e.g. paid-social-cuts" className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal"/></label><label className="text-xs font-bold">Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Paid social video cuts" className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal"/></label></div>
      <label className="mt-3 block text-xs font-bold">Description <span className="font-normal text-muted-foreground">(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="What changed in this version?" className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm font-normal"/></label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-2 text-xs font-bold"><Upload size={14}/><span className="truncate">{selectedFile ? `${selectedFile.name} · ${formatBytes(selectedFile.size)}` : 'Choose a deliverable file'}</span><input type="file" className="sr-only" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}/></label><button type="submit" disabled={uploading || createDeliverable.isPending} className="rounded-full bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground disabled:opacity-50">{uploading ? 'Uploading…' : 'Submit deliverable'}</button></div>
    </form>}
    {deliverablesQuery.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading deliverables…</p> : deliverablesQuery.isError ? <p className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">Deliverables could not be loaded. Refresh the page and try again.</p> : deliverables.length ? <div className="mt-6 space-y-4">{deliverables.map((deliverable) => <article key={deliverable.id} className="rounded-2xl border border-border bg-background/60 p-4" data-testid={`card-deliverable-${deliverable.id}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{deliverable.title}</h3><span className="rounded-full bg-secondary px-2 py-1 font-mono-ui text-[10px] text-secondary-foreground">v{deliverable.version}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${deliverableStatusClass(deliverable.status)}`}>{deliverableStatusLabel(deliverable.status)}</span></div><p className="mt-1 text-xs text-muted-foreground">{deliverable.fileName} · {formatBytes(deliverable.fileSize)} · {new Date(deliverable.createdAt).toLocaleDateString()}</p>{deliverable.description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{deliverable.description}</p>}</div><span className="font-mono-ui text-[10px] uppercase tracking-[.12em] text-muted-foreground">{deliverable.deliverableKey}</span></div><AttachmentPreviewCard attachment={{ url: deliverable.downloadUrl, name: deliverable.fileName, contentType: deliverable.contentType, size: deliverable.fileSize }} id={`deliverable-${deliverable.id}`}/>{!ownerMode && <div className="mt-4 border-t border-border pt-4"><textarea value={feedbackById[deliverable.id] ?? ''} onChange={(event) => setFeedbackById((current) => ({ ...current, [deliverable.id]: event.target.value }))} rows={2} placeholder="Add feedback if something needs changing." className="w-full resize-none rounded-xl border border-border bg-card p-3 text-sm outline-none focus:ring-4 focus:ring-primary/30"/><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={reviewDeliverable.isPending || deliverable.status === 'approved'} onClick={() => review(deliverable, 'approved')} className="rounded-full bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground disabled:opacity-50"><Check size={14} className="mr-1 inline"/> Approve version</button><button type="button" disabled={reviewDeliverable.isPending || deliverable.status === 'approved'} onClick={() => review(deliverable, 'changes_requested')} className="rounded-full border border-border px-4 py-2.5 text-xs font-bold disabled:opacity-50">Request changes</button></div></div>}{deliverable.customerFeedback && <p className="mt-4 rounded-xl bg-accent/10 p-3 text-xs leading-5"><b>Customer feedback:</b> {deliverable.customerFeedback}</p>}</article>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">{ownerMode ? 'No deliverables yet. Upload the first version when the work is ready for review.' : 'Your project deliverables will appear here when the team submits them.'}</div>}
    {message && <p className="mt-4 text-xs text-muted-foreground" role="status">{message}</p>}
  </section>;
}

function CircleActivityIcon({ type }: { type: string }) {
  if (type.includes('message')) return <MessageCircle size={14}/>;
  if (type === 'task_created' || type === 'task_updated') return <ListTodo size={14}/>;
  if (type === 'deliverable_approved') return <CheckCheck size={14}/>;
  if (type === 'deliverable_changes_requested') return <RefreshCw size={14}/>;
  if (type === 'project_completed') return <CircleCheck size={14}/>;
  if (type.includes('status_changed')) return <Layers3 size={14}/>;
  if (type.startsWith('price_') || type.includes('price')) return <Copy size={14}/>;
  if (type.startsWith('payment_') || type.includes('payment')) return <CircleDollarSign size={14}/>;
  return <History size={14}/>;
}

function LegacyCustomerOrderPanel({ orderId, includeChat = true }: { orderId: string; includeChat?: boolean }) {
  const statusQuery = useGetOrderStatus(orderId);
  const [rating, setRating] = useState(5);
  const [testimonial, setTestimonial] = useState('');
  const [permissionToPublish, setPermissionToPublish] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);
  const order = statusQuery.data;
  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch(`/api/orders/${orderId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, testimonial, permissionToPublish }) });
    if (response.ok) setReviewSaved(true);
  };
  if (statusQuery.isLoading) return <div className="rounded-3xl border border-dashed border-border p-10 text-sm text-muted-foreground">Loading project status…</div>;
  if (!order) return <div className="rounded-3xl border border-dashed border-border p-10 text-sm text-muted-foreground">Project status is unavailable.</div>;
  return <div className="space-y-5"><section className="rounded-3xl border border-border bg-card p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><Eyebrow>Project status</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">{requestStatusLabel(order.requestStatus)}</h2></div><span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold capitalize">{order.paymentStatus.replaceAll('_', ' ')}</span></div><div className="mt-6"><StatusTimeline status={order.requestStatus}/></div>{order.customPriceStatus === 'requested' && <div className="mt-5 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm"><b>Your price proposal is under review.</b><p className="mt-1 text-muted-foreground">{order.requestedCustomPriceCents ? money(order.requestedCustomPriceCents / 100) : ''} · {order.requestedCustomPriceReason || 'The owner will reply with the next step.'}</p></div>}{order.customPriceStatus === 'accepted' && <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm"><b>Price proposal accepted.</b><p className="mt-1 text-muted-foreground">Your agreed total is {money(order.totalCents / 100)}.</p></div>}</section>{order.transferDetails && order.paymentStatus !== 'paid' && <section className="rounded-3xl border border-primary/40 bg-primary/10 p-5 md:p-7"><div className="flex items-start justify-between gap-4"><div><Eyebrow>Payment requested</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Pay by bank transfer</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Transfer {money(order.amountDueCents / 100)} {order.transferDetails.currency.toUpperCase()}, then reply in your project chat with the reference.</p></div><Copy className="text-primary"/></div><dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Bank</dt><dd className="font-bold">{order.transferDetails.bankName}</dd></div><div><dt className="text-muted-foreground">Account name</dt><dd className="font-bold">{order.transferDetails.accountName}</dd></div><div><dt className="text-muted-foreground">Account number</dt><dd className="font-bold">{order.transferDetails.accountNumber}</dd></div><div><dt className="text-muted-foreground">Routing details</dt><dd className="font-bold">{order.transferDetails.routingDetails || '—'}</dd></div></dl>{order.transferDetails.bankAddress && <p className="mt-4 text-xs text-muted-foreground">Bank address: {order.transferDetails.bankAddress}</p>}{order.transferDetails.transferInstructions && <p className="mt-4 rounded-xl bg-background/70 p-3 text-sm leading-6">{order.transferDetails.transferInstructions}</p>}<p className="mt-4 text-xs text-muted-foreground">Payment is marked paid by the owner after the transfer is checked.</p></section>}{order.paymentStatus === 'paid' && <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm"><CheckCircle2 className="text-primary"/> Payment received{order.paymentReference ? ` · ${order.paymentReference}` : ''}</div>}{includeChat && <ProjectChat orderId={orderId}/>} {(order.requestStatus === 'delivered' || order.requestStatus === 'closed') && <form onSubmit={submitReview} className="rounded-3xl border border-border bg-card p-5 md:p-7"><Eyebrow>Share the result</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Leave a testimonial.</h2>{reviewSaved ? <p className="mt-4 text-sm text-primary">Thanks — your review was saved.</p> : <><div className="mt-5 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className={value <= rating ? 'text-accent' : 'text-muted-foreground'} aria-label={`${value} stars`}><Star size={22} fill="currentColor"/></button>)}</div><textarea value={testimonial} onChange={(event) => setTestimonial(event.target.value)} rows={4} required className="mt-4 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-4 focus:ring-primary/30" placeholder="What was it like to work together?"/><label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={permissionToPublish} onChange={(event) => setPermissionToPublish(event.target.checked)} className="mt-0.5"/> You may publish this testimonial on TaskFlow.</label><button className="mt-5 rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground">Save review</button></>}</form>}</div>;
}

function CustomerOrderPanel({ orderId, includeChat = true }: { orderId: string; includeChat?: boolean }) {
  const statusQuery = useGetOrderStatus(orderId, { query: { queryKey: getGetOrderStatusQueryKey(orderId), refetchInterval: 5000 } });
  const [rating, setRating] = useState(5);
  const [testimonial, setTestimonial] = useState('');
  const [permissionToPublish, setPermissionToPublish] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);
  const order = statusQuery.data;
  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch(`/api/orders/${orderId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, testimonial, permissionToPublish }) });
    if (response.ok) setReviewSaved(true);
  };
  if (statusQuery.isLoading) return <div className="rounded-3xl border border-dashed border-border p-10 text-sm text-muted-foreground">Loading project status…</div>;
  if (!order) return <div className="rounded-3xl border border-dashed border-border p-10 text-sm text-muted-foreground">Project status is unavailable.</div>;
  const milestones = order.milestones ?? projectStatuses.map((key, index) => ({ key, label: requestStatusLabel(key), description: '', state: index < projectStatuses.indexOf(order.requestStatus) ? 'complete' : index === projectStatuses.indexOf(order.requestStatus) ? 'current' : 'upcoming' }));
  return <div className="space-y-5">
    <section className="rounded-3xl border border-border bg-card p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><Eyebrow>Project status</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold capitalize">{requestStatusLabel(order.requestStatus)}</h2></div><span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold capitalize">{order.paymentStatus.replaceAll('_', ' ')}</span></div><div className="mt-6 grid gap-3 md:grid-cols-2">{milestones.map((milestone) => <div key={milestone.key} className={`rounded-2xl border p-4 ${milestone.state === 'current' ? 'border-primary bg-primary/10' : milestone.state === 'complete' ? 'border-primary/30 bg-primary/5' : 'border-border bg-background/50'}`} data-testid={`milestone-${milestone.key}`}><div className="flex items-center gap-2 text-sm font-bold"><span className={`grid size-6 place-items-center rounded-full text-xs ${milestone.state === 'upcoming' ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>{milestone.state === 'complete' ? '✓' : milestone.state === 'current' ? '•' : '·'}</span>{milestone.label}</div><p className="mt-2 pl-8 text-xs leading-5 text-muted-foreground">{milestone.description}</p></div>)}</div>{order.customPriceStatus === 'requested' && <div className="mt-5 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm"><b>Your price proposal is under review.</b><p className="mt-1 text-muted-foreground">{order.requestedCustomPriceCents ? money(order.requestedCustomPriceCents / 100) : ''} · {order.requestedCustomPriceReason || 'The owner will reply with the next step.'}</p></div>}{order.customPriceStatus === 'accepted' && order.customerPriceDecision !== 'pending' && <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm"><b>{order.customerPriceDecision === 'approved' ? 'Price approved.' : 'Change request sent.'}</b><p className="mt-1 text-muted-foreground">{order.customerPriceFeedback || `The agreed total is ${money(order.totalCents / 100)}.`}</p></div>}</section>
    <PriceDecisionPanel orderId={orderId} order={order}/>
    {order.transferDetails && order.paymentStatus !== 'paid' && <section className="rounded-3xl border border-primary/40 bg-primary/10 p-5 md:p-7"><div className="flex items-start justify-between gap-4"><div><Eyebrow>Payment requested</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Pay by bank transfer</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Transfer {money(order.amountDueCents / 100)} {order.transferDetails.currency.toUpperCase()}, then reply in your project chat with the reference.</p></div><Copy className="text-primary"/></div><dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Bank</dt><dd className="font-bold">{order.transferDetails.bankName}</dd></div><div><dt className="text-muted-foreground">Account name</dt><dd className="font-bold">{order.transferDetails.accountName}</dd></div><div><dt className="text-muted-foreground">Account number</dt><dd className="font-bold">{order.transferDetails.accountNumber}</dd></div><div><dt className="text-muted-foreground">Routing details</dt><dd className="font-bold">{order.transferDetails.routingDetails || '—'}</dd></div></dl>{order.transferDetails.bankAddress && <p className="mt-4 text-xs text-muted-foreground">Bank address: {order.transferDetails.bankAddress}</p>}{order.transferDetails.transferInstructions && <p className="mt-4 rounded-xl bg-background/70 p-3 text-sm leading-6">{order.transferDetails.transferInstructions}</p>}<p className="mt-4 text-xs text-muted-foreground">Payment is marked paid by the owner after the transfer is checked.</p></section>}
    {order.paymentStatus === 'paid' && <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm"><CheckCircle2 className="text-primary"/> Payment received{order.paymentReference ? ` · ${order.paymentReference}` : ''}</div>}
     <ActivityTimeline orderId={orderId}/>
     <DeliverablesPanel orderId={orderId}/>
    {includeChat && <ProjectChat orderId={orderId}/>}
    {(order.requestStatus === 'delivered' || order.requestStatus === 'closed') && <form onSubmit={submitReview} className="rounded-3xl border border-border bg-card p-5 md:p-7"><Eyebrow>Share the result</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Leave a testimonial.</h2>{reviewSaved ? <p className="mt-4 text-sm text-primary">Thanks — your review was saved.</p> : <><div className="mt-5 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className={value <= rating ? 'text-accent' : 'text-muted-foreground'} aria-label={`${value} stars`}><Star size={22} fill="currentColor"/></button>)}</div><textarea value={testimonial} onChange={(event) => setTestimonial(event.target.value)} rows={4} required className="mt-4 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-4 focus:ring-primary/30" placeholder="What was it like to work together?"/><label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={permissionToPublish} onChange={(event) => setPermissionToPublish(event.target.checked)} className="mt-0.5"/> You may publish this testimonial on TaskFlow.</label><button className="mt-5 rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground">Save review</button></>}</form>}
  </div>;
}

function OwnerControls({ orderId, order }: { orderId: string; order?: OrderStatus }) {
  const [status, setStatus] = useState(order?.requestStatus ?? 'request_received');
  const [offer, setOffer] = useState(order ? String(Math.round(order.totalCents / 100)) : '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  useEffect(() => { if (order) { setStatus(order.requestStatus); setOffer(String(Math.round(order.totalCents / 100))); } }, [order]);
  const post = async (path: string, body: unknown, successMessage = 'Saved.') => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/orders/${orderId}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error || 'Could not save.');
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetOrderStatusQueryKey(orderId) }),
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() }),
      ]);
      setMessage(successMessage);
    } catch {
      setMessage('Could not reach the project server.');
    } finally {
      setSaving(false);
    }
  };
  if (!order) return null;
  const amountCents = Math.round(Number(offer) * 100);
  const invalidAmount = !Number.isFinite(amountCents) || amountCents < 100;
  return <><section className="rounded-3xl border border-border bg-card p-5 md:p-7"><Eyebrow>Owner actions</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Move this project forward.</h2><p className="mt-2 text-sm text-muted-foreground">Changes refresh the project for you and the customer immediately.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Project status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="request_received">Request received</option><option value="in_review">In review</option><option value="awaiting_approval">Awaiting approval</option><option value="in_progress">In progress</option><option value="delivered">Delivered</option><option value="closed">Closed</option></select></label><button type="button" disabled={saving} onClick={() => void post('status', { requestStatus: status }, 'Status updated.')} className="self-end rounded-full bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground disabled:opacity-50">{saving ? 'Saving…' : 'Save status'}</button><label className="text-sm font-bold">Agreed total (USD)<input type="number" min="1" step="1" value={offer} onChange={(event) => setOffer(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"/></label><div className="flex items-end gap-2"><button type="button" disabled={saving || invalidAmount} onClick={() => void post('price-offer', { amountCents }, 'Project amount updated.')} className="rounded-full border border-border px-4 py-3 text-sm font-bold disabled:opacity-50">Accept / set price</button><button type="button" disabled={saving} onClick={() => void post('price-offer', { decision: 'declined' }, 'Price proposal rejected.')} className="rounded-full border border-destructive/30 px-4 py-3 text-sm font-bold text-destructive disabled:opacity-50">Reject offer</button></div></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={saving || invalidAmount} onClick={() => void post('payment-request', { amountCents }, 'Payment request sent.')} className="rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">Request bank transfer</button><button type="button" disabled={saving} onClick={() => setMarkPaidOpen(true)} className="rounded-full border border-border px-4 py-3 text-sm font-bold disabled:opacity-50">Mark paid</button></div>{message && <p className="mt-4 text-xs text-muted-foreground" role="status">{message}</p>}</section>{markPaidOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-secondary/55 p-4 backdrop-blur-sm"><section className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><Eyebrow>Payment confirmation</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Mark this transfer paid?</h2></div><button type="button" onClick={() => setMarkPaidOpen(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close payment dialog"><X size={17}/></button></div><p className="mt-3 text-sm leading-6 text-muted-foreground">A transfer reference is optional. Add the bank reference if you have it so the payment record is easier to reconcile later.</p><label className="mt-5 block text-sm font-bold">Transfer reference <span className="font-normal text-muted-foreground">(optional)</span><input autoFocus value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="e.g. TRF-2026-0042" className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal"/></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setMarkPaidOpen(false)} className="rounded-full border border-border px-4 py-2.5 text-sm font-bold">Cancel</button><button type="button" disabled={saving} onClick={() => { setMarkPaidOpen(false); void post('mark-paid', { reference: paymentReference.trim() }, 'Payment marked paid.'); }} className="rounded-full bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground disabled:opacity-50">Confirm payment</button></div></section></div>}</>;
}

function PaymentSettingsPanel() {
  const [form, setForm] = useState({ bankName: '', accountName: '', accountNumber: '', routingDetails: '', bankAddress: '', transferInstructions: '', currency: 'usd' });
  const [message, setMessage] = useState('');
  useEffect(() => { void fetch('/api/owner/payment-settings').then((response) => response.ok ? response.json() : null).then((data) => { if (data) setForm((current) => ({ ...current, ...data })); }); }, []);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch('/api/owner/payment-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setMessage(response.ok ? 'Bank-transfer details saved.' : 'Could not save bank-transfer details.');
  };
  return <form onSubmit={save} className="rounded-3xl border border-border bg-card p-5 md:p-7"><Eyebrow>Payment settings</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">Your bank-transfer details.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">These details stay private until you request payment for a specific project.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{(['bankName', 'accountName', 'accountNumber', 'routingDetails', 'bankAddress'] as const).map((key) => <label key={key} className="text-sm font-bold">{key === 'bankName' ? 'Bank name' : key === 'accountName' ? 'Account name' : key === 'accountNumber' ? 'Account number' : key === 'routingDetails' ? 'Routing / sort code' : 'Bank address'}<input required={key === 'bankName' || key === 'accountName' || key === 'accountNumber'} value={form[key]} onChange={(event) => update(key, event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal"/></label>)}<label className="text-sm font-bold md:col-span-2">Customer instructions<textarea value={form.transferInstructions} onChange={(event) => update('transferInstructions', event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm font-normal" placeholder="Include the order ID as the transfer reference."/></label></div><button className="mt-5 rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground">Save payment details</button>{message && <span className="ml-3 text-xs text-primary">{message}</span>}</form>;
}

function ProfileSettingsPanel() {
  const [profile, setProfile] = useState<{ id: string; firstName?: string | null; lastName?: string | null; email?: string | null; profileImageUrl?: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    void fetch('/api/account/profile').then((response) => response.ok ? response.json() : null).then((data) => { if (data) setProfile(data); });
  }, []);
  const upload = async (file: globalThis.File) => {
    if (!file.type.startsWith('image/')) {
      setMessage('Choose an image file.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/storage/profile/uploads/request-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error || 'Could not prepare image upload.');
      const data = await response.json() as { uploadURL: string; objectPath: string };
      const uploadResponse = await fetch(data.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!uploadResponse.ok) throw new Error('Could not upload image.');
      const saveResponse = await fetch('/api/account/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileImageUrl: data.objectPath }) });
      if (!saveResponse.ok) throw new Error('Could not save profile image.');
      setProfile(await saveResponse.json());
      setMessage('Profile image updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update profile image.');
    } finally {
      setBusy(false);
    }
  };
  return <section className="rounded-3xl border border-border bg-card p-5 md:p-7"><div className="flex flex-wrap items-center gap-4"><div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/15 text-primary">{profile?.profileImageUrl ? <img src={`${profile.profileImageUrl}${profile.profileImageUrl.includes('?') ? '&' : '?'}v=${Date.now()}`} alt="" className="size-full object-cover"/> : <UserCircle size={30}/>}</div><div className="min-w-0 flex-1"><Eyebrow>Your profile</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">{[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.email || 'Your TaskFlow profile'}</h2><p className="mt-1 text-sm text-muted-foreground">Add a photo so clients and collaborators know who they’re talking to.</p></div><label className="cursor-pointer rounded-full bg-secondary px-4 py-3 text-xs font-bold text-secondary-foreground">{busy ? 'Uploading…' : 'Add profile photo'}<input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }}/></label></div>{message && <p className="mt-4 text-xs text-muted-foreground">{message}</p>}</section>;
}

type ProductionTask = {
  id: string;
  orderId: string;
  serviceSlug: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigneeUserId: string | null;
  dueAt: string | null;
  order: { id: string; name: string; customerName: string; company: string; requestStatus: string; paymentStatus: string };
  assignee: { id: string; name: string; email: string | null } | null;
};

type WorkspaceAssignee = { id: string; name: string; email: string | null };
type RevenueSnapshot = {
  summary: { quotedCents: number; paidCents: number; outstandingCents: number; estimatedCostCents: number; estimatedProfitCents: number; projectCount: number; activeProjectCount: number; repeatClientCount: number };
  projects: Array<{ orderId: string; clientName: string; clientEmail: string; company: string; projectName: string; requestStatus: string; quoteCents: number; paymentStatus: string; invoiceNumber: string; invoiceStatus: string; dueAt: string | null; paidAt: string | null; createdAt: string; estimatedCostCents: number; estimatedProfitCents: number; services: string[] }>;
  repeatClients: Array<{ email: string; name: string; company: string; projects: number; revenueCents: number; lastProjectAt: string }>;
  serviceProfitability: Array<{ slug: string; name: string; revenueCents: number; estimatedCostCents: number; projects: number }>;
};

const taskStatusOptions = [['todo', 'To do'], ['in_progress', 'In progress'], ['blocked', 'Blocked'], ['done', 'Done']] as const;
const taskPriorityOptions = [['low', 'Low'], ['normal', 'Normal'], ['high', 'High'], ['urgent', 'Urgent']] as const;

function TaskBoard() {
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [assignees, setAssignees] = useState<WorkspaceAssignee[]>([]);
  const [projects, setProjects] = useState<Array<{ orderId: string; name: string }>>([]);
  const [filter, setFilter] = useState<'all' | ProductionTask['status']>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ProductionTask['priority']>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [newTask, setNewTask] = useState({ orderId: '', title: '', priority: 'normal' as ProductionTask['priority'], dueAt: '', assigneeUserId: '' });
  const [message, setMessage] = useState('');
  const load = async () => {
    const [tasksResponse, assigneesResponse, ordersResponse] = await Promise.all([fetch('/api/owner/tasks'), fetch('/api/owner/assignees'), fetch('/api/orders')]);
    if (!tasksResponse.ok) throw new Error('Could not load production tasks.');
    const loadedTasks = await tasksResponse.json() as ProductionTask[];
    setTasks(loadedTasks);
    if (assigneesResponse.ok) setAssignees(await assigneesResponse.json() as WorkspaceAssignee[]);
    if (ordersResponse.ok) {
      const orders = await ordersResponse.json() as Array<{ orderId: string; project?: { name?: string }; company?: string }>;
      setProjects(orders.map((order) => ({ orderId: order.orderId, name: order.project?.name || order.company || `Project ${order.orderId.slice(0, 8)}` })));
      setNewTask((current) => ({ ...current, orderId: current.orderId || orders[0]?.orderId || '' }));
    }
  };
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load production tasks.')); }, []);
  const updateTask = async (task: ProductionTask, changes: Record<string, unknown>) => {
    const response = await fetch(`/api/orders/${task.order.id}/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
    if (!response.ok) {
      setMessage((await response.json().catch(() => ({})) as { error?: string }).error || 'Could not update the task.');
      return;
    }
    const updated = await response.json() as ProductionTask;
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
  };
  const createTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTask.orderId || !newTask.title.trim()) {
      setMessage('Choose a project and add a task title.');
      return;
    }
    const response = await fetch(`/api/orders/${newTask.orderId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTask.title.trim(), priority: newTask.priority, dueAt: newTask.dueAt || null, assigneeUserId: newTask.assigneeUserId || null }) });
    if (!response.ok) {
      setMessage((await response.json().catch(() => ({})) as { error?: string }).error || 'Could not create the task.');
      return;
    }
    setNewTask((current) => ({ ...current, title: '', dueAt: '' }));
    setMessage('Task added.');
    await load();
  };
  const visibleTasks = tasks.filter((task) => (filter === 'all' || task.status === filter) && (priorityFilter === 'all' || task.priority === priorityFilter) && (assigneeFilter === 'all' || task.assigneeUserId === assigneeFilter) && `${task.title} ${task.order.name} ${task.order.customerName}`.toLowerCase().includes(search.toLowerCase()));
  const columns = filter === 'all' ? taskStatusOptions : taskStatusOptions.filter(([status]) => status === filter);
  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><Eyebrow>Production workspace</Eyebrow><h2 className="mt-2 font-display text-4xl font-bold">The work in motion.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Tasks are created from the service checklist when a project arrives. Adjust ownership, priority, and dates as the work changes.</p></div><button type="button" onClick={() => void load()} className="self-start rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold">Refresh board</button></div>
    <form onSubmit={createTask} className="rounded-3xl border border-primary/30 bg-primary/10 p-5"><div className="flex items-center gap-2"><Plus size={16} className="text-primary"/><h3 className="font-bold">Add a task</h3></div><div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr_auto]"><select value={newTask.orderId} onChange={(event) => setNewTask((current) => ({ ...current, orderId: event.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm"><option value="">Project</option>{projects.map((project) => <option key={project.orderId} value={project.orderId}>{project.name}</option>)}</select><input value={newTask.title} onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))} placeholder="Task title" className="h-10 rounded-xl border border-border bg-background px-3 text-sm"/><select value={newTask.priority} onChange={(event) => setNewTask((current) => ({ ...current, priority: event.target.value as ProductionTask['priority'] }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">{taskPriorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={newTask.assigneeUserId} onChange={(event) => setNewTask((current) => ({ ...current, assigneeUserId: event.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm"><option value="">Unassigned</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}</select><input type="date" value={newTask.dueAt} onChange={(event) => setNewTask((current) => ({ ...current, dueAt: event.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm"/><button className="rounded-full bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground">Add</button></div></form>
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 md:flex-row"><div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-3 text-muted-foreground"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks, projects, or clients" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm"/></div><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm"><option value="all">All statuses</option>{taskStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm"><option value="all">All priorities</option>{taskPriorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm"><option value="all">All assignees</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}</select></div>
    {message && <p className="text-xs text-muted-foreground" role="status">{message}</p>}
    <div className="grid gap-4 xl:grid-cols-4">{columns.map(([status, label]) => <section key={status} className="min-h-56 rounded-2xl border border-border bg-background/45 p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">{label}</h3><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">{visibleTasks.filter((task) => task.status === status).length}</span></div><div className="mt-3 space-y-3">{visibleTasks.filter((task) => task.status === status).map((task) => <article key={task.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[10px] uppercase tracking-[.12em] text-muted-foreground">{task.order.name}</p><h4 className="mt-2 text-sm font-bold">{task.title}</h4></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${task.priority === 'urgent' ? 'bg-destructive/15 text-destructive' : task.priority === 'high' ? 'bg-accent/30' : 'bg-muted text-muted-foreground'}`}>{task.priority}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{task.order.customerName}{task.order.company ? ` · ${task.order.company}` : ''}</p><div className="mt-4 grid gap-2"><select value={task.status} onChange={(event) => void updateTask(task, { status: event.target.value })} className="h-8 rounded-lg border border-border bg-background px-2 text-xs">{taskStatusOptions.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}</select><div className="grid grid-cols-2 gap-2"><select value={task.priority} onChange={(event) => void updateTask(task, { priority: event.target.value })} className="h-8 rounded-lg border border-border bg-background px-2 text-xs">{taskPriorityOptions.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}</select><select value={task.assigneeUserId ?? ''} onChange={(event) => void updateTask(task, { assigneeUserId: event.target.value || null })} className="h-8 min-w-0 rounded-lg border border-border bg-background px-2 text-xs"><option value="">Unassigned</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}</select></div><label className="flex items-center gap-2 text-[11px] text-muted-foreground"><CalendarDays size={13}/><input type="date" value={task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : ''} onChange={(event) => void updateTask(task, { dueAt: event.target.value || null })} className="h-7 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs"/></label></div></article>)}</div></section>)}</div>
  </div>;
}

function RevenueOpsPanel() {
  const [data, setData] = useState<RevenueSnapshot | null>(null);
  const [message, setMessage] = useState('');
  const load = async () => {
    const response = await fetch('/api/owner/revenue');
    if (!response.ok) throw new Error('Could not load revenue operations.');
    setData(await response.json() as RevenueSnapshot);
  };
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load revenue operations.')); }, []);
  if (message) return <div className="rounded-3xl border border-dashed border-border p-10 text-sm text-muted-foreground">{message}</div>;
  if (!data) return <div className="rounded-3xl border border-dashed border-border p-10 text-sm text-muted-foreground">Loading revenue operations…</div>;
  const cards = [['Quoted', data.summary.quotedCents], ['Collected', data.summary.paidCents], ['Outstanding', data.summary.outstandingCents], ['Est. profit', data.summary.estimatedProfitCents]] as const;
  return <div className="space-y-5"><div><Eyebrow>Revenue operations</Eyebrow><h2 className="mt-2 font-display text-4xl font-bold">Know what the work is doing.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Quotes, invoices, payment status, repeat clients, and estimated service profitability in one view.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, amount]) => <div key={label} className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="mt-3 font-display text-3xl font-bold">{money(Math.round(amount / 100))}</p></div>)}</div><div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><section className="overflow-hidden rounded-3xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-5"><div><Eyebrow>Quotes and invoices</Eyebrow><h3 className="mt-2 font-display text-2xl font-bold">Project ledger</h3></div><ReceiptText className="text-primary"/></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-5 py-3">Client</th><th className="px-5 py-3">Quote</th><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3">Profit</th></tr></thead><tbody>{data.projects.map((project) => <tr key={project.orderId} className="border-b border-border/70 last:border-0"><td className="px-5 py-4"><b>{project.clientName}</b><span className="mt-1 block text-xs text-muted-foreground">{project.projectName}</span></td><td className="px-5 py-4 font-bold">{money(Math.round(project.quoteCents / 100))}</td><td className="px-5 py-4"><span className="font-mono-ui text-xs">{project.invoiceNumber}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{project.invoiceStatus}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${project.paymentStatus === 'paid' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{project.paymentStatus.replaceAll('_', ' ')}</span></td><td className={`px-5 py-4 font-bold ${project.estimatedProfitCents < 0 ? 'text-destructive' : ''}`}>{money(Math.round(project.estimatedProfitCents / 100))}</td></tr>)}</tbody></table></div></section><section className="rounded-3xl border border-border bg-card p-5"><Eyebrow>Repeat clients</Eyebrow><h3 className="mt-2 font-display text-2xl font-bold">Who is coming back?</h3>{data.repeatClients.length ? <div className="mt-5 space-y-3">{data.repeatClients.map((client) => <div key={client.email} className="rounded-2xl bg-muted/60 p-4"><div className="flex items-start justify-between gap-3"><b>{client.name}</b><span className="rounded-full bg-primary/20 px-2 py-1 text-[10px] font-bold">{client.projects} projects</span></div><p className="mt-1 text-xs text-muted-foreground">{client.company || client.email}</p><p className="mt-3 text-sm font-bold">{money(Math.round(client.revenueCents / 100))} collected</p></div>)}</div> : <p className="mt-5 text-sm text-muted-foreground">Repeat clients will appear after a customer has more than one project.</p>}</section></div><section className="rounded-3xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><Eyebrow>Service profitability</Eyebrow><h3 className="mt-2 font-display text-2xl font-bold">What earns its keep?</h3></div><CircleDollarSign className="text-primary"/></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{data.serviceProfitability.map((service) => <div key={service.slug} className="rounded-2xl border border-border bg-background/50 p-4"><b className="text-sm">{service.name}</b><p className="mt-3 text-xs text-muted-foreground">{service.projects} project{service.projects === 1 ? '' : 's'}</p><div className="mt-2 flex justify-between text-sm"><span>Collected</span><b>{money(Math.round(service.revenueCents / 100))}</b></div><div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>Est. cost</span><span>{money(Math.round(service.estimatedCostCents / 100))}</span></div></div>)}</div></section></div>;
}

type TemplateTaskView = { key: string; title: string; description: string; priority: 'low' | 'normal' | 'high'; dueOffsetDays: number; archived?: boolean };
type TemplateDeliverableView = { key: string; title: string; description: string; defaultPriority: 'low' | 'normal' | 'high'; dueOffsetDays: number; archived?: boolean };
type ServiceTemplateView = {
  slug: string;
  name: string;
  options: string[];
  template: {
    key: string;
    version: number;
    defaultPriority: 'low' | 'normal' | 'high';
    defaultDueOffsetDays: number;
    tasks: TemplateTaskView[];
    deliverables: TemplateDeliverableView[];
  };
};

const priorityOptions = [['low', 'Low'], ['normal', 'Normal'], ['high', 'High']] as const;

function TemplateEditorCard({ item, onChange, onSave, saving }: { item: ServiceTemplateView; onChange: (item: ServiceTemplateView) => void; onSave: () => void; saving: boolean }) {
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newDeliverableTitle, setNewDeliverableTitle] = useState('');
  const updateTemplate = (changes: Partial<ServiceTemplateView['template']>) => onChange({ ...item, template: { ...item.template, ...changes } });
  const updateTask = (index: number, changes: Partial<TemplateTaskView>) => updateTemplate({ tasks: item.template.tasks.map((task, taskIndex) => taskIndex === index ? { ...task, ...changes } : task) });
  const updateDeliverable = (index: number, changes: Partial<TemplateDeliverableView>) => updateTemplate({ deliverables: item.template.deliverables.map((deliverable, deliverableIndex) => deliverableIndex === index ? { ...deliverable, ...changes } : deliverable) });
  const addStep = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newStepTitle.trim();
    if (!title) return;
    updateTemplate({ tasks: [...item.template.tasks, { key: `${item.slug}-step-${Date.now()}`, title, description: '', priority: item.template.defaultPriority, dueOffsetDays: item.template.defaultDueOffsetDays, archived: false }] });
    setNewStepTitle('');
  };
  const addDeliverable = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newDeliverableTitle.trim();
    if (!title) return;
    updateTemplate({ deliverables: [...item.template.deliverables, { key: `${item.slug}-deliverable-${Date.now()}`, title, description: '', defaultPriority: 'high', dueOffsetDays: item.template.defaultDueOffsetDays, archived: false }] });
    setNewDeliverableTitle('');
  };
  const moveTask = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= item.template.tasks.length) return;
    const tasks = [...item.template.tasks];
    [tasks[index], tasks[nextIndex]] = [tasks[nextIndex], tasks[index]];
    updateTemplate({ tasks });
  };
  return <article className="rounded-3xl border border-border bg-card p-5 md:p-6" data-testid={`card-template-${item.slug}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Eyebrow>{item.slug.replaceAll('-', ' ')} · version {item.template.version}</Eyebrow><h3 className="mt-2 font-display text-2xl font-bold">{item.name}</h3><p className="mt-1 text-xs text-muted-foreground">Changes apply to new projects only. Existing projects keep their saved template version.</p></div><ClipboardList className="text-primary"/></div>
    <div className="mt-5 grid gap-3 rounded-2xl bg-primary/10 p-4 sm:grid-cols-2"><label className="text-xs font-bold">Default task priority<select value={item.template.defaultPriority} onChange={(event) => updateTemplate({ defaultPriority: event.target.value as ServiceTemplateView['template']['defaultPriority'] })} className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs">{priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold">Default due offset (days)<input type="number" min="0" max="365" value={item.template.defaultDueOffsetDays} onChange={(event) => updateTemplate({ defaultDueOffsetDays: Math.max(0, Number(event.target.value) || 0) })} className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"/></label></div>
    <div className="mt-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Checklist steps</p><span className="text-[11px] text-muted-foreground">{item.template.tasks.filter((task) => !task.archived).length} active</span></div><div className="mt-3 space-y-3">{item.template.tasks.map((task, index) => <div key={task.key} className={`rounded-xl border p-3 ${task.archived ? 'border-dashed border-border bg-muted/40 opacity-70' : 'border-border bg-background/50'}`}><div className="flex items-start gap-2"><span className="pt-2 font-mono-ui text-xs text-primary">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input value={task.title} onChange={(event) => updateTask(index, { title: event.target.value })} className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-bold"/><select value={task.priority} onChange={(event) => updateTask(index, { priority: event.target.value as TemplateTaskView['priority'] })} className="h-9 rounded-lg border border-border bg-background px-2 text-xs">{priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input type="number" min="0" max="365" value={task.dueOffsetDays} onChange={(event) => updateTask(index, { dueOffsetDays: Math.max(0, Number(event.target.value) || 0) })} className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-xs" aria-label="Due offset days"/><textarea value={task.description} onChange={(event) => updateTask(index, { description: event.target.value })} rows={2} placeholder="Step notes" className="sm:col-span-3 w-full resize-none rounded-lg border border-border bg-background p-2 text-xs"/><div className="sm:col-span-3 flex flex-wrap gap-2 text-[11px]"><button type="button" onClick={() => moveTask(index, -1)} disabled={index === 0} className="rounded-full border border-border px-2.5 py-1 disabled:opacity-40">Move up</button><button type="button" onClick={() => moveTask(index, 1)} disabled={index === item.template.tasks.length - 1} className="rounded-full border border-border px-2.5 py-1 disabled:opacity-40">Move down</button><button type="button" onClick={() => updateTask(index, { archived: !task.archived })} className="rounded-full border border-border px-2.5 py-1">{task.archived ? 'Restore' : 'Archive'}</button></div></div></div></div>)}</div><form onSubmit={addStep} className="mt-3 flex gap-2"><input value={newStepTitle} onChange={(event) => setNewStepTitle(event.target.value)} placeholder="Add a checklist step" className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs"/><button className="rounded-full bg-secondary px-3 py-2 text-[11px] font-bold text-secondary-foreground">Add step</button></form></div>
    <div className="mt-6"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Deliverable slots</p><span className="text-[11px] text-muted-foreground">{item.template.deliverables.filter((deliverable) => !deliverable.archived).length} active</span></div><div className="mt-3 space-y-3">{item.template.deliverables.map((deliverable, index) => <div key={deliverable.key} className={`rounded-xl border p-3 ${deliverable.archived ? 'border-dashed border-border bg-muted/40 opacity-70' : 'border-border bg-background/50'}`}><div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input value={deliverable.title} onChange={(event) => updateDeliverable(index, { title: event.target.value })} className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-bold"/><select value={deliverable.defaultPriority} onChange={(event) => updateDeliverable(index, { defaultPriority: event.target.value as TemplateDeliverableView['defaultPriority'] })} className="h-9 rounded-lg border border-border bg-background px-2 text-xs">{priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input type="number" min="0" max="365" value={deliverable.dueOffsetDays} onChange={(event) => updateDeliverable(index, { dueOffsetDays: Math.max(0, Number(event.target.value) || 0) })} className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-xs" aria-label="Deliverable due offset days"/><textarea value={deliverable.description} onChange={(event) => updateDeliverable(index, { description: event.target.value })} rows={2} placeholder="What this slot contains" className="sm:col-span-3 w-full resize-none rounded-lg border border-border bg-background p-2 text-xs"/><div className="sm:col-span-3 flex flex-wrap gap-2 text-[11px]"><button type="button" onClick={() => updateDeliverable(index, { archived: !deliverable.archived })} className="rounded-full border border-border px-2.5 py-1">{deliverable.archived ? 'Restore' : 'Archive'}</button></div></div></div>)}</div><form onSubmit={addDeliverable} className="mt-3 flex gap-2"><input value={newDeliverableTitle} onChange={(event) => setNewDeliverableTitle(event.target.value)} placeholder="Add a deliverable slot" className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs"/><button className="rounded-full bg-secondary px-3 py-2 text-[11px] font-bold text-secondary-foreground">Add slot</button></form></div>
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-muted-foreground">Offsets are measured from project creation.</p><button type="button" onClick={onSave} disabled={saving} className="rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{saving ? 'Saving…' : 'Save template'}</button></div>
  </article>;
}

function ServiceTemplatesPanel() {
  const [templates, setTemplates] = useState<ServiceTemplateView[]>([]);
  const [message, setMessage] = useState('');
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const load = async () => {
    const response = await fetch('/api/owner/templates');
    if (!response.ok) throw new Error('Could not load service templates.');
    setTemplates(await response.json() as ServiceTemplateView[]);
  };
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load service templates.')); }, []);
  const save = async (item: ServiceTemplateView) => {
    setSavingSlug(item.slug);
    setMessage('');
    try {
      const response = await fetch(`/api/owner/templates/${item.slug}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.template) });
      const payload = await response.json().catch(() => ({})) as ServiceTemplateView | { error?: string };
      if (!response.ok) throw new Error(('error' in payload && payload.error) || 'Could not save service template.');
      setTemplates((current) => current.map((template) => template.slug === item.slug ? payload as ServiceTemplateView : template));
      setMessage(`${item.name} template saved for new projects.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save service template.');
    } finally {
      setSavingSlug(null);
    }
  };
  return <div className="space-y-5"><div><Eyebrow>Reusable service templates</Eyebrow><h2 className="mt-2 font-display text-4xl font-bold">Every service starts with a plan.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Edit the checklist, defaults, and deliverable slots used when a new project is created. Saving creates a new template version without changing active projects.</p></div>{message && <p className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm" role="status">{message}</p>}{!templates.length ? <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Loading templates…</p> : <div className="grid gap-4">{templates.map((item) => <TemplateEditorCard key={item.slug} item={item} saving={savingSlug === item.slug} onSave={() => void save(item)} onChange={(next) => setTemplates((current) => current.map((template) => template.slug === item.slug ? next : template))}/>)}</div>}</div>;
}

type TeamMemberView = { id: string; email: string; name: string; status: string; userId: string | null };

function TeamMembersPanel() {
  const [members, setMembers] = useState<TeamMemberView[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const response = await fetch('/api/owner/team-members');
    if (!response.ok) throw new Error('Could not load team members.');
    setMembers(await response.json() as TeamMemberView[]);
  };
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load team members.')); }, []);
  const invite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/owner/team-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name }) });
      const payload = await response.json().catch(() => ({})) as TeamMemberView | { error?: string };
      if (!response.ok) throw new Error(('error' in payload && payload.error) || 'Could not invite team member.');
      setMembers((current) => [...current.filter((member) => member.email !== (payload as TeamMemberView).email), payload as TeamMemberView]);
      setEmail('');
      setName('');
      setMessage('Team member added. They can be assigned after their TaskFlow account is available.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not invite team member.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (member: TeamMemberView) => {
    if (!window.confirm(`Remove ${member.name || member.email} from the team? Assigned tasks will become unassigned.`)) return;
    const response = await fetch(`/api/owner/team-members/${member.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Could not remove team member.');
      return;
    }
    setMembers((current) => current.filter((candidate) => candidate.id !== member.id));
    setMessage(`${member.name || member.email} removed from the team.`);
  };
  return <section className="rounded-3xl border border-border bg-card p-5 md:p-7"><div className="flex items-start justify-between gap-4"><div><Eyebrow>Production team</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold">People who can own tasks.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Invite a collaborator by email, then assign their active account to production tasks. Owners configured for this workspace are always available.</p></div><UsersRound className="text-primary"/></div><form onSubmit={invite} className="mt-5 grid gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 md:grid-cols-[1fr_1fr_auto]"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@company.com" className="h-10 rounded-xl border border-border bg-background px-3 text-sm"/><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name (optional)" className="h-10 rounded-xl border border-border bg-background px-3 text-sm"/><button disabled={busy} className="rounded-full bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground disabled:opacity-50">{busy ? 'Adding…' : 'Invite member'}</button></form><div className="mt-5 space-y-2">{members.length ? members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{member.name || member.email}</p><p className="text-xs text-muted-foreground">{member.email}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${member.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{member.status === 'active' ? 'Active' : 'Invited'}</span><button type="button" onClick={() => void remove(member)} className="rounded-full border border-destructive/30 px-2.5 py-1 text-[11px] font-bold text-destructive">Remove</button></div></div>) : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No additional team members yet.</p>}</div>{message && <p className="mt-4 text-xs text-muted-foreground" role="status">{message}</p>}</section>;
}

function CustomerOwnerStatus({ orderId }: { orderId: string }) {
  const statusQuery = useGetOrderStatus(orderId);
  if (statusQuery.isLoading) return <div className="rounded-3xl border border-dashed border-border p-8 text-sm text-muted-foreground">Loading project controls…</div>;
  if (!statusQuery.data) return null;
   return <><section className="rounded-3xl border border-border bg-card p-5 md:p-7"><Eyebrow>Current status</Eyebrow><div className="mt-4"><StatusTimeline status={statusQuery.data.requestStatus}/></div></section><OwnerControls orderId={orderId} order={statusQuery.data}/><DeliverablesPanel orderId={orderId} ownerMode/></>;
}

function AccountPage() {
  const { tab } = useParams<{ tab?: string }>();
  const activeTab: WorkspaceTab = tab === 'messages' ? 'messages' : tab === 'settings' ? 'settings' : 'overview';
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const ordersQuery = useGetOrders({ query: { queryKey: ['/api/orders'], enabled: isAuthenticated } });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const submitted = new URLSearchParams(window.location.search).get('submitted');
  const orders = ordersQuery.data ?? [];
  const unreadCount = orders.reduce((sum, order) => sum + (order.unreadCount ?? 0), 0);
  useEffect(() => {
    if (!selectedOrderId && orders[0]) setSelectedOrderId(submitted || orders[0].orderId);
  }, [orders, selectedOrderId, submitted]);
  if (authLoading) return <Shell><main className="mx-auto max-w-4xl px-5 py-24 text-center"><p className="text-sm text-muted-foreground">Loading your account…</p></main></Shell>;
  if (!isAuthenticated) return <Shell><main className="mx-auto max-w-3xl px-5 py-20"><div className="rounded-3xl bg-secondary p-8 text-secondary-foreground md:p-12"><Eyebrow>Your account</Eyebrow><h1 className="mt-5 font-display text-5xl font-bold">Keep the project moving.</h1><p className="mt-5 max-w-xl leading-7 text-secondary-foreground/70">Sign in to see requests, reply to your project chat, and keep your delivery history together.</p><button onClick={() => login('/account')} className="mt-8 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground" data-testid="button-account-sign-in"><LogIn size={16} className="mr-2 inline"/> Sign in</button></div></main></Shell>;
  return <WorkspaceShell activeTab={activeTab} unreadCount={unreadCount}><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><Eyebrow>Customer workspace</Eyebrow><h1 className="mt-4 font-display text-5xl font-bold md:text-7xl">{activeTab === 'messages' ? 'Project chat.' : activeTab === 'settings' ? 'Your settings.' : 'Your projects.'}</h1><p className="mt-5 max-w-xl text-muted-foreground">{activeTab === 'messages' ? 'A focused space for questions, files, decisions, and delivery notes.' : activeTab === 'settings' ? 'A few details that help TaskFlow feel more like yours.' : `Welcome back${user?.firstName ? `, ${user.firstName}` : ''}. Your requests and delivery history live here.`}</p></div><button onClick={() => logout('/')} className="self-start rounded-full border border-border bg-background px-4 py-2.5 text-xs font-bold md:self-auto" data-testid="button-account-logout">Sign out</button></div>{submitted && activeTab === 'overview' && <div className="mt-8 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm"><b>Request received.</b> We’ll email you if we need anything and reply in your project chat.</div>}{activeTab === 'settings' ? <section className="mt-10 grid gap-5 md:grid-cols-2"><div className="rounded-3xl border border-border bg-card p-6"><Eyebrow>Account</Eyebrow><h2 className="mt-3 font-display text-2xl font-bold">{user?.firstName || user?.email || 'Your TaskFlow account'}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{user?.email}</p><div className="mt-6 rounded-2xl bg-primary/10 p-4 text-sm leading-6">Your workspace keeps project history, private messages, and payment steps connected to the account you use to sign in.</div></div><div className="rounded-3xl border border-border bg-card p-6"><Eyebrow>Next step</Eyebrow><h2 className="mt-3 font-display text-2xl font-bold">Ready to add another piece?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Browse the service catalog without losing your existing projects.</p><Link href="/services" className="mt-6 inline-flex rounded-full bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground">Browse services <ArrowRight size={15} className="ml-2"/></Link></div></section> : activeTab === 'messages' ? <div className="mt-10 grid gap-5 xl:grid-cols-[300px_1fr]"><div className="space-y-2">{orders.length ? orders.map((order) => <button key={order.orderId} onClick={() => setSelectedOrderId(order.orderId)} className={`w-full rounded-2xl border p-4 text-left ${selectedOrderId === order.orderId ? 'border-foreground bg-muted' : 'border-border bg-card'}`}><div className="flex items-center justify-between gap-3"><span className="font-mono-ui text-[10px] uppercase text-muted-foreground">#{order.orderId.slice(0, 8)}</span>{order.unreadCount > 0 && <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-bold">{order.unreadCount} new</span>}</div><p className="mt-3 font-display text-lg font-bold">{requestStatusLabel(order.requestStatus)}</p><p className="mt-1 text-xs text-muted-foreground">{money(Math.round(order.totalCents / 100))} estimate</p></button>) : <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Your project conversations will appear here.</div>}</div><div>{selectedOrderId ? <ProjectChat orderId={selectedOrderId} fullScreen/> : <div className="grid min-h-[calc(100dvh-300px)] place-items-center rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Select a project to open its full-screen conversation.</div>}</div></div> : <div className="mt-10 grid gap-5 lg:grid-cols-[.72fr_1.28fr]"><div className="space-y-3">{ordersQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading requests…</p> : orders.length ? orders.map((order) => <button key={order.orderId} onClick={() => setSelectedOrderId(order.orderId)} className={`w-full rounded-2xl border p-5 text-left ${selectedOrderId === order.orderId ? 'border-foreground bg-muted' : 'border-border bg-card'}`} data-testid={`card-account-order-${order.orderId}`}><div className="flex items-center justify-between gap-4"><span className="font-mono-ui text-[10px] uppercase text-muted-foreground">#{order.orderId.slice(0, 8)}</span><div className="flex items-center gap-2">{order.unreadCount > 0 && <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-bold">{order.unreadCount} new</span>}<span className="rounded-full bg-primary/30 px-2 py-1 text-[10px] font-bold capitalize">{requestStatusLabel(order.requestStatus)}</span></div></div><p className="mt-5 font-display text-xl font-bold">{money(Math.round(order.totalCents / 100))} estimate</p><p className="mt-1 text-xs text-muted-foreground">{order.paymentStatus === 'paid' ? 'Paid by bank transfer' : order.paymentStatus === 'pending' ? 'Payment requested' : 'Payment follows scope approval'}</p></button>) : <div className="rounded-2xl border border-dashed border-border bg-card p-7"><h2 className="font-display text-2xl font-bold">No requests yet.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a service and start your first project.</p><Link href="/services" className="mt-5 inline-flex rounded-full bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground" data-testid="link-account-browse">Browse services</Link></div>}</div><div>{selectedOrderId ? <CustomerOrderPanel orderId={selectedOrderId} includeChat={false}/> : <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Select a project to open its status and payment steps.</div>}</div></div>}</WorkspaceShell>;
}

function InboxPage() {
  const { tab } = useParams<{ tab?: string }>();
  const activeTab: WorkspaceTab = tab === 'messages' ? 'messages' : tab === 'settings' ? 'settings' : tab === 'tasks' ? 'tasks' : tab === 'revenue' ? 'revenue' : tab === 'templates' ? 'templates' : 'inbox';
  const { isLoading: authLoading, isAuthenticated, login } = useAuth();
  const { role, loading: roleLoading } = useTaskflowRole();
  const ordersQuery = useGetOrders({ query: { queryKey: ['/api/orders'], enabled: isAuthenticated } });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'approval' | 'active' | 'archived'>('active');
  const isOwner = role?.role === 'admin' && role.accessStatus === 'active';
  const orders = ordersQuery.data ?? [];
  const filteredOrders = useMemo(() => orders.filter((order) => inboxFilter === 'all' || (inboxFilter === 'unread' ? order.unreadCount > 0 : inboxFilter === 'approval' ? order.customPriceStatus === 'requested' || order.customerPriceDecision === 'change_requested' : inboxFilter === 'archived' ? order.requestStatus === 'closed' : order.requestStatus !== 'closed')), [inboxFilter, orders]);
  const unreadCount = orders.reduce((sum, order) => sum + (order.unreadCount ?? 0), 0);
  useEffect(() => {
    if (isOwner && !selectedOrderId && orders[0]) setSelectedOrderId(orders[0].orderId);
  }, [isOwner, orders, selectedOrderId]);
  if (authLoading || roleLoading) return <Shell><main className="mx-auto max-w-4xl px-5 py-24 text-center"><p className="text-sm text-muted-foreground">Loading inbox…</p></main></Shell>;
  if (!isAuthenticated || !isOwner) return <Shell><main className="mx-auto max-w-3xl px-5 py-20"><div className="rounded-3xl border border-border bg-card p-8 text-center md:p-12"><MessageCircle size={30} className="mx-auto text-primary"/><h1 className="mt-6 font-display text-4xl font-bold">Your project inbox is private.</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">Sign in with the owner account to review requests and reply to customers.</p>{!isAuthenticated && <button onClick={() => login('/inbox')} className="mt-7 rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground" data-testid="button-inbox-sign-in">Sign in</button>}</div></main></Shell>;
  return <WorkspaceShell activeTab={activeTab} unreadCount={unreadCount} owner><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><Eyebrow>Owner workspace</Eyebrow><h1 className="mt-4 font-display text-5xl font-bold md:text-7xl">{activeTab === 'messages' ? 'Project chat.' : activeTab === 'settings' ? 'Payment settings.' : activeTab === 'tasks' ? 'Production board.' : activeTab === 'revenue' ? 'Revenue operations.' : activeTab === 'templates' ? 'Service templates.' : 'Project inbox.'}</h1><p className="mt-5 max-w-2xl text-muted-foreground">{activeTab === 'messages' ? 'Keep customer conversations focused, private, and close to the work.' : activeTab === 'settings' ? 'Your bank-transfer details stay private and only appear after you request payment.' : activeTab === 'tasks' ? 'Turn every project into a visible queue of work with an owner, priority, and next date.' : activeTab === 'revenue' ? 'Quotes, invoices, payment status, repeat clients, and estimated profitability.' : activeTab === 'templates' ? 'Reusable checklists and deliverable structures applied to every new service order.' : 'Review active requests, update status, request payment, and reply with the next useful step.'}</p></div></div>{activeTab === 'settings' ? <div className="mt-10 space-y-5"><PaymentSettingsPanel/><TeamMembersPanel/></div> : activeTab === 'tasks' ? <div className="mt-10"><TaskBoard/></div> : activeTab === 'revenue' ? <div className="mt-10"><RevenueOpsPanel/></div> : activeTab === 'templates' ? <div className="mt-10"><ServiceTemplatesPanel/></div> : <div className="mt-10 grid gap-5 xl:grid-cols-[300px_1fr]"><div className="space-y-3"><div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2"><Filter size={15} className="m-2 text-muted-foreground"/>{([['all', 'All'], ['unread', 'Unread'], ['approval', 'Needs decision'], ['active', 'Active'], ['archived', 'Archived']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setInboxFilter(value)} className={`rounded-full px-3 py-2 text-[11px] font-bold ${inboxFilter === value ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{label}</button>)}</div>{ordersQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading requests…</p> : filteredOrders.length ? filteredOrders.map((order) => <button key={order.orderId} onClick={() => setSelectedOrderId(order.orderId)} className={`w-full rounded-2xl border p-4 text-left ${selectedOrderId === order.orderId ? 'border-foreground bg-muted' : 'border-border bg-card'}`} data-testid={`card-inbox-order-${order.orderId}`}><div className="flex justify-between gap-3"><span className="font-mono-ui text-[10px] uppercase text-muted-foreground">#{order.orderId.slice(0, 8)}</span><div className="flex items-center gap-2">{order.unreadCount > 0 && <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-bold">{order.unreadCount} new</span>}<span className="rounded-full bg-primary/30 px-2 py-1 text-[10px] font-bold capitalize">{requestStatusLabel(order.requestStatus)}</span></div></div><p className="mt-4 font-display text-lg font-bold">{money(Math.round(order.totalCents / 100))} estimate</p><p className="mt-1 text-xs text-muted-foreground">{order.customPriceStatus === 'requested' ? `Customer proposed ${money((order.requestedCustomPriceCents ?? 0) / 100)}` : order.customerPriceDecision === 'change_requested' ? 'Customer requested a price change' : order.paymentStatus === 'pending' ? 'Payment requested' : order.paymentStatus === 'paid' ? 'Paid by bank transfer' : 'Payment not requested'}</p></button>) : <div className="rounded-2xl border border-dashed border-border p-7 text-sm text-muted-foreground">No projects match this filter.</div>}</div><div>{selectedOrderId ? activeTab === 'messages' ? <ProjectChat orderId={selectedOrderId} ownerMode fullScreen/> : <div className="space-y-5"><CustomerOwnerStatus orderId={selectedOrderId}/><ProjectChat orderId={selectedOrderId} ownerMode/></div> : <div className="grid min-h-[calc(100dvh-300px)] place-items-center rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Select a request to open its conversation.</div>}</div></div>}</WorkspaceShell>;
}

function HowItWorks() { const steps = [['01', 'Choose the outcome', 'Every service starts with a defined deliverable, realistic timing, and a visible price.'], ['02', 'Build one project', 'Put multiple services in one cart. Your disciplines share the same context.'], ['03', 'Give us the signal', 'A short brief tells us what matters and where the edges are.'], ['04', 'Review before payment', 'Submit the project request, discuss the scope in your private chat, and only pay after the plan is agreed.']]; return <Shell><main><section className="bg-secondary text-secondary-foreground"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><Eyebrow>The operating model</Eyebrow><h1 className="mt-5 font-display text-6xl font-bold leading-[.9] md:text-8xl">Less chasing.<br/><span className="text-primary">More shipping.</span></h1><p className="mt-8 max-w-xl text-lg leading-8 text-secondary-foreground/70">TaskFlow turns a vague “can you help?” into a useful project with a scope, a pace, and a place for every moving part.</p></div></section><section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2">{steps.map(([n, title, copy]) => <div key={n} className="bg-card p-8 md:p-10"><span className="font-mono-ui text-3xl text-primary">{n}</span><h2 className="mt-16 font-display text-3xl font-bold">{title}</h2><p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{copy}</p></div>)}</div></section><section className="bg-[#e8e2d6] py-20"><div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[.75fr_1.25fr] lg:px-8"><h2 className="font-display text-4xl font-bold md:text-6xl">Your project has a memory.</h2><p className="max-w-xl text-lg leading-8 text-muted-foreground">The shared project cart keeps business context together. That makes handoffs calmer and decisions faster.</p></div></section></main></Shell>; }
function FAQ() { const questions = [['What is TaskFlow, exactly?', 'TaskFlow is a storefront for completed digital work. Browse defined services, configure the shape you need, and combine multiple services into one project request.'], ['Can I order more than one service?', 'That is the point. Add as many configured services as you need to one project cart.'], ['How does express delivery work?', 'Express adds priority scheduling. A combined project is never promised in fewer than 5 business days. Larger loads switch to a custom schedule.'], ['What happens after I submit?', 'Your request creates an account-linked project thread. We’ll review the brief, ask questions in chat, and agree the scope before sending bank-transfer instructions.'], ['Do I have to pay immediately?', 'No. New project requests are payment-free. The owner reviews the scope and requests a bank transfer only after the final amount is agreed.'], ['Do you work internationally?', 'Yes. Prices are shown in USD and kickoff can be coordinated across time zones.']]; const [open, setOpen] = useState(0); return <Shell><main className="mx-auto max-w-4xl px-5 py-12 lg:px-8 lg:py-20"><Eyebrow>Good questions</Eyebrow><h1 className="mt-4 font-display text-6xl font-bold md:text-8xl">The fine print,<br/><span className="text-accent">made friendly.</span></h1><div className="mt-14 border-t border-border">{questions.map(([q, a], index) => <div key={q} className="border-b border-border"><button onClick={() => setOpen(open === index ? -1 : index)} className="flex w-full justify-between gap-5 py-6 text-left font-display text-xl font-bold" data-testid={`button-faq-${index}`}>{q}<ChevronDown size={20} className={open === index ? 'rotate-180' : ''}/></button>{open === index && <p className="max-w-2xl pb-7 text-sm leading-7 text-muted-foreground">{a}</p>}</div>)}</div><div className="mt-14 rounded-3xl bg-primary p-8"><div className="flex justify-between"><div><Eyebrow>Still curious?</Eyebrow><h2 className="mt-3 font-display text-3xl font-bold">Start with the work you can name.</h2></div><Sparkles/></div><Link href="/services" className="mt-7 inline-flex rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground">Explore services</Link></div></main></Shell>; }

const automationUrlSchema = z.object({ endpoint: z.string().trim().min(1, 'Enter a webhook URL.').url('Enter a valid webhook URL.').max(2000, 'URL must be 2,000 characters or fewer.').refine((value) => /^https:\/\//i.test(value), 'Webhook URLs must use HTTPS.') });
type AutomationUrlValues = z.infer<typeof automationUrlSchema>;
const lifecycleEvents = ['project.created', 'project.status_changed', 'task.created', 'task.updated', 'deliverable.submitted', 'deliverable.approved', 'deliverable.changes_requested', 'deliverable.comment', 'project.completed', 'price_offer.sent', 'price_offer.declined', 'price_offer.approved', 'price_offer.change_requested', 'payment.requested', 'payment.marked_paid'];

function BillingCreditsPage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const queryClient = useQueryClient();
  const plansQuery = useGetBillingPlans({ query: { queryKey: getGetBillingPlansQueryKey() } });
  const creditsQuery = useGetAccountCredits({ query: { queryKey: getGetAccountCreditsQueryKey(), enabled: isAuthenticated } });
  const checkout = useCreateBillingCheckout();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [returnRefreshed, setReturnRefreshed] = useState(false);
  const billingReturn = new URLSearchParams(window.location.search).get('billing_return') === '1';
  useEffect(() => {
    if (!billingReturn) return;
    void queryClient.invalidateQueries({ queryKey: getGetAccountCreditsQueryKey() }).finally(() => setReturnRefreshed(true));
  }, [billingReturn, queryClient]);
  const startCheckout = (planKey: string) => {
    setPendingPlan(planKey);
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    const returnUrl = new URL(`${base}account/credits?billing_return=1`, window.location.origin).toString();
    checkout.mutate({ data: { planKey: planKey as 'starter' | 'growth' | 'scale', returnUrl } }, {
      onSuccess: ({ purchaseUrl }) => window.location.assign(purchaseUrl),
      onError: () => setPendingPlan(null),
    });
  };
  const plans = plansQuery.data ?? [];
  const credits = creditsQuery.data;
  const currentPlan = credits?.planKey ? plans.find((plan) => plan.key === credits.planKey) : undefined;
  if (authLoading) return <Shell><main className="mx-auto max-w-5xl px-5 py-24"><div className="h-40 animate-pulse rounded-3xl bg-muted"/></main></Shell>;
  if (!isAuthenticated) return <Shell><main className="mx-auto max-w-3xl px-5 py-20"><div className="rounded-3xl bg-secondary p-8 text-secondary-foreground md:p-12"><Eyebrow>Your account</Eyebrow><h1 className="mt-5 font-display text-5xl font-bold">Credits for the work ahead.</h1><p className="mt-5 max-w-xl leading-7 text-secondary-foreground/70">Sign in to view your verified request-credit balance and choose a monthly plan.</p><button onClick={() => login('/account/credits')} className="mt-8 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground" data-testid="button-credits-sign-in"><LogIn size={16} className="mr-2 inline"/> Sign in</button></div></main></Shell>;
  return <WorkspaceShell activeTab="credits"><section className="relative overflow-hidden rounded-[2rem] bg-secondary p-6 text-secondary-foreground sm:p-10"><div className="absolute -right-16 -top-20 size-64 rounded-full border-[36px] border-primary/15"/><div className="relative max-w-3xl"><Eyebrow>Customer workspace · subscription credits</Eyebrow><h1 className="mt-5 max-w-2xl font-display text-5xl font-bold leading-[.95] tracking-[-.05em] sm:text-7xl">More momentum.<br/>Less admin.</h1><p className="mt-5 max-w-xl text-sm leading-7 text-secondary-foreground/70">Monthly request credits give you a clear way to plan ongoing work. Your balance and subscription status below come from your TaskFlow account.</p></div></section>
{billingReturn && <div className="mt-6 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm" data-testid="status-credit-checkout-return"><div className="flex items-start gap-3"><RefreshCw size={17} className={`mt-0.5 shrink-0 text-primary ${creditsQuery.isFetching ? 'animate-spin' : ''}`}/><div><p className="font-bold">{creditsQuery.isError ? 'Account status could not be verified.' : creditsQuery.isFetching || !returnRefreshed ? 'Checking with Whop…' : credits?.active ? 'Subscription verified.' : 'No active subscription verified yet.'}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">A checkout return is not confirmation of purchase. The balance below updates only from TaskFlow’s server-verified account record.</p></div></div>{!creditsQuery.isError && !credits?.active && <button type="button" onClick={() => void creditsQuery.refetch()} disabled={creditsQuery.isFetching} className="rounded-full border border-border bg-background px-3 py-2 text-xs font-bold disabled:opacity-50" data-testid="button-refresh-credit-status">{creditsQuery.isFetching ? 'Checking…' : 'Check again'}</button>}</div>}
    <section className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
      <article className="rounded-3xl border border-border bg-card p-6 sm:p-8" data-testid="panel-credit-balance"><div className="flex items-start justify-between gap-4"><div><Eyebrow>Available request credits</Eyebrow><p className="mt-5 font-display text-6xl font-bold leading-none tracking-[-.06em]" data-testid="text-credit-balance">{creditsQuery.isLoading ? '—' : credits ? credits.balance.toLocaleString() : '—'}</p><p className="mt-3 text-sm text-muted-foreground">Credits available to request eligible work.</p></div><div className="grid size-12 place-items-center rounded-2xl bg-primary/25 text-secondary"><CreditCard size={22}/></div></div>
        {creditsQuery.isLoading && <div className="mt-6 h-14 animate-pulse rounded-xl bg-muted"/>}
        {creditsQuery.isError && <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm" data-testid="status-credit-error"><p className="font-bold">Balance unavailable</p><p className="mt-1 text-muted-foreground">We could not verify your credit balance right now.</p><button onClick={() => void creditsQuery.refetch()} className="mt-3 inline-flex items-center gap-2 font-bold underline" data-testid="button-retry-credits"><RefreshCw size={13}/> Try again</button></div>}
        {!creditsQuery.isLoading && !creditsQuery.isError && credits && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><div><p className="text-xs font-mono-ui uppercase tracking-[.12em] text-muted-foreground">Active plan</p><p className="mt-1 font-bold" data-testid="text-credit-plan">{credits.active ? currentPlan?.title ?? credits.planKey ?? 'Active plan' : 'No active plan'}</p></div>{credits.periodEndsAt && <div className="text-left sm:text-right"><p className="text-xs font-mono-ui uppercase tracking-[.12em] text-muted-foreground">Current period ends</p><p className="mt-1 text-sm font-semibold" data-testid="text-credit-period-end">{new Date(credits.periodEndsAt).toLocaleDateString([], { dateStyle: 'long' })}</p></div>}</div>}
      </article>
      <aside className="rounded-3xl border border-border bg-primary/20 p-6 sm:p-8"><div className="flex items-center gap-2"><ReceiptText size={17}/><Eyebrow>Separate project billing</Eyebrow></div><h2 className="mt-4 font-display text-2xl font-bold">Credits are not project invoices.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Monthly subscription credits are for eligible work requests. Project-specific payments remain on each project’s agreed bank-transfer invoice and payment steps.</p><Link href="/account" className="mt-5 inline-flex items-center gap-2 text-sm font-bold underline" data-testid="link-projects-from-credits">View projects <ArrowRight size={14}/></Link></aside>
    </section>
    <section className="mt-12"><div className="flex flex-wrap items-end justify-between gap-4"><div><Eyebrow>Monthly plans</Eyebrow><h2 className="mt-2 font-display text-4xl font-bold tracking-[-.04em]">Choose your working rhythm.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Each plan renews monthly. Review the features, then continue to hosted checkout.</p></div><span className="rounded-full border border-border bg-card px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[.13em] text-muted-foreground">Secure checkout by Whop</span></div>
      {plansQuery.isLoading && <div className="mt-6 grid gap-4 md:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-3xl bg-muted"/>)}</div>}
      {plansQuery.isError && <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm" data-testid="status-billing-plans-error"><p className="font-bold">Plans could not be loaded.</p><button onClick={() => void plansQuery.refetch()} className="mt-3 font-bold underline" data-testid="button-retry-plans">Try loading plans again</button></div>}
      {!plansQuery.isLoading && !plansQuery.isError && plans.length === 0 && <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-10 text-center" data-testid="empty-billing-plans"><CreditCard size={24} className="mx-auto text-muted-foreground"/><p className="mt-3 font-bold">No monthly plans are available right now.</p><p className="mt-1 text-sm text-muted-foreground">Your account balance and existing project payment steps remain available.</p></div>}
      {!plansQuery.isLoading && !plansQuery.isError && plans.length > 0 && <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan, index) => <article key={plan.key} className={`relative flex min-h-[340px] flex-col overflow-hidden rounded-3xl border p-6 ${index === 1 ? 'border-foreground bg-card shadow-[8px_8px_0_hsl(222_39%_14%/.1)]' : 'border-border bg-card'}`} data-testid={`card-billing-plan-${plan.key}`}><div className="flex items-start justify-between gap-3"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground">Monthly plan</p><h3 className="mt-2 font-display text-2xl font-bold">{plan.title}</h3></div>{credits?.active && credits.planKey === plan.key && <span className="rounded-full bg-primary/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide">Current</span>}</div><p className="mt-6 font-display text-4xl font-bold tracking-[-.05em]">{money(plan.monthlyPriceUsd)}<span className="ml-1 font-sans text-sm font-semibold text-muted-foreground">/ month</span></p><div className="mt-3 inline-flex w-fit rounded-full bg-muted px-3 py-1.5 text-xs font-bold" data-testid={`text-plan-credits-${plan.key}`}>{plan.monthlyCredits.toLocaleString()} credits / month</div><ul className="mt-5 space-y-2.5">{plan.features.map((feature, featureIndex) => <li key={`${plan.key}-${featureIndex}`} className="flex gap-2 text-sm leading-5"><Check size={15} className="mt-0.5 shrink-0 text-primary"/><span>{feature}</span></li>)}</ul><div className="mt-auto pt-7"><button onClick={() => startCheckout(plan.key)} disabled={!plan.checkoutReady || checkout.isPending} className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${plan.checkoutReady ? 'bg-secondary text-secondary-foreground' : 'border border-border bg-muted text-muted-foreground'}`} data-testid={`button-checkout-${plan.key}`}>{checkout.isPending && pendingPlan === plan.key ? <><RefreshCw size={14} className="animate-spin"/> Preparing checkout…</> : plan.checkoutReady ? 'Choose this plan' : 'Checkout unavailable'}</button>{!plan.checkoutReady && <p className="mt-2 text-center text-xs text-muted-foreground">This plan is not ready for hosted checkout yet.</p>}</div></article>)}</div>}
      {checkout.isError && <p className="mt-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive" role="alert" data-testid="status-checkout-error">Checkout could not be started. Your account has not been charged. Please try again.</p>}
    </section>
  </WorkspaceShell>;
}

function AutomationProviderCard({ row }: { row: AutomationStatus }) {
  const queryClient = useQueryClient();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const form = useForm<AutomationUrlValues>({ resolver: zodResolver(automationUrlSchema), defaultValues: { endpoint: '' } });
  const mutation = useUpdateOwnerAutomation({ mutation: { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getGetOwnerAutomationsQueryKey() }); } } });
  const submit = (values: AutomationUrlValues) => mutation.mutate({ data: { provider: row.provider, active: row.active, endpoint: values.endpoint.trim() } }, { onSuccess: () => form.reset({ endpoint: '' }) });
  const toggle = () => mutation.mutate({ data: { provider: row.provider, active: !row.active } });
  const clearEndpoint = () => mutation.mutate({ data: { provider: row.provider, active: false, clearEndpoint: true } });
  return <article className="rounded-3xl border border-border bg-card p-5 sm:p-6" data-testid={`card-automation-${row.provider}`}><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-muted-foreground">Webhook provider</p><h3 className="mt-2 font-display text-2xl font-bold">{row.label}</h3><p className="mt-2 text-sm text-muted-foreground">Saved endpoint addresses are hidden. Replacing the URL keeps the current one active until the new URL is saved.</p></div><div className="flex flex-wrap gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${row.configured ? 'bg-primary/25 text-foreground' : 'bg-muted text-muted-foreground'}`} data-testid={`status-automation-configured-${row.provider}`}>{row.configured ? <CircleCheck size={14}/> : <CircleX size={14}/>} {row.configured ? 'Configured' : 'Not configured'}</span>{row.configured && <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${row.active ? 'bg-[#d8eadc] text-[#28563a]' : 'bg-muted text-muted-foreground'}`} data-testid={`status-automation-active-${row.provider}`}>{row.active ? 'Active' : 'Paused'}</span>}</div></div>
    <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="mt-5 border-t border-border pt-5"><FormField control={form.control} name="endpoint" render={({ field }) => <FormItem><FormLabel className="text-xs font-bold">{row.configured ? 'Replace webhook URL' : 'Webhook URL'}</FormLabel><FormControl><Input {...field} type="url" placeholder="https://hooks.example.com/…" autoComplete="url" data-testid={`input-automation-url-${row.provider}`} className="mt-2 h-11 rounded-xl bg-background"/></FormControl><p className="text-xs leading-5 text-muted-foreground">Use HTTPS on a public host. Local and private-network addresses are blocked.</p><FormMessage/></FormItem>}/><div className="mt-4 flex flex-wrap gap-2"><button type="submit" disabled={mutation.isPending} className="rounded-full bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground disabled:opacity-50" data-testid={`button-save-automation-${row.provider}`}>{mutation.isPending ? 'Saving…' : row.configured ? 'Save replacement URL' : 'Add webhook URL'}</button>{row.configured && <><button type="button" onClick={toggle} disabled={mutation.isPending} className="rounded-full border border-border px-4 py-2.5 text-xs font-bold disabled:opacity-50" data-testid={`button-toggle-automation-${row.provider}`}>{mutation.isPending ? 'Updating…' : row.active ? 'Disable provider' : 'Enable provider'}</button><button type="button" onClick={() => setClearDialogOpen(true)} disabled={mutation.isPending} className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-4 py-2.5 text-xs font-bold text-destructive disabled:opacity-50" data-testid={`button-clear-automation-${row.provider}`}><Link2Off size={13}/> Clear endpoint</button></>}</div>{mutation.isError && <p className="mt-3 text-sm text-destructive" role="alert" data-testid={`status-automation-error-${row.provider}`}>{mutation.error instanceof Error ? mutation.error.message : 'Could not save this provider setting. Check the URL and try again.'}</p>}{mutation.isSuccess && <p className="mt-3 text-sm text-primary" role="status" data-testid={`status-automation-saved-${row.provider}`}>Provider settings saved.</p>}</form></Form>
    {clearDialogOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-secondary/60 p-4 backdrop-blur-sm"><section role="alertdialog" aria-modal="true" aria-labelledby={`clear-automation-title-${row.provider}`} aria-describedby={`clear-automation-copy-${row.provider}`} className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl"><p className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-destructive">Remove connection</p><h3 id={`clear-automation-title-${row.provider}`} className="mt-2 font-display text-2xl font-bold">Clear {row.label} endpoint?</h3><p id={`clear-automation-copy-${row.provider}`} className="mt-3 text-sm leading-6 text-muted-foreground">This permanently removes the saved URL and disables this provider. It will stop receiving TaskFlow updates until you add a new URL.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setClearDialogOpen(false)} className="rounded-full border border-border px-4 py-2.5 text-sm font-bold" data-testid={`button-cancel-clear-automation-${row.provider}`}>Keep endpoint</button><button type="button" disabled={mutation.isPending} onClick={() => { setClearDialogOpen(false); clearEndpoint(); }} className="rounded-full bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground disabled:opacity-50" data-testid={`button-confirm-clear-automation-${row.provider}`}>{mutation.isPending ? 'Clearing…' : 'Remove endpoint'}</button></div></section></div>}
  </article>;
}

function OwnerAutomationsPage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const { role, loading: roleLoading } = useTaskflowRole();
  const isOwner = role?.role === 'admin' && role.accessStatus === 'active';
  const automationsQuery = useGetOwnerAutomations({ query: { queryKey: getGetOwnerAutomationsQueryKey(), enabled: isAuthenticated && isOwner } });
  if (authLoading || roleLoading) return <Shell><main className="mx-auto max-w-4xl px-5 py-24"><div className="h-40 animate-pulse rounded-3xl bg-muted"/></main></Shell>;
  if (!isAuthenticated || !isOwner) return <Shell><main className="mx-auto max-w-3xl px-5 py-20"><div className="rounded-3xl border border-border bg-card p-8 text-center md:p-12"><Webhook size={30} className="mx-auto text-primary"/><h1 className="mt-6 font-display text-4xl font-bold">Owner settings stay private.</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">Sign in with the owner account to configure project lifecycle webhooks.</p>{!isAuthenticated && <button onClick={() => login('/inbox/automations')} className="mt-7 rounded-full bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground" data-testid="button-automations-sign-in">Sign in</button>}</div></main></Shell>;
  const rows = automationsQuery.data ?? [];
  return <WorkspaceShell owner activeTab="automations"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><Eyebrow>Owner workspace · system connections</Eyebrow><h1 className="mt-4 font-display text-5xl font-bold tracking-[-.05em] md:text-7xl">Automations.</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">Connect project updates to the tools your team already uses. Saved endpoint values are not returned by the API, so they are never shown or prefilled here.</p></div><span className="flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold"><Webhook size={15}/> Webhook settings</span></div>
    <section className="mt-9 grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><div className="rounded-3xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><ListTodo size={17} className="text-primary"/><Eyebrow>Delivery behavior</Eyebrow></div><h2 className="mt-3 font-display text-2xl font-bold">No event filters are available.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Zapier, Make.com, Slack, and Discord receive every lifecycle event listed here when active. Figma and Canva asset-injection relays receive only <code className="rounded bg-muted px-1.5 py-0.5 text-xs">project.created</code> and <code className="rounded bg-muted px-1.5 py-0.5 text-xs">deliverable.submitted</code>.</p></div><div className="rounded-3xl bg-secondary p-5 text-secondary-foreground sm:p-6"><Eyebrow>Lifecycle event catalog</Eyebrow><p className="mt-2 text-xs leading-5 text-secondary-foreground/70">These are the backend event names. Delivery depends on provider type as described.</p><div className="mt-4 flex flex-wrap gap-2">{lifecycleEvents.map((eventName) => <code key={eventName} className="rounded-lg border border-secondary-foreground/15 bg-secondary-foreground/5 px-2.5 py-1.5 font-mono-ui text-[10px]" data-testid={`text-lifecycle-event-${eventName}`}>{eventName}</code>)}</div></div></section>
    <section className="mt-9"><div className="mb-5 flex items-end justify-between gap-4"><div><Eyebrow>Provider configuration</Eyebrow><h2 className="mt-2 font-display text-3xl font-bold">Connected destinations</h2></div><button onClick={() => void automationsQuery.refetch()} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold" data-testid="button-refresh-automations"><RefreshCw size={13}/> Refresh</button></div>{automationsQuery.isLoading && <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-3xl bg-muted"/> )}</div>}{automationsQuery.isError && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm" data-testid="status-automations-error"><p className="font-bold">Provider settings could not be loaded.</p><p className="mt-1 text-muted-foreground">The owner automation service may be unavailable. No saved endpoint values were changed.</p><button onClick={() => void automationsQuery.refetch()} className="mt-3 font-bold underline" data-testid="button-retry-automations">Try again</button></div>}{!automationsQuery.isLoading && !automationsQuery.isError && rows.length === 0 && <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center" data-testid="empty-automations"><Webhook size={24} className="mx-auto text-muted-foreground"/><p className="mt-3 font-bold">No provider entries were returned.</p><p className="mt-1 text-sm text-muted-foreground">Refresh to check configuration availability.</p></div>}{!automationsQuery.isLoading && !automationsQuery.isError && rows.length > 0 && <div className="grid gap-4 xl:grid-cols-2">{rows.map((row) => <AutomationProviderCard key={row.provider} row={row}/>)}</div>}</section>
  </WorkspaceShell>;
}

function RoleRouteGuard({ required, children }: { required: 'client' | 'admin' | 'superadmin' | 'specialist'; children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useTaskflowRole();
  const [, setLocation] = useLocation();
  const allowed = isAuthenticated && (
    required === 'client' ? role?.role === 'client'
      : required === 'specialist' ? role?.role === 'specialist' && role.accessStatus === 'active'
        : required === 'superadmin' ? role?.role === 'admin' && role.accessStatus === 'active' && role.isSuperAdmin
          : role?.role === 'admin' && role.accessStatus === 'active'
  );
  useEffect(() => {
    if (authLoading || roleLoading || allowed) return;
    setLocation(required === 'superadmin' && role?.role === 'admin' ? '/inbox' : '/dashboard');
  }, [allowed, authLoading, required, role?.role, roleLoading, setLocation]);
  if (authLoading || roleLoading || !allowed) return <main className="grid min-h-[65dvh] place-items-center px-5"><div className="rounded-2xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">Checking workspace access…</div></main>;
  return <>{children}</>;
}

function Router() {
  const adminInbox = () => <RoleRouteGuard required="admin"><InboxPage/></RoleRouteGuard>;
  const specialist = (children: ReactNode) => <RoleRouteGuard required="specialist"><Shell>{children}</Shell></RoleRouteGuard>;
  const handover = () => <RoleRouteGuard required="superadmin"><WorkspaceShell owner activeTab="handover"><PlatformHandoverPage/></WorkspaceShell></RoleRouteGuard>;
  const automations = () => <RoleRouteGuard required="admin"><OwnerAutomationsPage/></RoleRouteGuard>;
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={Home}/><Route path="/demo" component={DemoWorkspace}/><Route path="/services" component={ServicesPage}/><Route path="/services/:slug" component={ServiceDetail}/><Route path="/cart" component={CartPage}/><Route path="/checkout" component={Checkout}/><Route path="/account/credits" component={BillingCreditsPage}/>
    <Route path="/inbox/handover" component={handover}/><Route path="/admin/handover" component={handover}/><Route path="/owner/handover" component={handover}/>
    <Route path="/inbox/automations" component={automations}/><Route path="/admin/automations" component={automations}/><Route path="/owner/automations" component={automations}/>
    <Route path="/fulfillment/assessment" component={() => specialist(<SpecialistAssessmentPage/>)}/><Route path="/fulfillment" component={() => specialist(<FulfillmentPortalPage/>)}/>
    <Route path="/account/brand-vault" component={() => <RoleRouteGuard required="client"><WorkspaceShell activeTab="brandVault"><BrandVaultSetupPage/></WorkspaceShell></RoleRouteGuard>}/>
    <Route path="/dashboard" component={AccountPage}/><Route path="/account" component={AccountPage}/><Route path="/account/:tab" component={AccountPage}/>
    <Route path="/admin" component={adminInbox}/><Route path="/admin/:tab" component={adminInbox}/><Route path="/owner" component={adminInbox}/><Route path="/owner/:tab" component={adminInbox}/>
    <Route path="/inbox" component={adminInbox}/><Route path="/inbox/:tab" component={adminInbox}/>
    <Route path="/checkout/success" component={() => <OrderStatusPage/>}/><Route path="/checkout/cancel" component={() => <OrderStatusPage cancelled/>}/><Route path="/how-it-works" component={HowItWorks}/><Route path="/faq" component={FAQ}/><Route component={NotFound}/>
  </Switch></RoutedErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
 export default function TaskflowApp() { const [items, setItems] = useState<CartItem[]>(readCart); const [project, setProject] = useState<ProjectInfo>(() => readStorage<ProjectInfo>('taskflow-project', emptyProject)); const [deliveryOption, setDeliveryOption] = useState<'standard' | 'express'>(() => readStorage<'standard' | 'express'>('taskflow-delivery', 'standard')); const [customPrice, setCustomPrice] = useState(() => readStorage<string>('taskflow-custom-price', '')); const [customPriceReason, setCustomPriceReason] = useState(() => readStorage<string>('taskflow-custom-price-reason', '')); const add = (service: Service, option: string, brief: string, quantity: number) => setItems((current) => { const id = `${service.slug}-${option}`; const found = current.find((item) => item.id === id); return found ? current.map((item) => item.id === id ? { ...item, quantity: item.quantity + quantity, brief } : item) : [...current, { ...service, option, brief, quantity, id }]; }); const remove = (id: string) => setItems((current) => current.filter((item) => item.id !== id)); const adjust = (id: string, delta: number) => setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)); useEffect(() => { window.localStorage.setItem('taskflow-cart', JSON.stringify(serializeCart(items))); }, [items]); useEffect(() => { window.localStorage.setItem('taskflow-project', JSON.stringify(project)); }, [project]); useEffect(() => { window.localStorage.setItem('taskflow-delivery', deliveryOption); }, [deliveryOption]); useEffect(() => { window.localStorage.setItem('taskflow-custom-price', customPrice); }, [customPrice]); useEffect(() => { window.localStorage.setItem('taskflow-custom-price-reason', customPriceReason); }, [customPriceReason]); const value = useMemo(() => ({ items, add, remove, adjust, subtotal: items.reduce((sum, item) => sum + priceForOption(item, item.option) * item.quantity, 0), count: items.reduce((sum, item) => sum + item.quantity, 0), project, setProject, deliveryOption, setDeliveryOption, customPrice, setCustomPrice, customPriceReason, setCustomPriceReason }), [items, project, deliveryOption, customPrice, customPriceReason]); return <QueryClientProvider client={queryClient}><TooltipProvider><AuthProvider><TaskflowRoleProvider><CartContext.Provider value={value}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/><OnboardingGate/><RoleOnboardingGate/></WouterRouter></CartContext.Provider><Toaster/></TaskflowRoleProvider></AuthProvider></TooltipProvider></QueryClientProvider>; }

function hydrateCartItem(value: unknown): CartItem | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const serviceSlug = typeof record.serviceSlug === 'string' ? record.serviceSlug : typeof record.slug === 'string' ? record.slug : null;
  const service = serviceSlug ? serviceBySlug.get(serviceSlug) : undefined;
  if (!service) return null;
  const requestedOption = typeof record.option === 'string' ? record.option : '';
  const option = service.options.includes(requestedOption) ? requestedOption : service.options[0];
  const quantityValue = typeof record.quantity === 'number' && Number.isFinite(record.quantity) ? Math.floor(record.quantity) : 1;
  const quantity = Math.max(1, quantityValue);
  const brief = typeof record.brief === 'string' ? record.brief : '';
  return { ...service, id: `${service.slug}-${option}`, option, brief, quantity };
}

function serializeCart(items: CartItem[]) {
  return items.map(({ slug, option, brief, quantity }) => ({ serviceSlug: slug, option, brief, quantity }));
}

function readCart(): CartItem[] {
  const stored = readStorage<unknown>('taskflow-cart', []);
  if (!Array.isArray(stored)) return [];
  return stored.map(hydrateCartItem).filter((item): item is CartItem => Boolean(item));
}
