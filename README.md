# Backend Application

This is the backend application for the Lalu Portfolio project.

## Technologies Used

- Node.js
- Express.js
- TypeScript
- Google Generative AI (for AI functionalities)
- Pinecone (for vector database operations)
- Axios (for HTTP requests)
- CORS (for handling Cross-Origin Resource Sharing)
- Dotenv (for environment variable management)

## Installation

1.  Navigate to the `backend` directory:
    ```bash
    cd apps/backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## Configuration

Create a `.env` file in the `backend` directory based on the `.env.example` file:

```
PORT=8080
OPENAI_API_KEY=sk-REPLACE_ME

# Pinecone
PINECONE_API_KEY=pc-REPLACE_ME
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX=lalu-portfolio-index

# Prompt / behavior
SYSTEM_PROMPT=You are Lalu's AI twin. Use the provided context to answer in first-person concisely.
```

Replace `REPLACE_ME` with your actual API keys and configure other variables as needed.

## Development

To run the development server with automatic restarts on file changes:

```bash
npm run dev
```

The server will typically run on `http://localhost:8080` (or the `PORT` specified in your `.env` file).

## Building for Production

To build the TypeScript code into JavaScript:

```bash
npm run build
```

This will compile the TypeScript files from `src` into the `build` directory.

## Running in Production

To start the compiled application:

```bash
npm run start
```

## Importing Embeddings

To import embeddings (e.g., resume data) into Pinecone:

```bash
npm run import:embeddings
```

This script uses `dotenv` to load environment variables, so ensure your `.env` file is correctly configured with Pinecone credentials.