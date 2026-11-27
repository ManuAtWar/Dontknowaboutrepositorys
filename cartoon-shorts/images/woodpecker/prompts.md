# Woodpecker Short - generation log

Script (63 words, ~22 s): "Why don't woodpeckers get concussions? The popular answer was a shock-absorbing skull. But high-speed
video showed the opposite. The head doesn't cushion the hit. It stops as suddenly as the beak, like a stiff hammer.
Cushioning would weaken every peck. The real protection is size. A woodpecker's brain is so small and light that it can
handle stops that would concuss a human."

Sources: Van Wassenbergh et al. 2022, Current Biology ("Woodpeckers minimize cranial absorption of shocks").

## Higgsfield (MCP connector), 6.45 credits in total

| file | model / settings | credits | job |
|---|---|---|---|
| vo/take1.mp3 | text2speech_v2, variant elevenlabs, preset voice "Mark" | 1.20 | 54d99766-e4cb-49b2-88e9-017185dad37d |
| raw/woodpecker_idle.png | gpt_image_2_5, 2k, medium, transparent, 2:3 | 0.75 | f77d7d1a-b15c-4c39-a3d5-71136ca20ce0 |
| raw/woodpecker_pillow.png | same, edit of idle | 0.75 | 715770bb-e12d-43a0-984c-743b3e095187 |
| raw/woodpecker_smug.png | same, edit of idle | 0.75 | 3e1d8250-0d08-4b60-8b3e-d4db6a3dd29e |
| raw/trunk.png | same, 9:16, idle as style reference | 0.75 | 9a853734-a86b-4e69-ad74-16f94724bc8e |
| raw/guy_curious.png | same, idle as style reference | 0.75 | 53b50aeb-2a7b-4710-8f65-d093560d2ded |
| raw/guy_headbutt.png | same, edit of guy_curious | 0.75 | cac297b8-5b10-4ebc-a9a5-fb382c28aa88 |
| raw/guy_dizzy.png | same, edit of guy_curious | 0.75 | b76f386f-cb5f-45f8-971e-795e113d33a2 |

Sound effects: synthesized in code (`sfx.py`), no credits. Props and effects (lens, springs, brain, hammer, chips,
bursts, stars, viewfinder, scenery) are drawn in code (`src/woodpecker/Draw.tsx`).

## Prompts

**woodpecker_idle (hero)**
A cute cartoon woodpecker, full body, side view facing LEFT: the beak points to the left side of the image. Upright
clinging pose, as if gripping a vertical tree trunk that is not drawn: the body is upright and slightly tilted, two short
legs with curved toes reach forward to the left side of the image, and the stiff tail feathers angle down to the lower
right like a prop. Black back and folded black wings with a few small white spots, a white face with one black stripe
through the eye, a white chest and belly, a bright red cap on the back of the head, a long straight pointed grey beak.
Neutral, curious expression, eye open. Whole body in frame with a margin. Flat 2D cartoon in a simple, clean style: thick
smooth black outlines of even weight, flat colours with a very soft pale shade on one side, a small solid black oval eye
with a tiny white glint, a simple curved black eyebrow, clean vector-like linework, no texture, no gradients, no text, no
border. Isolated on a fully transparent background: no sky, no ground, no tree, no floor shadow.

**woodpecker_pillow (edit of idle)**
Edit the reference image: the same woodpecker in exactly the same pose, size, position and drawing style, but now a small
fluffy white pillow is tied over the front half of its beak with a thin pink ribbon, so the beak tip is hidden inside the
soft pillow. The bird looks annoyed: the eyebrow is tilted down toward the beak and the eye is half closed by a flat upper
lid. Everything else identical: same thick smooth black outlines, same flat colours. Isolated on a fully transparent
background: no sky, no ground, no tree, no floor shadow.

**woodpecker_smug (edit of idle)**
Edit the reference image: the same woodpecker in exactly the same pose, size, position and drawing style, but with a
smug, proud expression: the eye is half closed by a relaxed upper lid, the eyebrow is raised in a confident arc, and the
chest is puffed out a little. Everything else identical: same thick smooth black outlines, same flat colours. Isolated on
a fully transparent background: no sky, no ground, no tree, no floor shadow.

**trunk**
A tall straight tree trunk standing vertically in the centre, seen from the front, filling the full height of the image:
it enters at the bottom edge and leaves through the top edge, both ends cut off by the image border (no roots, no
treetop, no branches, no leaves). Warm brown bark with a few simple darker brown vertical bark lines and two small knots,
one small round dark peck hole on the right half at mid height. The trunk is about one third as wide as the image. Flat
2D cartoon in exactly the same drawing style as the reference image: thick smooth black outlines of even weight on both
sides of the trunk, flat colours with one simple soft shade, clean vector-like linework, no texture, no text, no border,
no characters, no birds. Isolated on a fully transparent background: no sky, no ground, no floor shadow.

**guy_curious**
A simple white cartoon character, full body, three-quarter view facing the LEFT side of the image, standing and looking
up toward the upper left with a curious face: eyebrows raised, eyes looking up and to the left, a small open round mouth.
The hand on the LEFT side of the image is raised to scratch the side of the head; the other arm hangs relaxed. Whole body
in frame with a margin. Flat 2D cartoon in exactly the same drawing style as the reference image (same outline weight and
flat colouring; the reference only shows the style, this character is different): a simple white character with a big
round head, a small soft body, noodle arms with simple four-finger hands and short legs with rounded feet, thick smooth
black outlines of even weight, flat white fill with a very soft pale-grey shade on one side, small solid black oval eyes,
simple curved black eyebrows, no nose, no hair, no clothes, no beak, no feathers. Clean vector-like linework, flat
colours, no texture, no text, no border. Isolated on a fully transparent background: no sky, no ground, no floor shadow.

**guy_headbutt (edit of guy_curious)**
Edit the reference image: the same simple white cartoon character, same size and same drawing style, now headbutting
something on the LEFT side of the image: the whole body leans far forward to the left with the big round head in front,
both eyes squeezed shut and each drawn as a small black chevron pointing inward, the mouth a tight wobbly grimace line,
both noodle arms swung back behind the body toward the right side of the image, both feet planted in the same place as in
the reference. Everything else identical: same thick smooth black outlines of even weight, same flat white fill with a
very soft pale-grey shade. No text, no symbols, no motion lines. Isolated on a fully transparent background: no sky, no
ground, no floor shadow.

**guy_dizzy (edit of guy_curious)**
Edit the reference image: the same simple white cartoon character, same size and same drawing style, now dizzy after
bumping his head: standing wobbly with the knees slightly bent and the body tilted a little to the right, both eyes drawn
as black spirals, the mouth open in a wavy line with a small pink tongue sticking out, a small round red bump on the left
side of the forehead, both arms hanging limp, both feet in the same place as in the reference. Everything else identical:
same thick smooth black outlines of even weight, same flat white fill with a very soft pale-grey shade. No stars, no
text, no symbols, no motion lines. Isolated on a fully transparent background: no sky, no ground, no floor shadow.
