/* Thin-line icon set (1.5px stroke) matching the KIT screens. Decorative by default. */
type P = React.SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
  ...props,
});

export const IconHome = (p: P) => (
  <svg {...base(p)}><path d="M3.5 10.5 12 3.5l8.5 7" /><path d="M5.5 9v11h13V9" /><path d="M10 20v-6h4v6" /></svg>
);
export const IconCalendar = (p: P) => (
  <svg {...base(p)}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01M16 16.5h.01" strokeWidth="2.2" /></svg>
);
export const IconUser = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" /></svg>
);
export const IconSearch = (p: P) => (
  <svg {...base(p)}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.8-4.8" /></svg>
);
export const IconArrow = (p: P) => (
  <svg {...base({ className: "arrow", ...p })}><path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" /></svg>
);
export const IconBack = (p: P) => (
  <svg {...base(p)}><path d="M20 12H5M10.5 6.5 5 12l5.5 5.5" /></svg>
);
export const IconChevronLeft = (p: P) => (
  <svg {...base(p)}><path d="m15 5-7 7 7 7" /></svg>
);
export const IconChevronRight = (p: P) => (
  <svg {...base(p)}><path d="m9 5 7 7-7 7" /></svg>
);
export const IconChevronDown = (p: P) => (
  <svg {...base(p)}><path d="m5 9 7 7 7-7" /></svg>
);
export const IconClock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconClose = (p: P) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconMenu = (p: P) => (
  <svg {...base(p)}><path d="M3.5 7h17M3.5 12h17M3.5 17h17" /></svg>
);
export const IconDots = (p: P) => (
  <svg {...base(p)}><circle cx="5.5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18.5" cy="12" r="1.6" /></svg>
);
export const IconLotus = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 4.2c1.9 1.8 2.9 4 2.9 6.4 0 2.3-1 4.4-2.9 6.2-1.9-1.8-2.9-3.9-2.9-6.2 0-2.4 1-4.6 2.9-6.4Z" />
    <path opacity=".85" d="M4 9.2c2.6.2 4.7 1.3 6.2 3.2 1 1.3 1.6 2.7 1.8 4.4-2.6-.1-4.7-1.2-6.2-3.2-1-1.3-1.6-2.7-1.8-4.4Zm16 0c-.2 1.7-.8 3.1-1.8 4.4-1.5 2-3.6 3.1-6.2 3.2.2-1.7.8-3.1 1.8-4.4 1.5-1.9 3.6-3 6.2-3.2Z" />
    <path opacity=".6" d="M2.5 14.5c2.2-.5 4.5-.3 6.4.8 1.3.7 2.3 1.7 3.1 2.9-2.3.9-4.6 1-6.6.1-1.3-.6-2.3-2-2.9-3.8Zm19 0c-.6 1.8-1.6 3.2-2.9 3.8-2 .9-4.3.8-6.6-.1.8-1.2 1.8-2.2 3.1-2.9 1.9-1.1 4.2-1.3 6.4-.8Z" />
  </svg>
);
/* Line versions for the home category discs (shown large — the strip thins the stroke in CSS). */
/* Motion hooks (motion.css, hover on the home strip): ic-draw = the stroke redraws itself (pathLength 1),
   ic-l* / ic-r* = lotus petals that open outward, ic-trace = a highlight that runs along a line. The
   drawings themselves are unchanged — the lotus pairs are the same sub-paths, one <path> each. */
export const IconLotusLine = (p: P) => (
  <svg {...base({ ...p, className: `ic-lotus ${p.className ?? ""}` })}>
    <path d="M12 4.6c1.9 1.9 2.9 4.1 2.9 6.5 0 2.3-1 4.4-2.9 6.3-1.9-1.9-2.9-4-2.9-6.3 0-2.4 1-4.6 2.9-6.5Z" />
    <path className="ic-l1" d="M9.4 8.6C8 7.9 6.5 7.6 5 7.7c0 2.6.8 4.8 2.3 6.5 1.2 1.4 2.8 2.5 4.7 3.2" />
    <path className="ic-r1" d="M14.6 8.6c1.4-.7 2.9-1 4.4-.9 0 2.6-.8 4.8-2.3 6.5-1.2 1.4-2.8 2.5-4.7 3.2" />
    <path className="ic-l2" d="M5.2 11.9c-1.2-.2-2.4-.1-3.7.3.6 2 1.8 3.5 3.5 4.4 1.9 1 4.2 1.3 7 .8" />
    <path className="ic-r2" d="M18.8 11.9c1.2-.2 2.4-.1 3.7.3-.6 2-1.8 3.5-3.5 4.4-1.9 1-4.2 1.3-7 .8" />
  </svg>
);
export const IconFaceLine = (p: P) => (
  <svg {...base(p)}>
    <path className="ic-draw" pathLength={1} d="M13.9 5.3c1.2 1.1 1.8 2.5 1.8 4.1l1.5 2.5c.2.4.1.7-.4.8l-.8.2.1 1.2c0 .4-.2.6-.6.6.4.4.3.8-.1 1 .2 1.4-.5 2.2-1.9 2.2h-1.4c-.4 1-.4 2 0 3.1" />
    <path d="M13.9 5.3c-1.4-1.6-3.4-2.2-5.2-1.6-2.5.8-3.8 3.2-3.5 5.9.2 1.9 1.2 3.2 2.2 4.5.9 1.1 1.2 2.6.8 4.6" />
    <path d="M13.9 5.3c-.9 1.7-2.4 2.8-4.5 3.2.2 1.5-.1 2.8-.9 4" />
    <path d="M6.9 4.6C5.5 2.9 3.3 3.3 2.9 5.1c-.3 1.5.8 2.7 2.4 2.6" />
    <path d="M13.1 10.2c.5.3 1 .3 1.500 0" />
  </svg>
);
export const IconHeadSpaLine = (p: P) => (
  <svg {...base(p)}>
    <path d="M14.4 5.2c1.2 1.1 1.8 2.5 1.8 4.1l1.5 2.5c.2.4.1.7-.4.8l-.8.2.1 1.2c0 .4-.2.6-.6.6.4.4.3.8-.1 1 .2 1.4-.5 2.2-1.9 2.2h-1.4c-.4 1-.4 2 0 3.1" />
    <path d="M14.4 5.2c-1.5-1.7-3.8-2.3-5.9-1.5-2.7 1-4 3.6-3.7 6.5.2 2-.5 3.5-1.3 4.9-.9 1.7-1 3.6-.2 5.8" />
    <path d="M14.4 5.2c-1.1 2-2.8 3.2-5 3.6.4 2.4-.1 4.4-1.1 6.1-1 1.7-1.2 3.6-.6 6" />
    <path className="ic-trace" pathLength={1} d="M14.4 5.2c-1.1 2-2.8 3.2-5 3.6.4 2.4-.1 4.4-1.1 6.1-1 1.7-1.2 3.6-.6 6" />
    <path d="M9.4 8.800c1.300 1.500 1.700 3.300 1.300 5.200-.3 1.500-.1 2.900.6 4.300" />
    <path d="M13.600 10.100c.5.3 1 .3 1.500 0" />
  </svg>
);
export const IconLeafLine = (p: P) => (
  <svg {...base({ ...p, className: `ic-leaf ${p.className ?? ""}` })}>
    <path d="M17.4 3C10.800 4.900 7 9.200 6.900 14.300c0 1.800.5 3.300 1.500 4.600 5.900-1.600 9.400-6.300 9-15.900Z" />
    <path className="ic-draw" pathLength={1} d="M15.300 6.600C11.300 10.900 8.700 15.400 6.200 21.300" />
  </svg>
);
export const IconLeaf =(p: P) => (
  <svg {...base(p)}><path d="M5 19c0-8 5-13.5 14-14-.3 9-5.8 14-14 14Z" /><path d="M5 19 13 11" /></svg>
);
export const IconDrop = (p: P) => (
  <svg {...base(p)}><path d="M12 3.5c3.5 4.3 5.5 7.6 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.6 2-5.9 5.5-10.2Z" /></svg>
);
export const IconFlower = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="2.2" /><path d="M12 9.8C10.3 6.8 10.7 4.2 12 3c1.3 1.2 1.7 3.8 0 6.8Zm0 4.4c1.7 3 1.3 5.6 0 6.8-1.3-1.2-1.7-3.8 0-6.8Zm2.2-2.2c3-1.7 5.6-1.3 6.8 0-1.2 1.3-3.8 1.7-6.8 0Zm-4.4 0c-3 1.7-5.6 1.3-6.8 0 1.2-1.3 3.8-1.7 6.8 0Z" /></svg>
);
export const IconStones = (p: P) => (
  <svg {...base(p)}><ellipse cx="12" cy="17" rx="7.5" ry="3" /><ellipse cx="12" cy="11.2" rx="5.5" ry="2.4" /><ellipse cx="12" cy="6.4" rx="3.4" ry="1.8" /></svg>
);
export const IconHeart = (p: P) => (
  <svg {...base(p)}><path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" /></svg>
);
export const IconGift = (p: P) => (
  <svg {...base(p)}><rect x="3.5" y="9" width="17" height="11.5" rx="1.5" /><path d="M2.5 9h19v-3h-19zM12 6v14.5" /><path d="M12 6C10.5 3 7 3 7 4.8 7 6 9 6 12 6Zm0 0c1.5-3 5-3 5-1.2C17 6 15 6 12 6Z" /></svg>
);
export const IconBell = (p: P) => (
  <svg {...base(p)}><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>
);
export const IconMail = (p: P) => (
  <svg {...base(p)}><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></svg>
);
export const IconPhone = (p: P) => (
  <svg {...base(p)}><path d="M5 3.5h3.5l1.8 4.5-2.3 1.5a11 11 0 0 0 6.5 6.5l1.5-2.3 4.5 1.8V19a1.5 1.5 0 0 1-1.6 1.5C10.5 20 4 13.5 3.5 5.1A1.5 1.5 0 0 1 5 3.5Z" /></svg>
);
export const IconPin = (p: P) => (
  <svg {...base(p)}><path d="M12 21s-6.5-6-6.5-11.2a6.5 6.5 0 1 1 13 0C18.5 15 12 21 12 21Z" /><circle cx="12" cy="9.8" r="2.4" /></svg>
);
export const IconWhatsapp = (p: P) => (
  <svg {...base(p)}><path d="M4 20.5 5.2 16.6A8.5 8.5 0 1 1 8.4 19.4Z" /><path d="M9 8.5c.2 3 2.6 5.8 6 6.5l1.1-1.4-1.9-1-.9.7c-1-.4-2.2-1.6-2.6-2.6l.7-.9-1-1.9Z" /></svg>
);
export const IconInstagram = (p: P) => (
  <svg {...base(p)}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17 7h.01" strokeWidth="2.4" /></svg>
);
export const IconFacebook = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21z" /></svg>
);
export const IconYoutube = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.6 2.6 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3Z" /></svg>
);
export const IconTiktok = (p: P) => (
  <svg {...base(p)}><path d="M14 3.5v11.2a3.8 3.8 0 1 1-3.8-3.8" /><path d="M14 3.5c.4 2.6 2.2 4.4 5 4.6" /></svg>
);
export const IconSend = (p: P) => (
  <svg {...base(p)}><path d="M20.5 3.5 3.5 10.8l7 2.7 2.7 7z" /><path d="m20.5 3.5-10 10" /></svg>
);
export const IconSparkle = (p: P) => (
  <svg {...base(p)}><path d="M11 3.5c.6 4 2.5 6 6.5 6.5-4 .6-5.9 2.5-6.5 6.5-.6-4-2.5-5.9-6.5-6.5 4-.5 5.9-2.5 6.5-6.5Z" /><path d="M18.5 15c.3 1.7 1.1 2.5 2.5 2.8-1.4.3-2.2 1.1-2.5 2.7-.3-1.6-1.1-2.4-2.5-2.7 1.4-.3 2.2-1.1 2.5-2.8Z" /></svg>
);
export const IconInfo = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.5h.01" strokeWidth="2" /></svg>
);
export const IconHourglass = (p: P) => (
  <svg {...base(p)}><path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5c0 5 9 5 9 8.5s-9 3.5-9 8.5M16.5 3.5c0 5-9 5-9 8.5s9 3.5 9 8.5" /></svg>
);
export const IconDoc = (p: P) => (
  <svg {...base(p)}><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4M9 12h6M9 15.5h6M9 8.5h2" /></svg>
);
export const IconCard = (p: P) => (
  <svg {...base(p)}><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M2.5 9.5h19M6 15h4" /></svg>
);
export const IconPaypal = (p: P) => (
  <svg {...base(p)}><path d="M7.5 19.5 10 4.5h5.5c2.8 0 4.2 1.6 3.7 4-.6 3-2.8 4.2-5.6 4.2H11l-1 6.8z" /><path d="M5 17 7.3 3" opacity=".5" /></svg>
);
export const IconLock = (p: P) => (
  <svg {...base(p)}><rect x="5" y="10.5" width="14" height="10" rx="1.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
);
export const IconSettings = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" /></svg>
);
export const IconUsers = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 19.5c.9-3 3.3-4.5 6.5-4.5s5.6 1.5 6.5 4.5" /><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 15.2c1.6.6 2.8 2 3.5 4.3" /></svg>
);
export const IconChat = (p: P) => (
  <svg {...base(p)}><path d="M4 5.5h16v10.5H9l-5 4z" /><path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="2" /></svg>
);
export const IconDoor = (p: P) => (
  <svg {...base(p)}><path d="M6 20.5V4.5l9-1.5v18" /><path d="M15 4.5h3v16M3.5 20.5h17M12 12h.01" strokeWidth="1.6" /></svg>
);
export const IconEdit = (p: P) => (
  <svg {...base(p)}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>
);
export const IconPlay = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M8 5.5v13l10.5-6.5z" /></svg>
);
export const IconStar = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden focusable={false} {...p}><path fill="currentColor" d="M12 2c.5 5.2 2.4 8.9 10 10-7.6 1.1-9.5 4.8-10 10-.5-5.2-2.4-8.9-10-10 7.6-1.1 9.5-4.8 10-10Z" /></svg>
);
export const IconMoon = (p: P) => (
  <svg {...base(p)}><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" /></svg>
);
export const IconSun = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></svg>
);
/* Treatment-group icons (catalog tabs), same 1.5px line as the rest of the set. */
export const IconHand = (p: P) => (
  <svg {...base(p)}>
    <path d="M7.2 12.6V6.4a1.2 1.2 0 0 1 2.400 0v4.800" />
    <path d="M9.600 11V4.600a1.200 1.200 0 0 1 2.400 0V11" />
    <path d="M12 11V5.400a1.200 1.200 0 0 1 2.400 0v6.200" />
    <path d="M14.400 12.200V8a1.200 1.200 0 0 1 2.400 0v6.600c0 3.800-2.200 6.400-5.600 6.400-2.300 0-3.800-1-5-2.900l-2.500-4a1.300 1.300 0 0 1 2.100-1.500l1.400 1.700" />
  </svg>
);
export const IconFoot = (p: P) => (
  <svg {...base(p)}>
    <path d="M9.400 21c-2 0-3.200-1.500-3-3.800.2-2.200 1.400-3.400 1.200-5.800-.2-2.600 1.200-4.400 3.400-4.400 2.400 0 3.700 2.100 3.400 5.300-.2 2.400.9 3.400.7 5.600-.2 1.900-1.600 3.100-3.700 3.100Z" />
    <circle cx="7.800" cy="4.500" r="1" />
    <circle cx="10.900" cy="3.500" r="1.100" />
    <circle cx="14" cy="4.300" r="1" />
    <circle cx="16.400" cy="6.400" r=".9" />
  </svg>
);
export const IconNail = (p: P) => (
  <svg {...base(p)}>
    <path d="M9.800 3h4.400v5.200H9.800z" />
    <path d="M8.300 8.200h7.400l1.600 3.800v7.300a1.700 1.700 0 0 1-1.700 1.700H8.400a1.700 1.700 0 0 1-1.700-1.700V12Z" />
    <path d="M6.700 15.200h10.600" />
  </svg>
);
export const IconLash = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 9.500c2.400 3.300 5.400 5 9 5s6.600-1.700 9-5" />
    <path d="M12 14.500V18M7.700 13.600l-1.300 3.200M16.300 13.600l1.300 3.200M4.500 11.300l-2 2.300M19.500 11.300l2 2.300" />
  </svg>
);
export const IconEye = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 13.500c2.500-3.500 5.500-5.200 9-5.200s6.500 1.700 9 5.200c-2.500 3.500-5.500 5.200-9 5.200s-6.500-1.700-9-5.200Z" />
    <circle cx="12" cy="13.500" r="2.500" />
    <path d="M4.500 6.800C6.800 5.200 9.300 4.400 12 4.400s5.200.8 7.500 2.400" />
  </svg>
);
