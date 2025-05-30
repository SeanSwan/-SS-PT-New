// Example of correct video reference patterns:

// Option 1: If video is in public folder (RECOMMENDED)
const videoSrc = "/Swans.mp4";  // This will work in both dev and production

// Option 2: If video is in assets folder
import SwansVideo from "../assets/Swans.mp4";
const videoSrc = SwansVideo;

// Option 3: Dynamic import
const SwansVideo = new URL("../assets/Swans.mp4", import.meta.url).href;

// Usage in JSX:
<video src={videoSrc} autoPlay muted loop>
  Your browser does not support the video tag.
</video>

// OR with multiple sources for browser compatibility:
<video autoPlay muted loop>
  <source src="/Swans.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>
