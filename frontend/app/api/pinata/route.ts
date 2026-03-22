import { NextResponse } from "next/server";

const PINATA_JWT = process.env.PINATA_JWT;

export async function POST(req: Request) {
  if (!PINATA_JWT) {
    return NextResponse.json(
      { error: "Pinata JWT not configured on server" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 },
    );
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: { message, timestamp: Date.now() },
      pinataMetadata: { name: "ChainWill Vault Message" },
    }),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => "");

    return NextResponse.json(
      { error: details || `Pinata upload failed: ${res.statusText}` },
      { status: res.status },
    );
  }

  const data = await res.json();

  return NextResponse.json({ cid: data.IpfsHash });
}
