import { getLeads, getProjects } from "@/lib/store";
import { recommendLead } from "@/lib/prospecting/recommend";
import { industryLabel } from "@/lib/taxonomy";
import { PageHeader } from "@/components/ui";
import PipelineBoard, { type PipelineCard } from "@/components/PipelineBoard";

export const dynamic = "force-dynamic";

export default function PipelinePage() {
  const projects = getProjects();
  const cards: PipelineCard[] = getLeads().map((lead) => {
    const rec = recommendLead(lead, projects);
    return {
      id: lead.id,
      name: lead.name,
      industry: industryLabel(lead.industry),
      city: lead.address.city,
      region: lead.address.region,
      estValueHigh: rec.estimatedValue.high,
      opportunity: rec.scores.opportunity,
      stage: lead.stage,
    };
  });

  return (
    <div>
      <PageHeader
        title="CRM Pipeline"
        subtitle="Drag accounts between stages. Stage changes persist instantly. Each column totals the potential value in flight."
      />
      <PipelineBoard initial={cards} />
    </div>
  );
}
