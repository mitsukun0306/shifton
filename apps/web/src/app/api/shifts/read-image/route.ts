import Anthropic from "@anthropic-ai/sdk";
import type { Database } from "@shifton/api";
import { todayIn } from "@shifton/core";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  isShiftReaderConfigured,
  MAX_IMAGE_BYTES,
  readShiftsFromImage,
  ShiftReaderError,
  SUPPORTED_IMAGE_TYPES,
  type SupportedImageType,
} from "@/lib/shift-reader";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * シフト表の画像を読み取り、シフトの候補を返す。
 * Web 版は Cookie のセッション、スマホ版は Authorization: Bearer <アクセストークン> で認証する。
 * 読み取り（AI の利用）はログイン中のユーザーだけに許可する。
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return error(401, "ログインが必要です");
  }
  if (!isShiftReaderConfigured) {
    return error(503, "読み取り機能が未設定です（ANTHROPIC_API_KEY を設定してください）");
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return error(400, "画像を選んでください");
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedImageType)) {
    return error(400, "JPEG・PNG・WebP・GIF の画像を選んでください");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return error(413, "画像が大きすぎます（3.5MB まで）");
  }
  const nameOnSheet =
    String(form?.get("nameOnSheet") ?? "")
      .trim()
      .slice(0, 50) || undefined;

  try {
    const result = await readShiftsFromImage({
      image: new Uint8Array(await file.arrayBuffer()),
      mediaType: file.type as SupportedImageType,
      nameOnSheet,
      today: todayIn(),
    });
    return json(result);
  } catch (e) {
    if (e instanceof ShiftReaderError) return error(422, e.message);
    if (e instanceof Anthropic.RateLimitError) {
      return error(429, "読み取りが混み合っています。少し待ってからお試しください");
    }
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic API key is invalid");
      return error(503, "読み取り機能の設定に問題があります（API キーを確認してください）");
    }
    console.error("shift image read failed", e);
    return error(502, "読み取りに失敗しました。時間をおいてお試しください");
  }
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (bearer) {
    const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const { data } = await supabase.auth.getUser(bearer);
    return Boolean(data.user);
  }
  return Boolean(await getCurrentUser());
}

/**
 * スマホ版（Expo の Web 表示を含む）から呼べるようにする。
 * Cookie は使わず Bearer トークンで認証するため、オリジンは限定しない。
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

function error(status: number, message: string) {
  return json({ error: message }, status);
}
