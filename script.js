// --- Part 1: Global 3D Scene Setup ---
// These are defined globally so all parts of our script can access them.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), alpha: true });
const clock = new THREE.Clock();
let orb, stars; // Declare orb and stars globally

function setupScene() {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.setZ(30);

    // Create the Orb
    const orbGeometry = new THREE.IcosahedronGeometry(5.5, 512);
    const orbMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            uniform float time; varying vec3 vNormal;
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); } vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            float snoise(vec3 v) { const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx); vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy); vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy; i = mod289(i); vec4 p = permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.)); float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_); vec4 x_o = mod(x_, 7.0); vec4 y_o = mod(y_, 7.0); vec4 h = 1.0 - abs(x_) / 49.0 - abs(y_) / 49.0; vec4 b0 = vec4(x_o.x, x_o.y, y_o.x, y_o.y); vec4 b1 = vec4(x_o.z, x_o.w, y_o.z, y_o.w); vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww; vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w); vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m; return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3))); }
            void main() { vNormal = normal; float displacement = snoise(normal + time * 0.05) * 0.15; vec3 newPosition = position + normal * displacement; gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0); }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            void main() { float intensity = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0) * intensity; }
        `,
        uniforms: { time: { value: 0.0 } }, transparent: true,
    });
    orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.y = -3;
    scene.add(orb);

    // Create the Stars
    const starVertices = [];
    for (let i = 0; i < 15000; i++) { const x = (Math.random() - 0.5) * 2000; const y = (Math.random() - 0.5) * 2000; const z = (Math.random() - 0.5) * 2000; starVertices.push(x, y, z); }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.ShaderMaterial({
        vertexShader: `void main() { gl_PointSize = 1.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            uniform vec3 orbScreenPos; uniform float orbScreenRadius;
            void main() {
                float distToOrbCenter = distance(gl_FragCoord.xy, orbScreenPos.xy);
                float orbEffectStrength = 1.0 - smoothstep(orbScreenRadius - 70.0, orbScreenRadius + 70.0, distToOrbCenter);
                vec3 darkColor = vec3(0.87, 0.72, 0.45); vec3 lightColor = vec3(1.0, 0.85, 0.6);
                vec3 finalColor = mix(darkColor, lightColor, orbEffectStrength);
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        uniforms: { orbScreenPos: { value: new THREE.Vector3() }, orbScreenRadius: { value: 0.0 }, },
        transparent: true,
    });
    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// --- Part 2: Main Animation Loop ---
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (event) => { mouseX = event.clientX; mouseY = event.clientY; });

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Animate Orb
    if (orb) {
        orb.material.uniforms.time.value = elapsedTime;
    }
    
    // Animate Stars
    if (stars && orb) {
        const orbWorldPosition = new THREE.Vector3().copy(orb.position);
        const orbScreenPositionVector = orbWorldPosition.clone().project(camera);
        stars.material.uniforms.orbScreenPos.value.x = (orbScreenPositionVector.x + 1) * window.innerWidth / 2;
        stars.material.uniforms.orbScreenPos.value.y = (-orbScreenPositionVector.y + 1) * window.innerHeight / 2;
        const tempOrbEdge = new THREE.Vector3(orb.geometry.parameters.radius, 0, 0).add(orb.position);
        const projectedOrbEdge = tempOrbEdge.project(camera);
        const projectedOrbCenter = orbWorldPosition.clone().project(camera);
        stars.material.uniforms.orbScreenRadius.value = new THREE.Vector2(projectedOrbEdge.x, projectedOrbEdge.y)
            .distanceTo(new THREE.Vector2(projectedOrbCenter.x, projectedOrbCenter.y)) * window.innerWidth / 2;

        const targetX = mouseX * 0.0001; const targetY = mouseY * 0.0001;
        stars.rotation.y += 0.05 * (targetX - stars.rotation.y);
        stars.rotation.x += 0.05 * (targetY - stars.rotation.x);
    }
    
    renderer.render(scene, camera);
}

// --- Part 3: All DOM-related logic runs after the page loads ---
window.addEventListener('load', () => {
    // Select all elements now that they are loaded
    const introOverlay = document.getElementById('intro-overlay');
    const introLogo = document.getElementById('intro-logo');
    const mainContent = document.getElementById('main-content');
    const sectionsToAnimate = document.querySelectorAll('.animated-section');
    const navLinks = document.querySelectorAll('nav a');
    const exportButton = document.getElementById('export-button');

    // --- Intro Logic ---
    introLogo.classList.add('animate');
    mainContent.classList.add('visible');
    setTimeout(() => {
        introOverlay.classList.add('hidden');
    }, 2000);

    // --- Carousel Logic ---
    // (This can be pasted here if needed, but keeping it focused on the fix)

    // --- Scroll Animation Logic ---
    let scrollTimeout;
    function updateScrollAnimations() { 
        const viewportHeight = window.innerHeight; 
        sectionsToAnimate.forEach(section => { 
            const rect = section.getBoundingClientRect(); 
            const sectionCenter = rect.top + rect.height / 2; 
            const distanceFromCenter = Math.abs(sectionCenter - viewportHeight / 2); 
            const maxBlur = 8; 
            const scrollFactor = distanceFromCenter / (viewportHeight / 2); 
            const blurValue = scrollFactor * maxBlur; 
            const opacityValue = 1 - Math.pow(scrollFactor, 1.5); 
            section.style.filter = `blur(${blurValue}px)`; 
            section.style.opacity = Math.max(0, opacityValue); 
        }); 
    }
    window.addEventListener('scroll', () => { clearTimeout(scrollTimeout); scrollTimeout = setTimeout(updateScrollAnimations, 10); });
    navLinks.forEach(link => { link.addEventListener('click', function(e) { e.preventDefault(); const targetId = this.getAttribute('href'); const targetSection = document.querySelector(targetId); if (targetSection) { targetSection.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }); });
    updateScrollAnimations();

    // --- PLY Exporter Logic ---
    function saveString(text, filename) {
        const link = document.createElement('a');
        link.style.display = 'none';
        document.body.appendChild(link);
        const blob = new Blob([text], { type: 'text/plain' });
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        document.body.removeChild(link);
    }
    exportButton.addEventListener('click', () => {
        const exporter = new THREE.PLYExporter();
        const result = exporter.parse(orb);
        saveString(result, 'orb_snapshot.ply');
    });

    // --- Window Resize Logic ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});

// --- Start Everything ---
setupScene();
animate();