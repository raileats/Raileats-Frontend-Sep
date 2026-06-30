import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "vendor-leads";

async function uploadFile(file: File | null, folder: string) {
  if (!file) return null;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.${ext}`;

  const { error } = await serviceClient.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = serviceClient.storage.from(BUCKET).getPublicUrl(fileName);

  return publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const restaurantName = String(form.get("restaurantName") || "");
    const ownerName = String(form.get("ownerName") || "");
    const mobile = String(form.get("mobile") || "");
    const city = String(form.get("city") || "");
    const fssai = String(form.get("fssai") || "");
    const gst = String(form.get("gst") || "");

    const fssaiPhoto = await uploadFile(
      form.get("fssaiphoto") as File | null,
      "fssai"
    );

    const gstPhoto = await uploadFile(
      form.get("gstphoto") as File | null,
      "gst"
    );

    const kitchenPhoto = await uploadFile(
      form.get("kitchenPhoto") as File | null,
      "kitchen"
    );

    const diningPhoto = await uploadFile(
      form.get("diningPhoto") as File | null,
      "dining"
    );

    const frontPhoto = await uploadFile(
      form.get("frontPhoto") as File | null,
      "front"
    );

    const { error } = await serviceClient.from("vendor_leads").insert({
      restaurant_name: restaurantName,
      owner_name: ownerName,
      mobile,
      city,
      fssai,
      gst,

      fssai_photo_url: fssaiPhoto,
      gst_photo_url: gstPhoto,
      kitchen_photo_url: kitchenPhoto,
      dining_photo_url: diningPhoto,
      front_photo_url: frontPhoto,

      status: "Pending",
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
    });
  } catch (e: any) {
    console.error(e);

    return NextResponse.json(
      {
        success: false,
        error: e.message,
      },
      {
        status: 500,
      }
    );
  }
}
