import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const invalidateSize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) {
        map.invalidateSize({ pan: false });
      }
    };
    const timeoutId = window.setTimeout(invalidateSize, 150);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(invalidateSize);

    observer?.observe(container);
    return () => {
      window.clearTimeout(timeoutId);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}
