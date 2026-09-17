import { useState } from "react";

export function createLikeHandler({ count, setCount }) {
  return () => setCount(count + 1);
}

export function LikeButton() {
  const [count, setCount] = useState(0);
  return <button onClick={createLikeHandler({ count, setCount })}>Likes: {count}</button>;
}
