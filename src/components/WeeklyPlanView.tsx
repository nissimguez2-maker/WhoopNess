"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CardBody,
  CardHeader,
  Chip,
  Tabs,
  Tab,
  Button,
  Select,
  SelectItem,
  Input,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  useDisclosure,
} from "@heroui/react";
import { Pencil, Dumbbell, Waves, Clock } from "lucide-react";
import type { ExerciseView, RecoveryBand, SessionType } from "@/core/types";
import { SurfaceCard } from "./ui/SurfaceCard";
import { PageHeader } from "./ui/PageHeader";
import { ExerciseList } from "./ExerciseList";
import { updateSession } from "@/app/week/actions";

export interface BranchVM {
  band: RecoveryBand;
  label: string;
  durationMin: number;
  exercises: ExerciseView[];
}
export interface SessionVM {
  id?: string;
  day: string;
  time?: string;
  type: SessionType;
  focus: string;
  branches: BranchVM[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BAND_DOT: Record<RecoveryBand, string> = { green: "bg-success", amber: "bg-warning", red: "bg-danger" };

export function WeeklyPlanView({
  sessions,
  weekLabel,
  rationale,
}: {
  sessions: SessionVM[];
  weekLabel: string;
  rationale?: string;
}) {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState<SessionVM | null>(null);

  function openEditor(s: SessionVM) {
    setEditing(s);
    onOpen();
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Week" subtitle={`${weekLabel} · ${sessions.length} sessions`} />

      {rationale && (
        <SurfaceCard>
          <CardBody className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-500">Why this week</p>
            <p className="mt-1 text-sm text-foreground-600">{rationale}</p>
          </CardBody>
        </SurfaceCard>
      )}

      {sessions.map((s) => (
        <SurfaceCard key={s.id ?? s.day}>
          <CardHeader className="flex items-center justify-between pb-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-semibold">{s.day}</span>
              {s.time && (
                <Chip size="sm" variant="flat" className="font-mono">
                  {s.time}
                </Chip>
              )}
              <Chip size="sm" variant="flat" color={s.type === "swim" ? "primary" : "default"} startContent={s.type === "swim" ? <Waves size={13} /> : <Dumbbell size={13} />}>
                {s.type === "swim" ? "Swim" : "Gym"}
              </Chip>
              <span className="text-foreground-600">· {s.focus}</span>
            </div>
            <Button isIconOnly size="sm" variant="light" aria-label="Edit session" onPress={() => openEditor(s)} className="text-foreground-500">
              <Pencil size={15} />
            </Button>
          </CardHeader>
          <CardBody className="pt-2">
            <Tabs aria-label={`${s.day} branches`} size="sm" variant="solid" radius="md" color="primary">
              {s.branches
                .filter((b) => b.exercises.length > 0)
                .map((b) => (
                  <Tab
                    key={b.band}
                    title={
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${BAND_DOT[b.band]}`} aria-hidden />
                        <span>{b.label}</span>
                      </div>
                    }
                  >
                    <div className="mb-2 flex items-center gap-1 text-xs text-foreground-500">
                      <Clock size={12} /> <span className="font-mono">{b.durationMin} min</span>
                    </div>
                    <ExerciseList exercises={b.exercises} />
                  </Tab>
                ))}
            </Tabs>
          </CardBody>
        </SurfaceCard>
      ))}

      <p className="text-center text-xs text-foreground-500">
        Each day&apos;s branch is chosen by your morning recovery — green → primary, amber → lighter, red → recovery.
      </p>

      <SessionEditor
        key={editing?.id ?? "none"}
        isOpen={isOpen}
        onClose={onClose}
        session={editing}
        onSaved={() => {
          onClose();
          router.refresh();
        }}
      />
    </div>
  );
}

function SessionEditor({
  isOpen,
  onClose,
  session,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  session: SessionVM | null;
  onSaved: () => void;
}) {
  const [day, setDay] = useState(session?.day ?? "Sun");
  const [time, setTime] = useState(session?.time ?? "18:00");
  const [type, setType] = useState<SessionType>(session?.type ?? "gym");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed when a different session is opened.
  const key = session?.id ?? session?.day ?? "none";

  async function save() {
    if (!session?.id) {
      onSaved();
      return;
    }
    setBusy(true);
    setError(null);
    const res = await updateSession({ sessionId: session.id, day, time, type });
    setBusy(false);
    if (res.ok) onSaved();
    else setError(res.error);
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="bottom">
      <DrawerContent key={key}>
        <DrawerHeader className="flex-col items-start">
          <span>Edit session</span>
          <span className="text-xs font-normal text-foreground-500">Day, time, and type</span>
        </DrawerHeader>
        <DrawerBody className="gap-4">
          <Select
            label="Day"
            selectedKeys={[day]}
            onSelectionChange={(keys) => setDay(String(Array.from(keys)[0] ?? day))}
          >
            {DAYS.map((d) => (
              <SelectItem key={d}>{d}</SelectItem>
            ))}
          </Select>
          <Input label="Time" type="time" value={time} onValueChange={setTime} />
          <div>
            <p className="mb-1.5 text-sm text-foreground-600">Type</p>
            <Tabs
              aria-label="Session type"
              fullWidth
              color="primary"
              selectedKey={type}
              onSelectionChange={(k) => setType(k as SessionType)}
            >
              <Tab key="gym" title={<div className="flex items-center gap-1.5"><Dumbbell size={14} /> Gym</div>} />
              <Tab key="swim" title={<div className="flex items-center gap-1.5"><Waves size={14} /> Swim</div>} />
            </Tabs>
            {type === "swim" && (
              <p className="mt-1.5 text-xs text-foreground-500">Swim sessions use push-ups, pull-ups, walking and bike only.</p>
            )}
          </div>
          {error && <p className="text-sm text-danger-400">{error}</p>}
        </DrawerBody>
        <DrawerFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={save} isLoading={busy}>
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
