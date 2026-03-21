const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const GATEWAY    = "https://gateway.pinata.cloud/ipfs";

export async function uploadTextToIPFS(text: string): Promise<string> {
  if (!PINATA_JWT) throw new Error("Pinata JWT not configured");

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: { message: text, timestamp: Date.now() },
      pinataMetadata: { name: "ChainWill Vault Message" },
    }),
  });

  if (!res.ok) throw new Error(`Pinata upload failed: ${res.statusText}`);
  const data = await res.json();
  return data.IpfsHash as string;
}

export async function fetchFromIPFS(ipfsHash: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/${ipfsHash}`);
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.statusText}`);
  const data = await res.json();
  return data.message as string;
}