import dotenv from "dotenv";
import { getIndex } from "../src/services/pinecone";

dotenv.config();

async function clearIndex() {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    console.error("Please set PINECONE_API_KEY and PINECONE_INDEX in .env");
    process.exit(1);
  }

  try {
    const index = getIndex();
    console.log(`Clearing all vectors from Pinecone index: ${process.env.PINECONE_INDEX}`);
    await index.deleteAll();
    console.log("Pinecone index cleared successfully.");
  } catch (error) {
    console.error("Error clearing Pinecone index:", error);
    process.exit(1);
  }
}

clearIndex().catch((err) => {
  console.error(err);
  process.exit(1);
});
