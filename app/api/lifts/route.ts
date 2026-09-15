import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { liftEntries } from "../../../db/schema";

const ALLOWED_LIFTS = new Set(["Bench Press", "Back Squat", "Deadlift", "Overhead Press", "Barbell Row", "Pull-up"]);

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return message.includes("no such table") ? "Workout storage is not ready yet." : message;
}

export async function GET() {
  try {
    const db = getDb();
    const entries = await db.select().from(liftEntries).orderBy(desc(liftEntries.createdAt), desc(liftEntries.id)).limit(30);
    return Response.json({ entries });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { lift?: string; weight?: number; sets?: number; reps?: number };
    const lift = payload.lift?.trim() ?? "";
    const weight = Number(payload.weight);
    const sets = Number(payload.sets);
    const reps = Number(payload.reps);
    if (!ALLOWED_LIFTS.has(lift)) return Response.json({ error: "Choose a supported lift." }, { status: 400 });
    if (!Number.isFinite(weight) || weight <= 0 || weight > 2000) return Response.json({ error: "Enter a valid weight." }, { status: 400 });
    if (!Number.isInteger(sets) || sets < 1 || sets > 99 || !Number.isInteger(reps) || reps < 1 || reps > 99) {
      return Response.json({ error: "Enter valid sets and reps." }, { status: 400 });
    }
    const db = getDb();
    const [entry] = await db.insert(liftEntries).values({ lift, weight, sets, reps }).returning();
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid entry." }, { status: 400 });
    const db = getDb();
    await db.delete(liftEntries).where(eq(liftEntries.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
