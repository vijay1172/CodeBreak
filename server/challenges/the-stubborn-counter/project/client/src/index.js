import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(createElement(App, { token: window.localStorage.getItem("accessToken") }));
