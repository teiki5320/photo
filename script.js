// ─── JournalPhoto Studio – v3.0 ──────────────────────────────────────────────
const { useState, useEffect, useMemo } = React;

// ─── Icônes SVG inline ────────────────────────────────────────────────────────
const _svg = (ch) => ({ size = 24, className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>{ch}</svg>
);
const Camera      = _svg(<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>);
const BookOpen    = _svg(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>);
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

// ─── Persistance localStorage ─────────────────────────────────────────────────
const LS_KEY = 'journalphoto_souvenirs';
const lsLoad = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
const lsSave = (data) => localStorage.setItem(LS_KEY, JSON.stringify(data));

// ─── Helpers images ───────────────────────────────────────────────────────────
const imgSrc    = img => typeof img === 'string' ? img : (img?.src || '');
const imgAspect = img => typeof img === 'string' ? 1 : (img?.aspect || 1);

// ─── Disposition automatique selon l'orientation ─────────────────────────────
// Retourne un tableau de rangées, chaque rangée = indices dans `images`
const buildRows = (images) => {
  const n = images.length;
  if (n === 0) return [];
  if (n === 1) return [[0]];

  const idxs   = Array.from({ length: n }, (_, i) => i);
  const aspect = i => imgAspect(images[i]);
  const isPort = i => aspect(i) < 0.85;
  const isLand = i => aspect(i) > 1.15;
  const ports  = idxs.filter(isPort);
  const lands  = idxs.filter(isLand);

  if (n === 2) {
    // 2 paysages → empilés, sinon côte à côte
    return (isLand(0) && isLand(1)) ? [[0], [1]] : [[0, 1]];
  }

  if (n === 3) {
    if (lands.length === 3) return [[0, 1], [2]];          // 3 paysages : 2+1
    if (ports.length === 3) return [[0, 1, 2]];            // 3 portraits : ligne de 3
    if (lands.length >= 2)  return [lands.slice(0, 2), ports.slice(0, 1).concat(lands.slice(2))];
    return [[0], [1, 2]];                                   // 1 grand + 2 petits
  }

  // 4-5 : utilisé uniquement pour les demi-pages (≤3 photos par moitié)
  return [[0, 1], n > 3 ? [2, 3] : [2]];
};

// Hauteur relative d'une rangée : 1 / somme des aspects de la rangée
// → garantit que chaque cadre a la même forme que la photo
const rowFlex = (row, images) =>
  1 / row.reduce((s, i) => s + imgAspect(images[i]), 0);

// ─── App ─────────────────────────────────────────────────────────────────────
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
  const [commentFontSize, setCommentFontSize] = useState(() => {
    try { return Number(localStorage.getItem('journalphoto_fontsize') || '12'); } catch { return 12; }
  });

  const [pageOverrides, setPageOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem('journalphoto_overrides') || '{}'); } catch { return {}; }
  });
  const setPageOverride = (key, patch) =>
    setPageOverrides(prev => {
      const next = { ...prev, [key]: { ...(prev[key] || {}), ...patch } };
      try { localStorage.setItem('journalphoto_overrides', JSON.stringify(next)); } catch {}
      return next;
    });

  const [activeSlider, setActiveSlider] = useState(null);
  const [sliderIdx,    setSliderIdx]    = useState(0);

  const currentMonthLabel = useMemo(() =>
    new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' }), []);

  useEffect(() => { setSouvenirs(lsLoad()); setLoading(false); }, []);

  const activeTarget = view === 'current' ? currentMonthLabel : openedAlbum;

  const displayBlocks = useMemo(() =>
    souvenirs
      .filter(s => s.album === activeTarget)
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0)),
  [souvenirs, activeTarget]);

  const albumsMap = useMemo(() =>
    souvenirs.reduce((acc, s) => {
      if (s.album) { if (!acc[s.album]) acc[s.album] = []; acc[s.album].push(s); }
      return acc;
    }, {}),
  [souvenirs]);

  // ─── Images ──────────────────────────────────────────────────────────────────
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
      res({ src: canvas.toDataURL('image/jpeg', 0.5), aspect: w / h });
    };
    img.src = base64;
  });

  const handleFiles = e => {
    const slots = 5 - tempPhotos.length;
    if (slots <= 0) return;
    Array.from(e.target.files).slice(0, slots).forEach(f => {
      const r = new FileReader();
      r.onload = async ev => {
        const processed = await processImage(ev.target.result);
        setTempPhotos(p => p.length < 5 ? [...p, processed] : p);
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
    lsSave(updated); setSouvenirs(updated);
    setTempPhotos([]); setComment('');
    setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2000);
    setIsUploading(false);
  };

  const deleteBlock = id => {
    const updated = souvenirs.filter(s => s.id !== id);
    lsSave(updated); setSouvenirs(updated);
  };

  // ─── Mosaïque (vue principale) ───────────────────────────────────────────────
  const Mosaic = ({ images }) => {
    const n = images.length;
    const s = img => imgSrc(img);
    if (n === 1) return <img src={s(images[0])} className="w-full h-full object-cover" />;
    if (n === 2) return (
      <div className="flex h-full gap-0.5">
        <img src={s(images[0])} className="w-1/2 h-full object-cover" />
        <img src={s(images[1])} className="w-1/2 h-full object-cover" />
      </div>
    );
    return (
      <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
        <img src={s(images[0])} className="w-full h-full object-cover" />
        <img src={s(images[1])} className="w-full h-full object-cover" />
        <img src={s(images[2])} className="w-full h-full object-cover" />
        <div className="relative">
          <img src={s(images[3] || images[2])} className="w-full h-full object-cover" />
          {n > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs">+{n-4}</div>}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-serif italic text-slate-400 bg-[#fcfaf7]">
      Initialisation du Studio…
    </div>
  );

  const atPhotoLimit = tempPhotos.length >= 5;

  return (
    <div className={`min-h-screen bg-[#fcfaf7] text-slate-900 font-serif pb-20 ${isPrintMode ? 'overflow-hidden' : ''}`}>

      {/* Slider */}
      {activeSlider && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4" onClick={() => setActiveSlider(null)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-[110]"><X size={32} /></button>
          <div className="relative w-full max-w-5xl h-full flex flex-col justify-center gap-6" onClick={e => e.stopPropagation()}>
            <div className="relative flex-1 flex items-center justify-center overflow-hidden rounded-sm">
              <img src={imgSrc(activeSlider.images[sliderIdx])} className="max-w-full max-h-[75vh] object-contain shadow-2xl" />
              {activeSlider.images.length > 1 && <>
                <button onClick={() => setSliderIdx(i => i > 0 ? i-1 : activeSlider.images.length-1)} className="absolute left-0 p-4 text-white/40 hover:text-white"><ChevronLeft size={48} /></button>
                <button onClick={() => setSliderIdx(i => i < activeSlider.images.length-1 ? i+1 : 0)} className="absolute right-0 p-4 text-white/40 hover:text-white"><ChevronRight size={48} /></button>
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

      {/* ── Album Studio ─────────────────────────────────────────────────── */}
      {isPrintMode && (() => {

        // Une page par bloc
        const pageList = displayBlocks.map((block, blockIdx) => ({ block, blockIdx }));
        const totalPages = Math.max(1, pageList.length);
        const pageIdx    = Math.min(currentSpread, totalPages - 1);
        const currentEntry = pageList[pageIdx] || null;

        const getOv = idx => pageOverrides[`${openedAlbum}:${idx}`] || {};
        const setOv = (idx, patch) => setPageOverride(`${openedAlbum}:${idx}`, patch);

        // ── Templates disponibles ─────────────────────────────────────────
        const TEMPLATES = [
          { id: 'auto',       label: 'Auto'         },
          { id: 'big-top',    label: 'Grande photo'  },
          { id: 'grid',       label: 'Grille'        },
          { id: 'magazine',   label: 'Magazine'      },
          { id: 'strip',      label: 'Bande'         },
          { id: 'minimal',    label: 'Minimaliste'   },
          { id: 'duo',        label: 'Duo'           },
          { id: 'trio',       label: 'Triptyque'     },
          { id: 'journal',    label: 'Journal'       },
          { id: 'portrait',   label: 'Portrait'      },
          { id: 'mosaique',   label: 'Mosaïque'      },
          { id: 'carte',      label: 'Carte'         },
          { id: 'panoramique',label: 'Panoramique'   },
          { id: 'texte-left', label: 'Texte gauche'  },
          { id: 'grand-bas',  label: 'Grand bas'     },
          { id: 'deux-rangs', label: 'Deux rangs'    },
          { id: 'pleine',     label: 'Pleine page'   },
          { id: 'six',        label: 'Six photos'    },
          { id: 'manchette',  label: 'Manchette'     },
          { id: 'polaroid',   label: 'Polaroid'      },
          { id: 'encadre',    label: 'Encadré'       },
          { id: 'large-texte',label: 'Long texte'    },
          { id: 'col3',       label: '3 colonnes'    },
          { id: 'diptyque-h', label: 'Diptyque H'    },
        ];

        // ── Cadre photo ───────────────────────────────────────────────────
        const btnS = { background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: 3, width: 22, height: 22, cursor: 'pointer', fontSize: 14, lineHeight: '22px', textAlign: 'center', padding: 0, touchAction: 'manipulation' };
        const Photo = ({ img, style, onLeft, onRight }) => (
          <div style={{ overflow: 'hidden', border: '4px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'relative', minHeight: 0, minWidth: 0, ...style }}>
            <img src={imgSrc(img)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {(onLeft || onRight) && (
              <div className="no-print" style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                {onLeft  ? <button onPointerDown={e=>{e.preventDefault();onLeft(); }} style={btnS}>‹</button> : <span/>}
                {onRight ? <button onPointerDown={e=>{e.preventDefault();onRight();}} style={btnS}>›</button> : <span/>}
              </div>
            )}
          </div>
        );

        // ── SmartRows (auto) ──────────────────────────────────────────────
        const SmartRows = ({ images, mp }) => {
          if (!images.length) return null;
          const rows = buildRows(images);
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
              {rows.map((row, ri) => (
                <div key={ri} style={{ flex: rowFlex(row, images), display: 'flex', gap: '3%' }}>
                  {row.map((imgIdx, pi) => (
                    <Photo key={pi} img={images[imgIdx]} style={{ flex: imgAspect(images[imgIdx]) }} {...mp(imgIdx)} />
                  ))}
                </div>
              ))}
            </div>
          );
        };

        // ── Miniatures SVG des templates (44×56) ─────────────────────────
        const TemplateIcon = ({ id }) => {
          const bg = '#c8b99a', lt = '#ddd5c2', tx = '#a09080';
          const s = { display: 'block' };
          const W = 44, H = 56;
          if (id === 'auto') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2" y="2" width="40" height="22" rx="1" fill={bg}/>
              <rect x="2" y="27" width="18" height="14" rx="1" fill={lt}/>
              <rect x="24" y="27" width="18" height="14" rx="1" fill={lt}/>
              <rect x="2" y="44" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2" y="49" width="20" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'big-top') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2" y="2" width="40" height="26" rx="1" fill={bg}/>
              <rect x="2" y="31" width="11" height="9" rx="1" fill={lt}/>
              <rect x="17" y="31" width="11" height="9" rx="1" fill={lt}/>
              <rect x="32" y="31" width="10" height="9" rx="1" fill={lt}/>
              <rect x="2" y="44" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2" y="49" width="20" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'grid') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2"  width="18" height="18" rx="1" fill={bg}/>
              <rect x="24" y="2"  width="18" height="18" rx="1" fill={lt}/>
              <rect x="2"  y="23" width="18" height="18" rx="1" fill={lt}/>
              <rect x="24" y="23" width="18" height="18" rx="1" fill={bg}/>
              <rect x="2"  y="44" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="49" width="20" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'magazine') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2" y="2" width="22" height="38" rx="1" fill={bg}/>
              <rect x="28" y="2"  width="14" height="11" rx="1" fill={lt}/>
              <rect x="28" y="16" width="14" height="11" rx="1" fill={lt}/>
              <rect x="28" y="30" width="14" height="10" rx="1" fill={lt}/>
              <rect x="2" y="44" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2" y="49" width="20" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'strip') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2" width="11" height="16" rx="1" fill={bg}/>
              <rect x="17" y="2" width="11" height="16" rx="1" fill={lt}/>
              <rect x="32" y="2" width="10" height="16" rx="1" fill={bg}/>
              <rect x="2" y="22" width="40" height="2" rx="1" fill={tx}/>
              <rect x="2" y="27" width="36" height="2" rx="1" fill={tx}/>
              <rect x="2" y="32" width="32" height="2" rx="1" fill={tx}/>
              <rect x="2" y="37" width="38" height="2" rx="1" fill={tx}/>
              <rect x="2" y="42" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2" y="47" width="34" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'minimal') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="6" y="2" width="32" height="26" rx="1" fill={bg}/>
              <rect x="2" y="32" width="36" height="2" rx="1" fill={tx}/>
              <rect x="2" y="37" width="30" height="2" rx="1" fill={tx}/>
              <rect x="2" y="42" width="34" height="2" rx="1" fill={tx}/>
              <rect x="2" y="47" width="24" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'duo') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2" width="18" height="32" rx="1" fill={bg}/>
              <rect x="24" y="2" width="18" height="32" rx="1" fill={lt}/>
              <rect x="2" y="38" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2" y="43" width="22" height="2" rx="1" fill={tx}/>
              <rect x="2" y="48" width="26" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'trio') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2" width="11" height="28" rx="1" fill={bg}/>
              <rect x="17" y="2" width="11" height="28" rx="1" fill={lt}/>
              <rect x="32" y="2" width="10" height="28" rx="1" fill={bg}/>
              <rect x="2" y="34" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2" y="39" width="22" height="2" rx="1" fill={tx}/>
              <rect x="2" y="44" width="26" height="2" rx="1" fill={tx}/>
              <rect x="2" y="49" width="18" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'journal') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2" y="2"  width="36" height="2" rx="1" fill={tx}/>
              <rect x="2" y="7"  width="30" height="2" rx="1" fill={tx}/>
              <rect x="2" y="12" width="34" height="2" rx="1" fill={tx}/>
              <rect x="2" y="17" width="26" height="2" rx="1" fill={tx}/>
              <rect x="2" y="24" width="18" height="14" rx="1" fill={bg}/>
              <rect x="24" y="24" width="18" height="14" rx="1" fill={lt}/>
              <rect x="2" y="41" width="40" height="13" rx="1" fill={lt}/>
            </svg>
          );
          if (id === 'portrait') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2" y="2" width="16" height="40" rx="1" fill={bg}/>
              <rect x="22" y="2"  width="20" height="2" rx="1" fill={tx}/>
              <rect x="22" y="7"  width="16" height="2" rx="1" fill={tx}/>
              <rect x="22" y="12" width="18" height="2" rx="1" fill={tx}/>
              <rect x="22" y="17" width="14" height="2" rx="1" fill={tx}/>
              <rect x="22" y="22" width="20" height="2" rx="1" fill={tx}/>
              <rect x="22" y="27" width="16" height="2" rx="1" fill={tx}/>
              <rect x="22" y="32" width="18" height="2" rx="1" fill={tx}/>
              <rect x="22" y="37" width="12" height="2" rx="1" fill={tx}/>
              <rect x="2" y="46" width="40" height="2" rx="1" fill={tx}/>
              <rect x="2" y="51" width="30" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'mosaique') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2"  width="22" height="22" rx="1" fill={bg}/>
              <rect x="28" y="2"  width="14" height="10" rx="1" fill={lt}/>
              <rect x="28" y="15" width="14" height="10" rx="1" fill={lt}/>
              <rect x="2"  y="27" width="14" height="13" rx="1" fill={lt}/>
              <rect x="20" y="27" width="22" height="13" rx="1" fill={bg}/>
              <rect x="2"  y="44" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="49" width="20" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'carte') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="6" y="2" width="32" height="22" rx="2" fill={bg}/>
              <rect x="2" y="27" width="40" height="2" rx="1" fill={tx}/>
              <rect x="2" y="32" width="34" height="2" rx="1" fill={tx}/>
              <rect x="2" y="37" width="38" height="2" rx="1" fill={tx}/>
              <rect x="2" y="42" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2" y="47" width="32" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'panoramique') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2" y="2" width="40" height="14" rx="1" fill={bg}/>
              <rect x="2" y="20" width="38" height="2" rx="1" fill={tx}/>
              <rect x="2" y="25" width="32" height="2" rx="1" fill={tx}/>
              <rect x="2" y="30" width="36" height="2" rx="1" fill={tx}/>
              <rect x="2" y="35" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2" y="40" width="34" height="2" rx="1" fill={tx}/>
              <rect x="2" y="45" width="24" height="2" rx="1" fill={tx}/>
              <rect x="2" y="50" width="30" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'texte-left') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2"  width="14" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="7"  width="16" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="12" width="12" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="17" width="15" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="22" width="11" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="27" width="14" height="2" rx="1" fill={tx}/>
              <rect x="22" y="2"  width="20" height="16" rx="1" fill={bg}/>
              <rect x="22" y="21" width="20" height="16" rx="1" fill={lt}/>
              <rect x="22" y="40" width="20" height="14" rx="1" fill={bg}/>
            </svg>
          );
          if (id === 'grand-bas') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2"  width="11" height="10" rx="1" fill={bg}/>
              <rect x="17" y="2"  width="11" height="10" rx="1" fill={lt}/>
              <rect x="32" y="2"  width="10" height="10" rx="1" fill={bg}/>
              <rect x="2"  y="16" width="40" height="24" rx="1" fill={lt}/>
              <rect x="2"  y="44" width="30" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="49" width="22" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'deux-rangs') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2"  width="18" height="16" rx="1" fill={bg}/>
              <rect x="24" y="2"  width="18" height="16" rx="1" fill={lt}/>
              <rect x="2"  y="22" width="18" height="16" rx="1" fill={lt}/>
              <rect x="24" y="22" width="18" height="16" rx="1" fill={bg}/>
              <rect x="2"  y="42" width="30" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="47" width="22" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'pleine') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2" y="2" width="40" height="52" rx="1" fill={bg}/>
              <rect x="4" y="46" width="24" height="2" rx="1" fill="rgba(255,255,255,0.7)"/>
              <rect x="4" y="50" width="16" height="2" rx="1" fill="rgba(255,255,255,0.5)"/>
            </svg>
          );
          if (id === 'six') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2"  width="11" height="12" rx="1" fill={bg}/>
              <rect x="17" y="2"  width="11" height="12" rx="1" fill={lt}/>
              <rect x="32" y="2"  width="10" height="12" rx="1" fill={bg}/>
              <rect x="2"  y="18" width="11" height="12" rx="1" fill={lt}/>
              <rect x="17" y="18" width="11" height="12" rx="1" fill={bg}/>
              <rect x="32" y="18" width="10" height="12" rx="1" fill={lt}/>
              <rect x="2"  y="34" width="30" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="39" width="24" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="44" width="28" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'manchette') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2" y="2" width="40" height="18" rx="1" fill={bg}/>
              <rect x="2" y="24" width="18" height="14" rx="1" fill={lt}/>
              <rect x="24" y="24" width="18" height="14" rx="1" fill={lt}/>
              <rect x="2"  y="42" width="30" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="47" width="22" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'polaroid') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2"  width="17" height="20" rx="1" fill="white" stroke={lt} strokeWidth="1"/>
              <rect x="3"  y="3"  width="15" height="13" rx="1" fill={bg}/>
              <rect x="26" y="2"  width="16" height="20" rx="1" fill="white" stroke={lt} strokeWidth="1"/>
              <rect x="27" y="3"  width="14" height="13" rx="1" fill={lt}/>
              <rect x="2"  y="26" width="17" height="20" rx="1" fill="white" stroke={lt} strokeWidth="1"/>
              <rect x="3"  y="27" width="15" height="13" rx="1" fill={lt}/>
              <rect x="26" y="26" width="16" height="20" rx="1" fill="white" stroke={lt} strokeWidth="1"/>
              <rect x="27" y="27" width="14" height="13" rx="1" fill={bg}/>
              <rect x="2"  y="50" width="28" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'encadre') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="4" y="2" width="36" height="28" rx="1" fill="white" stroke={lt} strokeWidth="2"/>
              <rect x="8" y="6" width="28" height="20" rx="1" fill={bg}/>
              <rect x="2"  y="34" width="38" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="39" width="32" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="44" width="36" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="49" width="26" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'large-texte') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="10" y="2" width="24" height="16" rx="1" fill={bg}/>
              <rect x="2"  y="22" width="40" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="27" width="36" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="32" width="40" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="37" width="30" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="42" width="38" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="47" width="24" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'col3') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2"  y="2" width="11" height="36" rx="1" fill={bg}/>
              <rect x="17" y="2" width="11" height="36" rx="1" fill={lt}/>
              <rect x="32" y="2" width="10" height="36" rx="1" fill={bg}/>
              <rect x="2"  y="42" width="30" height="2" rx="1" fill={tx}/>
              <rect x="2"  y="47" width="22" height="2" rx="1" fill={tx}/>
            </svg>
          );
          if (id === 'diptyque-h') return (
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={s}>
              <rect x="2" y="2"  width="40" height="18" rx="1" fill={bg}/>
              <rect x="2" y="23" width="40" height="18" rx="1" fill={lt}/>
              <rect x="2" y="45" width="28" height="2" rx="1" fill={tx}/>
              <rect x="2" y="50" width="20" height="2" rx="1" fill={tx}/>
            </svg>
          );
          return null;
        };

        // ── Rendu selon template ──────────────────────────────────────────
        const renderLayout = (template, images, mp, commentNode) => {
          const n = images.length;
          if (template === 'big-top') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <Photo img={images[0]} style={{ flex: 2.5 }} {...mp(0)} />
                {n > 1 && (
                  <div style={{ flex: 1, display: 'flex', gap: '3%' }}>
                    {images.slice(1).map((img, i) => (
                      <Photo key={i} img={img} style={{ flex: imgAspect(img) }} {...mp(i + 1)} />
                    ))}
                  </div>
                )}
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'grid') {
            const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
            const rows = Math.ceil(n / cols);
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: '3%', minHeight: 0 }}>
                  {images.map((img, i) => (
                    <div key={i} style={{ position: 'relative', overflow: 'hidden', border: '4px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                      <img src={imgSrc(img)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div className="no-print" style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                        {i > 0     ? <button onPointerDown={e=>{e.preventDefault();mp(i).onLeft?.(); }} style={btnS}>‹</button> : <span/>}
                        {i < n - 1 ? <button onPointerDown={e=>{e.preventDefault();mp(i).onRight?.();}} style={btnS}>›</button> : <span/>}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'magazine') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: 1, display: 'flex', gap: '3%', minHeight: 0 }}>
                  <Photo img={images[0]} style={{ flex: 3 }} {...mp(0)} />
                  {n > 1 && (
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '3%' }}>
                      {images.slice(1).map((img, i) => (
                        <Photo key={i} img={img} style={{ flex: 1 }} {...mp(i + 1)} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'strip') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4%', minHeight: 0 }}>
                <div style={{ flex: '0 0 28%', display: 'flex', gap: '3%' }}>
                  {images.map((img, i) => (
                    <Photo key={i} img={img} style={{ flex: imgAspect(img) }} {...mp(i)} />
                  ))}
                </div>
                <div style={{ flex: 1 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'minimal') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4%', minHeight: 0 }}>
                <div style={{ flex: '0 0 50%', display: 'flex', justifyContent: 'center' }}>
                  <Photo img={images[0]} style={{ maxWidth: '80%', flex: imgAspect(images[0]) }} {...mp(0)} />
                </div>
                <div style={{ flex: 1 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'panoramique') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: '0 0 22%' }}>
                  <Photo img={images[0]} style={{ height: '100%', width: '100%' }} {...mp(0)} />
                </div>
                <div style={{ flex: 1 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'texte-left') {
            return (
              <div style={{ flex: 1, display: 'flex', gap: '4%', minHeight: 0 }}>
                <div style={{ flex: 2 }}>{commentNode}</div>
                <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '3%' }}>
                  {images.map((img, i) => (
                    <Photo key={i} img={img} style={{ flex: 1 }} {...mp(i)} />
                  ))}
                </div>
              </div>
            );
          }
          if (template === 'grand-bas') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                {n > 1 && (
                  <div style={{ flex: '0 0 20%', display: 'flex', gap: '3%' }}>
                    {images.slice(0, -1).map((img, i) => (
                      <Photo key={i} img={img} style={{ flex: imgAspect(img) }} {...mp(i)} />
                    ))}
                  </div>
                )}
                <Photo img={images[n - 1]} style={{ flex: 1.5 }} {...mp(n - 1)} />
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'deux-rangs') {
            const half = Math.ceil(n / 2);
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: 1, display: 'flex', gap: '3%' }}>
                  {images.slice(0, half).map((img, i) => (
                    <Photo key={i} img={img} style={{ flex: imgAspect(img) }} {...mp(i)} />
                  ))}
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '3%' }}>
                  {images.slice(half).map((img, i) => (
                    <Photo key={i} img={img} style={{ flex: imgAspect(img) }} {...mp(i + half)} />
                  ))}
                </div>
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'pleine') {
            return (
              <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <Photo img={images[0]} style={{ position: 'absolute', inset: 0 }} {...mp(0)} />
                <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'six') {
            const take = images.slice(0, 6);
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(2,1fr)', gap: '3%', minHeight: 0 }}>
                  {take.map((img, i) => (
                    <div key={i} style={{ position: 'relative', overflow: 'hidden', border: '4px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                      <img src={imgSrc(img)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div className="no-print" style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                        {i > 0 ? <button onPointerDown={e=>{e.preventDefault();mp(i).onLeft?.();}} style={btnS}>‹</button> : <span/>}
                        {i < take.length-1 ? <button onPointerDown={e=>{e.preventDefault();mp(i).onRight?.();}} style={btnS}>›</button> : <span/>}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'manchette') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <Photo img={images[0]} style={{ flex: '0 0 30%' }} {...mp(0)} />
                <div style={{ flex: 1, display: 'flex', gap: '3%' }}>
                  {images.slice(1, 3).map((img, i) => (
                    <Photo key={i} img={img} style={{ flex: imgAspect(img) }} {...mp(i + 1)} />
                  ))}
                </div>
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'polaroid') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gridTemplateRows: 'repeat(2,1fr)', gap: '4%', minHeight: 0 }}>
                  {images.slice(0, 4).map((img, i) => (
                    <div key={i} style={{ background: 'white', padding: '4px 4px 14px', boxShadow: '0 3px 10px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        <img src={imgSrc(img)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div className="no-print" style={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                        {i > 0 ? <button onPointerDown={e=>{e.preventDefault();mp(i).onLeft?.();}} style={btnS}>‹</button> : <span/>}
                        {i < Math.min(n,4)-1 ? <button onPointerDown={e=>{e.preventDefault();mp(i).onRight?.();}} style={btnS}>›</button> : <span/>}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'encadre') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4%', minHeight: 0 }}>
                <div style={{ flex: '0 0 52%', width: '88%', position: 'relative', overflow: 'hidden', border: '8px solid white', boxShadow: '0 0 0 2px #d4c5a9, 0 6px 24px rgba(0,0,0,0.2)' }}>
                  <img src={imgSrc(images[0])} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, width: '100%' }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'large-texte') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4%', minHeight: 0 }}>
                <div style={{ flex: '0 0 26%', display: 'flex', justifyContent: 'center' }}>
                  <Photo img={images[0]} style={{ flex: imgAspect(images[0]), maxWidth: '60%' }} {...mp(0)} />
                </div>
                <div style={{ flex: 1 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'col3') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: 1, display: 'flex', gap: '3%', minHeight: 0 }}>
                  {[0,1,2].map(i => n > i ? (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%' }}>
                      {images.filter((_,j) => j % 3 === i).map((img, k) => (
                        <Photo key={k} img={img} style={{ flex: 1 }} {...mp(i + k * 3)} />
                      ))}
                    </div>
                  ) : <div key={i} style={{ flex: 1 }}/>)}
                </div>
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'diptyque-h') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <Photo img={images[0]} style={{ flex: 1 }} {...mp(0)} />
                {n > 1 && <Photo img={images[1]} style={{ flex: 1 }} {...mp(1)} />}
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'duo') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: 1, display: 'flex', gap: '3%', minHeight: 0 }}>
                  <Photo img={images[0]} style={{ flex: 1 }} {...mp(0)} />
                  {n > 1 && <Photo img={images[1]} style={{ flex: 1 }} {...mp(1)} />}
                </div>
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'trio') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: 1, display: 'flex', gap: '3%', minHeight: 0 }}>
                  {images.slice(0, 3).map((img, i) => (
                    <Photo key={i} img={img} style={{ flex: 1 }} {...mp(i)} />
                  ))}
                </div>
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'journal') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: '0 0 30%' }}>{commentNode}</div>
                <div style={{ flex: 1, display: 'flex', gap: '3%', minHeight: 0 }}>
                  {images.slice(0, 2).map((img, i) => (
                    <Photo key={i} img={img} style={{ flex: imgAspect(img) }} {...mp(i)} />
                  ))}
                </div>
                {n > 2 && (
                  <div style={{ flex: 1, display: 'flex', gap: '3%', minHeight: 0 }}>
                    {images.slice(2).map((img, i) => (
                      <Photo key={i} img={img} style={{ flex: imgAspect(img) }} {...mp(i + 2)} />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          if (template === 'portrait') {
            return (
              <div style={{ flex: 1, display: 'flex', gap: '4%', minHeight: 0 }}>
                <Photo img={images[0]} style={{ flex: '0 0 38%' }} {...mp(0)} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%' }}>
                  {commentNode}
                  {n > 1 && images.slice(1, 3).map((img, i) => (
                    <Photo key={i} img={img} style={{ flex: 1 }} {...mp(i + 1)} />
                  ))}
                </div>
              </div>
            );
          }
          if (template === 'mosaique') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '3fr 2fr', gridTemplateRows: '1fr 1fr', gap: '3%', minHeight: 0 }}>
                  <div style={{ gridRow: '1 / 3', position: 'relative', overflow: 'hidden', border: '4px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    <img src={imgSrc(images[0])} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div className="no-print" style={{ position: 'absolute', bottom: 4, right: 4 }}><button onPointerDown={e=>{e.preventDefault();mp(0).onRight?.();}} style={btnS}>›</button></div>
                  </div>
                  {[1,2].map(i => n > i ? (
                    <div key={i} style={{ position: 'relative', overflow: 'hidden', border: '4px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                      <img src={imgSrc(images[i])} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div className="no-print" style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                        {i > 0 ? <button onPointerDown={e=>{e.preventDefault();mp(i).onLeft?.();}} style={btnS}>‹</button> : <span/>}
                        {i < n-1 ? <button onPointerDown={e=>{e.preventDefault();mp(i).onRight?.();}} style={btnS}>›</button> : <span/>}
                      </div>
                    </div>
                  ) : <div key={i}/>)}
                </div>
                {n > 3 && (
                  <div style={{ flex: '0 0 22%', display: 'flex', gap: '3%' }}>
                    {images.slice(3).map((img, i) => (
                      <Photo key={i} img={img} style={{ flex: imgAspect(img) }} {...mp(i + 3)} />
                    ))}
                  </div>
                )}
                <div style={{ flexShrink: 0 }}>{commentNode}</div>
              </div>
            );
          }
          if (template === 'carte') {
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4%', minHeight: 0 }}>
                <div style={{ flex: '0 0 42%', width: '85%', position: 'relative', overflow: 'hidden', border: '6px solid white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', borderRadius: 4 }}>
                  <img src={imgSrc(images[0])} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  {n > 1 && (
                    <div className="no-print" style={{ position: 'absolute', bottom: 4, right: 4 }}>
                      <button onPointerDown={e=>{e.preventDefault();mp(0).onRight?.();}} style={btnS}>›</button>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, width: '100%' }}>{commentNode}</div>
              </div>
            );
          }
          // auto : SmartRows
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%', minHeight: 0 }}>
              <SmartRows images={images} mp={mp} />
              <div style={{ flexShrink: 0 }}>{commentNode}</div>
            </div>
          );
        };

        // ── Page scrapbook ────────────────────────────────────────────────
        const ScrapbookPage = ({ block, blockIdx }) => {
          if (!block) return (
            <div style={{ background: '#fdfcf8', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#ddd', fontStyle: 'italic', fontFamily: 'Georgia,serif', fontSize: '13px' }}>— page vide —</p>
            </div>
          );

          const ov         = getOv(blockIdx);
          const images     = ov.images  || block.images || [];
          const effComment = ov.comment !== undefined ? ov.comment : (block.comment || '');
          const template   = ov.layout  || 'auto';
          const n          = images.length;
          const onOv       = patch => setOv(blockIdx, patch);

          const moveImg = (i, j) => {
            const imgs = [...images];
            [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
            onOv({ images: imgs });
          };
          const mp = i => ({
            onLeft:  i > 0     ? () => moveImg(i, i - 1) : undefined,
            onRight: i < n - 1 ? () => moveImg(i, i + 1) : undefined,
          });

          const dateStr   = new Date(block.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
          const dateStyle = { margin: 0, fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#a09080', fontFamily: 'sans-serif' };
          const accentLine = <div style={{ height: '2px', background: 'linear-gradient(to right,#c8b99a,transparent)', marginBottom: '3%', flexShrink: 0 }} />;

          const commentNode = (
            <p contentEditable suppressContentEditableWarning
              onBlur={e => onOv({ comment: e.target.innerText.trim().slice(0, 600) })}
              style={{ margin: 0, fontStyle: 'italic', color: '#444', fontSize: `${commentFontSize}px`, lineHeight: 1.6, fontFamily: 'Georgia,serif', outline: 'none', borderBottom: '1px dashed rgba(200,185,154,0.6)', cursor: 'text', overflow: 'hidden' }}>
              {effComment || '—'}
            </p>
          );

          return (
            <div style={{ background: '#fdfcf8', width: '100%', height: '100%', padding: '6%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
              <div style={{ marginBottom: '3%', flexShrink: 0 }}><p style={dateStyle}>{dateStr}</p></div>
              {accentLine}
              {renderLayout(template, images, mp, commentNode)}
            </div>
          );
        };

        const EmptyPage = () => (
          <div style={{ width: '100%', height: '100%', background: '#fdfcf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#ddd', fontStyle: 'italic', fontFamily: 'Georgia,serif', fontSize: '13px' }}>— page vide —</p>
          </div>
        );

        // ── Panneau de paramètres ─────────────────────────────────────────
        const SettingsPanel = ({ blockIdx }) => {
          const ov = getOv(blockIdx);
          const currentTemplate = ov.layout || 'auto';
          return (
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', height: '100%', boxSizing: 'border-box', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p style={{ margin: '0 0 14px', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'sans-serif' }}>Modèle de page</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setOv(blockIdx, { layout: t.id })}
                      style={{ background: currentTemplate === t.id ? 'rgba(200,185,154,0.15)' : 'rgba(255,255,255,0.03)', border: `2px solid ${currentTemplate === t.id ? '#c8b99a' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '8px 4px 6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
                      <TemplateIcon id={t.id} />
                      <span style={{ fontSize: '7px', letterSpacing: '0.5px', color: currentTemplate === t.id ? '#c8b99a' : 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 10px', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'sans-serif' }}>Taille du commentaire</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {[9,10,11,12,13,14,15,16,18].map(v => (
                    <button key={v} onClick={() => { setCommentFontSize(v); try { localStorage.setItem('journalphoto_fontsize', String(v)); } catch {} }}
                      style={{ background: commentFontSize === v ? '#c8b99a' : 'rgba(255,255,255,0.07)', border: `1px solid ${commentFontSize === v ? '#c8b99a' : 'rgba(255,255,255,0.12)'}`, borderRadius: 6, color: commentFontSize === v ? '#1c1c2e' : 'rgba(255,255,255,0.5)', fontSize: '10px', fontFamily: 'sans-serif', padding: '5px 4px', cursor: 'pointer', flex: 1, transition: 'all 0.12s' }}>
                      {v}
                    </button>
                  ))}
                </div>
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

            {/* Contenu : livre gauche + panneau droite */}
            <div style={{ flex: 1, display: 'flex', gap: 28, padding: '20px 32px', overflow: 'hidden', minHeight: 0, alignItems: 'center', justifyContent: 'center' }} className="no-print">

              {/* Page (effet livre) */}
              <div style={{ flexShrink: 0, height: 'calc(100vh - 260px)', aspectRatio: '1/1.41', filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.65))' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '3px 0 0 3px', overflow: 'hidden', boxShadow: 'inset -10px 0 20px rgba(0,0,0,0.12), 6px 0 10px rgba(0,0,0,0.35)' }}>
                  {currentEntry ? <ScrapbookPage block={currentEntry.block} blockIdx={currentEntry.blockIdx} /> : <EmptyPage />}
                </div>
              </div>

              {/* Panneau paramètres */}
              <div style={{ flex: 1, minWidth: 200, maxWidth: 340, height: 'calc(100vh - 260px)' }}>
                {currentEntry ? <SettingsPanel blockIdx={currentEntry.blockIdx} /> : null}
              </div>

            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, padding: '16px 24px', flexShrink: 0 }} className="no-print">
              <button onClick={() => setCurrentSpread(s => Math.max(0, s - 1))} disabled={pageIdx === 0}
                style={{ background: pageIdx===0?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.12)', border:'none', borderRadius:'50%', width:48, height:48, cursor:pageIdx===0?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:pageIdx===0?'rgba(255,255,255,0.2)':'white' }}>
                <ChevronLeft size={24} />
              </button>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '3px', fontFamily: 'sans-serif', textTransform: 'uppercase' }}>
                Page {pageIdx + 1} / {totalPages}
              </p>
              <button onClick={() => setCurrentSpread(s => Math.min(totalPages - 1, s + 1))} disabled={pageIdx >= totalPages - 1}
                style={{ background: pageIdx>=totalPages-1?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.12)', border:'none', borderRadius:'50%', width:48, height:48, cursor:pageIdx>=totalPages-1?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:pageIdx>=totalPages-1?'rgba(255,255,255,0.2)':'white' }}>
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
              className={`px-10 py-2.5 rounded-xl text-xs font-bold transition-all ${view==='current'?'bg-white shadow text-blue-900 scale-105':'text-slate-400 hover:text-slate-600'}`}>
              EN COURS
            </button>
            <button onClick={() => { setView('library'); setOpenedAlbum(null); setIsPrintMode(false); }}
              className={`px-10 py-2.5 rounded-xl text-xs font-bold transition-all ${view==='library'&&!openedAlbum?'bg-white shadow text-blue-900 scale-105':'text-slate-400 hover:text-slate-600'}`}>
              BIBLIOTHÈQUE
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10 no-print">
        <div className="grid lg:grid-cols-12 gap-12">

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
                        <img src={imgSrc(img)} className="w-full h-full object-cover rounded-xl shadow ring-2 ring-white" />
                        <button onClick={() => setTempPhotos(p => p.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full shadow border p-0.5"><X size={10} /></button>
                      </div>
                    ))}
                    {!atPhotoLimit && (
                      <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50 transition-all">
                        <Camera size={24} className="text-slate-300" />
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleFiles} />
                      </label>
                    )}
                    {atPhotoLimit && (
                      <div className="flex items-center px-3 py-1 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-400 font-sans">5 / 5 max</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <textarea placeholder="Quelle est l'histoire de ce lot de photos ?"
                      className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm outline-none min-h-[140px] resize-none font-serif italic shadow-inner"
                      value={comment} onChange={e => setComment(e.target.value.slice(0, 400))}
                      maxLength={400} rows={6} />
                    <p className={`text-right text-[10px] font-sans pr-1 ${comment.length > 360 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {comment.length} / 400
                    </p>
                  </div>
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
                        onKeyDown={e => { if (e.key==='Enter'&&newAlbumName.trim()) { setOpenedAlbum(newAlbumName.trim()); setIsCreatingAlbum(false); setNewAlbumName(''); } }} />
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
                    {Object.keys(albumsMap).sort((a,b) => b.localeCompare(a)).map(name => (
                      <div key={name} onClick={() => { setOpenedAlbum(name); setView('library'); }} className="group cursor-pointer">
                        <div className="relative aspect-[16/10] bg-[#1a2a44] rounded-r-[3rem] shadow-2xl overflow-hidden border-l-[15px] border-black/30 group-hover:translate-x-3 transition-all duration-700">
                          {albumsMap[name][0]?.images[0] && (
                            <img src={imgSrc(albumsMap[name][0].images[0])}
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
