import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { ArrowUpRight, CircleHelp, RotateCcw, Users, Zap } from 'lucide-react';

type Mate = { group: THREE.Group; name: string; color: string; base: THREE.Vector3; phase: number; role: string };
type Game = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: PointerLockControls; disc: THREE.Mesh; mates: Mate[]; opponents: THREE.Group[]; discVelocity: THREE.Vector3; discFlying: boolean; discAge: number; held: boolean; charge: number; keys: Set<string>; lastTime: number; status: string; passes: number; catches: number; selected: number; field: THREE.Group };

const TEAM = ['#2855ff', '#b7f34a', '#ff765f'];
const MATE_NAMES = ['MIA', 'JULES', 'ALEX'];

function makePlayer(color: string, accent = '#f4f0e7') {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#c98d67', roughness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#273044', roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.62, 4, 8), bodyMat); torso.position.y = 1.05; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skinMat); head.position.y = 1.63; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.195, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), darkMat); hair.position.y = 1.69; g.add(hair);
  for (const x of [-0.12, 0.12]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.48, 3, 6), darkMat); leg.position.set(x, 0.42, 0); g.add(leg); }
  for (const x of [-0.31, 0.31]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.43, 3, 6), bodyMat); arm.position.set(x, 1.12, 0); arm.rotation.z = x < 0 ? -0.13 : 0.13; g.add(arm); }
  const shoes = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.08, 0.32), new THREE.MeshStandardMaterial({ color: accent })); shoes.position.set(0, 0.1, -0.04); g.add(shoes);
  return g;
}
function createDisc() {
  const group = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.035, 32), new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: 0.4, metalness: 0.05 }));
  group.add(rim);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.19, 0.018, 32), new THREE.MeshStandardMaterial({ color: '#2855ff', roughness: 0.48 })); top.position.y = 0.02; group.add(top);
  const mark = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.009, 6, 24), new THREE.MeshStandardMaterial({ color: '#b7f34a' })); mark.rotation.x = Math.PI / 2; mark.position.y = 0.032; group.add(mark);
  return group;
}

function App() {
  const mountRef = useRef<HTMLDivElement>(null); const gameRef = useRef<Game | null>(null);
  const [screen, setScreen] = useState<'intro'|'playing'|'paused'>('intro');
  const [charge, setCharge] = useState(0); const [passes, setPasses] = useState(0); const [catches, setCatches] = useState(0); const [status, setStatus] = useState('Find a teammate. Make the pass.');
  const [target, setTarget] = useState(0); const [help, setHelp] = useState(false);

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#dfe8e4'); scene.fog = new THREE.Fog('#dfe8e4', 38, 100);
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 140); camera.position.set(0, 1.72, 12);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)); renderer.setSize(mount.clientWidth, mount.clientHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; mount.appendChild(renderer.domElement);
    const controls = new PointerLockControls(camera, renderer.domElement); scene.add(camera);
    scene.add(new THREE.HemisphereLight('#f5fff9', '#49614b', 2.0)); const sun = new THREE.DirectionalLight('#fff2d7', 2.7); sun.position.set(-12, 24, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
    const field = new THREE.Group(); scene.add(field);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(44, 78), new THREE.MeshStandardMaterial({ color: '#a9d87b', roughness: 1 })); ground.rotation.x = -Math.PI/2; ground.position.y = -0.03; ground.receiveShadow = true; field.add(ground);
    const addLine = (x:number,z:number,w:number,d:number,color='#f8f6ed') => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,0.025,d), new THREE.MeshBasicMaterial({color})); m.position.set(x,0.005,z); field.add(m); };
    addLine(0, -30, 28, .12); addLine(0, 30, 28, .12); addLine(-14,0,.12,60); addLine(14,0,.12,60); addLine(0,-22,28,.1); addLine(0,22,28,.1);
    for (const [z,c] of [[-26,'#2855ff'],[26,'#ff765f']] as [number,string][]) { const zone = new THREE.Mesh(new THREE.PlaneGeometry(28,8),new THREE.MeshStandardMaterial({color:c,roughness:1})); zone.rotation.x=-Math.PI/2; zone.position.set(0,.01,z); field.add(zone); }
    // Small field markings, grass tufts and sideline flags make depth readable without heavy assets.
    const center = new THREE.Mesh(new THREE.RingGeometry(3.8,3.92,48),new THREE.MeshBasicMaterial({color:'#f8f6ed',side:THREE.DoubleSide})); center.rotation.x=-Math.PI/2; center.position.y=.02; field.add(center);
    for (const x of [-16,16]) for (const z of [-25,-15,0,15,25]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,1.35,6),new THREE.MeshStandardMaterial({color:'#f8f6ed'})); pole.position.set(x,.65,z); field.add(pole); const flag = new THREE.Mesh(new THREE.ConeGeometry(.28,.45,3),new THREE.MeshStandardMaterial({color:x<0?'#2855ff':'#ff765f'})); flag.rotation.z=Math.PI/2; flag.position.set(x+.2,1.05,z); field.add(flag); }
    const mates: Mate[] = [];
    const matePositions = [[-5, 0, 4],[4,0,-3],[7,0,9]];
    matePositions.forEach((p,i)=>{ const g=makePlayer(TEAM[i]); g.position.set(p[0],0,p[2]); g.rotation.y=Math.PI; g.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}}); field.add(g); mates.push({group:g,name:MATE_NAMES[i],color:TEAM[i],base:new THREE.Vector3(p[0],0,p[2]),phase:i*2.1,role:['CUT LEFT','DEEP CUT','RESET'][i]}); });
    const opponents: THREE.Group[]=[]; [[-1,0,-4],[2,0,5]].forEach((p,i)=>{const g=makePlayer('#ff765f');g.position.set(p[0],0,p[2]);g.rotation.y=Math.PI;field.add(g);opponents.push(g);});
    const disc=createDisc(); camera.add(disc); disc.position.set(.38,-.27,-.65); disc.rotation.set(0,0,-.18);
    const game: Game={renderer,scene,camera,controls,disc,mates,opponents,discVelocity:new THREE.Vector3(),discFlying:false,discAge:0,held:false,charge:0,keys:new Set(),lastTime:performance.now(),status:'',passes:0,catches:0,selected:0,field}; gameRef.current=game;
    const keyDown=(e:KeyboardEvent)=>{game.keys.add(e.key.toLowerCase()); if(['1','2','3'].includes(e.key)){game.selected=Number(e.key)-1;setTarget(game.selected);setStatus(`Target: ${game.mates[game.selected].name} · ${game.mates[game.selected].role}`);} if(e.key.toLowerCase()==='r'){resetDisc(game);setStatus('Disc reset. Choose a teammate and pass.');} };
    const keyUp=(e:KeyboardEvent)=>game.keys.delete(e.key.toLowerCase());
    const mouseDown=(e:MouseEvent)=>{if(e.button===0&&game.controls.isLocked&&!game.discFlying){game.held=true;game.charge=.15;}};
    const mouseUp=(e:MouseEvent)=>{if(e.button===0&&game.held){game.held=false;throwDisc(game);setPasses(game.passes);setStatus('Pass away! Watch the disc and your teammate.');}};
    window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);renderer.domElement.addEventListener('mousedown',mouseDown);window.addEventListener('mouseup',mouseUp);
    const clock=new THREE.Clock(); let frame=0;
    const animate=()=>{frame=requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),.04); const t=performance.now()/1000;
      if(game.controls.isLocked){const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();const speed=game.keys.has('shift')?8:5.2;const move=new THREE.Vector3();if(game.keys.has('w'))move.add(forward);if(game.keys.has('s'))move.sub(forward);if(game.keys.has('d'))move.add(right);if(game.keys.has('a'))move.sub(right);if(move.lengthSq()>0){move.normalize().multiplyScalar(speed*dt);camera.position.add(move);}camera.position.x=THREE.MathUtils.clamp(camera.position.x,-12.5,12.5);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-28,28);camera.position.y=1.72;
        game.mates.forEach((m,i)=>{if(!game.discFlying){const spread=i===game.selected?2.5:0;const dest=new THREE.Vector3(m.base.x+Math.sin(t*.8+m.phase)*2.1+spread,m.base.y,m.base.z+Math.cos(t*.7+m.phase)*2.5);m.group.position.lerp(dest,dt*1.1);}else{const dest=new THREE.Vector3(m.base.x+Math.sin(t*1.4+m.phase)*2.8,m.base.y,m.base.z+Math.cos(t*1.2+m.phase)*3.8);m.group.position.lerp(dest,dt*1.35);} });
      }
      if(game.held){game.charge=Math.min(1,game.charge+dt*.55);setCharge(game.charge);}
      if(game.discFlying){game.discAge+=dt;const old=game.disc.position.clone();game.discVelocity.y-=2.8*dt;game.disc.position.addScaledVector(game.discVelocity,dt);game.disc.rotation.y+=dt*18;game.disc.rotation.z=Math.sin(game.discAge*4)*.12;
        // Segment-vs-sphere catch checks prevent the disc skipping through a player between frames.
        let caught=-1; for(let i=0;i<game.mates.length;i++){const m=game.mates[i];const center=m.group.position.clone().add(new THREE.Vector3(0,1.05,0));if(segmentDistance(center,old,game.disc.position)<.72&&game.disc.position.y>.35&&game.disc.position.y<2.5){caught=i;break;}}
        if(caught>=0){game.discFlying=false;game.discAge=0;game.catches++;setCatches(game.catches);camera.add(game.disc);game.disc.position.set(.38,-.27,-.65);game.disc.rotation.set(0,0,-.18);game.mates[caught].group.position.x+=.3;setStatus(`CATCH! ${game.mates[caught].name} secured the disc. Choose your next pass.`);}
        else if(game.disc.position.y<.16||Math.abs(game.disc.position.x)>14||Math.abs(game.disc.position.z)>31||game.discAge>5){game.discFlying=false;game.discAge=0;setStatus(game.disc.position.y<.16?'Turnover: disc hit the ground. Press R to reset.':'Out of bounds. Press R to reset.');}
        else {for(const opp of game.opponents){const c=opp.position.clone().add(new THREE.Vector3(0,1.1,0));if(segmentDistance(c,old,game.disc.position)<.62&&game.disc.position.y<2.5){game.discFlying=false;game.discAge=0;setStatus('Defended! The opponent got a hand on it. Press R to reset.');break;}}}
      }
      renderer.render(scene,camera);
    }; animate();
    const resize=()=>{if(!mount)return;camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight);};window.addEventListener('resize',resize);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);renderer.domElement.removeEventListener('mousedown',mouseDown);window.removeEventListener('mouseup',mouseUp);controls.dispose();renderer.dispose();if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);gameRef.current=null;};
  },[]);

  function start(){const g=gameRef.current;if(!g)return;g.controls.lock();setScreen('playing');}
  function pause(){const g=gameRef.current;if(!g)return;if(g.controls.isLocked)g.controls.unlock();else{g.controls.lock();setScreen('playing');}}
  function choose(i:number){const g=gameRef.current;if(g){g.selected=i;setTarget(i);}setStatus(`Target: ${MATE_NAMES[i]} · ${['CUT LEFT','DEEP CUT','RESET'][i]}`);}

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">F</span><span>FIELDNOTES <small>ULTIMATE PLAYGROUND</small></span></div><div className="top-meta"><span className="live-dot"/> TRAINING MODE <span className="meta-divider"/> 01 / PASS & MOVE</div><button className="icon-button" onClick={()=>setHelp(!help)} aria-label="Help"><CircleHelp size={18}/></button></header>
    <section className="stage-wrap"><div className="stage" ref={mountRef}>
      <div className="stage-top"><span className="pill">01 — THE FIRST PASS</span><span className="stage-coordinate">FIELD 01 / 70 × 40 M</span></div>
      <div className="crosshair"><i/><i/></div>
      <div className="aim-label">AIM · LOOK AT YOUR TEAMMATE</div>
      <div className="status-toast"><span className="status-icon"><Zap size={15}/></span>{status}</div>
      <div className="bottom-hud"><div className="charge-box"><div className="hud-label">THROW POWER <b>{Math.round(charge*100)}%</b></div><div className="charge-track"><span style={{width:`${charge*100}%`}}/></div><div className="hud-tip">HOLD LEFT CLICK TO CHARGE · RELEASE TO THROW</div></div><div className="stat-box"><div><span>PASSES</span><strong>{passes}</strong></div><div><span>CATCHES</span><strong>{catches}</strong></div></div></div>
      {screen!=='playing'&&<div className="screen-overlay"><div className="overlay-card"><div className="eyebrow">LESS TALK. MORE DISC.</div><h1>{screen==='intro'?<>STEP ONTO<br/><em>THE FIELD.</em></>:<>TAKE A<br/><em>BREATHER.</em></>}</h1><p>{screen==='intro'?'Move, read the field, and find a teammate. This is your first passing drill.':'The field is paused. Get your bearings, then get back into the flow.'}</p><button className="primary-button" onClick={start}>{screen==='intro'?'ENTER THE FIELD':'BACK TO PLAY'} <ArrowUpRight size={17}/></button><div className="overlay-controls"><span>WASD MOVE</span><span>MOUSE LOOK</span><span>1–3 SELECT TEAMMATE</span></div></div></div>}
    </div>
    <aside className="sidebar"><div className="side-heading"><div><span className="eyebrow">YOUR SIDE</span><h2>Find the<br/>open player.</h2></div><Users size={21}/></div><p className="side-copy">Your teammates keep moving. Pick a target, turn your view toward them, then send the disc.</p><div className="roster">{MATE_NAMES.map((name,i)=><button key={name} className={`mate-card ${target===i?'selected':''}`} onClick={()=>choose(i)}><span className="mate-number">0{i+1}</span><span className="mate-avatar" style={{background:TEAM[i]}}><span/></span><span className="mate-info"><b>{name}</b><small>{['CUT LEFT','DEEP CUT','RESET'][i]}</small></span><span className="keycap">{i+1}</span></button>)}</div><div className="coach-note"><span className="note-mark">↗</span><div><b>COACH’S NOTE</b><p>Don’t throw where your teammate is. Throw where they’re going.</p></div></div><div className="side-bottom"><button className="secondary-button" onClick={()=>{const g=gameRef.current;if(g)resetDisc(g);setStatus('Disc reset. Pick a teammate and try again.');}}><RotateCcw size={15}/> RESET DISC <kbd>R</kbd></button><button className="pause-button" onClick={pause}>{screen==='playing'?'PAUSE':'RESUME'}</button></div></aside></section>
    {help&&<div className="help-modal"><div className="help-card"><button className="close-help" onClick={()=>setHelp(false)}>×</button><span className="eyebrow">QUICK CONTROLS</span><h2>Make a clean pass.</h2><p><b>W A S D</b> — move around the field. <b>Mouse</b> — look and aim. <b>1 / 2 / 3</b> — select a teammate. <b>Hold left click</b> to build power, then release to throw. <b>R</b> resets the disc. Aim roughly toward a teammate; catch detection checks the full flight segment to reduce tunnelling.</p><button className="primary-button" onClick={()=>setHelp(false)}>GOT IT <ArrowUpRight size={17}/></button></div></div>}
    <footer className="footer"><span>BUILT FOR THE CURIOUS, NOT JUST THE COMPETITIVE.</span><span>PLAY FAIR. KEEP IT MOVING. <b>© FIELDNOTES 2026</b></span></footer>
  </main>;
}

function segmentDistance(point:THREE.Vector3,a:THREE.Vector3,b:THREE.Vector3){const ab=b.clone().sub(a);const denom=ab.lengthSq()||1;const t=THREE.MathUtils.clamp(point.clone().sub(a).dot(ab)/denom,0,1);return point.distanceTo(a.clone().addScaledVector(ab,t));}
function throwDisc(game:Game){if(game.discFlying)return;const {camera,disc,scene,mates,selected}=game;const direction=new THREE.Vector3();camera.getWorldDirection(direction);const origin=camera.position.clone().addScaledVector(direction,.8);origin.y-=.16;scene.attach(disc);disc.position.copy(origin);disc.rotation.set(0,0,0);const power=.7+game.charge*1.1;game.discVelocity.copy(direction).multiplyScalar(9+power*7);game.discVelocity.y+=1.6+power*1.8;game.discFlying=true;game.discAge=0;game.passes++;game.charge=0;const mate=mates[selected];const target=mate.group.position.clone().add(new THREE.Vector3(0,1.2,0));const to=target.sub(origin);if(to.length()<.1)return; // Direction stays player-aimed; HUD target is a cue, not auto-aim.
}
function resetDisc(game:Game){game.discFlying=false;game.discAge=0;game.held=false;game.charge=0;game.camera.add(game.disc);game.disc.position.set(.38,-.27,-.65);game.disc.rotation.set(0,0,-.18);}
export default App;
