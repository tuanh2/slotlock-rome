import React, { useState, useEffect } from "react";

const KEYWORDS = [
  "STAKE-TO-RESERVE USDC",
  "SELF-SERVICE DYNAMIC QR",
  "ATOMIC DEPOSIT REFUND",
  "ZERO GHOSTING GUARANTEE",
  "DUAL-LANE EVM & SOLANA CPI",
  "CRYPTOGRAPHIC PRESENCE PROOF",
  "NO MANUAL APPROVAL REQUIRED",
  "INSTANT ESCROW SETTLEMENT",
];

const TICKER_ITEMS = [
  "STAKE-TO-RESERVE",
  "SELF-SERVICE CHECK-IN",
  "DYNAMIC QR PROTOCOL",
  "ATOMIC USDC REFUND",
  "ZERO GHOSTING",
  "ROME EVM ON SOLANA",
  "INSTANT REFUND ON CHECK-IN",
  "NO MANUAL APPROVAL",
  "100% TRANSPARENT ON-CHAIN ESCROW",
  "DUAL-LANE METAMASK & SOLFLARE",
  "400MS SOLANA CPI SETTLEMENT",
];

export const HeroKeywordsTypewriter: React.FC = () => {
  const [keywordIndex, setKeywordIndex] = useState(0);
  const [subText, setSubText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(90);

  useEffect(() => {
    const currentWord = KEYWORDS[keywordIndex];

    const handleTyping = () => {
      if (!isDeleting) {
        setSubText(currentWord.slice(0, subText.length + 1));
        if (subText.length + 1 === currentWord.length) {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), 1800);
          setTypingSpeed(50);
        }
      } else {
        setSubText(currentWord.slice(0, subText.length - 1));
        if (subText.length === 0) {
          setIsDeleting(false);
          setKeywordIndex((prev) => (prev + 1) % KEYWORDS.length);
          setTypingSpeed(90);
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [subText, isDeleting, keywordIndex, typingSpeed]);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        color: "var(--rome-flame)",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        letterSpacing: "0.02em",
        textShadow: "0 0 20px rgba(255, 72, 0, 0.4)",
      }}
    >
      {subText}
      <span className="typewriter-cursor" />
    </span>
  );
};

export const MarqueeTickerRibbon: React.FC = () => {
  return (
    <div className="marquee-ribbon">
      <div className="marquee-content">
        {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, idx) => (
          <span key={idx} className="marquee-item">
            <span className="marquee-glyph">✦</span>
            <span>{item}</span>
          </span>
        ))}
      </div>
      <div className="marquee-content" aria-hidden="true">
        {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, idx) => (
          <span key={"dup-" + idx} className="marquee-item">
            <span className="marquee-glyph">✦</span>
            <span>{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
