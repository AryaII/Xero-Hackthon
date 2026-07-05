import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { HeroKpiStrip } from "@/components/HeroKpiStrip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentThinkingTab } from "@/components/tabs/AgentThinkingTab";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { ActionsTimelineTab } from "@/components/tabs/ActionsTimelineTab";
import { Toasts } from "@/components/Toasts";
import { useOodaRun } from "@/hooks/useOodaRun";
import { fetchHealth } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tab, setTab] = useState("thinking");
  const ooda = useOodaRun();

  useEffect(() => {
    fetchHealth().then(setHealth);
  }, []);

  return (
    <div className="min-h-screen bg-xero-bg">
      <TopBar orgName={health?.org ?? null} demoMode={health?.demoMode ?? false} />

      <HeroKpiStrip sources={ooda.sources} hypotheses={ooda.hypotheses} />

      <main className="mx-auto max-w-[1280px] px-6 pb-16">
        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList>
            <TabsTrigger value="thinking">Agent Thinking</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="timeline">Actions Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="thinking">
            <AgentThinkingTab ooda={ooda} />
          </TabsContent>
          <TabsContent value="dashboard">
            <DashboardTab sources={ooda.sources} hypotheses={ooda.hypotheses} />
          </TabsContent>
          <TabsContent value="timeline">
            <ActionsTimelineTab
              actions={ooda.actions}
              approvingIds={ooda.approvingIds}
              onApprove={ooda.approve}
              onReject={ooda.reject}
            />
          </TabsContent>
        </Tabs>
      </main>

      <Toasts toasts={ooda.toasts} />
    </div>
  );
}

export default App;
