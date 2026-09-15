"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Check, ChevronDown, Dumbbell, History, Minus, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";
import { toast, Toaster } from "sonner";

const LIFTS = ["Bench Press", "Back Squat", "Deadlift", "Overhead Press", "Barbell Row", "Pull-up"] as const;
const INCREMENTS = [1, 2.5, 5, 10, 25, 45];
type LiftEntry = { id: number; lift: string; weight: number; reps: number; sets: number; createdAt: string };

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title: string;
          description: string;
          inputSchema: object;
          annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
          execute: (input: unknown) => Promise<unknown>;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

function formatDate(value: string) {
  const parsed = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const day = sameDay(date, today) ? "Today" : sameDay(date, yesterday) ? "Yesterday" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day} · ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export default function Home() {
  const [lift, setLift] = useState<(typeof LIFTS)[number]>("Bench Press");
  const [weight, setWeight] = useState(135);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(5);
  const [entries, setEntries] = useState<LiftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadEntries() {
    try {
      const response = await fetch("/api/lifts", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load your history");
      const data = (await response.json()) as { entries: LiftEntry[] };
      setEntries(data.entries);
    } catch {
      toast.error("Your workout history is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadEntries(); }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "log_gym_lift",
      title: "Log gym lift",
      description: "Save one completed major lift with its weight in pounds, number of sets, and reps.",
      inputSchema: {
        type: "object",
        properties: {
          lift: { type: "string", enum: [...LIFTS] },
          weight: { type: "number", exclusiveMinimum: 0, maximum: 2000 },
          sets: { type: "integer", minimum: 1, maximum: 99 },
          reps: { type: "integer", minimum: 1, maximum: 99 },
        },
        required: ["lift", "weight", "sets", "reps"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const value = input as { lift?: string; weight?: number; sets?: number; reps?: number };
        if (!LIFTS.includes(value.lift as (typeof LIFTS)[number]) || typeof value.weight !== "number" || value.weight <= 0 || typeof value.sets !== "number" || typeof value.reps !== "number" || !Number.isInteger(value.sets) || !Number.isInteger(value.reps)) {
          throw new Error("Provide a supported lift, positive weight, and whole-number sets and reps.");
        }
        const response = await fetch("/api/lifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        });
        if (!response.ok) throw new Error("The lift could not be saved.");
        const data = (await response.json()) as { entry: LiftEntry };
        setEntries((current) => [data.entry, ...current]);
        return { saved: true, entry: data.entry };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  const selectedHistory = useMemo(() => entries.filter((entry) => entry.lift === lift), [entries, lift]);
  const best = useMemo(() => selectedHistory.reduce((max, entry) => Math.max(max, entry.weight), 0), [selectedHistory]);

  async function saveLift() {
    if (weight <= 0 || sets < 1 || reps < 1) {
      toast.error("Enter a valid weight, set, and rep count.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/lifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lift, weight, sets, reps }),
      });
      if (!response.ok) throw new Error("Save failed");
      const data = (await response.json()) as { entry: LiftEntry };
      setEntries((current) => [data.entry, ...current]);
      toast.success(`${lift} logged`, { description: `${sets} × ${reps} at ${weight} lb` });
    } catch {
      toast.error("Could not save this lift. Your values are still here.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: number) {
    const previous = entries;
    setEntries((current) => current.filter((entry) => entry.id !== id));
    try {
      const response = await fetch(`/api/lifts?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      toast.success("Entry removed");
    } catch {
      setEntries(previous);
      toast.error("Could not remove that entry.");
    }
  }

  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      <Toaster theme="dark" richColors position="top-center" />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-7 sm:pt-8">
        <header className="mb-7 flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f2ff57] text-black shadow-[0_0_28px_rgba(242,255,87,.18)]">
              <Dumbbell aria-hidden="true" size={23} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-[-0.04em]">LIFT LOG</h1>
              <p className="text-sm text-zinc-500">Train. Track. Add weight.</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm font-semibold text-zinc-400 sm:flex">
            <BarChart3 size={17} aria-hidden="true" /> {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]">
          <section className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#111317] shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f2ff57]">Current set</p><h2 className="mt-1 text-lg font-bold">Log a lift</h2></div>
              {best > 0 && <div className="flex items-center gap-2 rounded-full bg-[#f2ff57]/10 px-3 py-2 text-xs font-bold text-[#f2ff57]"><Trophy size={14} aria-hidden="true" />Best {best} lb</div>}
            </div>

            <div className="space-y-7 p-5 sm:p-7">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-zinc-400">Exercise</span>
                <div className="relative">
                  <select value={lift} onChange={(event) => setLift(event.target.value as (typeof LIFTS)[number])} className="h-14 w-full appearance-none rounded-xl border border-white/10 bg-[#191c21] px-4 pr-11 text-base font-bold text-white outline-none transition focus:border-[#f2ff57]/70 focus:ring-4 focus:ring-[#f2ff57]/10">
                    {LIFTS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                </div>
              </label>

              <div>
                <div className="mb-3 flex items-end justify-between">
                  <label htmlFor="weight" className="text-sm font-semibold text-zinc-400">Weight</label>
                  <button type="button" onClick={() => setWeight(0)} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition hover:text-white"><RotateCcw size={13} aria-hidden="true" /> Reset</button>
                </div>
                <div className="flex items-end gap-2 border-b border-white/10 pb-5">
                  <input id="weight" type="number" min="0" step="0.5" inputMode="decimal" value={weight} onChange={(event) => setWeight(Math.max(0, Number(event.target.value)))} className="min-w-0 flex-1 bg-transparent text-[3.8rem] font-black leading-none tracking-[-0.065em] text-white outline-none sm:text-[4.8rem]" aria-label="Weight in pounds" />
                  <span className="pb-1 text-xl font-bold text-zinc-500">LB</span>
                </div>
                <p className="mb-3 mt-5 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Quick add</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {INCREMENTS.map((amount) => <button key={amount} type="button" onClick={() => setWeight((current) => Number((current + amount).toFixed(1)))} className="min-h-12 rounded-xl border border-white/10 bg-[#191c21] text-sm font-extrabold transition hover:border-[#f2ff57]/50 hover:bg-[#f2ff57]/10 active:scale-95" aria-label={`Add ${amount} pounds`}><span className="text-[#f2ff57]">+</span>{amount}</button>)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Counter label="Sets" value={sets} onChange={setSets} />
                <Counter label="Reps" value={reps} onChange={setReps} />
              </div>
              <button type="button" onClick={saveLift} disabled={saving} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#f2ff57] px-5 text-base font-black text-black shadow-[0_12px_34px_rgba(242,255,87,.14)] transition hover:bg-[#f7ff86] active:scale-[.99] disabled:cursor-wait disabled:opacity-60">
                {saving ? "Saving…" : <><Check size={20} strokeWidth={3} aria-hidden="true" /> Log workout</>}
              </button>
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-white/10 bg-[#111317] lg:sticky lg:top-7">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3"><History className="text-[#f2ff57]" size={20} aria-hidden="true" /><h2 className="text-lg font-bold">Recent lifts</h2></div>
              <span className="text-xs font-semibold text-zinc-500">Latest 30</span>
            </div>
            <div className="max-h-[650px] overflow-y-auto p-3 sm:p-4">
              {loading ? <div className="space-y-3 p-1" aria-label="Loading workout history">{[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-white/5" />)}</div> : entries.length === 0 ? (
                <div className="grid min-h-56 place-items-center px-6 text-center"><div><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-white/5 text-zinc-500"><Dumbbell size={21} aria-hidden="true" /></div><h3 className="font-bold">No lifts logged yet</h3><p className="mt-1 text-sm leading-6 text-zinc-500">Your workout history will appear here.</p></div></div>
              ) : <div className="space-y-2">{entries.map((entry) => {
                const liftBest = Math.max(...entries.filter((item) => item.lift === entry.lift).map((item) => item.weight));
                return <article key={entry.id} className="group flex items-center gap-3 rounded-xl border border-transparent bg-[#191c21] p-4 transition hover:border-white/10">
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-bold">{entry.lift}</h3>{entry.weight === liftBest && <span className="rounded bg-[#f2ff57]/10 px-1.5 py-0.5 text-[10px] font-black text-[#f2ff57]">BEST</span>}</div><p className="mt-1 text-xs text-zinc-500">{formatDate(entry.createdAt)}</p></div>
                  <div className="shrink-0 text-right"><p className="text-base font-black">{entry.weight} <span className="text-xs text-zinc-500">lb</span></p><p className="text-xs font-semibold text-zinc-500">{entry.sets} × {entry.reps}</p></div>
                  <button type="button" onClick={() => void deleteEntry(entry.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400 focus-visible:bg-red-500/10 focus-visible:text-red-400" aria-label={`Delete ${entry.lift} entry`}><Trash2 size={16} /></button>
                </article>;
              })}</div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="rounded-xl border border-white/10 bg-[#191c21] p-3">
    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-zinc-300 transition hover:bg-white/10 active:scale-95" aria-label={`Decrease ${label.toLowerCase()}`}><Minus size={17} /></button>
      <strong className="text-2xl font-black">{value}</strong>
      <button type="button" onClick={() => onChange(Math.min(99, value + 1))} className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-zinc-300 transition hover:bg-white/10 active:scale-95" aria-label={`Increase ${label.toLowerCase()}`}><Plus size={17} /></button>
    </div>
  </div>;
}
