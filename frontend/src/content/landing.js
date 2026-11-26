// Item photos live in /public/images (see public/images/README.txt)
const spotOverflowingBin = { url: "/images/overflowing-bin.png" };
const spotBlockedDrain = { url: "/images/blocked-drain.png" };
const spotRoadsideDump = { url: "/images/roadside-dump.png" };
const bananaPeel = { url: "/images/banana-peel.png" };
const newspaper = { url: "/images/newspaper.png" };
const tinCan = { url: "/images/tin-can.png" };
const battery = { url: "/images/old-battery.png" };
const cflBulb = { url: "/images/cfl-bulb.png" };
const nav = [
  { label: "How it works", href: "#how" },
  { label: "Categories", href: "#categories" },
  { label: "Features", href: "#features" },
  { label: "For Nagar Nigam", href: "#nigam" },
  { label: "FAQ", href: "#faq" }
];
const links = {
  report: "/report",
  admin: "/admin",
};
const hero = {
  badge: "Snap. Sort. Alert.",
  title: "A Cleaner City Is In Your Hands",
  sub: "Report garbage, help your city stay clean, with just a click.",
  chips: ["AI waste sorting", "Auto GPS location", "Instant alert"]
};
const steps = [
  { t: "Click Photo", d: "Snap a picture of the garbage you spot." },
  { t: "AI Sorts the Waste", d: "Our model identifies the waste category." },
  { t: "Auto Location Captured", d: "GPS tags the exact spot automatically." },
  { t: "Nagar Nigam Alerted", d: "The municipal team gets the report instantly." }
];
const categories = [
  { k: "bio", t: "Biodegradable", items: ["Food waste", "Paper", "Cardboard"], tip: "Compost it or keep it in the green bin." },
  { k: "nonbio", t: "Non-biodegradable", items: ["Plastic", "Metal", "Glass", "Clothes"], tip: "Keep it clean and dry for recycling." },
  { k: "hazard", t: "Hazardous", items: ["Batteries"], tip: "Never mix with regular waste; hand over separately." }
];
const features = [
  { t: "AI image classification", d: "Photos are sorted into waste categories automatically." },
  { t: "Automatic GPS location", d: "No typing addresses — location is attached for you." },
  { t: "Instant alerts", d: "Municipal teams are notified as soon as you report." },
  { t: "Live waste map", d: "See reported spots across the city on one map." },
  { t: "Status tracking", d: "Follow each report: Reported, In Progress, Resolved." },
  { t: "Analytics for officials", d: "Category and area insights to plan better." }
];
const nigam = ["Live complaint map", "Complaint management", "Staff assignment", "Category analytics"];
const why = {
  text: "Clean public spaces make healthier neighbourhoods. Click-2-Clean connects citizens directly with municipal teams so garbage gets noticed, sorted and cleared faster.",
  badges: ["SDG 9: Industry, Innovation and Infrastructure", "SDG 16: Peace, Justice and Strong Institutions"]
};
const faq = [
  { q: "How does it work?", a: "Take a photo of the garbage, the app suggests its waste type, adds your location and sends the report to the municipal team." },
  { q: "Which waste types does it recognise?", a: "Three broad groups: biodegradable, non-biodegradable and hazardous. The AI can make mistakes, so reports can be corrected." },
  { q: "Is my location shared?", a: "Only the location of the reported waste is attached to the report so the team can find it. It is used for cleanup, nothing else." },
  { q: "What happens after I report?", a: "The report appears on the Nagar Nigam dashboard, gets assigned to staff, and its status updates as it is handled." },
  { q: "Is it free to use?", a: "Yes. It is a free student project for citizens." }
];
const faqDecor = { sticker: "Got questions?", still: "Still curious?" };
const credits = {
  mentor: "Faculty mentor: Dr. Manish Dixit",
  team: "Team: Sneha Parmar, Sharun Mourya",
  note: "A student project by MITS Gwalior. Not officially affiliated with Gwalior Nagar Nigam."
};
const stickers = ["No forms. Just a click.", "Snap. Sort. Alert."];
const bins = [
  { k: "bio", label: "Wet", bin: "Green bin" },
  { k: "nonbio", label: "Dry", bin: "Blue bin" },
  { k: "hazard", label: "Hazardous", bin: "Red bin" }
];
const wasteItems = [
  { name: "Banana peel", img: bananaPeel.url, bin: 0, hint: "Food scraps go in the green Wet bin." },
  { name: "Vegetable scraps", img: "", bin: 0, hint: "Kitchen waste goes in the green Wet bin." },
  { name: "Newspaper", img: newspaper.url, bin: 1, hint: "Clean, dry paper goes in the blue Dry bin." },
  { name: "Plastic bottle", img: "", bin: 1, hint: "Plastic goes in the blue Dry bin." },
  { name: "Tin can", img: tinCan.url, bin: 1, hint: "Metal goes in the blue Dry bin." },
  { name: "Glass jar", img: "", bin: 1, hint: "Glass goes in the blue Dry bin." },
  { name: "Old battery", img: battery.url, bin: 2, hint: "Batteries are hazardous: red bin." },
  { name: "Medicine strip", img: "", bin: 2, hint: "Medicines are hazardous: red bin." },
  { name: "CFL bulb", img: cflBulb.url, bin: 2, hint: "CFL bulbs contain mercury: red bin." },
  { name: "Paint can", img: "", bin: 2, hint: "Paint is hazardous: red bin." }
];
const categoryThumbs = [bananaPeel.url, tinCan.url, battery.url];
const spots = [
  {
    t: "Overflowing bin",
    img: spotOverflowingBin.url,
    alt: "Overflowing garbage bins"
  },
  {
    t: "Blocked drain",
    img: spotBlockedDrain.url,
    alt: "Blocked drain with waste"
  },
  {
    t: "Roadside dump",
    img: spotRoadsideDump.url,
    alt: "Roadside garbage dump"
  }
];
const reportIncludes = "Each report includes your photo, the suggested waste type and the GPS location.";
export {
  bins,
  categories,
  categoryThumbs,
  credits,
  faq,
  faqDecor,
  features,
  hero,
  links,
  nav,
  nigam,
  reportIncludes,
  spots,
  steps,
  stickers,
  wasteItems,
  why
};
