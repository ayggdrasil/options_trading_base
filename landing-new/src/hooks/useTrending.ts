import { useContext } from "react";
import { TrendingContext } from "../contexts/data/TrendingContext";

export const useTrending = () => {
  const context = useContext(TrendingContext);
  if (context === undefined) {
    throw new Error("useTrending must be used within a TrendingProvider");
  }
  return context;
};
