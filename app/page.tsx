"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import f1GPTLogo from "./assests/formula_1-logo-brandlogos.net_-512x512.png";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import Bubble from "./components/Bubble";
import PromptSuggestionsRow from "./components/PromptSuggestionsRow";
import LoadingBubble from "./components/LoadingBubble";

const CHIPS = ["All", "2025 Season", "Drivers", "Teams", "History", "Races", "Stats", "News"];

const Home = () => {
  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({
      api: "/api/chat",
    }),
  });
  const [input, setInput] = useState("");
  const [activeChip, setActiveChip] = useState("All");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";
  const noMessages = !messages || messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handlePrompt = (promptText: string) => {
    sendMessage({ text: promptText });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    sendMessage({ text: trimmedInput });
    setInput("");
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">
            <Image src={f1GPTLogo} width={32} height={32} alt="F1GPT" />
            <span className="header-logo-text">
              F1<span>GPT</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* Chips */}
        <div className="chips-row">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              className={`chip ${activeChip === chip ? "active" : ""}`}
              onClick={() => setActiveChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat */}
        <div className="chat-area">
          {noMessages ? (
            <div className="welcome">
              <Image
                className="welcome-logo"
                src={f1GPTLogo}
                width={80}
                height={80}
                alt="F1GPT Logo"
              />
              <h1>
                Welcome to F1<span>GPT</span>
              </h1>
              <p>
                Your personal race engineer is here. Ask anything about Formula
                One — drivers, teams, races, history, standings — and get
                instant, intelligent answers. Lights out and away we go!
              </p>
              <PromptSuggestionsRow onPromptClick={handlePrompt} />
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((message, index) => (
                <Bubble key={`message-${index}`} message={message} />
              ))}
              {isLoading && <LoadingBubble />}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input Bar */}
          <div className="chat-input-bar">
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder="Ask F1GPT anything..."
              />
              <button type="submit" disabled={isLoading || !input.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
