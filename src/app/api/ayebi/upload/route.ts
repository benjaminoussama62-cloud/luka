import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/storage/database";
import { getSessionFromCookies } from "@/lib/auth-server";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "ayebi");
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Connectez-vous pour téléverser." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const slug = String(form.get("slug") ?? "").trim();
  const license = String(form.get("license") ?? "CC BY-SA 4.0").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Format image non supporté." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 4 Mo)." }, { status: 400 });
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const id = crypto.randomUUID();
  const filename = `${id}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buf);

  getDb()
    .prepare(
      `INSERT INTO ayebi_uploads (id, slug, filename, mime, license, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, slug || null, filename, file.type, license, session.id, new Date().toISOString());

  const url = `/uploads/ayebi/${filename}`;
  return NextResponse.json({ url, id, license });
}
