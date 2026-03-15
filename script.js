// ─── Globals injectés (plateforme) ──────────────────────────────────────────
// __firebase_config  : string JSON
// __initial_auth_token : string (optionnel)
// ─────────────────────────────────────────────────────────────────────────────

// React hooks (depuis le global React)
const { useState, useEffect, useMemo } = React;

// Icônes Lucide React (global LucideReact)
const {
  Camera, BookOpen, Plus, Trash2, ChevronLeft, ChevronRight,
  X, CheckCircle2, FolderPlus, Send, ImageIcon, Printer,
  Calendar: CalendarIcon, Shuffle, Download, Maximize2, Sparkles,
  LayoutGrid, Layers, Type, Frame
} = LucideReact;

// ─── CONFIGURATION FIREBASE (compat SDK) ─────────────────────────────────────
const firebaseConfig = (typeof __firebase_config !== 'undefined')
  ? JSON.parse(__firebase_config)
  : {};

const app  = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(app);
const db   = firebase.firestore(app);

const appId = 'journal-photo-studio-v100-final';

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
function App() {
  const [user,       setUser]       = useState(null);
  const [souvenirs,  setSouvenirs]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  // Navigation
  const [view,        setView]        = useState('current'); // 'current' | 'library'
  const [openedAlbum, setOpenedAlbum] = useState(null);

  // Formulaire Bloc (panneau gauche)
  const [tempPhotos,   setTempPhotos]   = useState([]);
  const [comment,      setComment]      = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isUploading,  setIsUploading]  = useState(false);
  const [showSuccess,  setShowSuccess]  = useState(false);

  // Création Album
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumName,    setNewAlbumName]    = useState('');

  // Collage & Styles
  const [isPrintMode,   setIsPrintMode]   = useState(false);
  const [collageStyle,  setCollageStyle]  = useState('masonry'); // masonry | grid | magazine | polaroid
  const [collageSeed,   setCollageSeed]   = useState(Math.random());

  // Slider (Visionneuse)
  const [activeSlider, setActiveSlider] = useState(null);
  const [sliderIdx,    setSliderIdx]    = useState(0);

  const currentMonthLabel = useMemo(() =>
    new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
  []);

  // 1. Authentification ──────────────────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await auth.signInWithCustomToken(__initial_auth_token);
        } else {
          await auth.signInAnonymously();
        }
      } catch (e) { console.error('Auth error', e); }
    };
    initAuth();
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  // 2. Synchronisation Firestore ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const ref = db
      .collection('artifacts').doc(appId)
      .collection('users').doc(user.uid)
      .collection('souvenirs');
    const unsub = ref.onSnapshot(
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSouvenirs(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [user]);

  // ─── Logique de filtrage ──────────────────────────────────────────────────
  const activeTarget = view === 'current' ? currentMonthLabel : openedAlbum;

  const displayBlocks = useMemo(() => {
    return souvenirs
      .filter(s => s.album === activeTarget)
      .sort((a, b) =>
        (b.date || '').localeCompare(a.date || '') ||
        (b.createdAt || 0) - (a.createdAt || 0)
      );
  }, [souvenirs, activeTarget]);

  const albumsMap = useMemo(() => {
    return souvenirs.reduce((acc, s) => {
      if (s.album) {
        if (!acc[s.album]) acc[s.album] = [];
        acc[s.album].push(s);
      }
      return acc;
    }, {});
  }, [souvenirs]);

  // ─── Compression image ────────────────────────────────────────────────────
  const processImage = (base64) => {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800;
        let w = img.width, h = img.height;
        if (w > h ? w > MAX_SIZE : h > MAX_SIZE) {
          if (w > h) { h *= MAX_SIZE / w; w = MAX_SIZE; }
          else       { w *= MAX_SIZE / h; h = MAX_SIZE; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        res(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = base64;
    });
  };

  const handleFiles = (e) => {
    Array.from(e.target.files).forEach(f => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const compressed = await processImage(ev.target.result);
        setTempPhotos(prev => [...prev, compressed]);
      };
      reader.readAsDataURL(f);
    });
  };

  // ─── Soumission d'un bloc ─────────────────────────────────────────────────
  const submitBlock = async () => {
    if (!user || tempPhotos.length === 0 || isUploading || !activeTarget) return;
    setIsUploading(true);
    const destination = activeTarget;
    try {
      const ref = db
        .collection('artifacts').doc(appId)
        .collection('users').doc(user.uid)
        .collection('souvenirs');
      await ref.add({
        images:    tempPhotos,
        comment:   comment.trim(),
        date:      selectedDate,
        createdAt: Date.now(),
        album:     destination,
      });
      setTempPhotos([]);
      setComment('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e) { console.error(e); }
    finally { setIsUploading(false); }
  };

  // ─── Suppression d'un bloc ────────────────────────────────────────────────
  const deleteBlock = (blockId) => {
    db.collection('artifacts').doc(appId)
      .collection('users').doc(user.uid)
      .collection('souvenirs').doc(blockId)
      .delete();
  };

  // ─── UI : Miniature mosaïque ──────────────────────────────────────────────
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
          {n > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs">
              +{n - 4}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="h-screen flex items-center justify-center font-serif italic text-slate-400 bg-[#fcfaf7]">
      Initialisation du Studio…
    </div>
  );

  // ─── RENDU ────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen bg-[#fcfaf7] text-slate-900 font-serif pb-20 selection:bg-blue-50 ${isPrintMode ? 'overflow-hidden' : ''}`}>

      {/* ── Slider / Visionneuse ─────────────────────────────────────────── */}
      {activeSlider && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveSlider(null)}
        >
          <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-[110]">
            <X size={32} />
          </button>
          <div
            className="relative w-full max-w-5xl h-full flex flex-col justify-center gap-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative flex-1 flex items-center justify-center overflow-hidden rounded-sm">
              <img
                src={activeSlider.images[sliderIdx]}
                className="max-w-full max-h-[75vh] object-contain shadow-2xl transition-all duration-300"
              />
              {activeSlider.images.length > 1 && (
                <>
                  <button
                    onClick={() => setSliderIdx(i => i > 0 ? i - 1 : activeSlider.images.length - 1)}
                    className="absolute left-0 p-4 text-white/40 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={48} />
                  </button>
                  <button
                    onClick={() => setSliderIdx(i => i < activeSlider.images.length - 1 ? i + 1 : 0)}
                    className="absolute right-0 p-4 text-white/40 hover:text-white transition-colors"
                  >
                    <ChevronRight size={48} />
                  </button>
                </>
              )}
            </div>
            <div className="text-center text-white pb-10">
              <p className="text-[10px] uppercase tracking-widest opacity-40 font-sans mb-2">
                {new Date(activeSlider.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xl italic px-6 max-w-3xl mx-auto leading-relaxed">
                "{activeSlider.comment || 'Souvenir précieux'}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Studio Modal ───────────────────────────────────────────── */}
      {isPrintMode && (
        <div className="fixed inset-0 z-[150] bg-white overflow-y-auto animate-in slide-in-from-bottom no-scrollbar">
          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-md z-[160] px-8 py-6 border-b flex justify-between items-center no-print">
            <button
              onClick={() => setIsPrintMode(false)}
              className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold uppercase tracking-widest">Collage Studio</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{openedAlbum}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold text-xs shadow-xl flex items-center gap-3"
            >
              <Printer size={16} /> IMPRIMER / PDF
            </button>
          </div>

          {/* Collage */}
          <div className={`max-w-5xl mx-auto p-12 mb-32 transition-all duration-700 ${collageStyle === 'polaroid' ? 'bg-slate-50' : 'bg-white'}`}>
            <div className={`
              ${collageStyle === 'masonry'  ? 'columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8' : ''}
              ${collageStyle === 'grid'     ? 'grid grid-cols-1 md:grid-cols-2 gap-12' : ''}
              ${collageStyle === 'magazine' ? 'grid grid-cols-12 gap-8' : ''}
              ${collageStyle === 'polaroid' ? 'flex flex-wrap justify-center gap-12' : ''}
            `}>
              {displayBlocks.map((b, idx) => {
                const colSpan = (idx % 3 === 0) ? 'col-span-12' : 'col-span-6';
                return (
                  <div
                    key={b.id}
                    className={`relative break-inside-avoid
                      ${collageStyle === 'magazine' ? colSpan : ''}
                      ${collageStyle === 'polaroid' ? 'w-80'   : ''}
                    `}
                  >
                    <div className={`overflow-hidden bg-white shadow-xl
                      ${collageStyle === 'polaroid' ? 'p-4 pb-16 border transform rotate-1 shadow-lg' : 'border-[8px] border-white'}
                      ${collageStyle === 'magazine' ? 'aspect-[16/7]' : 'aspect-square rounded-2xl'}
                    `}>
                      <Mosaic images={b.images} />
                    </div>
                    <div className={`mt-4 ${collageStyle === 'polaroid' ? 'absolute bottom-6 left-6 right-6' : 'px-2'}`}>
                      <p className={`font-sans font-bold uppercase tracking-widest mb-1
                        ${collageStyle === 'polaroid' ? 'text-[8px] text-slate-400' : 'text-[9px] text-slate-300'}
                      `}>
                        {new Date(b.date).toLocaleDateString('fr-FR')}
                      </p>
                      <p className={`italic text-slate-600
                        ${collageStyle === 'magazine' ? 'text-lg leading-relaxed' : 'text-sm leading-snug'}
                      `}>
                        {b.comment}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sélecteur de style */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t p-6 z-[170] no-print">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-8">
                {[
                  { id: 'masonry',  label: 'Masonry',  icon: <LayoutGrid size={20} /> },
                  { id: 'grid',     label: 'Grille',   icon: <Layers     size={20} /> },
                  { id: 'magazine', label: 'Magazine', icon: <Type       size={20} /> },
                  { id: 'polaroid', label: 'Polaroid', icon: <Frame      size={20} /> },
                ].map(style => (
                  <button
                    key={style.id}
                    onClick={() => setCollageStyle(style.id)}
                    className={`flex flex-col items-center gap-2 transition-all
                      ${collageStyle === style.id ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}
                    `}
                  >
                    <div className={`p-4 rounded-2xl border-2 transition-all
                      ${collageStyle === style.id ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-100 bg-white shadow-sm'}
                    `}>
                      {style.icon}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest">{style.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCollageSeed(Math.random())}
                className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600 transition-all active:rotate-180"
              >
                <Shuffle size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation principale ────────────────────────────────────────── */}
      <nav className="bg-white/95 border-b sticky top-0 z-50 px-6 py-4 shadow-sm backdrop-blur-md no-print">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg shadow-lg">
              <BookOpen className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tighter uppercase font-sans">
              Journal<span className="text-blue-600">Photo</span>
            </h1>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border shadow-inner">
            <button
              onClick={() => { setView('current'); setOpenedAlbum(null); setIsPrintMode(false); }}
              className={`px-10 py-2.5 rounded-xl text-xs font-bold transition-all
                ${view === 'current' ? 'bg-white shadow text-blue-900 scale-105' : 'text-slate-400 hover:text-slate-600'}
              `}
            >
              EN COURS
            </button>
            <button
              onClick={() => { setView('library'); setOpenedAlbum(null); setIsPrintMode(false); }}
              className={`px-10 py-2.5 rounded-xl text-xs font-bold transition-all
                ${view === 'library' && !openedAlbum ? 'bg-white shadow text-blue-900 scale-105' : 'text-slate-400 hover:text-slate-600'}
              `}
            >
              BIBLIOTHÈQUE
            </button>
          </div>
        </div>
      </nav>

      {/* ── Contenu principal ────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto p-6 md:p-10 no-print">
        <div className="grid lg:grid-cols-12 gap-12">

          {/* Panneau gauche – Ajout de bloc */}
          {activeTarget && (
            <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit animate-in fade-in slide-in-from-left-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/40 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800">
                  <Plus size={20} className="text-blue-600" /> Nouveau Bloc
                </h3>

                <div className="space-y-6">
                  {/* Date */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date du souvenir</p>
                    <div className="relative flex items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 focus-within:ring-4 focus-within:ring-blue-50/30 transition-all">
                      <CalendarIcon className="text-slate-400 shrink-0 mr-3" size={18} />
                      <input
                        type="date"
                        className="bg-transparent text-sm font-bold w-full outline-none font-sans"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Cible */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 italic flex items-center gap-3">
                    <ImageIcon size={18} className="text-blue-200" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Cible : <span className="text-blue-900 ml-1 font-sans truncate">{activeTarget}</span>
                    </p>
                  </div>

                  {/* Photos */}
                  <div className="flex flex-wrap gap-3">
                    {tempPhotos.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 group">
                        <img src={img} className="w-full h-full object-cover rounded-xl shadow ring-2 ring-white" />
                        <button
                          onClick={() => setTempPhotos(p => p.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full shadow border p-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50 group transition-all">
                      <Camera size={24} className="text-slate-300 group-hover:text-blue-500" />
                      <input type="file" className="hidden" accept="image/*" multiple onChange={handleFiles} />
                    </label>
                  </div>

                  {/* Commentaire */}
                  <textarea
                    placeholder="Quelle est l'histoire de ce lot de photos ?"
                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm outline-none min-h-[140px] resize-none font-serif italic shadow-inner"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />

                  {/* Bouton Sceller */}
                  <button
                    onClick={submitBlock}
                    disabled={tempPhotos.length === 0 || isUploading}
                    className={`w-full font-bold py-6 rounded-[2rem] shadow-xl flex items-center justify-center gap-4 transition-all duration-300
                      ${showSuccess
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-900 hover:bg-black text-white disabled:bg-slate-200 shadow-slate-100'
                      }`}
                  >
                    {isUploading
                      ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      : showSuccess
                        ? <CheckCircle2 size={24} />
                        : <><Send size={18} className="text-blue-400" /> Sceller le Bloc</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section droite */}
          <div className={activeTarget ? 'lg:col-span-8' : 'lg:col-span-12'}>
            {(view === 'current' || openedAlbum) ? (

              /* ── Vue Mois en cours / Album ouvert ── */
              <div className="animate-in fade-in duration-500">
                <div className="mb-12 border-b pb-10 border-slate-200 flex justify-between items-end no-print">
                  <div>
                    {openedAlbum && (
                      <button
                        onClick={() => setOpenedAlbum(null)}
                        className="mb-6 flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest"
                      >
                        <ChevronLeft size={16} /> Bibliothèque
                      </button>
                    )}
                    <h2 className="text-4xl sm:text-7xl font-serif text-slate-900 capitalize tracking-tighter leading-none">
                      {activeTarget}
                    </h2>
                  </div>
                  {/* Bouton Print Studio (albums classés uniquement) */}
                  {view === 'library' && openedAlbum && displayBlocks.length > 0 && (
                    <button
                      onClick={() => setIsPrintMode(true)}
                      className="flex flex-col items-center gap-2 group transition-all"
                    >
                      <div className="p-4 bg-white shadow-lg rounded-full border border-slate-50 text-blue-600 group-hover:scale-110 group-hover:shadow-blue-50 transition-all">
                        <Printer size={24} />
                      </div>
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
                      <div
                        key={block.id}
                        className="group bg-white p-3 shadow-md border border-slate-50 hover:shadow-xl transition-all duration-300 rounded-3xl flex flex-col animate-in zoom-in-95"
                      >
                        <div
                          className="relative aspect-square overflow-hidden bg-slate-50 cursor-zoom-in rounded-2xl"
                          onClick={() => { setActiveSlider(block); setSliderIdx(0); }}
                        >
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
                            <p className="text-slate-800 text-sm italic leading-relaxed line-clamp-3">
                              "{block.comment || 'Souvenir immortalisé'}"
                            </p>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteBlock(block.id); }}
                            className="mt-5 text-red-100 hover:text-red-600 transition-colors self-end no-print p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            ) : (

              /* ── Bibliothèque / Archives ── */
              <div className="space-y-16 max-w-6xl mx-auto animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b pb-12 border-slate-100">
                  <div className="text-center md:text-left">
                    <h2 className="text-5xl sm:text-7xl font-serif text-slate-900 tracking-tighter leading-none">Archives</h2>
                    <p className="text-slate-400 font-serif italic text-xl mt-4">Votre collection privée de souvenirs classés</p>
                  </div>

                  {/* Création d'album */}
                  {isCreatingAlbum ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-4">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Nom de l'album…"
                        className="px-6 py-4 bg-white border border-blue-200 rounded-2xl text-sm font-bold shadow-xl outline-none w-64 font-sans"
                        value={newAlbumName}
                        onChange={e => setNewAlbumName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newAlbumName.trim()) {
                            setOpenedAlbum(newAlbumName.trim());
                            setIsCreatingAlbum(false);
                            setNewAlbumName('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newAlbumName.trim()) {
                            setOpenedAlbum(newAlbumName.trim());
                            setIsCreatingAlbum(false);
                            setNewAlbumName('');
                          }
                        }}
                        className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100"
                      >
                        <CheckCircle2 size={24} />
                      </button>
                      <button
                        onClick={() => setIsCreatingAlbum(false)}
                        className="p-4 bg-white text-slate-400 rounded-2xl border"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCreatingAlbum(true)}
                      className="flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-3xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all group font-sans"
                    >
                      <FolderPlus size={24} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                      Nouvel Album
                    </button>
                  )}
                </div>

                {Object.keys(albumsMap).length === 0 ? (
                  <div className="py-40 text-center italic text-slate-200">
                    La bibliothèque est vide. Créez un tome ci-dessus.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 mt-16">
                    {Object.keys(albumsMap).sort((a, b) => b.localeCompare(a)).map(name => (
                      <div
                        key={name}
                        onClick={() => { setOpenedAlbum(name); setView('library'); }}
                        className="group cursor-pointer perspective-1000"
                      >
                        <div className="relative aspect-[16/10] bg-[#1a2a44] rounded-r-[3rem] shadow-2xl overflow-hidden border-l-[15px] border-black/30 group-hover:translate-x-3 transition-all duration-700">
                          {albumsMap[name][0]?.images[0] && (
                            <img
                              src={albumsMap[name][0].images[0]}
                              className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-1000"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                          <div className="relative h-full z-10 flex flex-col justify-end p-10">
                            <span className="text-blue-400 text-[9px] uppercase tracking-[0.5em] font-bold mb-3 font-sans">Volume Relié</span>
                            <h3 className="text-4xl text-white font-serif capitalize truncate leading-tight tracking-tight">{name}</h3>
                            <div className="h-0.5 w-10 bg-blue-500/50 mt-4 group-hover:w-20 transition-all duration-500 shadow-xl shadow-blue-500/50"></div>
                            <p className="text-white/40 text-[9px] uppercase tracking-widest mt-6 font-bold font-sans">
                              {albumsMap[name].length} Blocs
                            </p>
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

// ─── Montage React ────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root');
ReactDOM.createRoot(rootEl).render(<App />);
