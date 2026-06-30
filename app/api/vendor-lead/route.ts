import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "vendor-leads";

async function uploadFile(file: File | null, folder: string) {
  if (!file || file.size === 0) return null;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  console.log(`📤 Uploading ${file.name} -> ${fileName}`);

  const { error: uploadError } = await serviceClient.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("❌ Storage Upload Error:", uploadError);
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = serviceClient.storage.from(BUCKET).getPublicUrl(fileName);

  return publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    console.log("========== Vendor Lead API Called ==========");

    const form = await req.formData();

    const restaurantName = String(form.get("restaurantName") || "").trim();
    const ownerName = String(form.get("ownerName") || "").trim();
    const mobile = String(form.get("mobile") || "").trim();
    const city = String(form.get("city") || "").trim();
    const fssai = String(form.get("fssai") || "").trim();
    const gst = String(form.get("gst") || "").trim();

    console.log({
      restaurantName,
      ownerName,
      mobile,
      city,
      fssai,
      gst,
    });

    if (!restaurantName || !mobile || !city) {
      return NextResponse.json(
        {
          success: false,
          error: "Restaurant Name, Mobile and City are required.",
        },
        {
          status: 400,
        }
      );
    }

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

    console.log("📥 Inserting into vendor_leads...");

    const { data, error } = await serviceClient
      .from("vendor_leads")
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase Insert Error:", error);
      throw error;
    }

    console.log("✅ Vendor Lead Saved:", data);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("❌ Vendor Lead API Error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Unknown Error",
      },
      {
        status: 500,
      }
    );
  }
}
