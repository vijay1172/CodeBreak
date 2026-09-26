import { useState } from "react";

export function createLikeHandler({ count, setCount }) {
  return () => setCount(count + 1);
}

export function LikeButton() {
  const [count, setCount] = useState(0);
  const addLike = createLikeHandler({ count, setCount });

  return (
    <div className="counter-controls">
      <output aria-live="polite">Likes <strong>{count}</strong></output>
      <div className="counter-actions">
        <button className="like-button secondary" onClick={addLike}>Add one</button>
        <button className="like-button" onClick={() => { addLike(); addLike(); addLike(); }}>Rapid +3</button>
      </div>
    </div>
  );
}
