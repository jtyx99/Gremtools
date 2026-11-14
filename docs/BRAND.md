# Gremtools brand

Name, brand architecture, mascot, visual design and voice.

## Name

**Gremtools** = gremlin + tools. Gremlins are the folklore creatures blamed for meddling with
machinery; here the gremlin is on your side and does the fiddly work for you.

- Written as one word with a capital G: Gremtools. Not "GremTools", "Grem Tools" or "Gremtool".
- In the logo the two halves are told apart by colour (Grem in the text colour, tools in violet),
  not by a capital letter.
- Lower case in URLs, package names and handles: `gremtools`.

## Promise

Free tools for your files that run in your browser. No uploads, no sign-up, no limits.

Three things every part of the product should support:

1. **Private.** Files stay on the device. Say so plainly and often.
2. **Quick.** Open a tool, drop a file, get the result. No accounts, no queues.
3. **Friendly.** A little mischief in the tone, never in the behaviour.

## Brand architecture

One brand, one site, one mascot. Modules are sections of Gremtools, not separate products.

| Level | Naming | Example | URL |
|---|---|---|---|
| Platform | Gremtools | Gremtools | `/` |
| Module | Plain description + "tools" | PDF tools, Image tools, Colour tools | `/pdf`, `/image`, `/colour` |
| Tool | Plain verb + object | Merge PDFs, Compress PDF, Page numbers | `/pdf/merge` |

Rules:

- Tool names say what the tool does in ordinary words. No puns or gremlin words in tool names;
  people search for "merge PDF".
- Where a short module label is needed (app shortcuts, social posts), use "Grem PDF",
  "Grem Image", "Grem Colour". Do not use these as navigation labels in the product.
- A module does not get its own logo, colour or mascot. Ling can hold a different prop per module
  (wrench for PDF, paintbrush for image, colour swatches for colour).
- If a module is ever moved to its own address, use a subdomain (`pdf.gremtools...`) and keep the
  same header, look and mascot.
- British spelling in the product: colour, organise, centre.

## Ling

Ling is the Gremtools mascot: a small gremlin, a "gremling". The name is the "-ling" of
gremling (as in duckling: a little one).

- Always introduce the name with context: "Ling the gremling" or "Ling from Gremtools". On its
  own the name is not distinctive enough.
- Ling is "they" or simply "Ling".

### Character

Curious, eager, a bit cheeky, proud of a job well done. Ling loves taking things apart and
(nearly always) puts them back together better. Ling is never mean, never sarcastic at the
user's expense, and never the cause of a problem: when something fails, Ling is sheepish and
helpful.

### Design

- Chibi proportions: head about half the total height, small rounded body, short limbs.
- Big pointed ears that stick out sideways, each with a small notch feel at the base.
- Large round eyes with dark pupils; a wide grin with a single snaggle tooth.
- Tinkerer's goggles pushed up on the forehead, violet lenses.
- Holds a tool. The default is a wrench.
- Bold flat colour, thick dark outline, minimal shading. Must read clearly at 32 px (head only).
- No clothing or accessories that tie Ling to a culture, gender or age.

### Poses

| Pose | Used for | Notes |
|---|---|---|
| Idle | Home page, empty states | Gentle bob, wrench at rest |
| Working | Processing, loading | Focused eyes, wrench swinging |
| Happy | Result ready | Closed smiling eyes, arm up, sparkles |
| Oops | Errors, page not found | Worried brows, sweat drop, small sparks |

Head-only mark: used in the header, favicon and app icon.

Future poses worth having: waving (welcome), sleeping (offline), holding a paintbrush (image
module), holding swatches (colour module).

### Current artwork

The mascot in the product is a placeholder drawn in code (`src/shared/Mascot.tsx`,
`public/favicon.svg`). A final version should be commissioned from an illustrator using this
section as the brief, delivered as SVG in the four poses plus the head mark, with full rights
assigned to the project owner.

## Colour

| Token | Dark theme | Light theme | Use |
|---|---|---|---|
| Background | `#15171c` | `#f5f6f0` | Page |
| Surface | `#1d2027` | `#ffffff` | Cards, header |
| Surface 2 | `#272b35` | `#ecefe4` | Hover, wells, selected |
| Border | `#363b48` | `#d5d9c9` | Lines |
| Text | `#eef0f4` | `#1a1d17` | Body text |
| Muted | `#a0a7b6` | `#5a6152` | Secondary text |
| Primary (gremlin lime) | `#b4f03a` | `#a6e22e` | Main buttons, tool icons, progress |
| Primary ink | `#172006` | `#172006` | Text and icons on lime |
| Accent (violet) | `#a78bfa` | `#6d3fd9` | Wordmark, emphasis, focus ring, goggles |
| Danger | `#ff7b72` | `#c62828` | Error text |

Ling: skin `#9bd84a`, skin shadow `#6fae2b`, outline `#1d2a0c`, lenses `#a78bfa`.

Rules:

- Lime is a fill, never a text colour on light backgrounds (it fails contrast). Text on lime is
  always primary ink.
- One lime button per screen: the main action.
- Violet is for emphasis and links, used sparingly.
- Dark is the signature look; light must be equally complete.

## Typography

No web fonts are loaded (speed, privacy, offline). System fonts only.

- Headings and wordmark: rounded system face where available
  (`ui-rounded, 'SF Pro Rounded', 'Nunito', 'Segoe UI', system-ui`), weight 800, tight tracking.
- Body: `system-ui`.

If a brand typeface is chosen later, self-host it; a rounded geometric sans (for example Nunito
or Baloo 2, both open licence) suits the wordmark.

## Shape and layout

- Rounded corners throughout: 16 px on cards, 12 px on buttons, 8 px on fields.
- Thin borders rather than shadows.
- Tool icons: lime rounded square with a dark line icon.
- Generous spacing; one column on phones; nothing scrolls sideways.

## Voice

Plain first, playful second. The interface text should be understood by someone in a hurry.

| Do | Don't |
|---|---|
| "Compress PDF" | "Squish-o-matic" |
| "Tinkering…" while working | Jokes inside option labels or error details |
| "That didn't work" + what to do next | Blaming the user, or cute text that hides the problem |
| "Your files stay on this device. Nothing is uploaded." | Vague claims like "100% secure" |
| "Ling is still building these." | Fake urgency, exclamation-heavy copy |

- Ling may appear in headings, empty states, loading and success messages.
- Errors say what happened and what to try, in one or two sentences.
- No dark patterns: no fake limits, countdowns or sign-up nags.

## Logo use

- Lock-up: Ling head mark to the left of the wordmark.
- Mark alone for small spaces (favicon, app icon), on the dark background colour with rounded corners.
- Keep clear space around the lock-up of at least the height of the letter G.
- Do not recolour Ling, stretch the mark, or place the lock-up on busy images.

## Ownership

The Gremtools source code is open under AGPL-3.0. The Gremtools name, the Ling character, and the
logo are not part of that licence and remain the property of the project owner. Anyone hosting a
modified version should use a different name and mascot.
