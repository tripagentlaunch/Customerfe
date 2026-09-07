const STARTERS = [
  "Somewhere warm and calm in December",
  "Book me a flight to Dubai on the 12th",
  "What visa do I need for Bali?",
  "Luxury hotels in Bali",
  "Talk to a human",
];

export default function StarterChips({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="ta-cc-starters">
      {STARTERS.map((s) => (
        <button key={s} type="button" className="ta-cc-chip" onClick={() => onPick(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}
