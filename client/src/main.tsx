import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Import Material Icons
const linkElement = document.createElement('link');
linkElement.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
linkElement.rel = "stylesheet";
document.head.appendChild(linkElement);

// Import fonts
const fontLink = document.createElement('link');
fontLink.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@300;400;500;600;700;800;900&family=Roboto:wght@300;400;500;700&family=Noto+Sans+Arabic:wght@300;400;500;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// Import Kalpurush font (Bengali traditional serif)
const kalpurushLink = document.createElement('link');
kalpurushLink.href = "https://fonts.maateen.me/kalpurush/font.css";
kalpurushLink.rel = "stylesheet";
document.head.appendChild(kalpurushLink);

// Set the title
document.title = "School Management System";

createRoot(document.getElementById("root")!).render(<App />);
