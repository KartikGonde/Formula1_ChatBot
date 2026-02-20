const Bubble = ({ message }) => {
  const { content, role, parts } = message;

  const renderedContent =
    typeof content === "string" && content.trim().length > 0
      ? content
      : Array.isArray(parts)
        ? parts
            .filter((part) => part?.type === "text" && typeof part?.text === "string")
            .map((part) => part.text)
            .join("\n")
        : "";

  return (
    <div className={`${role} bubble`}>
      {renderedContent}
    </div>
  );
};

export default Bubble;
