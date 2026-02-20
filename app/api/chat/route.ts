import OpenAI from "openai";
import dotenv from "dotenv";

export const runtime = "nodejs";
dotenv.config();

type IncomingMessage = {
  role?: string;
  content?: unknown;
  parts?: Array<{ type?: string; text?: unknown }>;
};

type SupportedChatMessage =
  | OpenAI.Chat.Completions.ChatCompletionUserMessageParam
  | OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam
  | OpenAI.Chat.Completions.ChatCompletionSystemMessageParam;

function extractMessageText(message: IncomingMessage): string {
  if (typeof message?.content === "string") {
    return message.content;
  }

  if (Array.isArray(message?.parts)) {
    return message.parts
      .filter((part) => part?.type === "text" && typeof part?.text === "string")
      .map((part) => part.text as string)
      .join("\n")
      .trim();
  }

  return "";
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response("OPENAI_API_KEY is not configured", { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { messages } = await req.json();
    const normalizedMessages: IncomingMessage[] = Array.isArray(messages) ? messages : [];
    const latestUserMessage = [...normalizedMessages]
      .reverse()
      .find((message) => message?.role === "user");
    const latestMessage = extractMessageText(latestUserMessage ?? {});

    if (!latestMessage) {
      return new Response("Request is missing user message text", { status: 400 });
    }

    const chatHistory = normalizedMessages.reduce<SupportedChatMessage[]>((acc, message) => {
        const content = extractMessageText(message);
        const role = message?.role;

        if (!content) {
          return acc;
        }

        if (role === "user") {
          acc.push({
            role: "user",
            content,
          } satisfies OpenAI.Chat.Completions.ChatCompletionUserMessageParam);
          return acc;
        }
        if (role === "assistant") {
          acc.push({
            role: "assistant",
            content,
          } satisfies OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam);
          return acc;
        }
        if (role === "system") {
          acc.push({
            role: "system",
            content,
          } satisfies OpenAI.Chat.Completions.ChatCompletionSystemMessageParam);
          return acc;
        }

        return acc;
      }, []);

    let docContext = "";

    // Create embedding
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
      encoding_format: "float",
    });

    const hasAstraConfig = Boolean(
      process.env.ASTRA_DB_API_ENDPOINT &&
        process.env.ASTRA_DB_NAMESPACE &&
        process.env.ASTRA_DB_COLLECTION &&
        process.env.ASTRA_DB_APPLICATION_TOKEN
    );

    try {
      if (!hasAstraConfig) {
        throw new Error("Astra env vars are missing");
      }

      // Call Astra REST API for vector search
      const response = await fetch(
        `${process.env.ASTRA_DB_API_ENDPOINT}/api/json/v1/${process.env.ASTRA_DB_NAMESPACE}/${process.env.ASTRA_DB_COLLECTION}?vector=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cassandra-token": process.env.ASTRA_DB_APPLICATION_TOKEN as string,
          },
          body: JSON.stringify({
            vector: embedding.data[0].embedding,
            limit: 10,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Astra API error: ${response.statusText}`);
      }

      const json = await response.json();
      const docsMap = json?.data?.map((doc) => doc.document?.text);
      docContext = JSON.stringify(docsMap);
    } catch (err) {
      console.error("Error querying Astra REST API:", err);
      docContext = "";
    }

    const systemPrompt: OpenAI.Chat.Completions.ChatCompletionSystemMessageParam = {
      role: "system",
      content: `You are an AI assistant who knows everything about Formula One.
Use the below context to augment what you know about Formula One racing.
The context will provide you with the most recent page data from Wikipedia,
the official F1 website, and others.
If the context doesn't include the information you need, answer based on your
existing knowledge, and don't mention the source of your information or
what the context does or doesn't include.
Format responses using markdown where applicable and don't return images.

--------------------
START CONTEXT
${docContext}
END CONTEXT
--------------------
QUESTION: ${latestMessage}
--------------------
      `,
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [systemPrompt, ...chatHistory],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("Error handling request:", err);
    const status =
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      typeof (err as { status?: unknown }).status === "number"
        ? ((err as { status: number }).status ?? 500)
        : 500;

    if (status === 429) {
      return new Response(
        "OpenAI quota exceeded. Add billing/credits to your OpenAI project, then retry.",
        { status: 429 }
      );
    }

    const message = err instanceof Error ? err.message : "Internal Server Error";
    return new Response(message, { status });
  }
}
