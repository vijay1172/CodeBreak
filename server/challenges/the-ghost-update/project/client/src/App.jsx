import { SearchBox } from "./components/SearchBox.jsx";

const courses = ["React fundamentals", "React component testing", "Responsive CSS", "JavaScript promises"];

export function searchCourses(query) {
  return new Promise((resolve, reject) => {
    const normalized = query.trim().toLowerCase();
    setTimeout(() => {
      if (normalized === ":offline") return reject(new Error("Search is unavailable. Try another query."));
      resolve(normalized ? courses.filter((course) => course.toLowerCase().includes(normalized)) : []);
    }, normalized === "r" ? 800 : 120);
  });
}

export function App({ search = searchCourses }) {
  return (
    <main className="dashboard">
      <h1>Course library</h1>
      <p>Search for a course. To reproduce, type r and quickly replace it with react.</p>
      <p>Use :offline to simulate a failed search; clear the field for an empty result.</p>
      <SearchBox search={search} />
    </main>
  );
}
