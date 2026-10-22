export type TaskflowCatalogItem = {
  slug: string;
  name: string;
  priceCents: number;
  scopePriceCents: number[];
  options: string[];
  soon?: boolean;
};

export type TaskflowTemplateTask = {
  key: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
  dueOffsetDays: number;
  archived?: boolean;
};

export type TaskflowServiceTemplate = {
  key: string;
  defaultPriority: "low" | "normal" | "high";
  defaultDueOffsetDays: number;
  tasks: TaskflowTemplateTask[];
  deliverables: Array<{
    key: string;
    title: string;
    description: string;
    defaultPriority: "low" | "normal" | "high";
    dueOffsetDays: number;
    archived?: boolean;
  }>;
};

const scopePrices = (startingPriceCents: number): number[] => [
  startingPriceCents,
  Math.round(startingPriceCents * 1.45 / 500) * 500,
  Math.round(startingPriceCents * 2 / 500) * 500,
];

export const taskflowCatalog: TaskflowCatalogItem[] = [
  { slug: "paid-social-video-kit", name: "Paid social video kit", priceCents: 68000, scopePriceCents: scopePrices(68000), options: ["Starter · 3 concepts", "Growth · 6 concepts", "Scale · 10 concepts"] },
  { slug: "ugc-style-ad", name: "UGC-style product ad", priceCents: 42000, scopePriceCents: scopePrices(42000), options: ["One concept", "Three concepts", "Five concepts"] },
  { slug: "youtube-shorts-pack", name: "YouTube Shorts pack", priceCents: 26000, scopePriceCents: scopePrices(26000), options: ["3 Shorts", "5 Shorts", "10 Shorts"] },
  { slug: "founder-content-sprint", name: "Founder content sprint", priceCents: 54000, scopePriceCents: scopePrices(54000), options: ["12 posts", "20 posts", "30 posts"] },
  { slug: "social-post-pack", name: "Social post pack", priceCents: 18000, scopePriceCents: scopePrices(18000), options: ["5 posts", "10 posts", "20 posts"] },
  { slug: "content-calendar", name: "Content calendar", priceCents: 24000, scopePriceCents: scopePrices(24000), options: ["2 weeks", "1 month", "3 months"] },
  { slug: "caption-copy-pack", name: "Caption copy pack", priceCents: 12000, scopePriceCents: scopePrices(12000), options: ["10 captions", "25 captions", "50 captions"] },
  { slug: "conversion-landing-page", name: "Conversion landing page", priceCents: 125000, scopePriceCents: scopePrices(125000), options: ["Single page", "Page + thank-you", "Page + 2 variants"], soon: true },
  { slug: "brand-starter-system", name: "Brand starter system", priceCents: 98000, scopePriceCents: scopePrices(98000), options: ["Essential", "Standard", "Extended"] },
  { slug: "sales-deck-design", name: "Sales deck design", priceCents: 76000, scopePriceCents: scopePrices(76000), options: ["Up to 12 slides", "Up to 20 slides", "Up to 30 slides"] },
  { slug: "social-graphics-set", name: "Social graphics set", priceCents: 32000, scopePriceCents: scopePrices(32000), options: ["5 graphics", "10 graphics", "20 graphics"] },
  { slug: "thumbnail-pack", name: "Thumbnail pack", priceCents: 9500, scopePriceCents: scopePrices(9500), options: ["2 thumbnails", "5 thumbnails", "10 thumbnails"] },
  { slug: "workflow-automation-map", name: "Workflow automation map", priceCents: 88000, scopePriceCents: scopePrices(88000), options: ["One workflow", "Three workflows", "Team-wide audit"] },
  { slug: "lead-enquiry-workflow", name: "Lead enquiry workflow", priceCents: 64000, scopePriceCents: scopePrices(64000), options: ["Form + inbox", "Form + CRM handoff", "Full follow-up flow"] },
  { slug: "spreadsheet-automation", name: "Spreadsheet automation", priceCents: 52000, scopePriceCents: scopePrices(52000), options: ["One sheet", "Three sheets", "Team dashboard"] },
  { slug: "document-processing-flow", name: "Document processing flow", priceCents: 72000, scopePriceCents: scopePrices(72000), options: ["One document type", "Three document types", "Full intake flow"] },
  { slug: "website-build", name: "Website build", priceCents: 320000, scopePriceCents: scopePrices(320000), options: ["Marketing site", "Site + CMS", "Site + CMS + motion"], soon: true },
];

export const taskflowCatalogBySlug = new Map(taskflowCatalog.map((item) => [item.slug, item]));

const videoTasks: TaskflowTemplateTask[] = [
  { key: "brief", title: "Confirm brief and references", description: "Check the audience, message, format, and source assets.", priority: "high", dueOffsetDays: 1 },
  { key: "first-cut", title: "Prepare first cut", description: "Create the first creative pass for internal review.", priority: "normal", dueOffsetDays: 4 },
  { key: "revision", title: "Apply review changes", description: "Resolve approved customer feedback and prepare the final pass.", priority: "normal", dueOffsetDays: 6 },
  { key: "handoff", title: "Export and hand off final files", description: "Check filenames, formats, dimensions, and upload the final deliverable.", priority: "high", dueOffsetDays: 7 },
];
const contentTasks: TaskflowTemplateTask[] = [
  { key: "brief", title: "Confirm brief and voice", description: "Align on audience, tone, references, and content requirements.", priority: "high", dueOffsetDays: 1 },
  { key: "draft", title: "Draft the content batch", description: "Produce the first complete content pass.", priority: "normal", dueOffsetDays: 4 },
  { key: "edit", title: "Edit and format", description: "Polish the content and prepare platform-ready versions.", priority: "normal", dueOffsetDays: 6 },
  { key: "handoff", title: "Hand off the content pack", description: "Upload the final content and supporting notes.", priority: "high", dueOffsetDays: 7 },
];
const designTasks: TaskflowTemplateTask[] = [
  { key: "brief", title: "Confirm brief and visual direction", description: "Align on audience, references, dimensions, and brand constraints.", priority: "high", dueOffsetDays: 1 },
  { key: "concept", title: "Prepare first concept", description: "Create the first visual direction for review.", priority: "normal", dueOffsetDays: 4 },
  { key: "revision", title: "Apply review changes", description: "Resolve the approved feedback and finalize the design system.", priority: "normal", dueOffsetDays: 6 },
  { key: "handoff", title: "Package final assets", description: "Export, name, and upload the final design files.", priority: "high", dueOffsetDays: 7 },
];
const automationTasks: TaskflowTemplateTask[] = [
  { key: "discovery", title: "Map the current workflow", description: "Document inputs, owners, systems, and desired outcomes.", priority: "high", dueOffsetDays: 1 },
  { key: "build", title: "Build the workflow", description: "Configure the agreed automation and supporting assets.", priority: "normal", dueOffsetDays: 4 },
  { key: "test", title: "Test with real examples", description: "Run representative cases and resolve edge cases.", priority: "high", dueOffsetDays: 6 },
  { key: "handoff", title: "Document and hand off", description: "Upload the map, instructions, and final workflow files.", priority: "high", dueOffsetDays: 7 },
];
const webTasks: TaskflowTemplateTask[] = [
  { key: "discovery", title: "Confirm structure and content", description: "Align on pages, content, integrations, and acceptance criteria.", priority: "high", dueOffsetDays: 1 },
  { key: "build", title: "Build the agreed pages", description: "Implement the core experience and responsive states.", priority: "normal", dueOffsetDays: 4 },
  { key: "qa", title: "Run responsive QA", description: "Check links, forms, content, accessibility, and mobile layouts.", priority: "high", dueOffsetDays: 6 },
  { key: "handoff", title: "Publish and hand off", description: "Complete the launch checklist and provide handoff notes.", priority: "high", dueOffsetDays: 7 },
];

export function getTaskflowServiceTemplate(slug: string, serviceName: string): TaskflowServiceTemplate {
  const tasks = slug.includes("video") || slug.includes("ugc") || slug.includes("youtube") ? videoTasks
    : slug.includes("content") || slug.includes("caption") || slug.includes("social-post") ? contentTasks
      : slug.includes("brand") || slug.includes("deck") || slug.includes("graphic") || slug.includes("thumbnail") ? designTasks
        : slug.includes("website") ? webTasks : automationTasks;
  const deliverableTitle = serviceName.endsWith("pack") || serviceName.endsWith("kit") ? `${serviceName} files` : serviceName;
  return {
    key: slug,
    defaultPriority: "normal",
    defaultDueOffsetDays: 7,
    tasks: tasks.map((task) => ({ ...task, archived: false })),
    deliverables: [{
      key: `${slug}-final`,
      title: deliverableTitle,
      description: `Final files and handoff materials for ${serviceName}.`,
      defaultPriority: "high",
      dueOffsetDays: 7,
      archived: false,
    }],
  };
}