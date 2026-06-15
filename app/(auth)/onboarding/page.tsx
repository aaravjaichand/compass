"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusDot } from "@/components/ui/StatusDot";
import { Toggle } from "@/components/ui/Toggle";

type Step = 0 | 1 | 2 | 3 | 4;

const TOTAL = 5;

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile fields keyed by the canonical ids in lib/packet/fields.ts.
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState("Hudson");
  const [memoryOn, setMemoryOn] = useState(true);

  function next() {
    setStep((s) => Math.min(TOTAL - 1, s + 1) as Step);
  }
  function back() {
    setStep((s) => Math.max(0, s - 1) as Step);
  }

  async function finish() {
    setBusy(true);
    setError(null);
    const data: Record<string, string> = {};
    if (fullName) data.applicant_full_name = fullName;
    if (address) data.home_address = address;
    if (city) data.home_city = city;
    if (zip) data.home_zip = zip;
    if (phone) data.phone = phone;
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, county, memoryEnabled: memoryOn }),
      });
      if (!res.ok) throw new Error();
      window.location.assign("/dashboard");
    } catch {
      setBusy(false);
      setError("Couldn't save. Please try again.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs tracking-wide text-muted">
          GETTING SET UP
        </span>
        <span className="font-mono text-xs text-subtle">
          Step {step + 1} of {TOTAL}
        </span>
      </div>

      <div key={step} className="fade-up mt-4">
        {step === 0 ? (
          <Card className="space-y-4">
            <h1 className="text-2xl tracking-tight">Welcome to Compass</h1>
            <p className="text-muted">
              Describe a situation in plain language and Compass finds local aid
              programs, checks rough eligibility, and prepares a packet you can
              file yourself.
            </p>
            <div className="space-y-2 text-sm text-muted">
              <p className="flex items-start gap-3">
                <StatusDot tone="success" />
                Every match shows its reasoning, source, and a confidence level.
              </p>
              <p className="flex items-start gap-3">
                <StatusDot tone="danger" />
                Compass never submits anything — you decide and file.
              </p>
            </div>
            <Button onClick={next} className="w-full justify-center">
              Get started
            </Button>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card className="space-y-4">
            <h1 className="text-2xl tracking-tight">Your privacy</h1>
            <p className="text-muted">
              Your details and saved plans are{" "}
              <span className="text-fg">encrypted at rest</span> and visible only
              to you. Identity fields (name, address, phone, documents) are{" "}
              <span className="text-fg">never sent to the AI</span> — they only go
              into the forms you choose to file.
            </p>
            <p className="text-sm text-subtle">
              You can export or delete your data — including your whole account —
              at any time from Settings.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={back}>
                Back
              </Button>
              <Button onClick={next} className="flex-1 justify-center">
                I understand
              </Button>
            </div>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card className="space-y-4">
            <h1 className="text-2xl tracking-tight">A few details</h1>
            <p className="text-muted">
              Optional, but it lets Compass pre-fill your applications. You can
              edit or add these later.
            </p>
            <div className="space-y-3">
              <Labeled label="Full legal name">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </Labeled>
              <Labeled label="Street address">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="City">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </Labeled>
                <Labeled label="ZIP">
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} />
                </Labeled>
              </div>
              <Labeled label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Labeled>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={back}>
                Back
              </Button>
              <Button onClick={next} className="flex-1 justify-center">
                Continue
              </Button>
            </div>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card className="space-y-5">
            <h1 className="text-2xl tracking-tight">Should Compass remember?</h1>
            <p className="text-muted">
              With memory on, Compass keeps a few details between visits — your
              situation, household, and the programs you&rsquo;re pursuing — so
              you don&rsquo;t start over each time.
            </p>
            <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-fg">Long-term memory</p>
                <p className="text-sm text-muted">
                  You can change this anytime in Settings.
                </p>
              </div>
              <Toggle
                checked={memoryOn}
                onChange={setMemoryOn}
                label="Long-term memory"
              />
            </div>
            <p className="text-sm text-subtle">
              Compass never remembers your name, date of birth, or any ID numbers
              — only what helps it pick up where you left off.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={back}>
                Back
              </Button>
              <Button onClick={next} className="flex-1 justify-center">
                Continue
              </Button>
            </div>
          </Card>
        ) : null}

        {step === 4 ? (
          <Card className="space-y-4">
            <h1 className="text-2xl tracking-tight">Where do you live?</h1>
            <p className="text-muted">
              Compass covers the Hudson and Bergen County (NJ) directory. This
              focuses your matches.
            </p>
            <Labeled label="County">
              <Select value={county} onChange={(e) => setCounty(e.target.value)}>
                <option value="Hudson">Hudson</option>
                <option value="Bergen">Bergen</option>
              </Select>
            </Labeled>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={back} disabled={busy}>
                Back
              </Button>
              <Button onClick={finish} disabled={busy} className="flex-1 justify-center">
                {busy ? "Finishing…" : "Finish and go to dashboard"}
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-xs uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
