import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "F1GPT",
  description:
    "Fast cars, even faster answers to your Formula One questions!",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
