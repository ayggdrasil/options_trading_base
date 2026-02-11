import { useState, useEffect, useCallback } from "react";

interface ElementBoundingOption {
  windowScroll?: boolean;
  immediate?: boolean;
}

function useElementBounding(ref: any, options: ElementBoundingOption = {}) {
  const { windowScroll = true, immediate = true } = options;

  const [bounding, setBounding] = useState({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
  });

  const updateBounding = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();

      setBounding({
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        x: rect.left,
        y: rect.top,
      });
    }
  }, [ref]);

  useEffect(() => {
    if (!ref.current) return;

    if (immediate) {
      updateBounding();
    }

    const resizeObserver = new ResizeObserver(() => {
      updateBounding();
    });

    resizeObserver.observe(ref.current);

    if (windowScroll) {
      window.addEventListener("scroll", updateBounding);
    }

    return () => {
      resizeObserver.disconnect();
      if (windowScroll) {
        window.removeEventListener("scroll", updateBounding);
      }
    };
  }, [ref, immediate, windowScroll, updateBounding]);

  return bounding;
}

export default useElementBounding;
