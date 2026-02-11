import { useState, useEffect, ReactNode } from "react";
import { twJoin } from "tailwind-merge";

interface TagLineSliderProps {
  tagLines: ReactNode[];
  interval?: number;
  className?: string;
}

const TagLineSlider: React.FC<TagLineSliderProps> = ({ tagLines, interval = 3000, className }) => {
  const [current, setCurrent] = useState(0);
  const [animation, setAnimation] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimation("animate-fade-out-translate");
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % tagLines.length);
        setAnimation("animate-fade-in-translate");
      }, 400); // Match this to the animation-fade-in-translate duration
    }, interval);

    return () => clearInterval(timer);
  }, [tagLines.length, interval]);

  return (
    <div className={twJoin("flex flex-row justify-start items-center", animation, className)}>
      {tagLines[current]}
    </div>
  );
};

export default TagLineSlider;
