# Amateur Extra Flashcards

A clean, dark-mode-first study app for the US Amateur Radio Extra exam.

Built with Next.js, TypeScript, Tailwind CSS, and Framer Motion.

## Features

- Three study modes (switch in the upper-left):
	- Answer only (minimal, vertically centered)
	- Answer highlighted (all answers visible, correct highlighted)
	- Quiz (multiple choice with crisp feedback)
- Pool progress popover (bottom center):
	- Sequential grid (E1A01 → …) with custom tooltips
	- Colors: blue = seen, green = correct, red = wrong, blue ring/white outline = current
	- Compact stats (answered/total, correct, wrong, accuracy)
- Figures support: detects “Figure E7-1” etc. and shows matching images (public/E7-1.png). Images auto-invert in dark mode.
- Dark/light theme toggle (top-right), persisted to localStorage.
- Animated stacked-card backdrop, tuned for both themes.
- Keyboard navigation: Left/Right arrows switch cards.
- Previous/Next chevrons under the card.
- Reset (bottom-right) shuffles and clears progress.

## Data

- Questions are served from public/extra.json via API route at /api/questions.
- Each question has: `id`, `question`, `answers[]`, `correct`, `refs`.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Build and start:

```bash
npm run build
npm start
```

## Code map

- src/app/page.tsx — main page, mode switcher, popovers, navigation
- src/components/Flashcard.tsx — card UI and modes
- src/components/QuestionPool.tsx — pool grid and tooltips
- src/components/ThemeToggle.tsx — sun/moon theme switcher
- src/app/api/questions/route.ts — serves questions from public/extra.json

## Notes

- Interactive elements show pointer on hover.
- Accuracy/Correct/Wrong display only in Quiz mode.
- Seen counts include any mode; only Quiz answers affect correct/wrong.

## License

MIT (or your preference).
