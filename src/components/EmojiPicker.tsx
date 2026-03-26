import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";

interface EmojiEntry {
  readonly emoji: string;
  readonly keywords: string;
}

const EMOJI_GROUPS: Record<string, EmojiEntry[]> = {
  "Apps & Tools": [
    { emoji: "🖥️", keywords: "desktop computer monitor pc screen" },
    { emoji: "💻", keywords: "laptop computer macbook notebook" },
    { emoji: "📱", keywords: "phone mobile smartphone iphone" },
    { emoji: "⌨️", keywords: "keyboard type input" },
    { emoji: "🖱️", keywords: "mouse click cursor" },
    { emoji: "🔧", keywords: "wrench tool fix repair" },
    { emoji: "🛠️", keywords: "hammer tools build" },
    { emoji: "⚙️", keywords: "gear settings config" },
    { emoji: "🔩", keywords: "bolt screw hardware" },
    { emoji: "📦", keywords: "package box bundle" },
    { emoji: "📁", keywords: "folder directory file" },
    { emoji: "📂", keywords: "folder open directory" },
    { emoji: "🗂️", keywords: "index dividers tabs organize" },
    { emoji: "💾", keywords: "floppy disk save storage" },
    { emoji: "📀", keywords: "dvd disc optical" },
    { emoji: "🧰", keywords: "toolbox kit utility" },
  ],
  "Web & Cloud": [
    { emoji: "🌐", keywords: "globe web internet world browser" },
    { emoji: "🔗", keywords: "link chain url href" },
    { emoji: "🌍", keywords: "earth globe europe africa world" },
    { emoji: "🌎", keywords: "earth globe americas world" },
    { emoji: "🌏", keywords: "earth globe asia australia world" },
    { emoji: "☁️", keywords: "cloud server hosting" },
    { emoji: "📡", keywords: "satellite antenna signal" },
    { emoji: "📶", keywords: "signal wifi wireless network" },
    { emoji: "🛜", keywords: "wifi wireless network internet" },
    { emoji: "🔒", keywords: "lock security private password" },
    { emoji: "🔓", keywords: "unlock open public" },
    { emoji: "🔑", keywords: "key password access auth" },
    { emoji: "🏠", keywords: "house home main page" },
    { emoji: "🏢", keywords: "office building company work" },
  ],
  "AI & Science": [
    { emoji: "🤖", keywords: "robot ai bot machine android" },
    { emoji: "🧠", keywords: "brain mind think intelligence ai" },
    { emoji: "✨", keywords: "sparkles magic ai star shine" },
    { emoji: "💡", keywords: "light bulb idea think" },
    { emoji: "🔬", keywords: "microscope science research lab" },
    { emoji: "🧪", keywords: "test tube experiment science lab" },
    { emoji: "🧬", keywords: "dna gene biology science" },
    { emoji: "⚡", keywords: "lightning bolt electric power fast" },
    { emoji: "🪄", keywords: "magic wand spell wizard" },
    { emoji: "🎯", keywords: "target goal direct bullseye aim" },
    { emoji: "💎", keywords: "gem diamond jewel precious" },
    { emoji: "🔮", keywords: "crystal ball predict future magic" },
    { emoji: "🧿", keywords: "nazar amulet evil eye protect" },
    { emoji: "♾️", keywords: "infinity loop forever endless" },
  ],
  Productivity: [
    { emoji: "📝", keywords: "memo note write edit pencil" },
    { emoji: "📋", keywords: "clipboard checklist list task" },
    { emoji: "✅", keywords: "check done complete task" },
    { emoji: "📌", keywords: "pin pushpin location mark" },
    { emoji: "📎", keywords: "paperclip clip attach" },
    { emoji: "🗓️", keywords: "calendar date schedule event plan" },
    { emoji: "⏰", keywords: "alarm clock time wake" },
    { emoji: "⏱️", keywords: "stopwatch timer time track" },
    { emoji: "📊", keywords: "chart bar graph data analytics" },
    { emoji: "📈", keywords: "chart increase grow trending up" },
    { emoji: "📉", keywords: "chart decrease down trending" },
    { emoji: "🗒️", keywords: "notepad spiral pad memo" },
    { emoji: "📒", keywords: "ledger notebook yellow" },
    { emoji: "📓", keywords: "notebook journal" },
    { emoji: "📔", keywords: "notebook decorative" },
    { emoji: "🔔", keywords: "bell notification alert ring" },
  ],
  Communication: [
    { emoji: "💬", keywords: "speech bubble chat message talk" },
    { emoji: "📧", keywords: "email mail envelope message" },
    { emoji: "📨", keywords: "incoming envelope email receive" },
    { emoji: "📩", keywords: "envelope arrow email send" },
    { emoji: "✉️", keywords: "envelope letter mail" },
    { emoji: "📤", keywords: "outbox send upload tray" },
    { emoji: "📥", keywords: "inbox receive download tray" },
    { emoji: "📣", keywords: "megaphone announce loud speaker" },
    { emoji: "📢", keywords: "loudspeaker announce public" },
    { emoji: "🗣️", keywords: "speaking head talk voice" },
    { emoji: "👥", keywords: "people group team users" },
    { emoji: "🤝", keywords: "handshake deal agree partner" },
  ],
  "Video & Film": [
    { emoji: "🎬", keywords: "clapper movie film video cinema" },
    { emoji: "📹", keywords: "video camera camcorder record" },
    { emoji: "🎥", keywords: "movie camera cinema film shoot" },
    { emoji: "📺", keywords: "television tv screen monitor watch" },
    { emoji: "🎞️", keywords: "film frames reel cinema strip" },
    { emoji: "📽️", keywords: "projector film movie screen cinema" },
    { emoji: "🎙️", keywords: "microphone studio podcast record voice" },
    { emoji: "🎧", keywords: "headphone audio listen music" },
    { emoji: "🎤", keywords: "microphone sing karaoke voice" },
    { emoji: "📷", keywords: "camera photo picture shot" },
    { emoji: "📸", keywords: "camera flash photo snapshot" },
    { emoji: "🖼️", keywords: "frame picture painting gallery" },
  ],
  "Art & Design": [
    { emoji: "🎨", keywords: "palette art paint color design creative" },
    { emoji: "🖌️", keywords: "paintbrush brush art paint stroke" },
    { emoji: "🖍️", keywords: "crayon draw color art kids" },
    { emoji: "✏️", keywords: "pencil write draw edit sketch" },
    { emoji: "🖊️", keywords: "pen write sign ink" },
    { emoji: "✒️", keywords: "nib pen ink calligraphy" },
    { emoji: "🎭", keywords: "theater mask performing arts drama" },
    { emoji: "🧵", keywords: "thread sewing stitch textile" },
    { emoji: "🧶", keywords: "yarn knit crochet craft" },
    { emoji: "📐", keywords: "triangle ruler measure angle design" },
    { emoji: "📏", keywords: "ruler measure straight design" },
    { emoji: "🪡", keywords: "needle sewing stitch" },
    { emoji: "🎪", keywords: "circus tent carnival show" },
    { emoji: "🏛️", keywords: "classical building museum architecture" },
    { emoji: "🗿", keywords: "moai statue stone sculpture" },
  ],
  "Music & Game": [
    { emoji: "🎵", keywords: "music note song sound melody" },
    { emoji: "🎶", keywords: "music notes song melody" },
    { emoji: "🎹", keywords: "piano keyboard music keys instrument" },
    { emoji: "🎸", keywords: "guitar music rock instrument" },
    { emoji: "🥁", keywords: "drum beat music rhythm instrument" },
    { emoji: "🎺", keywords: "trumpet brass music instrument" },
    { emoji: "🎻", keywords: "violin string music instrument" },
    { emoji: "🎮", keywords: "game controller play video gamepad" },
    { emoji: "🕹️", keywords: "joystick game arcade retro" },
    { emoji: "🎲", keywords: "dice game random chance board" },
    { emoji: "♟️", keywords: "chess piece strategy board game" },
    { emoji: "🧩", keywords: "puzzle piece jigsaw game" },
  ],
  Learning: [
    { emoji: "📚", keywords: "books library read study stack" },
    { emoji: "📖", keywords: "book open read page" },
    { emoji: "🎓", keywords: "graduation cap education school" },
    { emoji: "🏫", keywords: "school building education" },
    { emoji: "📕", keywords: "book closed red" },
    { emoji: "📗", keywords: "book green" },
    { emoji: "📘", keywords: "book blue" },
    { emoji: "📙", keywords: "book orange" },
    { emoji: "🔍", keywords: "search magnify find look" },
    { emoji: "🧑‍💻", keywords: "technologist coder developer programmer" },
    { emoji: "👨‍💻", keywords: "man technologist coder developer" },
    { emoji: "👩‍💻", keywords: "woman technologist coder developer" },
  ],
  "News & Media": [
    { emoji: "📰", keywords: "newspaper news article press daily" },
    { emoji: "🗞️", keywords: "newspaper rolled news press" },
    { emoji: "📡", keywords: "satellite broadcast antenna news" },
    { emoji: "📺", keywords: "television tv screen news broadcast" },
    { emoji: "📻", keywords: "radio broadcast news fm am" },
    { emoji: "🗳️", keywords: "ballot box vote election politics" },
    { emoji: "📢", keywords: "loudspeaker announce news alert public" },
    { emoji: "📣", keywords: "megaphone announce news breaking" },
    { emoji: "🔔", keywords: "bell notification alert news update" },
    { emoji: "🌍", keywords: "globe world news international" },
    { emoji: "🏛️", keywords: "government politics parliament news" },
    { emoji: "⚖️", keywords: "balance scale justice law court" },
    { emoji: "💹", keywords: "chart stock market finance economy news" },
    { emoji: "🏟️", keywords: "stadium sports event news" },
  ],
  "Faces & People": [
    { emoji: "😀", keywords: "grinning face smile happy" },
    { emoji: "😎", keywords: "sunglasses cool face" },
    { emoji: "🤓", keywords: "nerd face glasses geek" },
    { emoji: "🥸", keywords: "disguise face costume glasses mustache" },
    { emoji: "🤡", keywords: "clown face costume funny circus" },
    { emoji: "👻", keywords: "ghost face costume halloween spooky" },
    { emoji: "👽", keywords: "alien face extraterrestrial space" },
    { emoji: "🎃", keywords: "jack o lantern pumpkin halloween costume" },
    { emoji: "🦸", keywords: "superhero hero costume cape power" },
    { emoji: "🦹", keywords: "supervillain villain costume evil" },
    { emoji: "🧙", keywords: "wizard mage magic costume" },
    { emoji: "🧛", keywords: "vampire dracula costume halloween" },
    { emoji: "🧟", keywords: "zombie undead costume halloween" },
    { emoji: "🧜", keywords: "mermaid merman costume fantasy" },
    { emoji: "🥷", keywords: "ninja stealth costume warrior" },
    { emoji: "🧑‍🎄", keywords: "santa claus christmas costume holiday" },
    { emoji: "👑", keywords: "crown king queen royal costume" },
    { emoji: "🎩", keywords: "top hat magician costume formal" },
    { emoji: "🎭", keywords: "theater mask costume drama performing" },
    { emoji: "👺", keywords: "goblin tengu mask costume japanese" },
    { emoji: "👹", keywords: "ogre oni mask costume japanese demon" },
    { emoji: "🤖", keywords: "robot face android machine ai" },
    { emoji: "💀", keywords: "skull skeleton death halloween costume" },
    { emoji: "🐲", keywords: "dragon face costume fantasy mythical" },
  ],
  Misc: [
    { emoji: "🚀", keywords: "rocket launch fast ship space" },
    { emoji: "🔥", keywords: "fire hot flame trending" },
    { emoji: "⭐", keywords: "star favorite best" },
    { emoji: "🌟", keywords: "glowing star shine bright" },
    { emoji: "💪", keywords: "strong muscle power flex" },
    { emoji: "🎉", keywords: "party tada celebrate confetti" },
    { emoji: "🏆", keywords: "trophy winner champion award" },
    { emoji: "❤️", keywords: "heart love red" },
    { emoji: "💜", keywords: "heart purple love" },
    { emoji: "💙", keywords: "heart blue love" },
    { emoji: "💚", keywords: "heart green love" },
    { emoji: "💛", keywords: "heart yellow love" },
    { emoji: "🧡", keywords: "heart orange love" },
    { emoji: "☕", keywords: "coffee hot drink cup tea" },
    { emoji: "🍕", keywords: "pizza food slice" },
    { emoji: "🐱", keywords: "cat face pet kitten" },
  ],
};

interface EmojiPickerProps {
  readonly value: string;
  readonly fallback: string;
  readonly history?: readonly string[];
  readonly onSelect: (emoji: string) => void;
  readonly onOpenChange?: (open: boolean) => void;
}

const GROUP_KEYS = Object.keys(EMOJI_GROUPS);
const HISTORY_KEY = "History";

export function EmojiPicker({ value, fallback, history = [], onSelect, onOpenChange }: EmojiPickerProps) {
  const { t } = useI18n();
  const [open, setOpenRaw] = useState(false);

  const setOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setOpenRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      if (next !== prev) onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState(history.length > 0 ? HISTORY_KEY : GROUP_KEYS[0]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const panelHeight = 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > panelHeight ? rect.bottom + 4 : rect.top - panelHeight - 4;
    setPos({ top, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(t) &&
        panelRef.current && !panelRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, updatePos, setOpen]);

  const allEntries = useMemo(() => Object.values(EMOJI_GROUPS).flat(), []);

  const historyEntries = useMemo(() =>
    history.map((emoji) => allEntries.find((e) => e.emoji === emoji) ?? { emoji, keywords: "" }),
    [history, allEntries],
  );

  const filtered = useMemo(() => {
    if (search) {
      const q = search.toLowerCase();
      return allEntries.filter((e) => e.keywords.includes(q));
    }
    if (activeGroup === HISTORY_KEY) return historyEntries;
    return EMOJI_GROUPS[activeGroup] ?? [];
  }, [search, activeGroup, allEntries, historyEntries]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500/40 transition-colors cursor-pointer"
        title={t("choose_icon")}
      >
        <span className="text-2xl leading-none">{value || fallback}</span>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-[100] w-72 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-2xl flex flex-col"
        >
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search_emoji")}
              autoFocus
              className="w-full px-2.5 py-1.5 rounded-md bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {!search && (
            <div className="flex flex-wrap gap-0.5 px-2 pt-2">
              {[...(history.length > 0 ? [HISTORY_KEY] : []), ...GROUP_KEYS].map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveGroup(group)}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeGroup === group
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {group === HISTORY_KEY ? t("history") : group}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-8 gap-0.5 p-2 max-h-64 overflow-y-scroll overscroll-contain">
            {filtered.map((entry, i) => (
              <button
                key={`${entry.emoji}-${i}`}
                type="button"
                onClick={() => {
                  onSelect(entry.emoji);
                  setOpen(false);
                  setSearch("");
                }}
                className="w-8 h-8 flex items-center justify-center rounded-md text-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                title={entry.keywords}
              >
                {entry.emoji}
              </button>
            ))}
            {search && filtered.length === 0 && (
              <p className="col-span-8 text-center text-xs text-gray-400 py-4">{t("no_results")}</p>
            )}
          </div>

          {value && (
            <div className="px-2 pb-2">
              <button
                type="button"
                onClick={() => {
                  onSelect("");
                  setOpen(false);
                }}
                className="w-full text-center py-1.5 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                {t("reset_to_default")}
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
