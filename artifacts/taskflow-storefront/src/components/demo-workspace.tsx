import { useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileImage,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  MessageCircle,
  Palette,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Video,
  Wallet,
} from "lucide-react";

type Role = "Client" | "Creator" | "Admin";
type PageKey = "overview" | "deliverables" | "messages" | "brand" | "tasks" | "queue" | "projects" | "team" | "revenue";
type Status = "In progress" | "In review" | "Ready to start" | "Approved";

const dateFromToday = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
};
const todayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

const projects = [
  { id: "northstar", name: "Northstar launch", client: "Northstar Studio", color: "#d6a85f", mark: "N", progress: 68, due: dateFromToday(5), status: "In progress", category: "Brand campaign", budget: "$4,800" },
  { id: "fieldnotes", name: "Fieldnotes social", client: "Fieldnotes Market", color: "#789b83", mark: "F", progress: 42, due: dateFromToday(8), status: "In progress", category: "Social content", budget: "$2,650" },
  { id: "daylight", name: "Daylight refresh", client: "Daylight Goods", color: "#b77a78", mark: "D", progress: 91, due: dateFromToday(2), status: "In review", category: "Visual identity", budget: "$3,200" },
];

const tasks = [
  { id: "film", title: "Launch film — 30 sec cut", project: "Northstar launch", projectId: "northstar", type: "Video", due: "Today, 4:00 PM", status: "In progress" as Status, assignee: "Mira Chen", amount: "$720" },
  { id: "story", title: "Instagram story set (6 frames)", project: "Fieldnotes social", projectId: "fieldnotes", type: "Social", due: "Tomorrow", status: "Ready to start" as Status, assignee: "Mira Chen", amount: "$380" },
  { id: "packaging", title: "Packaging detail retouch", project: "Daylight refresh", projectId: "daylight", type: "Design", due: dateFromToday(2), status: "In review" as Status, assignee: "Alex Rivera", amount: "$460" },
  { id: "ad", title: "Paid social variations", project: "Northstar launch", projectId: "northstar", type: "Design", due: dateFromToday(4), status: "Ready to start" as Status, assignee: "Alex Rivera", amount: "$540" },
];

const navByRole: Record<Role, { key: PageKey; label: string; icon: typeof LayoutDashboard }[]> = {
  Client: [
    { key: "overview", label: "Project overview", icon: LayoutDashboard },
    { key: "deliverables", label: "Deliverables", icon: FileImage },
    { key: "messages", label: "Messages", icon: MessageCircle },
    { key: "brand", label: "Brand context", icon: Palette },
  ],
  Creator: [
    { key: "tasks", label: "My production", icon: ListChecks },
    { key: "queue", label: "Delivery queue", icon: Video },
    { key: "messages", label: "Project notes", icon: MessageCircle },
  ],
  Admin: [
    { key: "overview", label: "Operations", icon: LayoutDashboard },
    { key: "projects", label: "Project triage", icon: FolderKanban },
    { key: "team", label: "Team workload", icon: UsersRound },
    { key: "revenue", label: "Revenue", icon: CircleDollarSign },
  ],
};

const initialMessages = [
  { by: "Lena Park", role: "Client", time: "9:42 AM", text: "The warm, late-afternoon light in the reference feels right. Could we keep that in the opening shot?" },
  { by: "Mira Chen", role: "Creator", time: "10:08 AM", text: "Absolutely. I’ve pulled that into the first pass and kept the type treatment nice and quiet." },
  { by: "Lena Park", role: "Client", time: "10:16 AM", text: "Lovely. The pacing is feeling much closer to the launch story." },
];

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "blue" }) {
  return <span className={`tf-badge tf-badge-${tone}`}>{children}</span>;
}

function SectionTitle({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="tf-section-title"><div>{eyebrow && <p className="tf-eyebrow">{eyebrow}</p>}<h2>{title}</h2>{detail && <p className="tf-detail">{detail}</p>}</div>{action}</div>;
}

function Avatar({ initials, tint = "sage" }: { initials: string; tint?: "sage" | "peach" | "blue" }) {
  return <span className={`tf-avatar tf-avatar-${tint}`} aria-label={initials}>{initials}</span>;
}

export default function DemoWorkspace() {
  const [role, setRole] = useState<Role>("Client");
  const [page, setPage] = useState<PageKey>("overview");
  const [selectedProject, setSelectedProject] = useState("northstar");
  const [selectedTask, setSelectedTask] = useState("film");
  const [taskStatuses, setTaskStatuses] = useState<Record<string, Status>>({});
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const project = projects.find((item) => item.id === selectedProject) ?? projects[0];
  const task = tasks.find((item) => item.id === selectedTask) ?? tasks[0];
  const roleNav = navByRole[role];

  const visibleTasks = useMemo(() => tasks.filter((item) =>
    `${item.title} ${item.project} ${item.assignee}`.toLowerCase().includes(search.toLowerCase())
  ), [search]);

  function switchRole(nextRole: Role) {
    setRole(nextRole);
    setPage(nextRole === "Client" ? "overview" : nextRole === "Creator" ? "tasks" : "overview");
    setNotice("");
  }

  function setTaskStatus(id: string) {
    const currentStatus = taskStatuses[id] ?? tasks.find((item) => item.id === id)?.status ?? "Ready to start";
    const next: Status = currentStatus === "Ready to start" ? "In progress" : currentStatus === "In progress" ? "In review" : currentStatus === "In review" ? "Approved" : "Ready to start";
    setTaskStatuses((current) => ({ ...current, [id]: next }));
    setNotice(`Sample status changed to “${next}”.`);
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { by: role === "Client" ? "Lena Park" : role === "Creator" ? "Mira Chen" : "TaskFlow team", role, time: "Just now", text }]);
    setDraft("");
    setNotice("Message added to this local demo thread.");
  }

  const statusFor = (id: string) => taskStatuses[id] ?? tasks.find((item) => item.id === id)?.status ?? "Ready to start";

  return (
    <div className="taskflow-demo">
      <style>{`
        .taskflow-demo{--tf-ink:#202d32;--tf-muted:#718087;--tf-line:#dce4df;--tf-paper:#f2f5f1;--tf-card:#fbfcfa;--tf-teal:#1a7770;--tf-teal-soft:#e3f1ed;--tf-orange:#e5a166;--tf-navy:#263a40;min-height:100dvh;background:var(--tf-paper);color:var(--tf-ink);font-family:var(--app-font-sans,'Manrope',sans-serif);font-size:13px}
        .taskflow-demo *{box-sizing:border-box}.tf-shell{min-height:100dvh;display:flex;flex-direction:column}.tf-topbar{height:66px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 30px;background:#fbfcfa;border-bottom:1px solid var(--tf-line);gap:18px}
        .tf-brand{display:flex;align-items:center;gap:10px;font-family:var(--app-font-serif,'Space Grotesk',sans-serif);font-size:20px;font-weight:700;letter-spacing:-1.1px}.tf-brand-mark{width:30px;height:30px;border-radius:9px;background:var(--tf-navy);display:grid;place-items:center;color:#f5c88f}.tf-brand-dot{color:var(--tf-teal)}
        .tf-demo-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid #cbded7;background:#edf6f2;color:#346a5e;padding:7px 11px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.045em}.tf-demo-chip span{width:6px;height:6px;border-radius:50%;background:#51957d}
        .tf-top-actions{display:flex;align-items:center;gap:14px}.tf-top-link{border:0;background:none;color:#637378;font-size:12px;font-weight:700;display:flex;align-items:center;gap:7px;cursor:pointer}.tf-top-link:hover{color:var(--tf-teal)}.tf-top-divider{height:24px;width:1px;background:var(--tf-line)}
        .tf-role-switch{display:flex;padding:3px;border:1px solid var(--tf-line);border-radius:10px;background:#f4f7f4;gap:2px}.tf-role-switch button{border:0;background:transparent;color:#738087;padding:7px 11px;border-radius:7px;font-size:11px;font-weight:800;cursor:pointer;transition:background .18s,color .18s,transform .18s}.tf-role-switch button:hover{color:var(--tf-ink)}.tf-role-switch button[aria-pressed=true]{background:var(--tf-navy);color:#fff;box-shadow:0 2px 4px #1b31331a}
        .tf-layout{display:flex;flex:1;min-height:0}.tf-sidebar{width:238px;flex:none;background:#263a40;color:#ecf0eb;padding:25px 15px 18px;display:flex;flex-direction:column}.tf-workspace-label{padding:0 12px;color:#a7b8b5;font-family:var(--app-font-mono,monospace);font-size:9px;text-transform:uppercase;letter-spacing:.17em}.tf-side-project{display:flex;align-items:center;gap:10px;margin:16px 7px 24px;padding:11px;border-radius:11px;background:#344a4d}.tf-project-mark{width:31px;height:31px;border-radius:9px;display:grid;place-items:center;color:#263a40;font-family:var(--app-font-serif,serif);font-weight:800}.tf-side-project strong{display:block;font-size:11px}.tf-side-project small{display:block;color:#a7b8b5;margin-top:3px;font-size:10px}.tf-nav{display:grid;gap:4px}.tf-nav button{width:100%;display:flex;align-items:center;gap:11px;text-align:left;border:0;padding:10px 12px;border-radius:9px;background:transparent;color:#bfcbc7;font-size:11px;font-weight:700;cursor:pointer}.tf-nav button:hover{background:#ffffff0c;color:white}.tf-nav button[aria-current=page]{color:#fff;background:#40585a}.tf-nav button[aria-current=page] svg{color:#78c6b3}.tf-nav-icon{width:17px;height:17px}.tf-nav-count{margin-left:auto;padding:2px 6px;border-radius:9px;background:#f0bf83;color:#263a40;font-size:9px}
        .tf-sidebar-foot{margin-top:auto;border-top:1px solid #ffffff1c;padding:17px 8px 0}.tf-demo-note{display:flex;gap:9px;color:#a9bbb7;font-size:10px;line-height:1.6}.tf-demo-note svg{flex:none;color:#84c2ac}.tf-main{flex:1;min-width:0;padding:27px clamp(20px,4vw,56px) 48px}.tf-main-inner{max-width:1180px;margin:0 auto}.tf-main-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}.tf-greeting{font-family:var(--app-font-serif,'Space Grotesk',sans-serif);font-size:28px;line-height:1.15;letter-spacing:-1.2px;margin:0}.tf-greeting-sub{font-size:12px;color:var(--tf-muted);margin:8px 0 0}.tf-eyebrow{margin:0 0 7px;color:var(--tf-teal);font-family:var(--app-font-mono,monospace);font-size:9px;letter-spacing:.15em;text-transform:uppercase;font-weight:700}.tf-date{display:flex;gap:7px;align-items:center;color:var(--tf-muted);font-size:11px}
        .tf-content-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(245px,.8fr);gap:18px;align-items:start}.tf-stack{display:grid;gap:16px;min-width:0}.tf-card{background:var(--tf-card);border:1px solid var(--tf-line);border-radius:14px;box-shadow:0 2px 9px #243a3510}.tf-card-pad{padding:20px}.tf-section-title{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin:0 0 17px}.tf-section-title h2{font-family:var(--app-font-serif,'Space Grotesk',sans-serif);font-size:17px;letter-spacing:-.45px;margin:0}.tf-detail{font-size:11px;color:var(--tf-muted);margin:6px 0 0;line-height:1.55}.tf-inline-link{border:0;background:transparent;color:var(--tf-teal);font-weight:800;font-size:10px;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap}.tf-inline-link:hover{text-decoration:underline}
        .tf-project-hero{padding:0;overflow:hidden}.tf-hero-banner{height:115px;padding:19px 21px;background:linear-gradient(118deg,#dcebe4,#edf0dd 53%,#f5d8b7);position:relative;overflow:hidden}.tf-hero-banner:before,.tf-hero-banner:after{content:"";position:absolute;border:1px solid #fff9;border-radius:50%;width:190px;height:190px;right:10%;top:-105px}.tf-hero-banner:after{width:250px;height:250px;right:-10px;top:-160px}.tf-project-label{position:relative;z-index:1;color:#3f655c;font-family:var(--app-font-mono,monospace);font-size:9px;letter-spacing:.13em;text-transform:uppercase}.tf-hero-title{position:relative;z-index:1;margin-top:9px;font-family:var(--app-font-serif,'Space Grotesk',sans-serif);font-size:23px;font-weight:700;letter-spacing:-.8px;color:#233b3b}.tf-hero-body{padding:18px 21px 20px}.tf-progress-head{display:flex;align-items:center;justify-content:space-between;font-size:10px;color:var(--tf-muted);margin-bottom:9px}.tf-progress-head strong{color:var(--tf-ink);font-size:11px}.tf-progress{height:6px;background:#e7ece7;border-radius:8px;overflow:hidden}.tf-progress span{height:100%;display:block;background:var(--tf-teal);border-radius:8px;transition:width .25s}.tf-milestones{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:17px}.tf-milestone{padding-top:11px;border-top:1px solid var(--tf-line)}.tf-milestone small{display:block;color:var(--tf-muted);font-size:9px}.tf-milestone strong{display:block;margin-top:5px;font-size:10px}
        .tf-stat-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.tf-stat{padding:15px}.tf-stat-head{display:flex;align-items:center;justify-content:space-between;color:var(--tf-muted);font-size:10px}.tf-stat-icon{width:28px;height:28px;display:grid;place-items:center;background:#e7f2ed;color:var(--tf-teal);border-radius:8px}.tf-stat-value{font-family:var(--app-font-serif,'Space Grotesk',sans-serif);font-size:23px;font-weight:700;letter-spacing:-.8px;margin-top:11px}.tf-stat-caption{color:var(--tf-muted);font-size:9px;margin-top:4px}
        .tf-deliverable{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #e9eeea}.tf-deliverable:first-of-type{border-top:0;padding-top:2px}.tf-file-icon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:#edf2e8;color:#617e64;flex:none}.tf-deliverable-copy{min-width:0;flex:1}.tf-deliverable-copy strong{font-size:11px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tf-deliverable-copy small{display:block;color:var(--tf-muted);font-size:9px;margin-top:4px}.tf-badge{display:inline-flex;align-items:center;white-space:nowrap;padding:5px 8px;border-radius:99px;background:#edf0ee;color:#66736f;font-size:9px;font-weight:800}.tf-badge-green{background:#e4f2eb;color:#34725a}.tf-badge-amber{background:#fcf0df;color:#946434}.tf-badge-blue{background:#e7eff3;color:#4b6e7f}
        .tf-mini-heading{font-family:var(--app-font-serif,'Space Grotesk',sans-serif);font-size:14px;margin:0}.tf-brand-block{padding:15px;border-radius:11px;background:#f1f4ed}.tf-brand-swatches{display:flex;gap:7px;margin:12px 0}.tf-swatch{height:22px;width:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #dce4dc}.tf-brand-copy{color:var(--tf-muted);font-size:10px;line-height:1.7;margin:0}.tf-context-row{display:flex;justify-content:space-between;padding-top:11px;margin-top:11px;border-top:1px solid #dfe7df;font-size:10px}.tf-context-row span{color:var(--tf-muted)}
        .tf-activity{display:grid;gap:15px}.tf-activity-item{display:flex;gap:10px;align-items:flex-start}.tf-activity-icon{width:25px;height:25px;border-radius:8px;background:#edf4ef;color:#53806d;display:grid;place-items:center;flex:none}.tf-activity-item p{margin:0;font-size:10px;line-height:1.5}.tf-activity-item small{display:block;color:var(--tf-muted);font-size:9px;margin-top:4px}
        .tf-list{overflow:hidden}.tf-list-row{display:grid;grid-template-columns:minmax(180px,1.5fr) minmax(110px,.8fr) minmax(90px,.7fr) minmax(90px,.65fr) 32px;align-items:center;gap:12px;padding:13px 18px;border-top:1px solid #e8eeea}.tf-list-row:first-child{border-top:0}.tf-list-head{background:#f5f7f4;color:var(--tf-muted);font-family:var(--app-font-mono,monospace);font-size:8px;text-transform:uppercase;letter-spacing:.1em;padding-top:10px;padding-bottom:10px}.tf-row-main{display:flex;align-items:center;gap:10px;min-width:0}.tf-row-main strong{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tf-row-main small{display:block;color:var(--tf-muted);font-size:9px;margin-top:4px}.tf-row-secondary{font-size:10px;color:#53646a}.tf-row-button{border:0;background:transparent;display:grid;place-items:center;color:#7d8987;cursor:pointer;border-radius:7px;width:28px;height:28px}.tf-row-button:hover{background:#edf3ef;color:var(--tf-teal)}
        .tf-task-layout{display:grid;grid-template-columns:minmax(0,1fr) 305px;gap:16px;align-items:start}.tf-task-row{display:flex;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid #e8eeea;cursor:pointer}.tf-task-row:first-child{border-top:0}.tf-task-row:hover{background:#f5f8f4}.tf-task-row[aria-selected=true]{background:#edf5f0;box-shadow:inset 3px 0 var(--tf-teal)}.tf-task-check{width:33px;height:33px;display:grid;place-items:center;border-radius:10px;background:#eef2ec;color:#688074;flex:none}.tf-task-name{min-width:0;flex:1}.tf-task-name strong{display:block;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tf-task-name small{display:block;margin-top:4px;color:var(--tf-muted);font-size:9px}.tf-task-due{color:#74817f;font-size:9px;white-space:nowrap}.tf-task-detail{padding:19px}.tf-detail-art{height:105px;border-radius:10px;background:linear-gradient(135deg,#e4eee6,#e5e4d1 55%,#e9c59d);display:grid;place-items:center;color:#57806d;margin-bottom:15px}.tf-detail-task-title{font-family:var(--app-font-serif,'Space Grotesk',sans-serif);font-size:16px;line-height:1.3;margin:6px 0}.tf-detail-description{font-size:10px;line-height:1.7;color:var(--tf-muted)}.tf-meta-line{display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-top:1px solid #e8eeea;font-size:9px}.tf-meta-line span{color:var(--tf-muted)}.tf-primary-button{border:0;border-radius:9px;background:var(--tf-teal);color:white;padding:10px 13px;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;transition:transform .18s,background .18s}.tf-primary-button:hover{background:#155e59;transform:translateY(-1px)}.tf-secondary-button{border:1px solid var(--tf-line);background:#fbfcfa;color:#405257;padding:9px 11px;border-radius:9px;font-size:10px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:7px}.tf-secondary-button:hover{background:#eff4f0}
        .tf-message-list{display:grid;gap:15px;max-height:410px;overflow:auto;padding-right:4px}.tf-message{display:flex;gap:10px;align-items:flex-start}.tf-message.is-own{flex-direction:row-reverse}.tf-message-body{max-width:79%}.tf-message-meta{display:flex;gap:7px;align-items:center;margin-bottom:5px;font-size:9px;color:var(--tf-muted)}.tf-message.is-own .tf-message-meta{justify-content:flex-end}.tf-message-bubble{padding:11px 13px;border-radius:3px 12px 12px 12px;background:#f0f4ef;font-size:10px;line-height:1.65;color:#405157}.tf-message.is-own .tf-message-bubble{border-radius:12px 3px 12px 12px;background:#e4f1eb}.tf-message-form{display:flex;gap:8px;margin-top:16px}.tf-message-form input,.tf-search-input{min-width:0;border:1px solid var(--tf-line);background:#fff;border-radius:9px;padding:10px 12px;font:inherit;font-size:10px;color:var(--tf-ink);outline:none}.tf-message-form input{flex:1}.tf-message-form input:focus,.tf-search-input:focus{border-color:#75a99a;box-shadow:0 0 0 3px #1a777015}.tf-search-box{display:flex;align-items:center;gap:7px;border:1px solid var(--tf-line);background:#fff;border-radius:9px;padding:0 10px;color:#7d8987}.tf-search-input{border:0!important;box-shadow:none!important;padding-left:0;width:155px}.tf-notice{position:fixed;right:22px;bottom:20px;background:#253c40;color:#fff;padding:11px 15px;border-radius:10px;box-shadow:0 8px 26px #1b313333;font-size:10px;z-index:20;animation:tf-notice .2s ease-out}.tf-mobile-nav{display:none}.tf-project-select{border:1px solid var(--tf-line);background:#fbfcfa;border-radius:9px;padding:8px 10px;color:#506169;font:inherit;font-size:10px;font-weight:700}
        .tf-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:17px}.tf-kpi{padding:15px}.tf-kpi-label{display:flex;justify-content:space-between;color:var(--tf-muted);font-size:9px}.tf-kpi-value{font-family:var(--app-font-serif,'Space Grotesk',sans-serif);font-size:22px;font-weight:700;letter-spacing:-.7px;margin:11px 0 5px}.tf-kpi-trend{font-size:9px;color:#49876a;display:flex;align-items:center;gap:3px}.tf-project-triage{display:grid;gap:10px}.tf-triage-card{display:grid;grid-template-columns:minmax(170px,1.3fr) minmax(100px,.7fr) minmax(110px,.7fr) minmax(90px,.5fr) auto;gap:12px;align-items:center;padding:13px 15px;background:#fbfcfa;border:1px solid var(--tf-line);border-radius:11px}.tf-team-person{display:flex;align-items:center;gap:9px}.tf-team-person strong{display:block;font-size:10px}.tf-team-person small{display:block;color:var(--tf-muted);font-size:9px;margin-top:3px}.tf-workload{height:5px;border-radius:9px;background:#e9eeea;overflow:hidden;min-width:65px}.tf-workload span{height:100%;display:block;border-radius:9px;background:#68a18a}.tf-bars{height:160px;display:flex;align-items:flex-end;gap:12px;padding:14px 8px 0;border-bottom:1px solid var(--tf-line)}.tf-bar-col{height:100%;flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:7px}.tf-bar{width:min(32px,70%);background:#b5d8c8;border-radius:6px 6px 2px 2px;position:relative;min-height:6px}.tf-bar:nth-child(odd){background:#82b7a1}.tf-bar-label{font-size:8px;color:var(--tf-muted)}.tf-ops-note{display:flex;align-items:flex-start;gap:10px;padding:13px;border-radius:10px;background:#f8f0e5;color:#85633e;font-size:10px;line-height:1.6}.tf-ops-note svg{flex:none}.tf-table-wrap{overflow-x:auto}.tf-creator-tag{display:flex;align-items:center;gap:7px;color:#4c6164;font-size:10px}.tf-avatar{width:29px;height:29px;flex:none;border-radius:10px;display:grid;place-items:center;font-size:9px;font-weight:800;color:#36564e;background:#dcece2}.tf-avatar-peach{background:#f2e2d3;color:#815e43}.tf-avatar-blue{background:#dfe9ee;color:#4f6979}
        @keyframes tf-notice{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:980px){.tf-sidebar{width:205px}.tf-main{padding:24px}.tf-content-grid{grid-template-columns:minmax(0,1fr) minmax(220px,.75fr)}.tf-task-layout{grid-template-columns:minmax(0,1fr) 270px}.tf-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tf-triage-card{grid-template-columns:minmax(160px,1.2fr) minmax(90px,.7fr) minmax(90px,.7fr) auto}.tf-triage-card .tf-hide-tablet{display:none}}
        @media(max-width:720px){.tf-topbar{height:auto;min-height:64px;padding:12px 16px;flex-wrap:wrap}.tf-brand{font-size:18px}.tf-demo-chip{font-size:9px;padding:6px 9px}.tf-top-actions{gap:8px}.tf-top-link,.tf-top-divider{display:none}.tf-role-switch button{padding:7px 9px;font-size:10px}.tf-layout{display:block}.tf-sidebar{display:none}.tf-main{padding:22px 15px 35px}.tf-main-head{align-items:flex-start}.tf-greeting{font-size:24px}.tf-mobile-nav{display:flex;gap:6px;overflow-x:auto;padding:10px 14px;background:#fbfcfa;border-bottom:1px solid var(--tf-line)}.tf-mobile-nav button{white-space:nowrap;border:0;border-radius:8px;padding:8px 10px;background:transparent;color:#68777b;font-size:10px;font-weight:800}.tf-mobile-nav button[aria-current=page]{background:#e6f1ec;color:#276d5f}.tf-content-grid{grid-template-columns:1fr}.tf-task-layout{grid-template-columns:1fr}.tf-task-detail{position:relative}.tf-stat-row{gap:8px}.tf-stat{padding:12px}.tf-stat-value{font-size:20px}.tf-kpi-grid{gap:8px}.tf-kpi{padding:12px}.tf-list-row{grid-template-columns:minmax(160px,1fr) 95px 30px}.tf-list-row>*:nth-child(3),.tf-list-row>*:nth-child(4){display:none}.tf-list-head>*:nth-child(3),.tf-list-head>*:nth-child(4){display:none}.tf-triage-card{grid-template-columns:minmax(150px,1fr) 90px auto;gap:8px;padding:11px}.tf-triage-card .tf-hide-tablet{display:none}.tf-section-title{margin-bottom:14px}.tf-task-due{display:none}}
        @media(max-width:410px){.tf-demo-chip{order:3;width:100%;justify-content:center}.tf-topbar{gap:8px}.tf-role-switch button{padding:6px 7px}.tf-main-head{display:block}.tf-date{margin-top:12px}.tf-stat-row{grid-template-columns:1fr 1fr}.tf-stat:last-child{grid-column:span 2}.tf-list-row{padding:12px}.tf-triage-card{grid-template-columns:1fr auto}.tf-triage-card>*:nth-child(2){display:none}}
        @media(prefers-reduced-motion:reduce){.taskflow-demo *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
      `}</style>
      <div className="tf-shell">
        <header className="tf-topbar">
          <Link href="/" className="tf-brand" style={{ color: "inherit", textDecoration: "none" }} aria-label="Return to the TaskFlow storefront"><span className="tf-brand-mark"><ArrowUpRight size={18} strokeWidth={2.7}/></span><span>taskflow<span className="tf-brand-dot">.</span></span></Link>
          <div className="tf-demo-chip" data-testid="status-demo-disclosure"><span/>Sample data · Demo mode</div>
          <div className="tf-top-actions">
            <button className="tf-top-link" type="button" onClick={() => setNotice("Help is part of this local product preview.")}><LifeBuoy size={15}/> Help</button>
            <span className="tf-top-divider"/>
            <div className="tf-role-switch" role="group" aria-label="Choose demo perspective">
              {(["Client", "Creator", "Admin"] as Role[]).map((item) => <button type="button" key={item} aria-pressed={role === item} onClick={() => switchRole(item)} data-testid={`button-role-${item.toLowerCase()}`}>{item}</button>)}
            </div>
          </div>
        </header>
        <div className="tf-layout">
          <aside className="tf-sidebar">
            <div className="tf-workspace-label">Workspace / {role}</div>
            <div className="tf-side-project"><span className="tf-project-mark" style={{ background: project.color }}>{project.mark}</span><div><strong>{role === "Admin" ? "Studio operations" : project.client}</strong><small>{role === "Creator" ? "Creator workspace" : role === "Admin" ? "Agency workspace" : "Client workspace"}</small></div><ChevronDown size={14} style={{ marginLeft: "auto", color: "#a7b8b5" }}/></div>
            <nav className="tf-nav" aria-label={`${role} workspace`}>
              {roleNav.map(({ key, label, icon: Icon }) => <button type="button" key={key} aria-current={page === key ? "page" : undefined} onClick={() => { setPage(key); setNotice(""); }} data-testid={`nav-${key}`}><Icon className="tf-nav-icon"/>{label}{key === "messages" && <span className="tf-nav-count">2</span>}</button>)}
            </nav>
            <div className="tf-sidebar-foot"><div className="tf-demo-note"><ShieldCheck size={16}/><span>Preview workspace<br/>Nothing here changes a real account.</span></div></div>
          </aside>
          <main className="tf-main">
            <nav className="tf-mobile-nav" aria-label={`${role} workspace pages`}>
              {roleNav.map(({ key, label }) => <button key={key} type="button" aria-current={page === key ? "page" : undefined} onClick={() => setPage(key)}>{label}</button>)}
            </nav>
            <div className="tf-main-inner">
              {role === "Client" && page === "overview" && <ClientOverview project={project} onPage={setPage} onProject={setSelectedProject}/>}
              {role === "Client" && page === "deliverables" && <Deliverables project={project} onProject={setSelectedProject} statusFor={statusFor} onToggle={setTaskStatus}/>}
              {role === "Client" && page === "brand" && <BrandContext project={project}/>}
              {page === "messages" && <Messages role={role} messages={messages} draft={draft} setDraft={setDraft} onSend={sendMessage}/>}
              {role === "Creator" && page === "tasks" && <CreatorTasks tasks={visibleTasks} selectedTask={task} statusFor={statusFor} onSelect={setSelectedTask} onToggle={setTaskStatus} search={search} setSearch={setSearch}/>}
              {role === "Creator" && page === "queue" && <DeliveryQueue statusFor={statusFor} onToggle={setTaskStatus} onSelect={(id) => { setSelectedTask(id); setPage("tasks"); }}/>}
              {role === "Admin" && page === "overview" && <AdminOverview onPage={setPage}/>}
              {role === "Admin" && page === "projects" && <ProjectTriage projectId={selectedProject} onSelect={setSelectedProject}/>}
              {role === "Admin" && page === "team" && <TeamWorkload/>}
              {role === "Admin" && page === "revenue" && <RevenueView/>}
            </div>
          </main>
        </div>
      </div>
      {notice && <div className="tf-notice" role="status" onAnimationEnd={() => {}}>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")} style={{ border: 0, background: "transparent", color: "#b8d5cb", marginLeft: 10, cursor: "pointer" }}>Dismiss</button></div>}
    </div>
  );
}

function ClientOverview({ project, onPage, onProject }: { project: typeof projects[number]; onPage: (page: PageKey) => void; onProject: (id: string) => void }) {
  return <>
    <div className="tf-main-head"><div><p className="tf-eyebrow">Client workspace</p><h1 className="tf-greeting">Good morning, Lena.</h1><p className="tf-greeting-sub">Your work, in motion. Here’s the latest on your launch.</p></div><div className="tf-date"><CalendarDays size={14}/> {todayLabel}</div></div>
    <div className="tf-content-grid">
      <div className="tf-stack">
        <section className="tf-card tf-project-hero">
          <div className="tf-hero-banner"><div className="tf-project-label">{project.category} · {project.client}</div><div className="tf-hero-title">{project.name}</div></div>
          <div className="tf-hero-body">
            <div className="tf-progress-head"><span>Project progress</span><strong>{project.progress}%</strong></div><div className="tf-progress" aria-label={`Project ${project.progress}% complete`}><span style={{ width: `${project.progress}%` }}/></div>
            <div className="tf-milestones"><div className="tf-milestone"><small>Kickoff</small><strong><Check size={12} style={{ color: "#428269", verticalAlign: "middle", marginRight: 4 }}/>Complete</strong></div><div className="tf-milestone"><small>Production</small><strong>In progress</strong></div><div className="tf-milestone"><small>Final delivery</small><strong>{project.due}</strong></div></div>
          </div>
        </section>
        <div className="tf-stat-row">
          <div className="tf-card tf-stat"><div className="tf-stat-head">Active deliverables<span className="tf-stat-icon"><FileImage size={14}/></span></div><div className="tf-stat-value">4</div><div className="tf-stat-caption">2 ready for your review</div></div>
          <div className="tf-card tf-stat"><div className="tf-stat-head">Next milestone<span className="tf-stat-icon"><Clock3 size={14}/></span></div><div className="tf-stat-value" style={{ fontSize: 18 }}>{project.due}</div><div className="tf-stat-caption">First-round review</div></div>
          <div className="tf-card tf-stat"><div className="tf-stat-head">Project health<span className="tf-stat-icon"><Activity size={14}/></span></div><div className="tf-stat-value" style={{ fontSize: 18, color: "#39745f" }}>On track</div><div className="tf-stat-caption">Updated 12 minutes ago</div></div>
        </div>
        <section className="tf-card tf-card-pad">
          <SectionTitle title="Recent deliverables" detail="A quick look at what’s moving." action={<button className="tf-inline-link" onClick={() => onPage("deliverables")}>All deliverables <ArrowRight size={13}/></button>}/>
          <DeliverableRow icon={<Video size={16}/>} title="Launch film — first cut" meta="MP4 · 00:30 · Added today" badge="In review" tone="amber"/>
          <DeliverableRow icon={<FileImage size={16}/>} title="Campaign stills — set 01" meta="6 files · Added yesterday" badge="Ready" tone="green"/>
          <DeliverableRow icon={<FileText size={16}/>} title="Launch messaging framework" meta="PDF · Updated last week" badge="Approved" tone="blue"/>
        </section>
      </div>
      <div className="tf-stack">
        <section className="tf-card tf-card-pad">
          <SectionTitle eyebrow="Your projects" title="Project spaces"/>
          {projects.map((item) => <button key={item.id} type="button" className="tf-deliverable" onClick={() => onProject(item.id)} style={{ width: "100%", textAlign: "left", border: 0, background: "transparent", cursor: "pointer" }} data-testid={`select-project-${item.id}`}>
            <span className="tf-project-mark" style={{ background: item.color, width: 34, height: 34, borderRadius: 10 }}>{item.mark}</span><span className="tf-deliverable-copy"><strong>{item.name}</strong><small>{item.client} · {item.progress}% complete</small></span><ArrowRight size={14} color="#83918c"/>
          </button>)}
        </section>
        <section className="tf-card tf-card-pad">
          <SectionTitle title="Brand context" action={<button className="tf-inline-link" onClick={() => onPage("brand")}>Open vault <ArrowRight size={13}/></button>}/>
          <BrandPreview/>
        </section>
        <section className="tf-card tf-card-pad">
          <SectionTitle title="A note from your team" action={<button className="tf-inline-link" onClick={() => onPage("messages")}>View thread <ArrowRight size={13}/></button>}/>
          <div className="tf-activity-item"><Avatar initials="MC"/><div><p><strong>Mira Chen</strong> shared a new film cut for your review.</p><small>12 minutes ago · Northstar launch</small></div></div>
        </section>
      </div>
    </div>
  </>;
}

function DeliverableRow({ icon, title, meta, badge, tone }: { icon: ReactNode; title: string; meta: string; badge: string; tone: "green" | "amber" | "blue" }) {
  return <div className="tf-deliverable"><span className="tf-file-icon">{icon}</span><span className="tf-deliverable-copy"><strong>{title}</strong><small>{meta}</small></span><Badge tone={tone}>{badge}</Badge></div>;
}

function BrandPreview() {
  return <div className="tf-brand-block"><p className="tf-mini-heading">Northstar visual system</p><div className="tf-brand-swatches"><span className="tf-swatch" style={{ background: "#263c3a" }}/><span className="tf-swatch" style={{ background: "#d3a76f" }}/><span className="tf-swatch" style={{ background: "#e8e2d4" }}/><span className="tf-swatch" style={{ background: "#8d9a82" }}/></div><p className="tf-brand-copy">Warm, grounded, and quietly optimistic. Natural light; useful details; no over-polish.</p></div>;
}

function Deliverables({ project, onProject, statusFor, onToggle }: { project: typeof projects[number]; onProject: (id: string) => void; statusFor: (id: string) => Status; onToggle: (id: string) => void }) {
  return <><div className="tf-main-head"><div><p className="tf-eyebrow">Client workspace / Deliverables</p><h1 className="tf-greeting">Made for your launch.</h1><p className="tf-greeting-sub">Review the files and follow each piece through delivery.</p></div><select className="tf-project-select" aria-label="Choose project" value={project.id} onChange={(event) => onProject(event.target.value)}><option value="northstar">Northstar launch</option><option value="fieldnotes">Fieldnotes social</option><option value="daylight">Daylight refresh</option></select></div>
    <section className="tf-card tf-card-pad"><SectionTitle title={`${project.name} deliverables`} detail="Select a status to preview the workflow. Changes stay in this demo."/>
      {tasks.filter((item) => item.projectId === project.id).map((item) => <div key={item.id} className="tf-deliverable"><span className="tf-file-icon">{item.type === "Video" ? <Video size={16}/> : <FileImage size={16}/>}</span><span className="tf-deliverable-copy"><strong>{item.title}</strong><small>{item.type} · Due {item.due} · {item.assignee}</small></span><button className="tf-secondary-button" onClick={() => onToggle(item.id)} aria-label={`Change status for ${item.title}`}><Badge tone={statusFor(item.id) === "Approved" ? "green" : statusFor(item.id) === "In review" ? "amber" : "blue"}>{statusFor(item.id)}</Badge><ChevronDown size={12}/></button></div>)}
      <DeliverableRow icon={<FileText size={16}/>} title="Launch messaging framework" meta="PDF · 12 pages · Added last week" badge="Approved" tone="green"/>
    </section>
    <div className="tf-content-grid" style={{ marginTop: 16 }}><section className="tf-card tf-card-pad"><SectionTitle title="Review, without the back-and-forth" detail="The latest work is always attached to its project context."/><div className="tf-activity"><div className="tf-activity-item"><span className="tf-activity-icon"><CheckCircle2 size={14}/></span><p><strong>Round one approved</strong><small>Earlier this week · Messaging framework</small></p></div><div className="tf-activity-item"><span className="tf-activity-icon"><FileImage size={14}/></span><p><strong>New cut uploaded</strong><small>Today · Launch film first cut</small></p></div></div></section><section className="tf-card tf-card-pad"><SectionTitle title="Delivery details"/><div className="tf-context-row"><span>Working files</span><strong>Included</strong></div><div className="tf-context-row"><span>Delivery format</span><strong>MP4, PNG, PDF</strong></div><div className="tf-context-row"><span>Next review</span><strong>{project.due}</strong></div></section></div>
  </>;
}

function BrandContext({ project }: { project: typeof projects[number] }) {
  return <><div className="tf-main-head"><div><p className="tf-eyebrow">Client workspace / Brand context</p><h1 className="tf-greeting">A shared point of view.</h1><p className="tf-greeting-sub">The context your production team uses to keep every piece feeling like you.</p></div><Badge tone="green">Shared with team</Badge></div>
    <div className="tf-content-grid"><div className="tf-stack"><section className="tf-card tf-card-pad"><SectionTitle eyebrow="Brand vault" title={`${project.client} visual system`} detail="A considered foundation for the work in this workspace."/><BrandPreview/><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}><div className="tf-brand-block"><p className="tf-eyebrow">Type direction</p><p className="tf-mini-heading" style={{ fontSize: 20 }}>Warm utility</p><p className="tf-brand-copy">Clear, human typography. Prefer a little character over rigid geometry.</p></div><div className="tf-brand-block"><p className="tf-eyebrow">Image direction</p><p className="tf-mini-heading">Natural light</p><p className="tf-brand-copy">Real materials, quiet composition, daylight that feels lived-in.</p></div></div></section><section className="tf-card tf-card-pad"><SectionTitle title="Voice notes"/><p className="tf-brand-copy">Thoughtful, useful, and unhurried. Make the reader feel invited in, not sold to. Keep sentences simple and specific.</p><div className="tf-context-row"><span>Say</span><strong>“Made for everyday rituals.”</strong></div><div className="tf-context-row"><span>Skip</span><strong>“Revolutionary, game-changing.”</strong></div></section></div>
      <div className="tf-stack"><section className="tf-card tf-card-pad"><SectionTitle title="Project brief"/><p className="tf-brand-copy">Introduce the Northstar collection through a compact launch story: the objects, the people who make them, and the small rituals they belong to.</p><div className="tf-context-row"><span>Audience</span><strong>Curious home cooks</strong></div><div className="tf-context-row"><span>Primary channel</span><strong>Social + product page</strong></div><div className="tf-context-row"><span>Success looks like</span><strong>Useful, unmistakable work</strong></div></section><section className="tf-card tf-card-pad"><SectionTitle title="Shared references"/><DeliverableRow icon={<FileImage size={16}/>} title="Northstar moodboard" meta="8 references · Updated last week" badge="Current" tone="green"/><DeliverableRow icon={<FileText size={16}/>} title="Product language notes" meta="Brief · 2 pages" badge="Current" tone="green"/></section></div>
    </div>
  </>;
}

function Messages({ role, messages, draft, setDraft, onSend }: { role: Role; messages: typeof initialMessages; draft: string; setDraft: (value: string) => void; onSend: () => void }) {
  return <><div className="tf-main-head"><div><p className="tf-eyebrow">{role} workspace / Conversation</p><h1 className="tf-greeting">{role === "Creator" ? "Project notes." : "The work, in context."}</h1><p className="tf-greeting-sub">A shared thread for decisions, references, and the next useful step.</p></div><Badge tone="green">Northstar launch</Badge></div>
    <div className="tf-content-grid"><section className="tf-card tf-card-pad"><SectionTitle title="Launch film — first cut" detail="Lena Park · Mira Chen · TaskFlow team"/>
      <div className="tf-message-list" aria-live="polite">{messages.map((message, index) => <div className={cx("tf-message", message.role === role && "is-own")} key={`${message.time}-${index}`}><Avatar initials={message.role === "Client" ? "LP" : message.role === "Creator" ? "MC" : "TF"} tint={message.role === "Creator" ? "sage" : message.role === "Admin" ? "blue" : "peach"}/><div className="tf-message-body"><div className="tf-message-meta"><strong>{message.by}</strong><span>·</span><span>{message.time}</span></div><div className="tf-message-bubble">{message.text}</div></div></div>)}</div>
      <form className="tf-message-form" onSubmit={(event) => { event.preventDefault(); onSend(); }}><input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="Write a message" placeholder="Add a note to this demo thread…"/><button className="tf-primary-button" type="submit" disabled={!draft.trim()} style={{ opacity: draft.trim() ? 1 : .55 }}><Send size={13}/> Send</button></form>
    </section><div className="tf-stack"><section className="tf-card tf-card-pad"><SectionTitle title="Thread context"/><div className="tf-activity-item"><span className="tf-activity-icon"><Video size={14}/></span><div><p><strong>Launch film — 30 sec cut</strong></p><small>In production · Due today</small></div></div><div className="tf-context-row"><span>Project</span><strong>Northstar launch</strong></div><div className="tf-context-row"><span>Review window</span><strong>{projects[0].due}</strong></div></section><section className="tf-ops-note"><Sparkles size={15}/><span><strong>Demo thread</strong><br/>Messages are kept only in local page state. They won’t be sent to a real team.</span></section></div></div>
  </>;
}

function CreatorTasks({ tasks: filteredTasks, selectedTask, statusFor, onSelect, onToggle, search, setSearch }: { tasks: typeof tasks; selectedTask: typeof tasks[number]; statusFor: (id: string) => Status; onSelect: (id: string) => void; onToggle: (id: string) => void; search: string; setSearch: (value: string) => void }) {
  return <><div className="tf-main-head"><div><p className="tf-eyebrow">Creator workspace / Production</p><h1 className="tf-greeting">Your production board.</h1><p className="tf-greeting-sub">A clear run at the work in front of you, with the brief close by.</p></div><button className="tf-secondary-button" onClick={() => setSearch("")}><CalendarDays size={13}/>This week <ChevronDown size={12}/></button></div>
    <div className="tf-kpi-grid"><Kpi label="Assigned to you" value="4" trend="Across 3 projects"/><Kpi label="Due today" value="1" trend="Launch film cut"/><Kpi label="In review" value="1" trend="Awaiting client notes"/><Kpi label="This week" value="$1,640" trend="Production value"/></div>
    <div className="tf-task-layout"><section className="tf-card tf-list">
      <div className="tf-section-title" style={{ padding: "17px 17px 0" }}><div><h2>Assigned production</h2><p className="tf-detail">Select a task to open its brief and delivery controls.</p></div><label className="tf-search-box"><Search size={13}/><input className="tf-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" aria-label="Search production tasks"/></label></div>
      {filteredTasks.length ? filteredTasks.map((item) => <div role="button" tabIndex={0} className="tf-task-row" aria-selected={selectedTask.id === item.id} key={item.id} onClick={() => onSelect(item.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(item.id); }} data-testid={`task-row-${item.id}`}><span className="tf-task-check">{item.type === "Video" ? <Video size={15}/> : <FileImage size={15}/>}</span><span className="tf-task-name"><strong>{item.title}</strong><small>{item.project} · {item.type}</small></span><span className="tf-task-due">{item.due}</span><Badge tone={statusFor(item.id) === "In review" ? "amber" : statusFor(item.id) === "Approved" ? "green" : "blue"}>{statusFor(item.id)}</Badge></div>) : <div style={{ padding: 28, textAlign: "center", color: "var(--tf-muted)" }}>No tasks match that search. Try another title or project.</div>}
    </section>
    <aside className="tf-card tf-task-detail"><div className="tf-detail-art"><Video size={31} strokeWidth={1.4}/></div><p className="tf-eyebrow">{selectedTask.type} / {selectedTask.project}</p><h2 className="tf-detail-task-title">{selectedTask.title}</h2><p className="tf-detail-description">Cut a concise, tactile launch film. Lead with the late-afternoon kitchen scene; leave room for the product to feel useful, not staged.</p><div className="tf-meta-line"><span>Due</span><strong>{selectedTask.due}</strong></div><div className="tf-meta-line"><span>Client contact</span><strong>Lena Park</strong></div><div className="tf-meta-line"><span>Delivery</span><strong>MP4 · 1080 × 1920</strong></div><div className="tf-meta-line"><span>Status</span><Badge tone="blue">{statusFor(selectedTask.id)}</Badge></div><button className="tf-primary-button" style={{ width: "100%", marginTop: 13 }} onClick={() => onToggle(selectedTask.id)}><CheckCircle2 size={14}/>{statusFor(selectedTask.id) === "In progress" ? "Send to review" : "Advance sample status"}</button><p className="tf-detail-description" style={{ marginBottom: 0, textAlign: "center" }}>Status controls only change this preview.</p></aside></div>
  </>;
}

function Kpi({ label, value, trend }: { label: string; value: string; trend: string }) {
  return <div className="tf-card tf-kpi"><div className="tf-kpi-label">{label}<ArrowUpRight size={13}/></div><div className="tf-kpi-value">{value}</div><div className="tf-kpi-trend">{trend}</div></div>;
}

function DeliveryQueue({ statusFor, onToggle, onSelect }: { statusFor: (id: string) => Status; onToggle: (id: string) => void; onSelect: (id: string) => void }) {
  const reviewTasks = tasks.filter((item) => statusFor(item.id) === "In review" || statusFor(item.id) === "In progress");
  return <><div className="tf-main-head"><div><p className="tf-eyebrow">Creator workspace / Delivery queue</p><h1 className="tf-greeting">Close the loop.</h1><p className="tf-greeting-sub">Everything moving toward a client handoff, in one place.</p></div><Badge tone="amber">{reviewTasks.length} active</Badge></div>
    <div className="tf-content-grid"><section className="tf-card tf-card-pad"><SectionTitle title="Needs your next step" detail="Advance a sample status to explore the handoff."/>
      {reviewTasks.map((item) => <div key={item.id} className="tf-deliverable"><span className="tf-file-icon">{item.type === "Video" ? <Video size={16}/> : <FileImage size={16}/>}</span><span className="tf-deliverable-copy"><strong>{item.title}</strong><small>{item.project} · Due {item.due}</small></span><button className="tf-secondary-button" onClick={() => onToggle(item.id)}><Badge tone={statusFor(item.id) === "In review" ? "amber" : "blue"}>{statusFor(item.id)}</Badge><ChevronDown size={12}/></button><button className="tf-row-button" onClick={() => onSelect(item.id)} aria-label={`Open ${item.title}`}><ArrowRight size={15}/></button></div>)}
    </section><div className="tf-stack"><section className="tf-card tf-card-pad"><SectionTitle title="Delivery checklist"/><div className="tf-activity"><div className="tf-activity-item"><span className="tf-activity-icon"><Check size={13}/></span><p><strong>File naming and format</strong><small>Check exports against project brief</small></p></div><div className="tf-activity-item"><span className="tf-activity-icon"><Check size={13}/></span><p><strong>Client notes addressed</strong><small>Keep relevant context attached</small></p></div><div className="tf-activity-item"><span className="tf-activity-icon"><Clock3 size={13}/></span><p><strong>Handoff message</strong><small>Include a clear review request</small></p></div></div></section><div className="tf-ops-note"><ShieldCheck size={15}/><span>Use the status control to preview progress. No files are uploaded in this sample workspace.</span></div></div></div>
  </>;
}

function AdminOverview({ onPage }: { onPage: (page: PageKey) => void }) {
  return <><div className="tf-main-head"><div><p className="tf-eyebrow">Agency operations / Current week</p><h1 className="tf-greeting">Good morning, team.</h1><p className="tf-greeting-sub">A focused view of the work, the people, and what needs attention.</p></div><button className="tf-secondary-button" onClick={() => onPage("projects")}><FolderKanban size={13}/>Triage projects <ArrowRight size={12}/></button></div>
    <div className="tf-kpi-grid"><Kpi label="Active projects" value="12" trend="3 need a next step"/><Kpi label="Team capacity" value="74%" trend="Healthy this week"/><Kpi label="Month to date" value="$18.4k" trend="↑ 8.6% vs last month"/><Kpi label="Waiting on client" value="3" trend="Oldest: 1.4 days"/></div>
    <div className="tf-content-grid"><div className="tf-stack">
      <section className="tf-card tf-card-pad"><SectionTitle title="Project triage" detail="A shortlist of the work that could use a little attention." action={<button className="tf-inline-link" onClick={() => onPage("projects")}>View all <ArrowRight size={13}/></button>}/><ProjectTriageRows compact/></section>
      <section className="tf-card tf-card-pad"><SectionTitle title="Team capacity this week" action={<button className="tf-inline-link" onClick={() => onPage("team")}>Team view <ArrowRight size={13}/></button>}/><MiniTeam/></section>
    </div><div className="tf-stack">
      <section className="tf-card tf-card-pad"><SectionTitle title="Revenue snapshot" action={<button className="tf-inline-link" onClick={() => onPage("revenue")}>Details <ArrowRight size={13}/></button>}/><div className="tf-kpi-value" style={{ marginTop: 3 }}>$18,420</div><div className="tf-kpi-trend"><ArrowUpRight size={12}/> 8.6% compared to May</div><RevenueBars/><div className="tf-context-row"><span>Booked this month</span><strong>$24,680</strong></div><div className="tf-context-row"><span>Awaiting approval</span><strong>$3,250</strong></div></section>
      <section className="tf-card tf-card-pad"><SectionTitle title="Operations pulse"/><div className="tf-activity"><div className="tf-activity-item"><span className="tf-activity-icon"><MessageCircle size={14}/></span><p><strong>3 conversations</strong><small>One client has been waiting 1.4 days</small></p></div><div className="tf-activity-item"><span className="tf-activity-icon"><CheckCircle2 size={14}/></span><p><strong>5 deliverables approved</strong><small>Since the start of this week</small></p></div></div></section>
    </div></div>
  </>;
}

function ProjectTriage({ projectId, onSelect }: { projectId: string; onSelect: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredProjects = projects.filter((item) => `${item.name} ${item.client}`.toLowerCase().includes(searchTerm.toLowerCase()));
  return <><div className="tf-main-head"><div><p className="tf-eyebrow">Agency operations / Projects</p><h1 className="tf-greeting">Keep the work unblocked.</h1><p className="tf-greeting-sub">Triage deadlines, client review, and production capacity.</p></div><button className="tf-primary-button" onClick={() => onSelect("northstar")}><FolderKanban size={14}/>Focus Northstar</button></div>
    <div className="tf-kpi-grid"><Kpi label="Active" value="12" trend="Across 8 clients"/><Kpi label="At risk" value="2" trend="Needs a decision"/><Kpi label="Awaiting review" value="3" trend="One past due"/><Kpi label="Delivered this month" value="17" trend="Across 6 projects"/></div>
    <section className="tf-card tf-card-pad"><SectionTitle title="Project triage" detail="Select a row to focus the sample workspace project." action={<label className="tf-search-box"><Search size={13}/><input className="tf-search-input" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Find project" aria-label="Find project"/></label>}/>{filteredProjects.length ? <ProjectTriageRows projectsToShow={filteredProjects} projectId={projectId} onSelect={onSelect}/> : <div style={{ padding: 20, color: "var(--tf-muted)", fontSize: 11 }}>No project matches that search.</div>}</section>
  </>;
}

function ProjectTriageRows({ compact = false, projectsToShow, projectId, onSelect }: { compact?: boolean; projectsToShow?: typeof projects; projectId?: string; onSelect?: (id: string) => void }) {
  const rows = projectsToShow ?? (compact ? [projects[0], projects[2]] : projects);
  return <div className="tf-project-triage">{rows.map((item, index) => <button key={item.id} className="tf-triage-card" type="button" onClick={() => onSelect?.(item.id)} style={{ width: "100%", textAlign: "left", cursor: onSelect ? "pointer" : "default", borderColor: projectId === item.id ? "#84b4a0" : undefined }} data-testid={`triage-project-${item.id}`}><span className="tf-row-main"><span className="tf-project-mark" style={{ background: item.color, width: 31, height: 31, borderRadius: 9 }}>{item.mark}</span><span><strong>{item.name}</strong><small>{item.client}</small></span></span><span className="tf-row-secondary">{item.due}</span><span className="tf-row-secondary tf-hide-tablet"><Badge tone={index === 1 ? "amber" : "green"}>{index === 1 ? "Review overdue" : "On track"}</Badge></span><span className="tf-row-secondary tf-hide-tablet">{item.progress}%</span><ArrowRight size={14} color="#82918c"/></button>)}</div>;
}

function MiniTeam() {
  const people = [{ name: "Mira Chen", role: "Video & motion", initials: "MC", load: 78, tint: "sage" as const }, { name: "Alex Rivera", role: "Design", initials: "AR", load: 64, tint: "peach" as const }, { name: "Jo Ellis", role: "Copy & content", initials: "JE", load: 51, tint: "blue" as const }];
  return <div className="tf-stack" style={{ gap: 12 }}>{people.map((person) => <div key={person.name} className="tf-team-person"><Avatar initials={person.initials} tint={person.tint}/><span style={{ flex: 1 }}><strong>{person.name}</strong><small>{person.role}</small></span><span className="tf-workload"><span style={{ width: `${person.load}%` }}/></span><small style={{ width: 28, textAlign: "right", color: "var(--tf-muted)", fontSize: 9 }}>{person.load}%</small></div>)}</div>;
}

function TeamWorkload() {
  return <><div className="tf-main-head"><div><p className="tf-eyebrow">Agency operations / Team</p><h1 className="tf-greeting">Capacity with context.</h1><p className="tf-greeting-sub">See who has room, and where projects are concentrating.</p></div><button className="tf-secondary-button" onClick={() => window.alert("This is a sample team roster. No invitation is sent.")}><Plus size={14}/>Invite teammate</button></div>
    <div className="tf-kpi-grid"><Kpi label="Available this week" value="26h" trend="Across 3 creators"/><Kpi label="Avg. utilization" value="64%" trend="Comfortable range"/><Kpi label="Due in 48 hours" value="3" trend="One client review"/><Kpi label="Open assignments" value="7" trend="2 unassigned"/></div>
    <div className="tf-content-grid"><section className="tf-card tf-card-pad"><SectionTitle title="Team workload" detail="Current planned capacity against a 40-hour week."/><MiniTeam/><div className="tf-context-row"><span>Average planned time</span><strong>25.6 / 40 hours</strong></div></section><section className="tf-card tf-card-pad"><SectionTitle title="Unassigned work"/>{tasks.filter((item) => item.assignee === "Alex Rivera").map((item) => <div className="tf-deliverable" key={item.id}><span className="tf-file-icon"><FileImage size={15}/></span><span className="tf-deliverable-copy"><strong>{item.title}</strong><small>{item.project} · {item.due}</small></span><Badge tone="amber">Review</Badge></div>)}<div className="tf-ops-note" style={{ marginTop: 14 }}><Activity size={15}/><span>Sample workloads are illustrative and do not reflect real creator availability.</span></div></section></div>
  </>;
}

function RevenueBars() {
  const values = [42, 55, 49, 68, 62, 83];
  const bars = values.map((value, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - values.length + index + 1);
    return { m: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date), v: value };
  });
  return <div className="tf-bars" aria-label="Monthly revenue chart">{bars.map((bar) => <div key={bar.m} className="tf-bar-col"><div className="tf-bar" style={{ height: `${bar.v}%` }}/><span className="tf-bar-label">{bar.m}</span></div>)}</div>;
}

function RevenueView() {
  return <><div className="tf-main-head"><div><p className="tf-eyebrow">Agency operations / Revenue</p><h1 className="tf-greeting">A steadier view of revenue.</h1><p className="tf-greeting-sub">Booked work and approvals, without losing sight of the details.</p></div><button className="tf-secondary-button" onClick={() => window.alert("Sample report prepared locally. No file was exported.")}><FileText size={14}/>Export report</button></div>
    <div className="tf-kpi-grid"><Kpi label="Month to date" value="$18,420" trend="↑ 8.6% vs previous month"/><Kpi label="Booked" value="$24,680" trend="7 active projects"/><Kpi label="Awaiting approval" value="$3,250" trend="Across 3 deliverables"/><Kpi label="Avg. project value" value="$3,480" trend="Last 90 days"/></div>
    <div className="tf-content-grid"><section className="tf-card tf-card-pad"><SectionTitle title="Monthly revenue" detail="Recognized revenue · last six months"/><RevenueBars/><div className="tf-context-row"><span>Monthly target</span><strong>$22,000 · 83.7%</strong></div></section><section className="tf-card tf-card-pad"><SectionTitle title="Recent booked work"/>{projects.map((item) => <div key={item.id} className="tf-deliverable"><span className="tf-project-mark" style={{ background: item.color, width: 34, height: 34, borderRadius: 10 }}>{item.mark}</span><span className="tf-deliverable-copy"><strong>{item.name}</strong><small>{item.client} · Active</small></span><strong style={{ fontSize: 10 }}>{item.budget}</strong></div>)}</section></div>
    <section className="tf-card tf-card-pad" style={{ marginTop: 16 }}><SectionTitle title="Operations note" detail="The numbers shown are local sample figures for a realistic product preview."/><div className="tf-ops-note"><Wallet size={15}/><span>Booked value reflects the full agreed scope; recognized revenue reflects completed milestone billing. No real transactions or financial records are connected here.</span></div></section>
  </>;
}
