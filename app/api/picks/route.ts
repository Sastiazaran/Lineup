import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadTinoBoard, PickSaveError, savePick } from "@/lib/picks-store";

/**
 * Tino board: upcoming games, the caller's picks, and hit rate. Settles due picks first.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const board = await loadTinoBoard(session.userId);
  return NextResponse.json(board);
}

/**
 * Saves a winner pick (home, away, or draw for soccer) for one snapshot event.
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { eventId?: string; selection?: string };
  if (!body.eventId?.trim() || !body.selection) {
    return NextResponse.json({ error: "eventId and selection are required." }, { status: 400 });
  }

  try {
    const board = await savePick(session.userId, {
      eventId: body.eventId.trim(),
      selection: body.selection,
    });
    return NextResponse.json(board);
  } catch (error) {
    if (error instanceof PickSaveError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export const dynamic = "force-dynamic";
