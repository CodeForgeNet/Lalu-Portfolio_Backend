import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || ""
    });
  }
  return pineconeClient;
}

export function getIndex(indexName?: string) {
  const client = getPineconeClient();
  return client.index(indexName || process.env.PINECONE_INDEX || "");
}
