import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import health from "../data/health.generated.json";
import type {
  HealthData,
  HealthLink,
  HealthIndexRow,
  HealthCard,
  HealthDayStep,
  HealthDataRow,
  HealthOgRow,
  HospitalData,
  DestinationData,
  SpecialtyData,
  GuideData,
  LongevityData,
  PathwayData,
} from "../types/health";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { withTaraAI } from "../components/TaraAI";
import "./health-page.module.css";

const HEALTH = health as unknown as Record<string, HealthData>;

// ---------- shared block primitives (the reusable library each category
// composes differently — see docs/... none; see chat log for the finding) ----------

function Icon({ svg }: { svg: string | null }) {
  if (!svg) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function SectionHead({
  iconSvg,
  eyebrow,
  heading,
  lede,
}: {
  iconSvg?: string | null;
  eyebrow: string | null;
  heading?: string | null;
  lede?: string | null;
}) {
  return (
    <div className="reveal" style={{ marginBottom: 26, maxWidth: "60ch" }}>
      <div className="eyebrow">
        {iconSvg && (
          <span className="ta-eyebrow-ic">
            <Icon svg={iconSvg} />
          </span>
        )}
        {eyebrow}
      </div>
      <div className="rule" />
      {heading && <h2 style={{ fontSize: "clamp(26px,3vw,40px)" }}>{heading}</h2>}
      {lede && (
        <p className="lede" style={{ marginTop: 12 }}>
          {lede}
        </p>
      )}
    </div>
  );
}

function SubHeader({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      style={{
        marginTop: 30,
        fontFamily: "var(--fr)",
        fontWeight: 600,
        fontSize: "10.5px",
        letterSpacing: ".13em",
        textTransform: "uppercase",
        color: "var(--stone,#8b8578)",
      }}
    >
      {text}
    </div>
  );
}

function CardGrid({ cards }: { cards: HealthCard[] }) {
  return (
    <div className="med-grid reveal d1">
      {cards.map((c, i) => (
        <div className="med-card" key={i}>
          <div className="mc-ic">
            <Icon svg={c.iconSvg} />
          </div>
          <h3 style={{ fontSize: 19 }}>{c.title}</h3>
          <p>{c.text}</p>
        </div>
      ))}
    </div>
  );
}

function IndexRows({ rows }: { rows: HealthIndexRow[] }) {
  return (
    <div className="med-index reveal d1">
      {rows.map((r, i) => (
        <div className="med-index-row" key={i}>
          <span className="ix-n">{r.name}</span>
          {r.region && (
            <span className="ix-r">
              <span className="ix-m">{r.region}</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function DaySteps({ steps }: { steps: HealthDayStep[] }) {
  return (
    <div className="ta-days reveal d1">
      {steps.map((s, i) => (
        <div className="ta-day" key={i}>
          <div className="ta-day-h">
            <span className="ta-day-n">{s.n}</span>
            <span className="ta-day-t">{s.title}</span>
          </div>
          <div className="ta-day-b">
            <div className="ta-slot">
              <p>{s.text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataRows({ rows }: { rows: HealthDataRow[] }) {
  return (
    <div className="med-datarow reveal d1">
      {rows.map((r, i) => (
        <div className="d" key={i}>
          <div className="dk">
            <Icon svg={r.iconSvg} />
            {r.label}
          </div>
          <div className="dv">{r.value}</div>
        </div>
      ))}
    </div>
  );
}

function OgRows({ rows }: { rows: HealthOgRow[] }) {
  return (
    <div className="ta-og-grid reveal d1">
      {rows.map((r, i) => (
        <div className="ta-og-row" key={i}>
          <span className="ta-og-k">{r.label}</span>
          <span className="ta-og-v">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChipsRow({ chips, className = "med-chips reveal d1" }: { chips: HealthLink[]; className?: string }) {
  return (
    <div className={className}>
      {chips.map((c, i) =>
        c.href ? (
          <Link className="med-chip" to={toRoute(c.href)} key={i}>
            {c.label}
          </Link>
        ) : (
          <span className="med-chip" key={i}>
            {c.label}
          </span>
        )
      )}
    </div>
  );
}

function PlainList({ items }: { items: string[] }) {
  return (
    <ul className="reveal d1" style={{ maxWidth: "64ch", lineHeight: 1.8, paddingLeft: 18, color: "var(--ink-soft,#3E3A35)" }}>
      {items.map((it, i) => (
        <li style={{ marginBottom: 7 }} key={i}>
          {it}
        </li>
      ))}
    </ul>
  );
}

// ---------- per-category bodies ----------

function HospitalBody({ data }: { data: HospitalData["hospital"] }) {
  return (
    <>
      <section className="band tight">
        <div className="wrap">
          <div className="med-accr reveal">
            {data.bestFor.accrChips.map((a, i) => (
              <span className="ac" key={i}>
                {a}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 22 }}>
            <div className="reveal" style={{ maxWidth: "62ch" }}>
              <p className="lede" style={{ fontSize: "clamp(19px,2vw,24px)", lineHeight: 1.55 }}>
                {data.bestFor.leadParagraph}
              </p>
            </div>
          </div>
          {data.bestFor.destinationChips.length > 0 && (
            <ChipsRow chips={data.bestFor.destinationChips} className="med-chips reveal d1" />
          )}
        </div>
      </section>
      <section className="band">
        <div className="wrap">
          <SectionHead
            iconSvg={data.centresOfExcellence.iconSvg}
            eyebrow={data.centresOfExcellence.eyebrow}
            heading={data.centresOfExcellence.heading}
          />
          <CardGrid cards={data.centresOfExcellence.cards} />
        </div>
      </section>
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead
            iconSvg={data.signatureProgrammes.iconSvg}
            eyebrow={data.signatureProgrammes.eyebrow}
            heading={data.signatureProgrammes.heading}
          />
          <PlainList items={data.signatureProgrammes.items} />
          <SubHeader text={data.signatureProgrammes.techHeader} />
          <div className="med-chips reveal d1">
            {data.signatureProgrammes.techChips.map((c, i) => (
              <span className="med-chip" key={i}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="band">
        <div className="wrap">
          <SectionHead
            iconSvg={data.patientJourney.iconSvg}
            eyebrow={data.patientJourney.eyebrow}
            heading={data.patientJourney.heading}
          />
          <DaySteps steps={data.patientJourney.steps} />
        </div>
      </section>
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead iconSvg={data.inDetail.iconSvg} eyebrow={data.inDetail.eyebrow} heading={data.inDetail.heading} />
          <DataRows rows={data.inDetail.rows} />
          <SubHeader text={data.inDetail.stayingHeader} />
          {data.inDetail.stayingNote && (
            <p className="ta-og-note" style={{ marginTop: 8, maxWidth: "60ch" }}>
              {data.inDetail.stayingNote}
            </p>
          )}
          {data.inDetail.sourceLinks.length > 0 && (
            <ChipsRow chips={data.inDetail.sourceLinks} className="med-chips reveal" />
          )}
        </div>
      </section>
    </>
  );
}

function DestinationBody({ data }: { data: DestinationData["destination"] }) {
  return (
    <>
      <section className="band">
        <div className="wrap">
          <SectionHead iconSvg={data.bestFor.iconSvg} eyebrow={data.bestFor.eyebrow} heading={data.bestFor.heading} />
          <ChipsRow chips={data.bestFor.specialtyChips} className="med-chips reveal d1" />
          {data.bestFor.accrText && (
            <div className="med-accr reveal" style={{ marginTop: 16 }}>
              <span className="ac">{data.bestFor.accrText}</span>
            </div>
          )}
          <div style={{ marginTop: 24 }}>
            <div className="reveal" style={{ maxWidth: "62ch" }}>
              <p className="lede" style={{ fontSize: "clamp(19px,2vw,24px)", lineHeight: 1.55 }}>
                {data.bestFor.leadParagraph}
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="band">
        <div className="wrap">
          <SectionHead
            iconSvg={data.experience.iconSvg}
            eyebrow={data.experience.eyebrow}
            heading={data.experience.heading}
            lede={data.experience.text}
          />
        </div>
      </section>
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead
            iconSvg={data.flagshipHospitals.iconSvg}
            eyebrow={data.flagshipHospitals.eyebrow}
            heading={data.flagshipHospitals.heading}
          />
          <IndexRows rows={data.flagshipHospitals.primary} />
          <SubHeader text={data.flagshipHospitals.moreHeader} />
          {data.flagshipHospitals.more.length > 0 && <IndexRows rows={data.flagshipHospitals.more} />}
        </div>
      </section>
      <section className="band">
        <div className="wrap">
          <SectionHead
            iconSvg={data.forIndianPatients.iconSvg}
            eyebrow={data.forIndianPatients.eyebrow}
            heading={data.forIndianPatients.heading}
          />
          <DataRows rows={data.forIndianPatients.rows} />
          {(data.forIndianPatients.onGround || data.forIndianPatients.recovery) && (
            <div className="ta-og-grid reveal d1">
              {data.forIndianPatients.onGround && (
                <div className="ta-og-row">
                  <span className="ta-og-k">{data.forIndianPatients.onGround.label}</span>
                  <span className="ta-og-v">{data.forIndianPatients.onGround.value}</span>
                </div>
              )}
              {data.forIndianPatients.recovery && (
                <div className="ta-og-row">
                  <span className="ta-og-k">{data.forIndianPatients.recovery.label}</span>
                  <span className="ta-og-v">{data.forIndianPatients.recovery.value}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      {data.aroundTreatment && (
        <section className="band tight" style={{ background: "var(--bone)" }}>
          <div className="wrap">
            <SectionHead
              iconSvg={data.aroundTreatment.iconSvg}
              eyebrow={data.aroundTreatment.eyebrow}
              heading={data.aroundTreatment.heading}
              lede={data.aroundTreatment.text}
            />
            <ChipsRow chips={data.aroundTreatment.cityChips} className="med-chips reveal d1" />
          </div>
        </section>
      )}
    </>
  );
}

function SpecialtyBody({ data }: { data: SpecialtyData["specialty"] }) {
  return (
    <>
      <section className="band">
        <div className="wrap">
          <SectionHead
            iconSvg={data.whereWorldLeads.iconSvg}
            eyebrow={data.whereWorldLeads.eyebrow}
            heading={data.whereWorldLeads.heading}
          />
          <IndexRows rows={data.whereWorldLeads.primary} />
          <SubHeader text={data.whereWorldLeads.indiaHeader} />
          {data.whereWorldLeads.indiaRows.length > 0 && <IndexRows rows={data.whereWorldLeads.indiaRows} />}
        </div>
      </section>
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead
            iconSvg={data.subSpecialties.iconSvg}
            eyebrow={data.subSpecialties.eyebrow}
            heading={data.subSpecialties.heading}
          />
          <CardGrid cards={data.subSpecialties.cards} />
        </div>
      </section>
      <section className="band">
        <div className="wrap">
          <SectionHead
            iconSvg={data.signatureTreatments.iconSvg}
            eyebrow={data.signatureTreatments.eyebrow}
            heading={data.signatureTreatments.heading}
          />
          <CardGrid cards={data.signatureTreatments.cards} />
        </div>
      </section>
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead
            iconSvg={data.journey.iconSvg}
            eyebrow={data.journey.eyebrow}
            heading={data.journey.heading}
            lede={data.journey.lede}
          />
          <DaySteps steps={data.journey.steps} />
        </div>
      </section>
      <section className="band">
        <div className="wrap">
          <SectionHead iconSvg={data.whatToWeigh.iconSvg} eyebrow={data.whatToWeigh.eyebrow} heading={data.whatToWeigh.heading} />
          <PlainList items={data.whatToWeigh.weighList} />
          <SubHeader text={data.whatToWeigh.costHeader} />
          {data.whatToWeigh.costList.length > 0 && <PlainList items={data.whatToWeigh.costList} />}
          <SubHeader text={data.whatToWeigh.questionsHeader} />
          {data.whatToWeigh.questionsList.length > 0 && <PlainList items={data.whatToWeigh.questionsList} />}
        </div>
      </section>
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead
            iconSvg={data.bestDestinations.iconSvg}
            eyebrow={data.bestDestinations.eyebrow}
            heading={data.bestDestinations.heading}
          />
          <ChipsRow chips={data.bestDestinations.chips} className="med-chips reveal d1" />
          {data.bestDestinations.leadParagraph && (
            <div style={{ marginTop: 26 }}>
              <div className="reveal" style={{ maxWidth: "62ch" }}>
                <p className="lede" style={{ fontSize: "clamp(19px,2vw,24px)", lineHeight: 1.55 }}>
                  {data.bestDestinations.leadParagraph}
                </p>
              </div>
            </div>
          )}
          {data.bestDestinations.note && (
            <p className="ta-map-note" style={{ marginTop: 18 }}>
              {data.bestDestinations.note}
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function GuideBody({ data }: { data: GuideData["guide"] }) {
  return (
    <>
      <section className="band">
        <div className="wrap">
          <SectionHead iconSvg={data.inShort.iconSvg} eyebrow={data.inShort.eyebrow} />
          <PlainList items={data.inShort.items} />
        </div>
      </section>
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead iconSvg={data.detail.iconSvg} eyebrow={data.detail.eyebrow} />
          <OgRows rows={data.detail.rows} />
        </div>
      </section>
    </>
  );
}

function LongevityBody({ data }: { data: LongevityData["longevity"] }) {
  return (
    <>
      <section className="band">
        <div className="wrap">
          <SectionHead iconSvg={data.programmes.iconSvg} eyebrow={data.programmes.eyebrow} heading={data.programmes.heading} />
          <CardGrid cards={data.programmes.cards} />
        </div>
      </section>
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead iconSvg={data.stay.iconSvg} eyebrow={data.stay.eyebrow} heading={data.stay.heading} />
          <PlainList items={data.stay.items} />
        </div>
      </section>
      <section className="band">
        <div className="wrap">
          <SectionHead
            iconSvg={data.whatIsMeasured.iconSvg}
            eyebrow={data.whatIsMeasured.eyebrow}
            heading={data.whatIsMeasured.heading}
          />
          <div className="med-chips reveal d1">
            {data.whatIsMeasured.chips.map((c, i) => (
              <span className="med-chip" key={i}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead iconSvg={data.inDetail.iconSvg} eyebrow={data.inDetail.eyebrow} heading={data.inDetail.heading} />
          <DataRows rows={data.inDetail.rows} />
          <SubHeader text={data.inDetail.settingHeader} />
          {data.inDetail.settingNote && (
            <p className="ta-og-note" style={{ marginTop: 8, maxWidth: "60ch" }}>
              {data.inDetail.settingNote}
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function PathwayBody({ data }: { data: PathwayData["pathway"] }) {
  return (
    <>
      <section className="band">
        <div className="wrap">
          <SectionHead iconSvg={data.whereToBegin.iconSvg} eyebrow={data.whereToBegin.eyebrow} lede={data.whereToBegin.lede} />
          <DaySteps steps={data.whereToBegin.steps} />
          {data.whereToBegin.note && (
            <p className="ta-map-note" style={{ marginTop: 18 }}>
              {data.whereToBegin.note}
            </p>
          )}
        </div>
      </section>
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead iconSvg={data.linkedTo.iconSvg} eyebrow={data.linkedTo.eyebrow} />
          <ChipsRow chips={data.linkedTo.chips} className="med-chips reveal d1" />
        </div>
      </section>
    </>
  );
}

// ---------- page ----------

export default function HealthPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const data = pageSlug ? HEALTH[pageSlug] : undefined;

  useEffect(() => {
    if (data?.seo.title) document.title = data.seo.title;
  }, [data]);

  useScrollReveal([data]);

  if (!data) {
    return (
      <div className="wrap band">
        <p>Not yet ported to the app.</p>
      </div>
    );
  }

  return (
    <>
      <header className="med-hero">
        <div className="wrap">
          <div className="med-hero-ic">
            <Icon svg={data.hero.iconSvg} />
          </div>
          <div className="eyebrow" dangerouslySetInnerHTML={{ __html: data.hero.eyebrowHtml ?? "" }} />
          <h1>{data.hero.name}</h1>
          <p className="lede">{data.hero.lede}</p>
        </div>
      </header>

      <section className="med-disc">
        <div className="wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5.4M12 7.7h.01" />
          </svg>
          <p>{data.disclaimer}</p>
        </div>
      </section>

      {data.category === "hospital" && <HospitalBody data={data.hospital} />}
      {data.category === "destination" && <DestinationBody data={data.destination} />}
      {data.category === "specialty" && <SpecialtyBody data={data.specialty} />}
      {data.category === "guide" && <GuideBody data={data.guide} />}
      {data.category === "longevity" && <LongevityBody data={data.longevity} />}
      {data.category === "pathway" && <PathwayBody data={data.pathway} />}

      <section className="med-concierge">
        <div className="wrap">
          <div className="eyebrow on-dark">Your medical-travel advisor</div>
          <h2>{data.concierge.heading}</h2>
          <p>{data.concierge.shareText}</p>
          <div className="med-conf">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />
              <path d="M9.2 12l2 2 3.6-3.6" />
            </svg>
            {data.concierge.confidenceNote}
          </div>
          <div className="btn-row">
            <Link className="btn btn-gold on-dark btn-square" to={toRoute(data.concierge.cta.href ?? "/enquire")}>
              {withTaraAI(data.concierge.cta.label)}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
