const Bubble = ({ message }: { message: any }) => {
  const { content, role, parts } = message;

  const renderedContent =
    typeof content === "string" && content.trim().length > 0
      ? content
      : Array.isArray(parts)
        ? parts
            .filter(
              (part: any) =>
                part?.type === "text" && typeof part?.text === "string"
            )
            .map((part: any) => part.text)
            .join("\n")
        : "";

  return (
    <div className={`bubble ${role}`}>
      {renderedContent}
    </div>
  );
};

export default Bubble;
