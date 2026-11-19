// Shape produced by tools/extract_whatson_page.py from whats-on.html.

export interface WhatsOnPageData {
  seo: { title: string | null; description: string | null };
  hero: { eyebrow: string | null; headingHtml: string | null; lede: string | null };
  monthLinks: { id: string; label: string | null }[];
  months: {
    id: string | null;
    name: string | null;
    count: string | null;
    // photo / photoCredit: the event's own photo, from its city page (tools/link-whatson-photos.mjs).
    events: { name: string | null; meta: string | null; body: string | null; href: string; photo?: string | null; photoCredit?: string | null }[];
  }[];
}
