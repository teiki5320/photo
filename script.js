// ─── React hooks ─────────────────────────────────────────────────────────────
const { useState, useEffect, useMemo } = React;

// ─── Icônes SVG inline (remplace lucide-react, zéro dépendance CDN) ──────────
const _svg = (children) => ({ size = 24, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}
  >{children}</svg>
);

const Camera      = _svg(<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>);
const BookOpen    = _svg(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>);
const Plus        = _svg(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>);
const Trash2      = _svg(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>);
const ChevronLeft = _svg(<polyline points="15 18 9 12 15 6"/>);
const ChevronRight= _svg(<polyline points="9 18 15 12 9 6"/>);
const X           = _svg(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>);
const CheckCircle2= _svg(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>);
const FolderPlus  = _svg(<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></>);
const Send        = _svg(<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>);
const ImageIcon   = _svg(<><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>);
const Printer     = _svg(<><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>);
const CalendarIcon= _svg(<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>);
const Shuffle     = _svg(<><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></>);
const LayoutGrid  = _svg(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>);
const Layers      = _svg(<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>);
const Type        = _svg(<><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></>);
const Frame       = _svg(<><line x1="22" y1="6" x2="2" y2="6"/><line x1="22" y1="18" x2="2" y2="18"/><line x1="6" y1="2" x2="6" y2="22"/><line x1="18" y1="2" x2="18" y2="22"/></>);

// ─── Persistance localStorage ─────────────────────────────────────────────────
const LS_KEY = 'journalphoto_souvenirs';
const lsLoad = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
const lsSave = (data) => localStorage.setItem(LS_KEY, JSON.stringify(data));

// ─── Composant principal ──────────────────────────────────────────────────────
function App() {
  const [souvenirs,  setSouvenirs]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  const [view,        setView]        = useState('current');
  const [openedAlbum, setOpenedAlbum] = useState(null);

  const [tempPhotos,   setTempPhotos]   = useState([]);
  const [comment,      setComment]      = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isUploading,  setIsUploading]  = useState(false);
  const [showSuccess,  setShowSuccess]  = useState(false);

  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumName,    setNewAlbumName]    = useState('');

  const [isPrintMode,    setIsPrintMode]    = useState(false);
  const [currentSpread,  setCurrentSpread]  = useState(0);

  const [activeSlider, setActiveSlider] = useState(null);
  const [sliderIdx,    setSliderIdx]    = useState(0);

  const currentMonthLabel = useMemo(() =>
    new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
  []);

  // Chargement localStorage ────────────────────────────────────────────────────
  useEffect(() => {
    setSouvenirs(lsLoad());
    setLoading(false);
  }, []);

  // Filtrage ───────────────────────────────────────────────────────────────────
  const activeTarget = view === 'current' ? currentMonthLabel : openedAlbum;

  const displayBlocks = useMemo(() =>
    souvenirs
      .filter(s => s.album === activeTarget)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0)),
  [souvenirs, activeTarget]);

  const albumsMap = useMemo(() =>
    souvenirs.reduce((acc, s) => {
      if (s.album) { if (!acc[s.album]) acc[s.album] = []; acc[s.album].push(s); }
      return acc;
    }, {}),
  [souvenirs]);

  // Images ─────────────────────────────────────────────────────────────────────
  const processImage = (base64) => new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > h ? w > MAX : h > MAX) {
        if (w > h) { h = h * MAX / w; w = MAX; } else { w = w * MAX / h; h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      res(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.src = base64;
  });

  const handleFiles = e => {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = async ev => {
        const compressed = await processImage(ev.target.result);
        setTempPhotos(p => [...p, compressed]);
      };
      r.readAsDataURL(f);
    });
  };

  const submitBlock = () => {
    if (!tempPhotos.length || isUploading || !activeTarget) return;
    setIsUploading(true);
    const newBlock = {
      id: Date.now().toString(),
      images: tempPhotos, comment: comment.trim(),
      date: selectedDate, createdAt: Date.now(), album: activeTarget,
    };
    const updated = [...souvenirs, newBlock];
    lsSave(updated);
    setSouvenirs(updated);
    setTempPhotos([]); setComment('');
    setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2000);
    setIsUploading(false);
  };

  const deleteBlock = id => {
    const updated = souvenirs.filter(s => s.id !== id);
    lsSave(updated);
    setSouvenirs(updated);
  };

  // Mosaïque ───────────────────────────────────────────────────────────────────
  const Mosaic = ({ images }) => {
    const n = images.length;
    if (n === 1) return <img src={images[0]} className="w-full h-full object-cover" />;
    if (n === 2) return (
      <div className="flex h-full gap-0.5">
        <img src={images[0]} className="w-1/2 h-full object-cover" />
        <img src={images[1]} className="w-1/2 h-full object-cover" />
      </div>
    );
    return (
      <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
        <img src={images[0]} className="w-full h-full object-cover" />
        <img src={images[1]} className="w-full h-full object-cover" />
        <img src={images[2]} className="w-full h-full object-cover" />
        <div className="relative">
          <img src={images[3] || images[2]} className="w-full h-full object-cover" />
          {n > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs">+{n - 4}</div>}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-serif italic text-slate-400 bg-[#fcfaf7]">
      Initialisation du Studio…
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#fcfaf7] text-slate-900 font-serif pb-20 ${isPrintMode ? 'overflow-hidden' : ''}`}>

      {/* Slider */}
      {activeSlider && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4" onClick={() => setActiveSlider(null)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-[110]"><X size={32} /></button>
          <div className="relative w-full max-w-5xl h-full flex flex-col justify-center gap-6" onClick={e => e.stopPropagation()}>
            <div className="relative flex-1 flex items-center justify-center overflow-hidden rounded-sm">
              <img src={activeSlider.images[sliderIdx]} className="max-w-full max-h-[75vh] object-contain shadow-2xl" />
              {activeSlider.images.length > 1 && <>
                <button onClick={() => setSliderIdx(i => i > 0 ? i - 1 : activeSlider.images.length - 1)} className="absolute left-0 p-4 text-white/40 hover:text-white"><ChevronLeft size={48} /></button>
                <button onClick={() => setSliderIdx(i => i < activeSlider.images.length - 1 ? i + 1 : 0)} className="absolute right-0 p-4 text-white/40 hover:text-white"><ChevronRight size={48} /></button>
              </>}
            </div>
            <div className="text-center text-white pb-10">
              <p className="text-[10px] uppercase tracking-widest opacity-40 font-sans mb-2">
                {new Date(activeSlider.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xl italic px-6 max-w-3xl mx-auto leading-relaxed">"{activeSlider.comment || 'Souvenir précieux'}"</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Album Livre Studio ───────────────────────────────────────────── */}
      {isPrintMode && (() => {
        const totalSpreads = Math.max(1, Math.ceil(displayBlocks.length / 2));
        const spreadIdx    = Math.min(currentSpread, totalSpreads - 1);
        const leftBlock    = displayBlocks[spreadIdx * 2];
        const rightBlock   = displayBlocks[spreadIdx * 2 + 1];

        // ── Composant page scrapbook ─────────────────────────────────────
        // position:relative + img absolute = l'image remplit TOUJOURS son cadre
        // quelle que soit la source de hauteur du parent (flex, %, px…)
        const Photo = ({ src, style }) => (
          <div style={{ overflow: 'hidden', border: '4px solid white', boxShadow: '0 2px 10px rgba(0,0,0,0.18)', position: 'relative', minHeight: 0, ...style }}>
            <img src={src} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        );

        const ScrapbookPage = ({ block, idx }) => {
          const pg = { background: '#fdfcf8', width: '100%', height: '100%', padding: '6%', display: 'flex', flexDirection: 'column', gap: '4%', overflow: 'hidden', boxSizing: 'border-box' };
          const accentLine = <div style={{ height: '2px', background: 'linear-gradient(to right,#c8b99a,transparent)', marginBottom: '4%' }} />;

          if (!block) return (
            <div style={{ ...pg, alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#ddd', fontStyle: 'italic', fontFamily: 'Georgia,serif', fontSize: '13px' }}>— page vide —</p>
            </div>
          );

          const { images: imgs, comment, date } = block;
          const n = imgs.length;
          const dateStr = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
          const title   = comment ? comment.split(' ').slice(0, 4).join(' ') : 'Souvenir';

          // Layout A – Hero pleine page (1 photo ou index 0)
          if (idx % 4 === 0 || n === 1) return (
            <div style={pg}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2%' }}>
                <p style={{ margin: 0, fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#a09080', fontFamily: 'sans-serif' }}>{dateStr}</p>
              </div>
              {accentLine}
              <Photo src={imgs[0]} style={{ flex: 1 }} />
              {n >= 2 && (
                <div style={{ display: 'flex', gap: '3%', height: '26%', marginTop: '3%' }}>
                  {imgs.slice(1, 4).map((src, i) => <Photo key={i} src={src} style={{ flex: 1 }} />)}
                </div>
              )}
              <p style={{ margin: '3% 0 0', fontStyle: 'italic', color: '#444', fontSize: '12px', lineHeight: 1.5, fontFamily: 'Georgia,serif' }}>« {comment || '—'} »</p>
            </div>
          );

          // Layout B – Grande gauche + titre + petites droite (style Sketch 2 CM)
          if (idx % 4 === 1) return (
            <div style={{ ...pg, flexDirection: 'row' }}>
              <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: '4%' }}>
                <Photo src={imgs[0]} style={{ flex: 1 }} />
                {n >= 4 && <Photo src={imgs[3]} style={{ height: '28%' }} />}
              </div>
              <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingLeft: '5%' }}>
                <div>
                  <p style={{ fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#a09080', fontFamily: 'sans-serif', margin: '0 0 6px' }}>{dateStr}</p>
                  {accentLine}
                  <p style={{ fontSize: '18px', color: '#1a1a2e', margin: '0 0 8px', lineHeight: 1.2, fontFamily: 'Georgia,serif', fontWeight: 'bold' }}>{title}</p>
                  <p style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', lineHeight: 1.5, fontFamily: 'Georgia,serif' }}>{comment}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6%' }}>
                  {imgs.slice(1, 3).map((src, i) => <Photo key={i} src={src} style={{ height: '22%' }} />)}
                </div>
              </div>
            </div>
          );

          // Layout C – Grille 2×2 + bandeau titre (style Sketch 1 CM)
          if (idx % 4 === 2) return (
            <div style={pg}>
              <div style={{ borderBottom: '2px solid #c8b99a', paddingBottom: '3%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <p style={{ margin: 0, fontSize: '20px', fontFamily: 'Georgia,serif', fontWeight: 'bold', color: '#1a1a2e' }}>{title}</p>
                <p style={{ margin: 0, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#a09080', fontFamily: 'sans-serif' }}>{dateStr}</p>
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '3%' }}>
                {[0,1,2,3].map(i => <Photo key={i} src={imgs[i] || imgs[n-1]} style={{ width: '100%', height: '100%' }} />)}
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#555', fontStyle: 'italic', fontFamily: 'Georgia,serif', lineHeight: 1.5 }}>« {comment || '—'} »</p>
            </div>
          );

          // Layout D – Bandeau 3 petites + grande hero (style Sketch 3 CM)
          return (
            <div style={pg}>
              <div style={{ display: 'flex', gap: '3%', height: '22%' }}>
                {imgs.slice(0, 3).map((src, i) => <Photo key={i} src={src} style={{ flex: 1 }} />)}
              </div>
              <Photo src={imgs[Math.min(3, n-1)]} style={{ flex: 1 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2%' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '14px', fontFamily: 'Georgia,serif', fontStyle: 'italic', color: '#333' }}>« {comment || '—'} »</p>
                </div>
                <p style={{ margin: 0, fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#a09080', fontFamily: 'sans-serif', flexShrink: 0, marginLeft: '8px' }}>{dateStr}</p>
              </div>
            </div>
          );
        };

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: '#1c1c2e', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }} className="no-print">
              <button onClick={() => setIsPrintMode(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <ChevronLeft size={22} />
              </button>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)', fontFamily: 'sans-serif', fontWeight: 'bold' }}>Album Studio</p>
                <p style={{ margin: '2px 0 0', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>{openedAlbum}</p>
              </div>
              <button onClick={() => window.print()} style={{ background: 'white', border: 'none', borderRadius: 30, padding: '10px 22px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={14} /> Imprimer
              </button>
            </div>

            {/* Book */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 40px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', width: '100%', maxWidth: 960, aspectRatio: '2/1.4', filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.7))' }}>
                {/* Page gauche */}
                <div style={{ flex: 1, background: '#fdfcf8', borderRadius: '6px 0 0 6px', overflow: 'hidden', boxShadow: 'inset -6px 0 12px rgba(0,0,0,0.15)' }}>
                  <ScrapbookPage block={leftBlock} idx={spreadIdx * 2} />
                </div>
                {/* Reliure */}
                <div style={{ width: 10, background: 'linear-gradient(to right,#bbb,#f0ede8,#bbb)', flexShrink: 0, boxShadow: 'inset 0 0 6px rgba(0,0,0,0.2)' }} />
                {/* Page droite */}
                <div style={{ flex: 1, background: '#fdfcf8', borderRadius: '0 6px 6px 0', overflow: 'hidden', boxShadow: 'inset 6px 0 12px rgba(0,0,0,0.15)' }}>
                  <ScrapbookPage block={rightBlock} idx={spreadIdx * 2 + 1} />
                </div>
              </div>
            </div>

            {/* Navigation pages */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, padding: '16px 24px', flexShrink: 0 }} className="no-print">
              <button
                onClick={() => setCurrentSpread(s => Math.max(0, s - 1))}
                disabled={spreadIdx === 0}
                style={{ background: spreadIdx === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 48, height: 48, cursor: spreadIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: spreadIdx === 0 ? 'rgba(255,255,255,0.2)' : 'white' }}>
                <ChevronLeft size={24} />
              </button>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '3px', fontFamily: 'sans-serif', textTransform: 'uppercase' }}>
                Pages {spreadIdx * 2 + 1}–{spreadIdx * 2 + 2} &nbsp;/&nbsp; {totalSpreads * 2}
              </p>
              <button
                onClick={() => setCurrentSpread(s => Math.min(totalSpreads - 1, s + 1))}
                disabled={spreadIdx >= totalSpreads - 1}
                style={{ background: spreadIdx >= totalSpreads - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 48, height: 48, cursor: spreadIdx >= totalSpreads - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: spreadIdx >= totalSpreads - 1 ? 'rgba(255,255,255,0.2)' : 'white' }}>
                <ChevronRight size={24} />
              </button>
            </div>

          </div>
        );
      })()}

      {/* Navigation */}
      <nav className="bg-white/95 border-b sticky top-0 z-50 px-6 py-4 shadow-sm backdrop-blur-md no-print">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg shadow-lg"><BookOpen className="text-white" size={24} /></div>
            <h1 className="text-2xl font-bold tracking-tighter uppercase font-sans">Journal<span className="text-blue-600">Photo</span></h1>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border shadow-inner">
            <button onClick={() => { setView('current'); setOpenedAlbum(null); setIsPrintMode(false); }}
              className={`px-10 py-2.5 rounded-xl text-xs font-bold transition-all ${view === 'current' ? 'bg-white shadow text-blue-900 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              EN COURS
            </button>
            <button onClick={() => { setView('library'); setOpenedAlbum(null); setIsPrintMode(false); }}
              className={`px-10 py-2.5 rounded-xl text-xs font-bold transition-all ${view === 'library' && !openedAlbum ? 'bg-white shadow text-blue-900 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              BIBLIOTHÈQUE
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10 no-print">
        <div className="grid lg:grid-cols-12 gap-12">

          {/* Panneau gauche */}
          {activeTarget && (
            <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/40 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800"><Plus size={20} className="text-blue-600" /> Nouveau Bloc</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date du souvenir</p>
                    <div className="relative flex items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4">
                      <CalendarIcon className="text-slate-400 shrink-0 mr-3" size={18} />
                      <input type="date" className="bg-transparent text-sm font-bold w-full outline-none font-sans"
                        value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 italic flex items-center gap-3">
                    <ImageIcon size={18} className="text-blue-200" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Cible : <span className="text-blue-900 ml-1 font-sans truncate">{activeTarget}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {tempPhotos.map((img, i) => (
                      <div key={i} className="relative w-16 h-16">
                        <img src={img} className="w-full h-full object-cover rounded-xl shadow ring-2 ring-white" />
                        <button onClick={() => setTempPhotos(p => p.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full shadow border p-0.5"><X size={10} /></button>
                      </div>
                    ))}
                    <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50 transition-all">
                      <Camera size={24} className="text-slate-300" />
                      <input type="file" className="hidden" accept="image/*" multiple onChange={handleFiles} />
                    </label>
                  </div>
                  <textarea placeholder="Quelle est l'histoire de ce lot de photos ?"
                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm outline-none min-h-[140px] resize-none font-serif italic shadow-inner"
                    value={comment} onChange={e => setComment(e.target.value)} />
                  <button onClick={submitBlock} disabled={tempPhotos.length === 0 || isUploading}
                    className={`w-full font-bold py-6 rounded-[2rem] shadow-xl flex items-center justify-center gap-4 transition-all duration-300
                      ${showSuccess ? 'bg-green-600 text-white' : 'bg-slate-900 hover:bg-black text-white disabled:bg-slate-200'}`}>
                    {isUploading
                      ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      : showSuccess ? <CheckCircle2 size={24} />
                      : <><Send size={18} className="text-blue-400" /> Sceller le Bloc</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section droite */}
          <div className={activeTarget ? 'lg:col-span-8' : 'lg:col-span-12'}>
            {(view === 'current' || openedAlbum) ? (
              <div>
                <div className="mb-12 border-b pb-10 border-slate-200 flex justify-between items-end no-print">
                  <div>
                    {openedAlbum && (
                      <button onClick={() => setOpenedAlbum(null)}
                        className="mb-6 flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest">
                        <ChevronLeft size={16} /> Bibliothèque
                      </button>
                    )}
                    <h2 className="text-4xl sm:text-7xl font-serif text-slate-900 capitalize tracking-tighter leading-none">{activeTarget}</h2>
                  </div>
                  {view === 'library' && openedAlbum && displayBlocks.length > 0 && (
                    <button onClick={() => setIsPrintMode(true)} className="flex flex-col items-center gap-2 group transition-all">
                      <div className="p-4 bg-white shadow-lg rounded-full border border-slate-50 text-blue-600 group-hover:scale-110 transition-all"><Printer size={24} /></div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Print Studio</span>
                    </button>
                  )}
                </div>
                {displayBlocks.length === 0 ? (
                  <div className="py-48 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200 italic text-slate-300 px-10 shadow-inner">
                    L'album est vide. Ajoutez un premier bloc à gauche pour commencer votre récit.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {displayBlocks.map(block => (
                      <div key={block.id} className="group bg-white p-3 shadow-md border border-slate-50 hover:shadow-xl transition-all duration-300 rounded-3xl flex flex-col">
                        <div className="relative aspect-square overflow-hidden bg-slate-50 cursor-zoom-in rounded-2xl"
                          onClick={() => { setActiveSlider(block); setSliderIdx(0); }}>
                          <Mosaic images={block.images} />
                          <div className="absolute top-3 left-3 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[8px] text-white font-bold uppercase tracking-widest font-sans">
                            {block.images.length} Photos
                          </div>
                        </div>
                        <div className="mt-5 p-2 flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <CalendarIcon size={12} /> {new Date(block.date).toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-slate-800 text-sm italic leading-relaxed line-clamp-3">"{block.comment || 'Souvenir immortalisé'}"</p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); deleteBlock(block.id); }}
                            className="mt-5 text-red-100 hover:text-red-600 transition-colors self-end no-print p-1">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Bibliothèque */
              <div className="space-y-16 max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b pb-12 border-slate-100">
                  <div className="text-center md:text-left">
                    <h2 className="text-5xl sm:text-7xl font-serif text-slate-900 tracking-tighter leading-none">Archives</h2>
                    <p className="text-slate-400 font-serif italic text-xl mt-4">Votre collection privée de souvenirs classés</p>
                  </div>
                  {isCreatingAlbum ? (
                    <div className="flex items-center gap-2">
                      <input autoFocus type="text" placeholder="Nom de l'album…"
                        className="px-6 py-4 bg-white border border-blue-200 rounded-2xl text-sm font-bold shadow-xl outline-none w-64 font-sans"
                        value={newAlbumName} onChange={e => setNewAlbumName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && newAlbumName.trim()) { setOpenedAlbum(newAlbumName.trim()); setIsCreatingAlbum(false); setNewAlbumName(''); } }} />
                      <button onClick={() => { if (newAlbumName.trim()) { setOpenedAlbum(newAlbumName.trim()); setIsCreatingAlbum(false); setNewAlbumName(''); } }}
                        className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl"><CheckCircle2 size={24} /></button>
                      <button onClick={() => setIsCreatingAlbum(false)} className="p-4 bg-white text-slate-400 rounded-2xl border"><X size={24} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setIsCreatingAlbum(true)}
                      className="flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-3xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all group font-sans">
                      <FolderPlus size={24} className="text-blue-400" /> Nouvel Album
                    </button>
                  )}
                </div>
                {Object.keys(albumsMap).length === 0 ? (
                  <div className="py-40 text-center italic text-slate-200">La bibliothèque est vide. Créez un tome ci-dessus.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 mt-16">
                    {Object.keys(albumsMap).sort((a, b) => b.localeCompare(a)).map(name => (
                      <div key={name} onClick={() => { setOpenedAlbum(name); setView('library'); }} className="group cursor-pointer perspective-1000">
                        <div className="relative aspect-[16/10] bg-[#1a2a44] rounded-r-[3rem] shadow-2xl overflow-hidden border-l-[15px] border-black/30 group-hover:translate-x-3 transition-all duration-700">
                          {albumsMap[name][0]?.images[0] && (
                            <img src={albumsMap[name][0].images[0]}
                              className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-1000" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                          <div className="relative h-full z-10 flex flex-col justify-end p-10">
                            <span className="text-blue-400 text-[9px] uppercase tracking-[0.5em] font-bold mb-3 font-sans">Volume Relié</span>
                            <h3 className="text-4xl text-white font-serif capitalize truncate leading-tight tracking-tight">{name}</h3>
                            <div className="h-0.5 w-10 bg-blue-500/50 mt-4 group-hover:w-20 transition-all duration-500"></div>
                            <p className="text-white/40 text-[9px] uppercase tracking-widest mt-6 font-bold font-sans">{albumsMap[name].length} Blocs</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Montage React
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
