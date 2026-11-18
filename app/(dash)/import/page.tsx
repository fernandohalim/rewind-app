import { Floater, Vinyl } from "@/components/decor";
import { ImportFlow } from "@/components/import-flow";
import { PageHero } from "@/components/page-hero";

export const metadata = { title: "Import · Rewind" };

export default function ImportPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        kicker="Extended streaming history"
        title="Load your whole tape"
        subtitle="Every play since your account was created, with real minutes, skips and devices."
        decor={
          <Floater className="right-[6%] top-24 w-24 sm:right-[12%] sm:w-36" variant="b">
            <div className="spin-slow"><Vinyl label="#E9B44C" /></div>
          </Floater>
        }
      />
      <div className="relative z-10 mx-auto -mt-16 w-full max-w-3xl px-4 pb-20">
        <ImportFlow />
      </div>
    </main>
  );
}
