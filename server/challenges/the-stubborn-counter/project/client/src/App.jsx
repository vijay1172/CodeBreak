import { LikeButton } from "./components/LikeButton.jsx";

export function App() {
  return (
    <main className="counter-preview">
      <section className="counter-card" aria-labelledby="counter-title">
        <h1 id="counter-title">Rapid-click counter</h1>
        <p>Use Rapid +3 to queue three likes together. A correct fix increases the total by three.</p>
        <LikeButton />
      </section>
    </main>
  );
}
