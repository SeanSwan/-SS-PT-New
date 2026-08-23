# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/radar/PANEL-R4.md
**Tokens (Ollama):** 1972 in / 1462 out | **Wall:** 11.5s | **done_reason:** stop

---
D1: 1B · D2: 2C · D3: 3C

**D1:** I overrule GROK (1A) and DEEPSEEK (1C). A bottom sheet (1A) buries the core value behind a tap, violating the "monitoring" intent. A static bar (1C's critique) is insufficient. 1B (Qwen) is correct: the rail *is* the product. On a phone, it must be a persistent, non-interactive visual ticker (decorative) that sits above the content, ensuring the "Rise" is always visible without sacrificing the 44px touch target of the interactive list below.

**D2:** I overrule DEEPSEEK (2B) on the DOM structure. Splitting into a "decorative paint layer" and a "focusable list" creates two sources of truth, risking sync drift and accessibility confusion. 2C (Qwen) is the winner: single source of truth (`<ul>`), DOM prepending ensures screen readers announce new items naturally without `aria-live` region complexity, and 5s is the correct debounce for "new" vs "noise."

**D3:** I overrule GROK (3A) and DEEPSEEK (3B). 3C (GLM) is the only option that strictly adheres to `rss_headline_snippet_linkout`. **Ruling on `og:image`:** Fetching `og:image` is a **BREACH**. The posture is defined by the RSS feed's content. `og:image` is a web-scraping artifact, not an RSS enclosure. Using it implies we are rendering the *web page*, not the *feed item*. Only `enclosure` or `media:content` tags are valid sources for media, as they are part of the RSS contract. If absent, we fall back to typography. This preserves the "link-out" purity.

```css
/* d1-phone-ticker.css */
@media (max-width: 767px) {
  .rail-ticker {
    position: sticky;
    top: 0;
    z-index: 100;
    height: 48px;
    background: var(--surface-1, #121212);
    border-bottom: 1px solid var(--border, #333);
    overflow: hidden;
    display: flex;
    align-items: center;
    padding: 0 16px;
    font-size: 14px;
    color: var(--text-2, #aaa);
    white-space: nowrap;
  }
  
  .rail-ticker-content {
    display: inline-block;
    animation: ticker-scroll 30s linear infinite;
  }

  @keyframes ticker-scroll {
    0% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .rail-ticker-content {
      animation: none;
      transform: none;
    }
  }
}
```

```jsx
// d2-list-component.jsx
import React, { useEffect, useRef } from 'react';

export const StoryList = ({ stories, onAnnounce }) => {
  const listRef = useRef(null);
  const lastAnnouncedCount = useRef(0);

  useEffect(() => {
    const currentCount = stories.length;
    // Only announce if count increased and enough time passed (handled by parent debounce)
    if (currentCount > lastAnnouncedCount.current) {
      const newItems = currentCount - lastAnnouncedCount.current;
      const latest = stories[0]?.title || '';
      onAnnounce(`${newItems} new stories. Latest: ${latest}`);
      lastAnnouncedCount.current = currentCount;
    }
  }, [stories, onAnnounce]);

  return (
    <ul ref={listRef} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {stories.map((story) => (
        <li key={story.id} style={{ marginBottom: '16px' }}>
          <a 
            href={story.link} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'block', 
              textDecoration: 'none',
              color: 'var(--text-1, #fff)',
              minHeight: '44px',
              padding: '8px',
              borderRadius: '4px'
            }}
          >
            <strong>{story.title}</strong>
            <span style={{ display: 'block', fontSize: '14px', color: 'var(--text-2, #aaa)' }}>
              {story.snippet.slice(0, 140)}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
};
```

```css
/* d3-card-contract.css */
.story-card {
  display: block;
  text-decoration: none;
  color: var(--text-1, #fff);
  background: var(--surface-2, #1e1e1e);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease;
  min-height: 220px;
}

@media (prefers-reduced-motion: no-preference) {
  .story-card:hover {
    transform: translateY(-2px);
  }
}

.story-card-media {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--surface-3, #2a2a2a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-3, #666);
  font-weight: bold;
}

.story-card-content {
  padding: 16px;
}

.story-card-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0 0 8px 0;
  font-size: 16px;
}

.story-card-snippet {
  font-size: 14px;
  color: var(--text-2, #aaa);
  margin: 0;
  line-height: 1.4;
}
```
