/**
 * journey-sections.mjs — section renderers for the SwanJourney board.
 * Every visible string comes from copy-pack-full.json (verbatim law) except
 * structural labels, which are marked SAMPLE where illustrative.
 */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const nav = () => `
<nav class="nav">
  <img src="swan-logo.png" alt="SwanStudios logo">
  <span class="brand">SWANSTUDIOS</span>
  <span class="links">
    <a href="#community">Community</a><a href="#training">Training</a>
    <a href="#programs">Programs</a><a href="#trainers">For Trainers</a>
  </span>
</nav>`;

export const hero = (c) => `
<header class="hero">
  <div class="plate"></div><div class="grade"></div>
  ${nav()}
  <div class="inner wrap">
    <p class="kicker">Personal training &middot; Real community</p>
    <h1 class="chrome">${esc(c.hero.headline)}</h1>
    <p class="sub">${esc(c.hero.sub)}</p>
    <div class="ctas">
      <a class="btn btn-blue" href="#community">${esc(c.hero.cta_primary)}</a>
      <a class="btn btn-purple" href="#trainersearch">${esc(c.hero.cta_secondary)}</a>
    </div>
  </div>
  <div class="dive">DIVE IN</div>
</header>
<div class="fastlane wrap" id="trainersearch">
  <div class="card">
    <span class="q">Looking for a trainer near you?</span>
    <span class="field">City or ZIP</span>
    <a class="btn btn-purple" href="#trainers">Find a Trainer</a>
  </div>
</div>`;

export const mission = (c) => `
<section class="section"><div class="wrap">
  <p class="eyebrow">Why we exist</p>
  <p class="drama">&ldquo;We're not here to extract value from you. We're here to help you
  <span class="g">build it.</span>&rdquo;</p>
  <div class="gold-rule"></div>
  <div class="mission-grid">
    <p>${esc(c.mission.p1)}</p>
    <p>${esc(c.mission.p2)}</p>
    <p>${esc(c.mission.p3)}</p>
  </div>
  <p class="closing">${esc(c.mission.closing)}</p>
</div></section>`;

const PINS = [
  ['22%', '38%', ''], ['34%', '61%', 'g'], ['52%', '30%', ''], ['63%', '55%', ''],
  ['76%', '40%', 'g'], ['85%', '62%', ''], ['44%', '72%', ''],
];
const EVENTS = [
  ['THU 7PM', 'Community Walking Club', 'South Bay &middot; all levels', ['S', 'M', 'K'], '+12 going'],
  ['SAT 8AM', 'Beach Run &amp; Coffee', 'The Strand &middot; 5k easy pace', ['R', 'J', 'A'], '+9 going'],
  ['SUN 10AM', 'Group Training in the Park', 'Polliwog Park &middot; bring a mat', ['T', 'D', 'L'], '+15 going'],
];

export const community = (c) => `
<section class="section" id="community"><div class="wrap">
  <p class="eyebrow">The community half</p>
  <h2 class="title">${esc(c.beyond_the_gym.section_title)}</h2>
  <div class="gold-rule"></div>
  <div class="world">
    <div class="veil"></div>
    <div class="pins">${PINS.map(([l, t, g]) => `<span class="pin ${g}" style="left:${l};top:${t}"></span>`).join('')}</div>
    <div class="in">
      <h3>Your city is already in motion</h3>
      <p class="sub">Local events, walking clubs, group activities. Digital made real.</p>
      <div class="groups">
        <span class="chip gold">Join a group</span><span class="chip">South Bay</span>
        <span class="chip">Los Angeles</span><span class="chip">Fitness &amp; Training</span>
        <span class="chip">Golf</span><span class="chip">Your city</span>
      </div>
    </div>
  </div>
  <div class="events">
    ${EVENTS.map(([d, n, w, f, more]) => `
    <div class="event">
      <span class="date">${d}</span>
      <span><span class="name">${n}</span><br><span class="where">${w}</span></span>
      <span class="faces">${f.map((i) => `<span class="face">${i}</span>`).join('')}
        <span class="face" style="background:rgba(96,192,240,.25);font-size:12.5px">${esc(more)}</span></span>
      <span class="rsvp">RSVP</span>
      <span class="sample">SAMPLE</span>
    </div>`).join('')}
  </div>
  <div class="cats">
    ${c.beyond_the_gym.categories.map((k) => `
    <div class="cat ${k.title === 'Community Meetups' ? 'featured' : ''}">
      <h4>${esc(k.title)}</h4><p>${esc(k.desc)}</p>
    </div>`).join('')}
  </div>
</div></section>`;

export const services = (c) => `
<section class="section" id="training"><div class="wrap">
  <p class="eyebrow">What we do</p>
  <h2 class="title">Training, coaching, and everything around it</h2>
  <div class="gold-rule"></div>
  <div class="grid-4">
    ${c.what_we_do.features.map((f) => `
    <div class="svc"><h4>${esc(f.title)}</h4><p>${esc(f.desc)}</p></div>`).join('')}
  </div>
</div></section>`;

export const programs = (c) => `
<section class="section" id="programs"><div class="wrap">
  <p class="eyebrow">Programs</p>
  <h2 class="title">${esc(c.programs.section_title)}</h2>
  <div class="gold-rule"></div>
  <div class="tiers">
    ${c.programs.tiers.map((t) => `
    <div class="tier ${t.badge === 'Most Popular' ? 'hot' : ''}">
      ${t.badge ? `<span class="badge ${t.badge === 'Best Value' ? 'gold' : ''}">${esc(t.badge)}</span>` : ''}
      <h4>${esc(t.name)}</h4>
      <p class="meta">${esc(t.meta)}</p>
      <ul>${t.features.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>
      <a class="btn ${t.badge === 'Most Popular' ? 'btn-purple' : 'btn-blue'}" href="#cta">Start here</a>
    </div>`).join('')}
  </div>
</div></section>`;

export const golf = (c) => `
<section class="section"><div class="wrap">
  <div class="golf">
    <div class="veil"></div>
    <div class="in">
      <p class="eyebrow">Sports-specific</p>
      <h2 class="title">${esc(c.golf.section_title)}</h2>
      ${c.golf.features.map((f, i) => `
      <div class="feat"><span class="n">0${i + 1}</span>
        <span><h5>${esc(f.title)}</h5><p>${esc(f.desc)}</p></span></div>`).join('')}
    </div>
  </div>
</div></section>`;

export const proof = (c) => `
<section class="section"><div class="wrap">
  <p class="eyebrow">Real people. Real results.</p>
  <h2 class="title">Proof you can measure</h2>
  <div class="gold-rule"></div>
  <div class="proofs">
    ${c.testimonials.map((t) => `
    <div class="proof">
      <div class="ba">
        <div class="slot"><span class="m">MONTH 0</span><span class="tag">[CLIENT PHOTO]</span></div>
        <div class="slot"><span class="m">AFTER</span><span class="tag">[CLIENT PHOTO]</span></div>
      </div>
      <span class="result">&#9670; ${esc(t.result)}</span>
      <blockquote>&ldquo;${esc(t.quote)}&rdquo;</blockquote>
      <p class="who">${esc(t.author)} &middot; <span>${esc(t.descriptor)}</span></p>
    </div>`).join('')}
  </div>
</div></section>`;

export const stats = (c) => `
<section class="section stats"><div class="wrap">
  <div class="stat-grid">
    ${c.stats.items.map((s) => `
    <div class="stat">
      <div class="n">${esc(s.value)}</div>
      <div class="l">${esc(s.label)}</div>
      ${s.status === 'NEEDS-SEAN-NUMBER' ? '<span class="pend">&#8470; pending</span>' : ''}
    </div>`).join('')}
  </div>
</div></section>`;

export const about = (c) => `
<section class="section"><div class="wrap">
  <div class="about">
    <div class="veil"></div>
    <div class="in">
      <p class="eyebrow">The coach behind it</p>
      <h2 class="title">${esc(c.about.section_title)}</h2>
      <div class="pillars">
        ${c.about.pillars.map((p) => `
        <div class="pillar"><h4>${esc(p.title)}</h4><p>${esc(p.desc)}</p></div>`).join('')}
      </div>
    </div>
  </div>
</div></section>`;

export const trainers = (c) => `
<section class="section trainers" id="trainers"><div class="wrap">
  <p class="eyebrow">For trainers</p>
  <h2 class="title">Built to back your practice</h2>
  <div class="gold-rule"></div>
  <div class="grid-4">
    ${c.for_trainers.features.map((f) => `
    <div class="svc"><h4>${esc(f.title)}</h4><p>${esc(f.desc)}</p></div>`).join('')}
  </div>
</div></section>`;

export const cta = (c) => `
<section class="section emerge" id="cta"><div class="wrap">
  <h2 class="title">${esc(c.cta.title)}</h2>
  <p class="body">${esc(c.cta.body)}</p>
  <div class="ctas">
    <a class="btn btn-blue" href="#community">${esc(c.hero.cta_primary)}</a>
    <a class="btn btn-purple" href="#trainersearch">${esc(c.hero.cta_secondary)}</a>
  </div>
</div></section>
<footer><div class="wrap row">
  <img src="swan-logo.png" alt="SwanStudios">
  <span class="tag">${esc(c.mission.closing)}</span>
</div></footer>`;
