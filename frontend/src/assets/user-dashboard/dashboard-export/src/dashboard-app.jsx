/* SwanStudios Dashboard — App composition + top utility bar + XP toast */

const I4 = window.Icons;

function TopBar() {
  return (
    <div className="row gap-12" style={{ justifyContent: 'flex-end', marginBottom: 4 }}>
      <button className="icon-btn"><I4.search size={18}/></button>
      <button className="icon-btn"><I4.mail size={18}/><span className="dot">3</span></button>
      <button className="icon-btn"><I4.bell size={18}/><span className="dot cyan">7</span></button>
      <div className="xp-pill">
        <span className="coin">XP</span>
        18,450 XP
        <span style={{ width: 22, height: 22, borderRadius:'50%',
                        background:'rgba(218,195,110,0.18)',
                        border:'1px solid rgba(218,195,110,0.45)',
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                        color:'var(--gold-light)' }}>
          <I4.plus size={12} stroke={2.4}/>
        </span>
      </div>
    </div>
  );
}

function XpToast({ onClose }) {
  return (
    <div className="xp-toast">
      <button className="close" onClick={onClose}>✕</button>
      <div className="hex" style={{ '--s': '56px' }}>
        <span style={{ fontSize: 14 }}>XP</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow gold" style={{ fontSize: 10 }}>XP Gained!</div>
        <div style={{ fontFamily: 'var(--font-ui), Sora, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--gold-light)', letterSpacing: '-0.01em' }}>+25 XP</div>
        <div style={{ fontSize: 12, color: 'rgba(224,236,244,0.7)' }}>Great post! Keep it up.</div>
      </div>
    </div>
  );
}

function DashboardApp() {
  const [navActive, setNavActive] = useState('feed');
  const [tab, setTab] = useState('reels');
  const [toast, setToast] = useState(true);

  return (
    <>
      <div className="shell">
        <window.LeftRail active={navActive} setActive={setNavActive}/>

        <main className="center-col">
          <TopBar/>
          <window.HeroBanner activeTab={tab} setActiveTab={setTab}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 4 }}>
            <window.ReelsSpotlight/>
            <window.QuickPost/>
          </div>
          <window.FeedPostVideo/>
          <window.FeedPostText/>
        </main>

        <aside className="right-rail">
          <window.Stories/>
          <window.LiveActivity/>
          <window.ActiveChallenge/>
          <window.BadgesAndLeaderboard/>
          <window.Trending/>
          <window.Transformation/>
          <window.WeeklyMomentum/>
          <window.NextBestAction/>
        </aside>
      </div>

      {toast && <XpToast onClose={() => setToast(false)}/>}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<DashboardApp/>);
