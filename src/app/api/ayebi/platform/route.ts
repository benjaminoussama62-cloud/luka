import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { createCategory, createTemplate, listCategories, listTemplates } from "@/lib/ayebi/platform";

export async function GET() {
  return NextResponse.json({ categories: listCategories(), templates: listTemplates() });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = (await req.json()) as { type?: string; parentId?: string; slug?: string; label?: string; description?: string; name?: string; schema?: Record<string, unknown>; requiredFields?: string[] };
  try {
    if (body.type === "category" && body.slug && body.label) {
      return NextResponse.json({ category: createCategory({ parentId: body.parentId, slug: body.slug, label: body.label, description: body.description }) }, { status: 201 });
    }
    if (body.type === "template" && body.name && body.schema && Array.isArray(body.requiredFields)) {
      return NextResponse.json({ template: createTemplate({ name: body.name, description: body.description, schema: body.schema, requiredFields: body.requiredFields, userId: session.id }) }, { status: 201 });
    }
    return NextResponse.json({ error: "Payload de catégorie ou template invalide." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Création impossible." }, { status: 400 });
  }
}
