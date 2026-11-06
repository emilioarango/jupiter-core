(function(){
  const canvas = document.getElementById('pyramid-canvas');
  if(!canvas || !window.THREE) return;

  /* ── RENDERER ── */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  } catch(e) { return; }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0a0a0a, 1);

  /* ── SCENE ── */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  /* ── CAMERA ── */
  // FOV 42° keeps pyramid large without distortion; z=11 frames a 2.6-radius cone at full height
  const CAM_Z_DEFAULT = 11;
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth/window.innerHeight, 0.1, 200);
  camera.position.set(0, 3.5, CAM_Z_DEFAULT);
  camera.lookAt(0, 0.5, 0);

  /* ── COLOURS ── */
  const RED    = 0xd42020;
  const BLUE   = 0x4a7fd4;

  /* ── PYRAMID GEOMETRY ── */
  // Egyptian: 4-sided base, apex above centre
  // ConeGeometry(radius, height, radialSegments) with 4 segments = square base
  const pyGeo = new THREE.ConeGeometry(2.6, 3.4, 4, 1);

  // Flat-shading for that carved stone facet look
  pyGeo.computeVertexNormals();

  // Create a MeshPhongMaterial per face using geometry groups
  // Three.js r128 ConeGeometry: side faces are indices 0..3, bottom cap is last group
  // We'll use a single material with vertex colors for the faces
  const pyMat = new THREE.MeshPhongMaterial({
    color:     0x1a1a1a,
    emissive:  0x050505,
    specular:  0x4a7fd4,
    shininess: 35,
    flatShading: true,
  });

  const pyramid = new THREE.Mesh(pyGeo, pyMat);
  pyramid.rotation.y = Math.PI / 4;
  pyramid.castShadow    = true;
  pyramid.receiveShadow = true;
  pyramid.position.y    = 0.2;
  scene.add(pyramid);

  /* Edge wireframe — bright blue on dark */
  const edgesGeo = new THREE.EdgesGeometry(pyGeo);
  const edgesMat = new THREE.LineBasicMaterial({ color: 0x4a7fd4, linewidth: 1 });
  const edges    = new THREE.LineSegments(edgesGeo, edgesMat);
  pyramid.add(edges);

  /* ── GROUND PLANE (subtle shadow catcher) ── */
  const groundGeo = new THREE.PlaneGeometry(30, 30);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.5 });
  const ground    = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.5;
  ground.receiveShadow = true;
  scene.add(ground);

  /* Faint ground reflection line */
  const lineGeo = new THREE.PlaneGeometry(5.5, 0.005);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x4a7fd4, opacity:0.2, transparent:true });
  const baseline= new THREE.Mesh(lineGeo, lineMat);
  baseline.rotation.x = -Math.PI/2;
  baseline.position.y = -1.48;
  scene.add(baseline);



  /* ── FLOATING PARTICLES ── */
  const partCount = 120;
  const partPositions = new Float32Array(partCount * 3);
  for(let i=0; i<partCount; i++){
    partPositions[i*3+0] = (Math.random()-0.5)*14;
    partPositions[i*3+1] = (Math.random()-0.5)*8;
    partPositions[i*3+2] = (Math.random()-0.5)*14;
  }
  const partGeo = new THREE.BufferGeometry();
  partGeo.setAttribute('position', new THREE.BufferAttribute(partPositions, 3));
  const partMat = new THREE.PointsMaterial({ color: 0x4a7fd4, size:0.05, opacity:0.5, transparent:true });
  const particles = new THREE.Points(partGeo, partMat);
  scene.add(particles);

  /* ── LIGHTS ── */
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);

  /* Key light — cool blue-white from upper right */
  const keyLight = new THREE.DirectionalLight(0xc8d8ff, 1.4);
  keyLight.position.set(6, 10, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024,1024);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far  = 40;
  keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.camera.right= keyLight.shadow.camera.top    =  8;
  scene.add(keyLight);

  /* Fill light — deep blue from left */
  const fillLight = new THREE.DirectionalLight(0x1a3a8f, 0.8);
  fillLight.position.set(-5, 4, -3);
  scene.add(fillLight);

  /* Red rim light from below-back for drama */
  const rimLight = new THREE.PointLight(RED, 1.2, 14);
  rimLight.position.set(0, -3, -4);
  scene.add(rimLight);

  /* Subtle top blue point for apex glow */
  const topLight = new THREE.PointLight(0x6699ff, 0.8, 8);
  topLight.position.set(0, 6, 2);
  scene.add(topLight);

  /* ── DRAG TO ROTATE ── */
  let isDragging = false;
  let prevX = 0, prevY = 0;
  let rotY = Math.PI/4, rotX = 0.18;
  let velX = 0, velY = 0;

  canvas.addEventListener('mousedown', e=>{ isDragging=true; prevX=e.clientX; prevY=e.clientY; });
  window.addEventListener('mouseup',   ()=>{ isDragging=false; });
  window.addEventListener('mousemove', e=>{
    if(!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    velX = dy * 0.005;
    velY = dx * 0.005;
    rotX += velX; rotY += velY;
    // Clamp vertical rotation: -0.5 prevents flipping under base, 0.7 keeps apex in view
    rotX = Math.max(-0.5, Math.min(0.7, rotX));
    prevX = e.clientX; prevY = e.clientY;
  });

  // Touch
  canvas.addEventListener('touchstart', e=>{ isDragging=true; prevX=e.touches[0].clientX; prevY=e.touches[0].clientY; });
  canvas.addEventListener('touchend',   ()=>{ isDragging=false; });
  canvas.addEventListener('touchmove',  e=>{
    if(!isDragging || !e.touches.length) return;
    const dx = e.touches[0].clientX - prevX;
    const dy = e.touches[0].clientY - prevY;
    velX = dy * 0.005; velY = dx * 0.005;
    rotX += velX; rotY += velY;
    rotX = Math.max(-0.5, Math.min(0.7, rotX));
    prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
  });

  // Scroll to zoom; clamp between close-up (5) and wide (18)
  window.addEventListener('wheel', e=>{
    camera.position.z = Math.max(5, Math.min(18, camera.position.z + e.deltaY * 0.01));
  });

  /* ── RESIZE ── */
  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ── ANIMATE ── */
  let t = 0;
  let animPaused = false;
  document.addEventListener('visibilitychange', ()=>{ animPaused = document.hidden; });

  function animate(){
    requestAnimationFrame(animate);
    if(animPaused) return;
    t += 0.008;

    if(!isDragging){
      // Very slow auto-rotation
      velY *= 0.95;
      velX *= 0.95;
      rotY += 0.0006 + velY;
      rotX += velX;
      rotX = Math.max(-0.5, Math.min(0.7, rotX));
    }

    pyramid.rotation.y = rotY;
    pyramid.rotation.x = rotX;

    // Gentle float bob
    pyramid.position.y = 0.2 + Math.sin(t) * 0.08;

    // Particles drift slowly
    particles.rotation.y = t * 0.04;
    particles.rotation.x = t * 0.015;

    // Rim light pulse
    rimLight.intensity = 0.4 + Math.sin(t * 1.5) * 0.25;

    renderer.render(scene, camera);
  }
  animate();

})();

/* Runs separately from the scene above, so it still works if Three.js or WebGL is unavailable */
(function(){
  /* ── CURSOR ── */
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursor-ring');
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove', e=>{
    mx=e.clientX; my=e.clientY;
    cursor.style.left=mx+'px'; cursor.style.top=my+'px';
  });
  (function loop(){
    if(!document.hidden){ rx+=(mx-rx)*0.1; ry+=(my-ry)*0.1; ring.style.left=rx+'px'; ring.style.top=ry+'px'; }
    requestAnimationFrame(loop);
  })();

  /* ── SCROLL REVEALS ── */
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
  },{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));

})();

/* ── MOBILE NAV ── */
(function(){
  const btn    = document.getElementById('nav-hamburger');
  const menu   = document.getElementById('nav-mobile');
  if(!btn || !menu) return;

  const links  = Array.from(menu.querySelectorAll('.nav-mobile-link'));
  const isOpen = ()=> btn.classList.contains('open');

  function toggleMenu(open){
    btn.classList.toggle('open', open);
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if(open) links[0].focus();
  }

  btn.addEventListener('click', ()=> toggleMenu(!isOpen()));

  // Close on link click; the browser moves focus to the anchor target
  links.forEach(a=> a.addEventListener('click', ()=> toggleMenu(false)));

  document.addEventListener('keydown', e=>{
    if(!isOpen()) return;
    if(e.key==='Escape'){
      toggleMenu(false);
      btn.focus();
    } else if(e.key==='Tab'){
      // Keep focus cycling through the button and the menu links
      const items = [btn, ...links];
      const i = items.indexOf(document.activeElement);
      const next = e.shiftKey ? (i<=0 ? items.length-1 : i-1) : (i+1)%items.length;
      e.preventDefault();
      items[next].focus();
    }
  });

  // The hamburger is hidden above 700px, so close the menu if the viewport grows past it
  window.matchMedia('(max-width:700px)').addEventListener('change', e=>{
    if(!e.matches && isOpen()) toggleMenu(false);
  });
})();
