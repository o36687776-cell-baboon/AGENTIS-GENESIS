import { cn } from "@/design-system/utils";

interface GenesisIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

const GenesisIcon = ({
  children,
  size = 16,
  className,
  ...props
}: GenesisIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(
      "shrink-0",
      "text-[var(--color-soft-grey)]",
      className
    )}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

export const HomeIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M3 11.162L12 4l9 7.162v9.838a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </GenesisIcon>
);

export const WorkTreeIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M12 2L4 6v12l8 4 8-4V6z" />
    <path d="M4 6l8 4 8-4M4 12l8 4 8-4" />
  </GenesisIcon>
);

export const AgentsIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <circle cx="12" cy="12" r="9" fill="none" />
    <circle cx="12" cy="12" r="3" fill="none" />
  </GenesisIcon>
);

export const TasksIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <circle cx="12" cy="12" r="9" fill="none" />
    <path d="M12 3v9l3 3" />
  </GenesisIcon>
);

export const ArtifactsIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 8h10M7 12h10" />
  </GenesisIcon>
);

export const AutomationsIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M4 12h16M12 4l8 8-8 8" />
    <circle cx="8" cy="12" r="2" fill="none" />
  </GenesisIcon>
);

export const MemoryIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <circle cx="12" cy="12" r="9" fill="none" />
    <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z" />
  </GenesisIcon>
);

export const KnowledgeIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <circle cx="12" cy="12" r="9" fill="none" />
    <path d="M9 12l2 2 4-4" />
  </GenesisIcon>
);

export const SystemIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <circle cx="12" cy="12" r="9" fill="none" />
    <path d="M6 12h12" />
    <path d="M12 6v12" />
  </GenesisIcon>
);

export const SettingsIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <circle cx="12" cy="12" r="4" fill="none" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </GenesisIcon>
);

export const SearchIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <circle cx="11" cy="11" r="7" fill="none" />
    <path d="M21 21l-4.35-4.35" />
  </GenesisIcon>
);

export const CommandIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <circle cx="12" cy="12" r="9" fill="none" />
    <path d="M12 3v9l3 3" />
    <path d="M8 8l4 4 4-4" />
  </GenesisIcon>
);

export const ChevronRightIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M6 6l12 12M6 18l12-12" />
  </GenesisIcon>
);

export const ChevronDownIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M6 9l6 6 6-6" />
  </GenesisIcon>
);

export const ChevronUpIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M18 15l-6-6-6 6" />
  </GenesisIcon>
);

export const ExpandIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M5 9l7 7 7-7" />
  </GenesisIcon>
);

export const CollapseIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M5 15l7-7 7 7" />
  </GenesisIcon>
);

export const PlayIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M5 3v18l15-9L5 3z" />
  </GenesisIcon>
);

export const PauseIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <rect x="5" y="4" width="14" height="16" rx="2" />
    <path d="M9 8h2v8h-2zM13 8h2v8h-2z" />
  </GenesisIcon>
);

export const CheckIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M5 13l4 4L19 7" />
  </GenesisIcon>
);

export const XIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M18 6L6 18M6 6l12 12" />
  </GenesisIcon>
);

export const WarningIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M10.29 3.86L3 18a2 2 0 001.71 3h14.58a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.42 0z" />
    <path d="M12 9v4" />
    <circle cx="12" cy="17" r="1" fill="none" />
  </GenesisIcon>
);

export const AlertIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <circle cx="12" cy="12" r="9" fill="none" />
    <path d="M12 7v5M12 16h.01" />
  </GenesisIcon>
);

export const PlusIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M12 5v14M5 12h14" />
  </GenesisIcon>
);

export const ExternalIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 01 2-2h6M8 3h10a2 2 0 012 2v10" />
    <path d="M13 10l7-7M13 3h7v7" />
  </GenesisIcon>
);

export const SignalIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M12 18V6M12 6l-4 4M12 6l4 4" />
  </GenesisIcon>
);

export const TimelineIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M12 2v8l4 4" />
    <circle cx="12" cy="18" r="2" fill="none" />
    <path d="M6 18h12" />
  </GenesisIcon>
);

export const UploadIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M12 4v12M12 4l-4 4M12 4l4 4" />
    <path d="M4 20h16" />
  </GenesisIcon>
);

export const DownloadIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M12 4v12M12 4l4 4M12 4l-4 4" />
    <path d="M20 20H4" />
  </GenesisIcon>
);

export const TrashIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <path d="M3 6h18" />
    <path d="M8 10v8M16 10v8" />
    <path d="M10 2h4a1 1 0 011 1v2H9V3a1 1 0 011-1z" />
    <path d="M6 6l2 14a2 2 0 002 2h8a2 2 0 002-2L18 6" />
  </GenesisIcon>
);

export const DuplicateIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15l-2-2V5a2 2 0 012-2h8l2 2" />
  </GenesisIcon>
);

export const LockIcon = (props: Omit<GenesisIconProps, "children">) => (
  <GenesisIcon {...props}>
    <rect x="4" y="11" width="16" height="11" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
    <circle cx="12" cy="15" r="2" fill="none" />
  </GenesisIcon>
);

export type GenesisIconName =
  | "home"
  | "worktree"
  | "agents"
  | "tasks"
  | "artifacts"
  | "automations"
  | "memory"
  | "knowledge"
  | "system"
  | "settings"
  | "search"
  | "command"
  | "chevron-right"
  | "chevron-down"
  | "chevron-up"
  | "expand"
  | "collapse"
  | "play"
  | "pause"
  | "check"
  | "x"
  | "warning"
  | "alert"
  | "plus"
  | "external"
  | "signal"
  | "timeline";

export const iconMap: Record<GenesisIconName, React.FC<Omit<GenesisIconProps, "children">>> = {
  home: HomeIcon,
  worktree: WorkTreeIcon,
  agents: AgentsIcon,
  tasks: TasksIcon,
  artifacts: ArtifactsIcon,
  automations: AutomationsIcon,
  memory: MemoryIcon,
  knowledge: KnowledgeIcon,
  system: SystemIcon,
  settings: SettingsIcon,
  search: SearchIcon,
  command: CommandIcon,
  "chevron-right": ChevronRightIcon,
  "chevron-down": ChevronDownIcon,
  "chevron-up": ChevronUpIcon,
  expand: ExpandIcon,
  collapse: CollapseIcon,
  play: PlayIcon,
  pause: PauseIcon,
  check: CheckIcon,
  x: XIcon,
  warning: WarningIcon,
  alert: AlertIcon,
  plus: PlusIcon,
  external: ExternalIcon,
  signal: SignalIcon,
  timeline: TimelineIcon,
};

export function Icon({ name, ...props }: { name: GenesisIconName } & Omit<GenesisIconProps, "children">) {
  const IconComp = iconMap[name];
  return <IconComp {...props} />;
}
