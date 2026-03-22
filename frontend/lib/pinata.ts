const GATEWAY    = "https://gateway.pinata.cloud/ipfs";

export async function uploadTextToIPFS(text: string): Promise<string> {
  const res = await fetch("/api/pinata", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: text,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Pinata upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.cid as string;
}

export async function fetchFromIPFS(ipfsHash: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/${ipfsHash}`);
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.statusText}`);
  const data = await res.json();
  return data.message as string;
}
