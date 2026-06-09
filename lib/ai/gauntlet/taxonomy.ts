import type { BusinessCategoryId } from "@/lib/ai/gauntlet/types";

export const PENDING_CATEGORY = "pending" as const;

export type TaxonomyEntry = {
  id: BusinessCategoryId;
  pillar: 1 | 2 | 3;
  pillarLabel: string;
  internalDescription: string;
  customerModelLanguage: string;
};

export const TAXONOMY_MATRIX: readonly TaxonomyEntry[] = [
  {
    id: "1.1A_static_assets",
    pillar: 1,
    pillarLabel: "Asset-Based Revenue",
    internalDescription:
      "Static Informational & Design Assets (Information/Content Artifacts) — non-executable, downloadable files that transfer knowledge, process structure, or visual layouts; user interaction stops immediately after download. Examples: Notion workspace templates, Figma UI kits, e-books, Excel financial models, preset packs. Roadmap: audience validation & outline → asset creation → packaging & deliverability → Gumroad/Lemon Squeezy/Etsy distribution.",
    customerModelLanguage:
      "A downloadable digital asset — templates, kits, models, or guides someone buys once and uses offline, with no software left running after the file lands.",
  },
  {
    id: "1.1B_ecosystem_extensions",
    pillar: 1,
    pillarLabel: "Asset-Based Revenue",
    internalDescription:
      "Platform-Dependent Extensions & Plug-ins (Symbiotic Software) — micro-software engineered to augment, customize, or sit on top of an existing parent ecosystem, relying completely on the host platform's APIs. Examples: Chrome extensions, WordPress plug-ins, Figma widgets, Shopify apps, Obsidian extensions. Roadmap: API investigation → local core development → host compliance testing → store submission & review.",
    customerModelLanguage:
      "An extension or plug-in built for one host platform — it augments Chrome, WordPress, Figma, Shopify, or similar through that platform's APIs.",
  },
  {
    id: "1.1C_experiential_software",
    pillar: 1,
    pillarLabel: "Asset-Based Revenue",
    internalDescription:
      "Interactive, Simulation, & Entertainment Assets (Experiential Software) — high-fidelity software built on runtime engines where value is driven by interactive visual experiences, simulation mechanics, or complex local graphics loops. Examples: mobile games, Web3/VR environments, simulation engines, standalone desktop utilities. Roadmap: core mechanics & greyboxing → asset pipeline integration → game/loop balancing → deployment & engine export (iOS, Android, Steam, WebGL).",
    customerModelLanguage:
      "An interactive experience built on a runtime engine — games, simulations, or standalone utilities where the playable loop and visual experience are the product.",
  },
  {
    id: "1.1D_cloud_utility_saas",
    pillar: 1,
    pillarLabel: "Asset-Based Revenue",
    internalDescription:
      "Cloud-Based Utility Engines (SaaS / Web Apps) — centralized software architectures that solve ongoing procedural, functional, or business problems with data persistence, continuous hosting, multi-tenant databases, and ongoing maintenance. Examples: micro-SaaS analytics tools, project management web apps, custom client portals, AI-wrapper tools. Roadmap: database & architecture design → backend & logic implementation → frontend & authentication → deployment & billing infrastructure (Stripe, CI/CD, cloud hosting).",
    customerModelLanguage:
      "A cloud web app or micro-SaaS people log into over time — hosted accounts, saved data, and software that keeps solving an ongoing business or workflow problem.",
  },
  {
    id: "1.2_physical_inventory",
    pillar: 1,
    pillarLabel: "Asset-Based Revenue",
    internalDescription:
      "Physical Products & Inventory Assets — tangible merchandise manufactured, stored, and shipped.",
    customerModelLanguage:
      "A premium physical product execution — something you make, stock, package, and ship into someone's hands.",
  },
  {
    id: "1.3_media_content_ip",
    pillar: 1,
    pillarLabel: "Asset-Based Revenue",
    internalDescription:
      "Media, Content, & Intellectual Property — information architecture, brand loyalty, licensed creative outputs.",
    customerModelLanguage:
      "A content or media asset people follow, subscribe to, or pay to access.",
  },
  {
    id: "2.1_solo_freelance",
    pillar: 2,
    pillarLabel: "Time- & Skill-Based Revenue",
    internalDescription:
      "Direct Freelance & Individual Services — solo operations exchanging skill for client capital.",
    customerModelLanguage:
      "A hands-on service you deliver yourself — trading your skill and time directly for pay.",
  },
  {
    id: "2.2_agency_managed",
    pillar: 2,
    pillarLabel: "Time- & Skill-Based Revenue",
    internalDescription:
      "Agency & Managed Operational Models — labor arbitrage with teams or sub-contractors.",
    customerModelLanguage:
      "A managed service operation — you build a team or system that fulfills work at scale.",
  },
  {
    id: "3.1_platform_marketplace",
    pillar: 3,
    pillarLabel: "Capital- & Facilitation-Based Revenue",
    internalDescription:
      "Multi-Sided Platforms & Marketplaces — matching buyers and sellers for transactional fees.",
    customerModelLanguage:
      "A platform connecting active buyers and sellers — you facilitate the match and take a cut.",
  },
  {
    id: "3.2_affiliate_lead_gen",
    pillar: 3,
    pillarLabel: "Capital- & Facilitation-Based Revenue",
    internalDescription:
      "Affiliate Networks & Lead Generation — routing high-intent traffic for commission.",
    customerModelLanguage:
      "A traffic and referral engine — you send ready-to-buy people to someone else's checkout.",
  },
  {
    id: "3.3_financial_capital",
    pillar: 3,
    pillarLabel: "Capital- & Facilitation-Based Revenue",
    internalDescription:
      "Financial Capital & Liquidity Markets — capital deployment for returns.",
    customerModelLanguage:
      "A capital deployment play — putting money to work and earning returns from the movement.",
  },
] as const;

export const BUSINESS_CATEGORY_IDS = TAXONOMY_MATRIX.map(
  (entry) => entry.id,
) as BusinessCategoryId[];

export function getTaxonomyEntry(
  categoryId: string,
): TaxonomyEntry | undefined {
  return TAXONOMY_MATRIX.find((entry) => entry.id === categoryId);
}

export function isValidBusinessCategory(
  categoryId: string,
): categoryId is BusinessCategoryId {
  return BUSINESS_CATEGORY_IDS.includes(categoryId as BusinessCategoryId);
}

export function isPendingCategory(categoryId: string): boolean {
  return categoryId === PENDING_CATEGORY;
}

export function buildTriageMatrixPromptBlock(): string {
  return TAXONOMY_MATRIX.map(
    (entry) =>
      `- ${entry.id}: ${entry.internalDescription} (customer mirror: "${entry.customerModelLanguage}")`,
  ).join("\n");
}

export function getCustomerModelLanguage(categoryId: string): string {
  return (
    getTaxonomyEntry(categoryId)?.customerModelLanguage ??
    "A venture we're mapping together"
  );
}

const LEGACY_CATEGORY_ALIASES: Record<string, BusinessCategoryId> = {
  "1.1_digital_software": "1.1D_cloud_utility_saas",
  "1.1_saas": "1.1D_cloud_utility_saas",
  "1.1a_static_assets": "1.1A_static_assets",
  "1.1b_ecosystem_extensions": "1.1B_ecosystem_extensions",
  "1.1c_experiential_software": "1.1C_experiential_software",
  "1.1d_cloud_utility_saas": "1.1D_cloud_utility_saas",
  saas_digital: "1.1D_cloud_utility_saas",
  micro_saas: "1.1D_cloud_utility_saas",
  web_app: "1.1D_cloud_utility_saas",
  software: "1.1D_cloud_utility_saas",
  digital_software: "1.1D_cloud_utility_saas",
  chrome_extension: "1.1B_ecosystem_extensions",
  wordpress_plugin: "1.1B_ecosystem_extensions",
  shopify_app: "1.1B_ecosystem_extensions",
  figma_plugin: "1.1B_ecosystem_extensions",
  mobile_game: "1.1C_experiential_software",
  video_game: "1.1C_experiential_software",
  gumroad: "1.1A_static_assets",
  digital_product: "1.1A_static_assets",
  notion_template: "1.1A_static_assets",
  marketplace: "3.1_platform_marketplace",
  local_service: "2.1_solo_freelance",
  physical_goods: "1.2_physical_inventory",
  brick_and_mortar: "1.2_physical_inventory",
  creator_content: "1.3_media_content_ip",
  consulting_agency: "2.2_agency_managed",
  hardware_deep_tech: "3.3_financial_capital",
};

export function resolveClassifiedCategory(
  raw: string | null | undefined,
): BusinessCategoryId | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (isValidBusinessCategory(normalized)) {
    return normalized;
  }

  return LEGACY_CATEGORY_ALIASES[normalized] ?? null;
}
