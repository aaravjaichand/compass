import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function PreparePacketCTA({
  onStart,
  disabled,
}: {
  onStart: () => void;
  disabled?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3 print:hidden">
      <span className="font-mono text-xs tracking-wide text-muted">NEXT STEP</span>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl space-y-1.5">
          <h3 className="text-lg font-medium leading-snug">
            Turn this into a ready-to-file packet
          </h3>
          <p className="text-sm text-muted">
            Compass will ask you a few questions, then prepare your filled
            applications and a cover letter to download. Nothing is submitted —
            you review everything and file it yourself.
          </p>
        </div>
        <Button onClick={onStart} disabled={disabled}>
          Prepare my filing packet
        </Button>
      </div>
    </Card>
  );
}
