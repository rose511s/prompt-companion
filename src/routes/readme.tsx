import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/readme")({
  head: () => ({ meta: [{ title: "README — Prompt Directory" }] }),
  component: () => <RequireAuth><ReadmePage /></RequireAuth>,
});

function ReadmePage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">README — Team Prompt Directory</h1>
      <p className="text-muted-foreground mb-8">How to use this directory effectively.</p>

      <Card className="p-8 shadow-card prose prose-sm max-w-none">
        <h2 className="text-xl font-semibold mt-0">What this is</h2>
        <p>A curated library of <strong>gold-standard prompts</strong> for software development & DevOps tasks. Every prompt uses an established framework (CO-STAR, Few-Shot, Chain-of-Thought) and exposes its inputs as <code className="placeholder-token">[BRACKETED_VARIABLES]</code>.</p>

        <h2 className="text-xl font-semibold mt-8">How to use a prompt</h2>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Browse the <strong>Library</strong> or filter by category.</li>
          <li>Open a prompt and switch to the <strong>Fill variables</strong> tab.</li>
          <li>Fill each <code className="placeholder-token">VARIABLE</code> field — keep entries specific.</li>
          <li>Click <strong>Copy</strong> and paste into your AI tool of choice.</li>
        </ol>

        <h2 className="text-xl font-semibold mt-8">How to contribute</h2>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Click <strong>New Prompt</strong>.</li>
          <li>Pick a category and framework. Set tags so others can find it.</li>
          <li>Write the body. Mark every user input as <code className="placeholder-token">[UPPER_CASE]</code>.</li>
          <li>Toggle <strong>Visible to team</strong> on to share, off to keep private.</li>
        </ol>

        <h2 className="text-xl font-semibold mt-8">Frameworks at a glance</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>CO-STAR</strong> — Context, Objective, Style, Tone, Audience, Response.</li>
          <li><strong>Few-Shot</strong> — Provide 2–3 worked examples before the real task.</li>
          <li><strong>Chain-of-Thought</strong> — Ask the model to reason step-by-step before answering.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">Quality bar</h2>
        <p>Before sharing a prompt, validate it on at least <strong>two real tasks</strong> and confirm output quality is consistent regardless of the user's seniority.</p>
      </Card>
    </div>
  );
}
