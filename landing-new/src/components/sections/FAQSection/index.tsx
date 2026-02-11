import React, { useState } from "react";
import { twJoin } from "tailwind-merge";

interface FAQItem {
  id: number;
  question: string;
  answer: string[];
  defaultExpanded?: boolean;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 1,
    question: "Why trade options on CallPut instead of perps or brokers?",
    answer: [
      "CallPut offers onchain options trading with defined risk, no liquidations, and 24/7 market access.",
      "Unlike perpetual futures or brokers, trades are executed non-custodially with transparent onchain pricing and settlement."
    ],
    defaultExpanded: true,
  },
  {
    id: 2,
    question: "How does CallPut offer high leverage without liquidations?",
    answer: [
      "Options on CallPut provide leverage through option premiums, not borrowed margin.",
      "This structure caps maximum loss upfront and eliminates liquidation risk common in perpetual futures."
    ],
    defaultExpanded: true,
  },
  {
    id: 3,
    question: "What options can I trade on CallPut?",
    answer: [
      "CallPut starts with BTC and ETH options and will expand to U.S. stock options and additional altcoins over time.",
      "All options are traded as spread strategies for more capital-efficient execution."
    ],
    defaultExpanded: false,
  },
  {
    id: 4,
    question: "Can I really trade options 24/7, even when markets are closed?",
    answer: [
      "Yes. CallPut enables permissionless 24/7 options trading using synthetic pricing and dynamic spread adjustment.",
      "Traders can open, manage, and close positions at any time, without market-hour restrictions."
    ],
    defaultExpanded: false,
  },
  {
    id: 5,
    question: "How does CallPut keep spreads tight in volatile markets?",
    answer: [
      "CallPut uses a proprietary AMM with real-time pricing and adaptive risk premiums.",
      "Spreads adjust dynamically to market conditions to protect liquidity providers while remaining competitive for traders."
    ],
    defaultExpanded: false,
  },
  {
    id: 6,
    question: "How do liquidity providers earn yield on CallPut?",
    answer: [
      "Liquidity providers earn yield from trading fees and risk premiums paid by traders.",
      "Returns depend on market activity, volatility, and overall liquidity pool utilization."
    ],
    defaultExpanded: false,
  },
  {
    id: 7,
    question: "What makes CallPut different from every other options DEX?",
    answer: [
      "CallPut combines AMM-based options liquidity, crypto and stock options, 24/7 permissionless trading, and tokenized positions in a single onchain protocol.",
      "This design delivers consistent liquidity, capital efficiency, and non-custodial access at scale."
    ],
    defaultExpanded: false,
  },
  {
    id: 8,
    question: "Perps vs Options — what’s the difference on CallPut?",
    answer: [
      "Perpetual futures rely on borrowed margin and are exposed to liquidation risk and high, fluctuating funding fees.",
      "Options on CallPut offer significantly higher effective leverage with no liquidation, as leverage is provided through option premiums, making risk and payoff predictable even in volatile markets."
    ],
    defaultExpanded: false,
  },
  {
    id: 9,
    question: "Orderbook-base options vs CallPut options — how is onchain options trading different?",
    answer: [
     "Orderbook-base exchanges require custody and permissioned accounts, and often suffer from high slippage due to limited liquidity providers.",
     "CallPut enables non-custodial, permissionless, and competitively priced 24/7 options trading onchain, with transparent pricing and settlement enforced by smart contracts."
    ],
    defaultExpanded: false,
  },
];

const FAQItemComponent: React.FC<{
  item: FAQItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ item, index, isExpanded, onToggle }) => {
  return (
    <div className="w-full">
      <button
        onClick={onToggle}
        className={twJoin(
          "w-full flex flex-row items-start justify-between",
          "py-[20px]",
          "lg:py-[24px]",
          "cursor-pointer transition-all duration-200"
        )}
      >
        <p
          className="text-graybfbf text-[20px] font-[500] text-left flex-1 pr-[16px]"
        >
          {item.question}
        </p>
        <div className="flex-shrink-0 mt-[2px] text-graybfbf">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={twJoin(
              "transition-transform duration-200",
              isExpanded ? "rotate-180" : "rotate-0"
            )}
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>
      <div
        className={twJoin(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="text-graybfbf text-[16px] text-left font-[400] leading-[23px] pb-[24px]">
          {item.answer.map((paragraph, idx) => (
            <p key={idx} className={idx > 0 ? "mt-[16px]" : ""}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>
      {index < FAQ_ITEMS.length - 1 && (
        <div className="w-full h-[1px] bg-black2023" />
      )}
    </div>
  );
};

const FAQSection: React.FC = () => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(
    new Set(FAQ_ITEMS.map((item, index) => (item.defaultExpanded ? index : -1)).filter((i) => i !== -1))
  );

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <section
      className={twJoin(
        "h-fit w-full flex flex-row items-center justify-center",
        "bg-black1214",
        "px-[28px] py-[64px]",
        "lg:px-[112px] lg:pt-[64px] lg:pb-[120px]"
      )}
    >
      <div
        className={twJoin(
          "h-fit flex flex-col items-center justify-center gap-[20px]",
          "max-w-[584px]",
          "lg:max-w-[1280px]"
        )}
      >
        <h1
          className={twJoin(
            "text-whitef2f2 font-[400] tracking-[-1px]",
            "h-[48px] text-[36px] leading-[48px]",
            "lg:h-[72px] lg:text-[48px] lg:leading-[72px]"
          )}
        >
          FAQs
        </h1>

        <div
          className={twJoin(
            "w-full flex flex-col",
            "bg-transparent",
            // "bg-black181a",
            // "border-[1px] border-black2023",
            "rounded-[24px]",
            "px-[20px] py-[20px]",
            "lg:px-[40px] lg:py-[32px]"
          )}
        >
          {FAQ_ITEMS.map((item, index) => (
            <FAQItemComponent
              key={index}
              item={item}
              index={index}
              isExpanded={expandedItems.has(index)}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

