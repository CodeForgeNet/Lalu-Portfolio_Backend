"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPineconeClient = getPineconeClient;
exports.getIndex = getIndex;
const pinecone_1 = require("@pinecone-database/pinecone");
let pineconeClient = null;
function getPineconeClient() {
    if (!pineconeClient) {
        pineconeClient = new pinecone_1.Pinecone({
            apiKey: process.env.PINECONE_API_KEY || ""
        });
    }
    return pineconeClient;
}
function getIndex(indexName) {
    const client = getPineconeClient();
    return client.index(indexName || process.env.PINECONE_INDEX || "");
}
