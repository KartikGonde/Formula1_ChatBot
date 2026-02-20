"use client";
import Image from "next/image";
import { useState } from "react";
import f1GPTLogo from "./assests/formula_1-logo-brandlogos.net_-512x512.png";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import Bubble from "./components/Bubble";
import PromptSuggestionsRow from "./components/PromptSuggestionsRow";
import LoadingBubble from "./components/LoadingBubble";

const Home = () => {
  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({
      api: "/api/chat",
    }),
  });
  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";

  const noMessages = !messages || messages.length === 0;

  const handlePrompt = (promptText) => {
    sendMessage({ text: promptText });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    sendMessage({ text: trimmedInput });
    setInput("");
  };

  return (
    <main>
      <Image src={f1GPTLogo} width="250" alt="F1GPT Logo" />
      <section className={noMessages ? "" : "populated"}>
        {noMessages ? (
          <>
            <p className="starter-text">
              Your personal race engineer is here!
              Ask F1GPT anything about F1 and it will come back to you with the latest answers.
              Lights out and away we go now!
            </p>
            <PromptSuggestionsRow onPromptClick={handlePrompt} />
          </>
        ) : (
          <>
            {messages.map((message, index) => (
              <Bubble key={`message-${index}`} message={message} />
            ))}
            {isLoading && <LoadingBubble />}
          </>
        )}
      </section>
      <form onSubmit={handleSubmit}>
        <input
          className="question-box"
          onChange={(event) => setInput(event.target.value)}
          value={input}
          placeholder="Ask me something..."
        />
        <input type="submit" />
      </form>
    </main>
  );
};

export default Home;
