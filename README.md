# Lalu Portfolio - Backend

This directory contains the backend service for the AI-powered portfolio chatbot. It is a serverless application built with Node.js, Express, and TypeScript, designed to be deployed on AWS Lambda.

## Features

- **AI Chat**: Leverages Google Gemini and a RAG (Retrieval-Augmented Generation) pipeline with Pinecone to answer questions about Lalu's resume.
- **Text-to-Speech (TTS)**: Provides an endpoint to convert the AI's text responses into speech using the VoiceRSS API.
- **Question Suggestions**: Generates relevant follow-up questions to guide the conversation.
- **Serverless Architecture**: Built with the Serverless Framework for easy deployment and scalability on AWS Lambda.
- **Local Development**: Can be run locally for development and testing.

## Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Serverless**: [Serverless Framework](https://www.serverless.com/)
- **AI**:
  - **LLM**: [Google Gemini](https://deepmind.google/technologies/gemini/)
  - **Vector Database**: [Pinecone](https://www.pinecone.io/)
- **TTS**: [VoiceRSS](http://www.voicerss.org/)
- **Deployment**: [AWS Lambda](https://aws.amazon.com/lambda/)

## Project Structure

```
apps/backend/
├── src/
│   ├── index.ts            # Express app setup and local server entry point
│   ├── lambda.ts           # AWS Lambda handler entry point
│   ├── routes/
│   │   ├── ask.ts          # Handles chat questions and suggestions (RAG logic)
│   │   └── tts.ts          # Handles Text-to-Speech requests
│   └── services/
│       ├── gemini.ts       # Google Gemini API client and helpers
│       ├── pinecone.ts     # Pinecone vector database client
│       └── tts.ts          # VoiceRSS API client for TTS
├── scripts/
│   ├── import_embeddings.ts # Script to process resume.json and upload to Pinecone
│   └── clear_pinecone_index.ts # Script to clear all data from the Pinecone index
├── frontend_data/
│   └── resume.json         # The source of truth for the AI's knowledge
├── .env.example            # Example environment variables
├── package.json            # Project dependencies and scripts
└── serverless.yml          # Serverless Framework configuration
```

## API Endpoints

- `POST /api/ask`: The main endpoint for asking questions.
  - **Body**: `{ "question": "Your question here" }`
- `POST /api/suggest`: Generates initial conversation starter questions.
- `POST /api/tts`: Converts text to speech.
  - **Body**: `{ "text": "The text to convert to speech" }`

## Getting Started

### Prerequisites

- Node.js (v18.x or later)
- An AWS account for deployment
- API keys for:
  - Google Gemini
  - Pinecone
  - VoiceRSS

### 1. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the `apps/backend` directory by copying the `.env.example` file:

```bash
cp .env.example .env
```

Update the `.env` file with your credentials:

```
PORT=8080
GOOGLE_API_KEY=...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX=...
SYSTEM_PROMPT=You are Lalu's AI twin. Use the provided context to answer in first-person concisely.
VOICERSS_API_KEY=...
```

### 3. Populate the Vector Database

Before you can ask questions, you need to process the `resume.json` file and store its embeddings in your Pinecone index.

Make sure the `frontend_data/resume.json` file is present. Then, run the import script:

```bash
npm run import:embeddings
```

This script will chunk the resume data, create embeddings using the Gemini API, and upload them to Pinecone.

## Development

To run the backend server locally for development, use the `dev` script:

```bash
npm run dev
```

This will start a local server (usually on `http://localhost:8080`) with hot-reloading enabled.

You can also simulate the AWS Lambda environment locally using `serverless-offline`:

```bash
serverless offline start
```

## Deployment

To deploy the backend service to your AWS account, use the Serverless Framework CLI:

```bash
serverless deploy
```

This command will package the application, create the necessary AWS resources (like the Lambda function and API Gateway), and deploy the code.
