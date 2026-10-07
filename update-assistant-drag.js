const fs = require("fs");

const path = "./client/src/components/EvrakTakipAssistant.js";
let s = fs.readFileSync(path, "utf8");

/* ============================================================
   1) STATE + REFS
   ============================================================ */

const oldState =
`  const [open,setOpen]=useState(false), [messages,setMessages]=useState([starter]), [input,setInput]=useState(""), [busy,setBusy]=useState(false);
  const scrollRef=useRef(null); const navigate=useNavigate(); const openTab=useTabStore(s=>s.openTab);`;

const newState =
`  const [open,setOpen]=useState(false), [messages,setMessages]=useState([starter]), [input,setInput]=useState(""), [busy,setBusy]=useState(false);

  // AI Asistan robot konumu
  const [robotPos,setRobotPos]=useState(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem("bapsis-assistant-position") || "null");
      if(saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)){
        return saved;
      }
    }catch{}
    return null;
  });

  // Robot kenara gizlenmiş mi?
  const [robotDock,setRobotDock]=useState(()=>{
    try{
      const saved=localStorage.getItem("bapsis-assistant-dock");
      return saved==="left" || saved==="right" ? saved : null;
    }catch{
      return null;
    }
  });

  const dragState=useRef(null);
  const suppressClick=useRef(false);

  const scrollRef=useRef(null); const navigate=useNavigate(); const openTab=useTabStore(s=>s.openTab);`;

if(!s.includes(oldState)){
  console.error("DURDURULDU: State bolumu bulunamadi.");
  process.exit(1);
}

s=s.replace(oldState,newState);


/* ============================================================
   2) DRAG / DOCK FONKSIYONLARI
   ============================================================ */

const marker =
`  const go=(path,params={})=>{`;

const helpers =
`
  // Robotu ekran sinirlari icinde tut.
  const clampPosition=(x,y)=>{
    const size=64;
    const gap=10;

    return {
      x:Math.max(gap,Math.min(x,window.innerWidth-size-gap)),
      y:Math.max(gap,Math.min(y,window.innerHeight-size-gap))
    };
  };

  const saveRobotPosition=(pos)=>{
    setRobotPos(pos);

    try{
      localStorage.setItem(
        "bapsis-assistant-position",
        JSON.stringify(pos)
      );
    }catch{}
  };

  const dockRobot=(side)=>{
    const safeSide=side==="left" ? "left" : "right";

    setOpen(false);
    setRobotDock(safeSide);

    try{
      localStorage.setItem(
        "bapsis-assistant-dock",
        safeSide
      );
    }catch{}
  };

  const restoreRobot=()=>{
    setRobotDock(null);

    try{
      localStorage.removeItem(
        "bapsis-assistant-dock"
      );
    }catch{}

    // Robot kenardan biraz iceride geri gelsin.
    setRobotPos(current=>{
      const y=current?.y ?? Math.max(80,window.innerHeight-100);

      const next=clampPosition(
        hiddenSideForRestore.current==="left"
          ? 24
          : window.innerWidth-88,
        y
      );

      try{
        localStorage.setItem(
          "bapsis-assistant-position",
          JSON.stringify(next)
        );
      }catch{}

      return next;
    });
  };

  const hiddenSideForRestore=useRef("right");

  useEffect(()=>{
    if(robotDock){
      hiddenSideForRestore.current=robotDock;
    }
  },[robotDock]);

  useEffect(()=>{
    const handleResize=()=>{
      setRobotPos(current=>{
        if(!current) return current;

        const next=clampPosition(
          current.x,
          current.y
        );

        try{
          localStorage.setItem(
            "bapsis-assistant-position",
            JSON.stringify(next)
          );
        }catch{}

        return next;
      });
    };

    window.addEventListener("resize",handleResize);

    return ()=>{
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  },[]);

  const onRobotPointerDown=(e)=>{
    if(e.button!==undefined && e.button!==0){
      return;
    }

    const rect=e.currentTarget.getBoundingClientRect();

    dragState.current={
      pointerId:e.pointerId,
      startX:e.clientX,
      startY:e.clientY,
      originX:rect.left,
      originY:rect.top,
      moved:false
    };

    suppressClick.current=false;

    try{
      e.currentTarget.setPointerCapture(
        e.pointerId
      );
    }catch{}
  };

  const onRobotPointerMove=(e)=>{
    const drag=dragState.current;

    if(!drag || drag.pointerId!==e.pointerId){
      return;
    }

    const dx=e.clientX-drag.startX;
    const dy=e.clientY-drag.startY;

    if(
      !drag.moved &&
      Math.hypot(dx,dy)>5
    ){
      drag.moved=true;
      suppressClick.current=true;
    }

    if(!drag.moved){
      return;
    }

    const next=clampPosition(
      drag.originX+dx,
      drag.originY+dy
    );

    setRobotPos(next);
  };

  const onRobotPointerUp=(e)=>{
    const drag=dragState.current;

    if(!drag || drag.pointerId!==e.pointerId){
      return;
    }

    if(drag.moved){
      const dx=e.clientX-drag.startX;
      const dy=e.clientY-drag.startY;

      const next=clampPosition(
        drag.originX+dx,
        drag.originY+dy
      );

      saveRobotPosition(next);

      const centerX=next.x+32;

      // Sol veya sag kenara yaklastirildiginda gizle.
      if(centerX<=90){
        dockRobot("left");
      }
      else if(centerX>=window.innerWidth-90){
        dockRobot("right");
      }
    }

    try{
      e.currentTarget.releasePointerCapture(
        e.pointerId
      );
    }catch{}

    dragState.current=null;

    window.setTimeout(()=>{
      suppressClick.current=false;
    },100);
  };

  const onRobotClick=()=>{
    if(suppressClick.current){
      return;
    }

    setOpen(v=>!v);
  };

`;

if(!s.includes(marker)){
  console.error("DURDURULDU: go() noktasi bulunamadi.");
  process.exit(1);
}

s=s.replace(marker,helpers+marker);


/* ============================================================
   3) CHAT PANEL POZISYONU
   Robot neredeyse pencere ona gore acilsin.
   ============================================================ */

const oldPanel =
`className="fixed bottom-24 right-5 z-[12000] flex h-[min(760px,calc(100vh-125px))] w-[min(480px,calc(100vw-28px))] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_28px_90px_rgba(15,23,42,.24)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#07111f]/95">`;

const newPanel =
`className="fixed z-[12000] flex h-[min(760px,calc(100vh-125px))] w-[min(480px,calc(100vw-28px))] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_28px_90px_rgba(15,23,42,.24)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#07111f]/95"
    style={{
      right:
        !robotPos || robotPos.x > window.innerWidth/2
          ? 20
          : "auto",

      left:
        robotPos && robotPos.x <= window.innerWidth/2
          ? Math.min(
              Math.max(14,robotPos.x),
              Math.max(14,window.innerWidth-Math.min(480,window.innerWidth-28)-14)
            )
          : "auto",

      bottom:Math.max(
        88,
        robotPos
          ? Math.max(20,window.innerHeight-robotPos.y+16)
          : 96
      )
    }}>`;

if(!s.includes(oldPanel)){
  console.error("DURDURULDU: Chat paneli bulunamadi.");
  process.exit(1);
}

s=s.replace(oldPanel,newPanel);


/* ============================================================
   4) ESKI SABIT ROBOT BUTONU
   ============================================================ */

const oldButton =
`<motion.button onClick={()=>setOpen(v=>!v)} whileHover={{y:-3,scale:1.06}} whileTap={{scale:.94}} className="fixed bottom-5 right-5 z-[11990] grid h-16 w-16 place-items-center rounded-full border border-white bg-gradient-to-br from-white to-indigo-50 shadow-[0_16px_45px_rgba(49,46,129,.28)] ring-1 ring-indigo-100 dark:border-white/10 dark:from-[#101827] dark:to-[#0b1220] dark:ring-white/10" title="AI Asistan"><RobotAvatar compact/></motion.button>`;

const newButton =
`{robotDock ? (
    <motion.button
      initial={{opacity:0,scale:.9}}
      animate={{opacity:1,scale:1}}
      whileHover={{scale:1.04}}
      whileTap={{scale:.96}}
      onClick={restoreRobot}
      className={
        "fixed top-1/2 z-[11990] flex h-[72px] -translate-y-1/2 items-center border border-white/20 bg-gradient-to-br from-[#101827] to-[#172554] text-white shadow-[0_15px_45px_rgba(15,23,42,.35)] " +
        (
          robotDock==="left"
            ? "left-0 rounded-r-[24px] pl-1 pr-2"
            : "right-0 rounded-l-[24px] pl-2 pr-1"
        )
      }
      title="AI Asistanı geri çağır"
      aria-label="AI Asistanı geri çağır"
    >
      {robotDock==="right" && (
        <ChevronRight
          size={15}
          className="rotate-180 opacity-70"
        />
      )}

      <div className="scale-[.82]">
        <RobotAvatar compact/>
      </div>

      {robotDock==="left" && (
        <ChevronRight
          size={15}
          className="opacity-70"
        />
      )}
    </motion.button>
  ) : (
    <motion.button
      onPointerDown={onRobotPointerDown}
      onPointerMove={onRobotPointerMove}
      onPointerUp={onRobotPointerUp}
      onPointerCancel={onRobotPointerUp}
      onClick={onRobotClick}

      whileHover={{scale:1.06}}
      whileTap={{scale:.95}}

      className="fixed z-[11990] grid h-16 w-16 touch-none select-none place-items-center rounded-full border border-white bg-gradient-to-br from-white to-indigo-50 shadow-[0_16px_45px_rgba(49,46,129,.28)] ring-1 ring-indigo-100 cursor-grab active:cursor-grabbing dark:border-white/10 dark:from-[#101827] dark:to-[#0b1220] dark:ring-white/10"

      style={
        robotPos
          ? {
              left:robotPos.x,
              top:robotPos.y
            }
          : {
              right:20,
              bottom:20
            }
      }

      title="AI Asistan • Taşımak için sürükle"
      aria-label="AI Asistan"
    >
      <RobotAvatar compact/>

      <span className="pointer-events-none absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-white bg-[#172554] text-[10px] font-black text-white shadow-md">
        ✥
      </span>
    </motion.button>
  )}`;

if(!s.includes(oldButton)){
  console.error("DURDURULDU: Eski robot butonu bulunamadi.");
  process.exit(1);
}

s=s.replace(oldButton,newButton);


/* ============================================================
   WRITE UTF-8
   ============================================================ */

fs.writeFileSync(
  path,
  s,
  "utf8"
);

console.log("");
console.log("OK: UTF-8 korundu.");
console.log("OK: Robot suruklenebilir.");
console.log("OK: Sol/sag kenara birakinca gizleniyor.");
console.log("OK: Kenardaki sekmeden geri cagriliyor.");
console.log("OK: Robot konumu hatirlaniyor.");
console.log("OK: Asistan penceresi robot tarafina gore aciliyor.");
