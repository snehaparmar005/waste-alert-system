import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const pinSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46" aria-hidden="true">
    <path d="M18 1C8.61 1 1 8.61 1 18c0 12.1 17 26.5 17 26.5S35 30.1 35 18C35 8.61 27.39 1 18 1Z" fill="#0B4650" stroke="#fff" stroke-width="1.5"/>
    <circle cx="18" cy="18" r="6.5" fill="#159B43" stroke="#fff" stroke-width="2"/>
  </svg>
`;

export const cleanPinIcon = L.divIcon({
  className: "leaflet-clean-pin",
  html: pinSvg,
  iconSize: [36, 46],
  iconAnchor: [18, 45],
  popupAnchor: [0, -40],
});
