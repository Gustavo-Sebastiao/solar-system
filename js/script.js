import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Configuration & Data ---
// --- Configuration & Data ---
// --- Configuration & Data ---
const ASSETS_PATH = 'https://cdn.jsdelivr.net/gh/Gustavo-Sebastiao/solar-system@main/assets/solar_3d_models/'; 

async function checkLFS(url) {
    try {
        const response = await fetch(url, { method: 'GET', headers: { 'Range': 'bytes=0-100' } });
        const text = await response.text();
        if (text.includes('version https://git-lfs')) {
            console.error("LFS DETECTED: Files on server are just pointers, not binaries!", url);
            if (loadingText) loadingText.innerHTML += `<br><span style="color:red">ERRO: Git LFS Pointers detectados!</span>`;
            return true;
        }
        if (!response.ok) {
            console.error(`HTTP ERROR: ${response.status} for ${url}`);
            if (loadingText) loadingText.innerHTML += `<br><span style="color:red">ERRO HTTP ${response.status}: ${url.split('/').pop()}</span>`;
        }
    } catch (e) {}
    return false;
}

checkLFS(ASSETS_PATH + 'sun.glb');
const PLANETS_DATA = [
    { name: 'Sol', file: 'sun.glb', size: 2500, distance: -1600, type: 'Estrela', temp: '5.505 °C', fact: 'Contém 99,86% da massa de todo o sistema solar e é a fonte de energia que sustenta a vida na Terra.', speed: 0.001 },
    { name: 'Mercúrio', file: 'mercury_natural_color.glb', size: 35, distance: 0, type: 'Planeta Rochoso', temp: '-180 °C a 430 °C', fact: 'É o menor planeta do sistema solar e o mais próximo do Sol, completando uma volta em torno dele em apenas 88 dias.', speed: 0.005 },
    { name: 'Vênus', file: 'venus_pbr_textures.glb', size: 60, distance: 200, type: 'Planeta Rochoso', temp: '465 °C', fact: 'Embora não seja o mais próximo do Sol, é o planeta mais quente devido à sua densa atmosfera que retém o calor.', speed: 0.005 },
    { name: 'Terra', file: 'earth.glb', size: 65, distance: 400, type: 'Planeta Rochoso', temp: '15 °C (média)', fact: 'O único mundo conhecido a abrigar vida. Cerca de 70% da sua superfície é coberta por oceanos de água líquida.', speed: 0.005 },
    { name: 'Marte', file: 'mars.glb', size: 45, distance: 600, type: 'Planeta Rochoso', temp: '-65 °C', fact: 'Conhecido como o "Planeta Vermelho" devido ao óxido de ferro em sua superfície. Abriga o maior vulcão do sistema solar, o Monte Olimpo.', speed: 0.005 },
    { name: 'Júpiter', file: 'jupiter_with_moons.glb', size: 500, distance: 1100, type: 'Gigante Gasoso', temp: '-110 °C', fact: 'O maior planeta do sistema solar. Sua "Grande Mancha Vermelha" é, na verdade, uma tempestade gigante que dura há séculos.', speed: 0.005 },
    { name: 'Saturno', file: 'realistic_saturn_8k.glb', size: 250, distance: 1500, type: 'Gigante Gasoso', temp: '-140 °C', fact: 'Famoso por seu deslumbrante e complexo sistema de anéis, feitos majoritariamente de partículas de gelo e rocha.', speed: 0.005 },
    { name: 'Urano', file: 'uranus.glb', size: 100, distance: 1900, type: 'Gigante Gelado', temp: '-195 °C', fact: 'Um planeta único que gira "de lado". Seu eixo de rotação é quase paralelo ao plano de sua órbita.', speed: 0.005 },
    { name: 'Netuno', file: 'neptune.glb', size: 95, distance: 2300, type: 'Gigante Gelado', temp: '-201 °C', fact: 'O planeta mais distante do Sol. Possui os ventos mais fortes do sistema solar, que podem atingir mais de 2.100 km/h.', speed: 0.005 }
];

const MOON_DATA = { 
    name: 'Lua', 
    type: 'Satélite Natural', 
    temp: '-173 °C a 127 °C', 
    fact: 'O único satélite natural da Terra. Sua força gravitacional é a principal responsável pelas marés nos oceanos e por estabilizar a inclinação do nosso planeta.',
    size: 18
};

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505); // Very dark grey instead of pure black
const axesHelper = new THREE.AxesHelper(5000);
scene.add(axesHelper);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 50000);
camera.position.set(500, 200, 2500);

let renderer;
try {
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#three-canvas'),
        antialias: true
    });
} catch (e) {
    console.error("WebGL initialization failed", e);
}

if (renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
}

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Lighting ---
const sunLight = new THREE.DirectionalLight(0xffffff, 4.0);
sunLight.position.set(-2000, 0, 0); // Pointing from far left to right
sunLight.target.position.set(5000, 0, 0); // Target far right
scene.add(sunLight);
scene.add(sunLight.target);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Enough to see the planet, but dark enough for contrast
scene.add(ambientLight);

// All other fill lights (frontLight, hemiLight) removed for sharp crescent effect

// --- Starfield Removed for White Background ---


// --- Loaders & Data Handling ---
const loader = new GLTFLoader();
const planetGroups = {}; // Stores the orbit pivot group
const planetModels = {}; // Stores the GLTF scene itself
const loadingScreen = document.getElementById('loading-screen');
const loadingText = document.getElementById('loading-text');
const skipButton = document.getElementById('skip-loading');
let loadedCount = 0;
let isLoaded = false;

function onModelLoaded(name) {
    loadedCount++;
    console.log(`Loaded: ${name} (${loadedCount}/${PLANETS_DATA.length + 1})`);
    
    if (loadingText) {
        // Find or create a status line so we don't overwrite red errors
        let statusLine = document.getElementById('loading-status-line');
        if (!statusLine) {
            statusLine = document.createElement('div');
            statusLine.id = 'loading-status-line';
            loadingText.prepend(statusLine);
        }
        statusLine.innerText = `Carregando: ${name} (${loadedCount}/${PLANETS_DATA.length + 1})`;
    }

    if (loadedCount >= PLANETS_DATA.length + 1) {
        hideLoading();
    }
}

function hideLoading() {
    if (isLoaded) return;
    isLoaded = true;
    console.log("All models ready or timeout reached. Hiding loading screen.");

    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            startCinematicIntro();
        }, 500);
    }
}

function startCinematicIntro() {
    console.log("Starting cinematic intro...");
    // Start close to the Sun
    camera.position.set(-1000, 100, 1000);
    controls.target.set(-1600, 0, 0);

    // Lerp to the overview position (Static Side View)
    targetFocus = {
        isReset: true,
        camPos: new THREE.Vector3(400, 0, 3000), // Straight side view (Y=0)
        target: new THREE.Vector3(400, 0, 0)
    };
    isMoving = true;
}

// Show skip button after 6 seconds
setTimeout(() => {
    if (!isLoaded && skipButton) skipButton.classList.remove('hidden');
}, 6000);

if (skipButton) skipButton.onclick = hideLoading;

// Safety timeout: Hide loading screen after 12 seconds
setTimeout(hideLoading, 12000);

// Load Moon separately and keep track if it's ready
let moonModel = null;
let earthModel = null;
let moonOrbit = new THREE.Group();

function tryAttachMoon() {
    if (moonModel && earthModel) {
        // Find Earth's parent pivot group to add the Moon's orbit group to it
        const earthPivot = planetGroups['Terra'];
        if (earthPivot) {
            earthPivot.add(moonOrbit);
            moonOrbit.position.x = 400; // Same as Earth's distance
            moonOrbit.add(moonModel);
            moonModel.position.set(100, 0, 0); // Distance from Earth
        }
    }
}

loader.load(ASSETS_PATH + 'moon.glb', (gltf) => {
    moonModel = gltf.scene;
    // Normalize Moon Size (Smaller than Earth)
    const box = new THREE.Box3().setFromObject(moonModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    const scaleFactor = 18 / Math.max(size.x, size.y, size.z);
    moonModel.scale.setScalar(scaleFactor);
    
    // Center Moon
    moonModel.position.x = -(center.x * scaleFactor);
    moonModel.position.y = -(center.y * scaleFactor);
    moonModel.position.z = -(center.z * scaleFactor);

    // Setup moon material
    moonModel.traverse(child => {
        if (child.isMesh) {
            child.frustumCulled = false;
            child.userData.planetName = 'Lua';
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(mat => {
                if (mat && mat.emissive) {
                    mat.emissive.setHex(0x222222); // Subtle glow
                    mat.emissiveIntensity = 0.5;
                }
            });
        }
    });

    tryAttachMoon();
    planetModels['Lua'] = moonModel;
    onModelLoaded('Lua');
}, undefined, (err) => {
    console.error("Error loading Moon:", err);
    onModelLoaded('Lua (falha)');
});

PLANETS_DATA.forEach(data => {
    loader.load(ASSETS_PATH + data.file, (gltf) => {
        const model = gltf.scene;

        // Normalize Scale & Center
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = data.size / maxDim;
        
        model.scale.setScalar(scaleFactor);
        
        // Pivot Group for Orbit
        const pivot = new THREE.Group();
        scene.add(pivot);

        // Position model within pivot (Centered)
        model.position.x = data.distance - (center.x * scaleFactor);
        model.position.y = -(center.y * scaleFactor);
        model.position.z = -(center.z * scaleFactor);
        pivot.add(model);

        planetGroups[data.name] = pivot;
        planetModels[data.name] = model;

        // Visual Polish
        model.traverse(child => {
            if (child.isMesh) {
                child.frustumCulled = false;
                child.userData.planetName = data.name;

                // DEBUG: Force basic material to rule out lighting
                // const oldMat = child.material;
                // child.material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });

                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    if (mat) {
                        if (data.name === 'Sol') {
                            if (mat.emissive) {
                                mat.emissive.setHex(0xff5500); 
                                mat.emissiveIntensity = 10.0;
                            }
                            mat.color.setHex(0xffaa00);
                        } else {
                            if (mat.emissive) {
                                mat.emissive.setHex(0x000000);
                            }
                        }
                    }
                });
            }
        });

        // DEBUG: Box Helper
        const helper = new THREE.BoxHelper(model, 0xffff00);
        scene.add(helper);
        console.log(`Model ${data.name} added at X: ${model.position.x}, Scale: ${scaleFactor}`);

        // Track Earth for Moon attachment
        if (data.name === 'Terra') {
            earthModel = model;
            tryAttachMoon();
        }

        onModelLoaded(data.name);
    }, undefined, (e) => {
        console.error(`Error loading ${data.name}:`, e);
        const errorMsg = e && e.message ? e.message : "Erro desconhecido";
        if (loadingText) loadingText.innerHTML += `<br><span style="color:red">Falha ${data.name}: ${errorMsg}</span>`;
        onModelLoaded(`${data.name} (falha)`);
    });
});

// --- Interaction ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetFocus = null;
let isMoving = false;

window.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.planetName) obj = obj.parent;

        if (obj.userData.planetName) {
            focusOn(obj.userData.planetName);
        }
    }
});

function focusOn(name) {
    const data = (name === 'Lua') ? MOON_DATA : PLANETS_DATA.find(p => p.name === name);
    const model = planetModels[name];

    let multiplier = 2.5;
    if (name === 'Júpiter') multiplier = 1.8;
    if (name === 'Sol') multiplier = 1.5;
    if (name === 'Lua') multiplier = 2.0;

    targetFocus = {
        name: name,
        data: data,
        camOffset: data.size * multiplier
    };

    document.getElementById('planet-name').innerText = data.name;
    document.getElementById('planet-details').innerHTML = `
        <strong>Tipo:</strong> ${data.type}<br>
        <strong>Temperatura:</strong> ${data.temp}<br><br>
        ${data.fact}
    `;
    document.getElementById('planet-info').classList.remove('hidden');
    isMoving = true;
}

function resetView() {
    targetFocus = {
        isReset: true,
        camPos: new THREE.Vector3(400, 0, 3000),
        target: new THREE.Vector3(400, 0, 0)
    };
    document.getElementById('planet-info').classList.add('hidden');
    isMoving = true;
}

document.getElementById('back-button').onclick = resetView;

document.getElementById('next-planet').onclick = () => {
    if (!targetFocus || targetFocus.isReset) return;
    const currentIndex = PLANETS_DATA.findIndex(p => p.name === targetFocus.name);
    const nextIndex = (currentIndex + 1) % PLANETS_DATA.length;
    focusOn(PLANETS_DATA[nextIndex].name);
};

document.getElementById('prev-planet').onclick = () => {
    if (!targetFocus || targetFocus.isReset) return;
    const currentIndex = PLANETS_DATA.findIndex(p => p.name === targetFocus.name);
    const prevIndex = (currentIndex - 1 + PLANETS_DATA.length) % PLANETS_DATA.length;
    focusOn(PLANETS_DATA[prevIndex].name);
};

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // Axial Rotation Only (Infographic Specs)
    PLANETS_DATA.forEach(data => {
        const model = planetModels[data.name];
        if (model) {
            model.rotation.y += data.speed;
        }
    });

    if (moonOrbit) {
        moonOrbit.rotation.y += 0.005; // Orbit speed
    }

    if (moonModel) {
        moonModel.rotation.y += 0.01; // Axial speed
    }

    // Camera Lerp
    if (isMoving && targetFocus) {
        controls.enabled = false;

        if (targetFocus.isReset) {
            camera.position.lerp(targetFocus.camPos, 0.05);
            controls.target.lerp(targetFocus.target, 0.05);
            if (camera.position.distanceTo(targetFocus.camPos) < 1) {
                isMoving = false;
                controls.enabled = false; // Disable in Overview
            }
        } else {
            const worldPos = new THREE.Vector3();
            planetModels[targetFocus.name].getWorldPosition(worldPos);

            const desiredPos = worldPos.clone().add(new THREE.Vector3(0, targetFocus.camOffset * 0.4, targetFocus.camOffset));
            camera.position.lerp(desiredPos, 0.07);
            controls.target.lerp(worldPos, 0.07);

            if (camera.position.distanceTo(desiredPos) < 0.1) {
                isMoving = false;
                controls.enabled = true; // Enable only in focus
            }
        }
    } else if (targetFocus && !targetFocus.isReset) {
        controls.enabled = true;
    } else {
        controls.enabled = false;
    }

    if (renderer) {
        controls.update();
        renderer.render(scene, camera);
    }
}

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (renderer) renderer.setSize(window.innerWidth, window.innerHeight);
};

animate();
