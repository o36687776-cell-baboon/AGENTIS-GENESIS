import { useState } from "react";
import { Card } from "@/design-system/components/Card";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Icon } from "@/design-system/icons";

interface SettingSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

function SettingSection({ title, icon, children }: SettingSectionProps) {
  return (
    <Card surface={3} border>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <Icon name={icon as any} size={14} className="text-[var(--signal-primary)]" />
          <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            {title}
          </h3>
        </div>
        {children}
      </div>
    </Card>
  );
}

function ToggleSwitch({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-2.5">
      <div>
        <label className="text-sm font-medium text-[var(--color-light-grey)]">
          {label}
        </label>
        {description && (
          <p className="mt-0.5 max-w-sm text-xs text-[var(--color-soft-grey)]">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
          enabled ? "bg-[var(--signal-primary)]" : "bg-[var(--color-mid-grey)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--color-void)] transition-transform ${
            enabled ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

const autonomyOptions = [
  { id: "manual", label: "MANUAL", desc: "Human approves every action" },
  { id: "assisted", label: "ASSISTED", desc: "Agent executes low-risk actions" },
  { id: "supervised", label: "SUPERVISED", desc: "Agent executes within permissions" },
  { id: "autonomous", label: "AUTONOMOUS", desc: "Agent executes independently with configured limits" },
];

export function SettingsView() {
  const [autonomy, setAutonomy] = useState("supervised");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 font-medium text-[var(--color-off-white)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--color-soft-grey)]">
          Configure the AGENTIS GENESIS operating environment.
        </p>
      </div>

      <SettingSection title="GENERAL" icon="system">
        <ToggleSwitch
          label="Dark Mode"
          description="Always use the dark interface."
          enabled
          onChange={() => {}}
        />
      </SettingSection>

      <SettingSection title="AGENT AUTONOMY" icon="agents">
        <div className="space-y-2">
          {autonomyOptions.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-all ${
                autonomy === opt.id
                  ? "border-[var(--signal-primary)] bg-[color:mix(12%,var(--signal-primary),_transparent)]"
                  : "border-[var(--border-subtle)] hover:border-[var(--border-active)]"
              }`}
            >
              <input
                type="radio"
                name="autonomy"
                checked={autonomy === opt.id}
                onChange={() => setAutonomy(opt.id)}
                className="mt-0.5 accent-[var(--signal-primary)]"
              />
              <div>
                <span className="block font-medium text-[var(--color-light-grey)]">
                  {opt.label}
                </span>
                <span className="text-xs text-[var(--color-soft-grey)]">
                  {opt.desc}
                </span>
              </div>
            </label>
          ))}
        </div>
      </SettingSection>

      <SettingSection title="PRIVACY" icon="knowledge">
        <ToggleSwitch label="Read current workspace" enabled onChange={() => {}} />
        <ToggleSwitch label="Access selected documents" enabled onChange={() => {}} />
        <ToggleSwitch label="Connect approved applications" enabled onChange={() => {}} />
      </SettingSection>

      <SettingSection title="SECURITY" icon="alert">
        <ToggleSwitch
          label="End-to-end encryption"
          description="Encrypt all agent communications."
          enabled
          onChange={() => {}}
        />
        <ToggleSwitch label="Two-factor authentication" enabled onChange={() => {}} />
      </SettingSection>

      <SettingSection title="NOTIFICATIONS" icon="alert">
        <ToggleSwitch label="Desktop notifications" enabled onChange={() => {}} />
        <ToggleSwitch
          label="Email summary"
          description="Daily digest of completed work."
          enabled={false}
          onChange={() => {}}
        />
      </SettingSection>
    </div>
  );
}
