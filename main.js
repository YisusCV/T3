import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { construirMundo } from './mapa.js';

let scene, camera, renderer, controls;

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let colisionadoresMapa = [];
let zonaExtraccion = null;
let juegoTerminado = false;

let arma1 = null, arma2 = null;
let armaActual = 1;
let puedeDisparar = true;
let saludJugador = 100;

let zombis = [];
let modeloZombiOriginal = null;
const rangoDeteccion = 10.0;

let coleccionables = [];
let modeloCajaOriginal = null;

const raycaster = new THREE.Raycaster();
const centroPantalla = new THREE.Vector2(0, 0);

const inventarioArmas = {
    1: { nombre: 'Pistola', municion: 15, maxMunicion: 15, dano: 50 },
    2: { nombre: 'Escopeta', municion: 8, maxMunicion: 8, dano: 100 }
};

init();
animate();

// Pantalla de Victoria / Game Over para reiniciar con dificultad 
window.reiniciarConDificultad = function(modo) {
    sessionStorage.setItem('dificultadJuego', modo);
    location.reload();
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.FogExp2(0x111111, 0.03);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    controls = new PointerLockControls(camera, document.body);
    document.body.addEventListener('click', () => {
        if (!controls.isLocked && !juegoTerminado) controls.lock();
    });
    scene.add(camera);

    const mundo = construirMundo(scene);
    colisionadoresMapa = mundo.colisionadores;
    zonaExtraccion = mundo.cajaExtraccion;
    camera.position.copy(mundo.posicionInicial);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const loader = new GLTFLoader();

    loader.load('modelos/arma1.glb', (gltf) => {
        arma1 = gltf.scene;
        arma1.scale.set(0.02, 0.02, 0.02);
        arma1.position.set(0.25, -0.25, -0.5);
        arma1.rotation.set(0, Math.PI / 2, 0);
        arma1.visible = true;
        camera.add(arma1);
    }, undefined, (err) => console.warn('Aviso: Coloca modelos/arma1.glb', err));

    loader.load('modelos/arma2.glb', (gltf) => {
        arma2 = gltf.scene;
        arma2.scale.set(0.2, 0.2, 0.2);
        arma2.position.set(0.3, -0.3, -0.8);
        arma2.rotation.set(0, -Math.PI / 2, 0);
        arma2.visible = false;
        camera.add(arma2);
    }, undefined, (err) => console.warn('Aviso: Coloca modelos/arma2.glb', err));

    loader.load('modelos/zombi.glb', (gltf) => {
        modeloZombiOriginal = gltf.scene;
        inicializarZombis(mundo.posicionesZombis);
    }, undefined, (err) => {
        console.warn('Aviso: Falta modelos/zombi.glb.', err);
        inicializarZombis(mundo.posicionesZombis);
    });

    loader.load('modelos/balas.glb', (gltf) => {
        modeloCajaOriginal = gltf.scene;
        inicializarColeccionables(mundo.posicionesColeccionables);
    }, undefined, (err) => {
        console.warn('Aviso: Falta modelos/balas.glb.', err);
        inicializarColeccionables(mundo.posicionesColeccionables);
    });

    document.addEventListener('keydown', (event) => {
        if (juegoTerminado) return;
        switch (event.code) {
            case 'KeyW': moveForward = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyA': moveLeft = true; break;
            case 'KeyD': moveRight = true; break;
            case 'Digit1': cambiarArma(1); break;
            case 'Digit2': cambiarArma(2); break;
            case 'KeyR': recargarArma(); break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyD': moveRight = false; break;
        }
    });

    document.addEventListener('mousedown', (event) => {
        if (controls.isLocked && event.button === 0 && puedeDisparar && !juegoTerminado) {
            disparar();
            puedeDisparar = false;
        }
    });

    document.addEventListener('mouseup', (event) => {
        if (event.button === 0) {
            puedeDisparar = true;
        }
    });

    window.addEventListener('resize', onWindowResize);
    actualizarHUD();
}

function inicializarZombis(posiciones) {
    const containerHTML = document.getElementById('zombie-health-container');

    // Verificar la seleccion de modo difícil al terminar la partida anterior
    const modoActual = sessionStorage.getItem('dificultadJuego') || 'normal';
    const multiplicadorVelocidad = (modoActual === 'dificil') ? 1.5 : 1.0;

    posiciones.forEach((pos, index) => {
        let zombiMesh;
        if (modeloZombiOriginal) {
            zombiMesh = modeloZombiOriginal.clone();
            zombiMesh.scale.set(0.8, 0.8, 0.8);
        } else {
            const geo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
            const mat = new THREE.MeshStandardMaterial({ color: 0x338833 });
            zombiMesh = new THREE.Mesh(geo, mat);
        }

        zombiMesh.position.copy(pos);
        scene.add(zombiMesh);

        const barDiv = document.createElement('div');
        barDiv.className = 'zombie-health-bar';
        barDiv.innerHTML = '<div class="zombie-health-fill"></div>';
        containerHTML.appendChild(barDiv);

        let velocidadBase = (index % 2 === 0) ? 1.6 : 2.5;

        zombis.push({
            id: index,
            mesh: zombiMesh,
            salud: 2,          
            saludMax: 2,
            velocidad: velocidadBase * multiplicadorVelocidad, 
            activo: false,     
            uiBar: barDiv,
            uiFill: barDiv.querySelector('.zombie-health-fill')
        });
    });

    if (modoActual === 'dificil') {
        console.log('¡Partida iniciada en MODO DIFÍCIL!');
    }
}

function inicializarColeccionables(posiciones) {
    posiciones.forEach(pos => {
        let cajaMesh;
        if (modeloCajaOriginal) {
            cajaMesh = modeloCajaOriginal.clone();
            cajaMesh.scale.set(0.05, 0.05, 0.05); 
        } else {
            const geoCaja = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            const matCaja = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x553300 });
            cajaMesh = new THREE.Mesh(geoCaja, matCaja);
        }

        cajaMesh.position.copy(pos);
        scene.add(cajaMesh);

        coleccionables.push({
            mesh: cajaMesh,
            recogido: false
        });
    });
}

function cambiarArma(numeroArma) {
    if (armaActual === numeroArma) return;
    armaActual = numeroArma;

    if (arma1) arma1.visible = (armaActual === 1);
    if (arma2) arma2.visible = (armaActual === 2);

    const slot1 = document.getElementById('slot-1');
    const slot2 = document.getElementById('slot-2');
    if (slot1 && slot2) {
        slot1.classList.toggle('active', armaActual === 1);
        slot2.classList.toggle('active', armaActual === 2);
    }

    actualizarHUD();
}

function disparar() {
    const arma = inventarioArmas[armaActual];

    if (arma.municion <= 0) {
        console.log('¡Sin munición! Presiona R para recargar o busca balas.');
        return;
    }

    arma.municion--;
    actualizarHUD();

    const modeloActivo = armaActual === 1 ? arma1 : arma2;
    if (modeloActivo) {
        modeloActivo.position.z += 0.05;
        setTimeout(() => { modeloActivo.position.z -= 0.05; }, 80);
    }

    raycaster.setFromCamera(centroPantalla, camera);
    const intersecciones = raycaster.intersectObjects(scene.children, true);

    if (intersecciones.length > 0) {
        const objetoImpactado = intersecciones[0].object;

        zombis.forEach((zombi, index) => {
            let perteneceAZombi = false;

            zombi.mesh.traverse((child) => {
                if (child === objetoImpactado) perteneceAZombi = true;
            });

            if (perteneceAZombi || objetoImpactado === zombi.mesh) {
                zombi.salud -= 1; 
                zombi.activo = true; 

                const porcentaje = Math.max(0, (zombi.salud / zombi.saludMax) * 100);
                zombi.uiFill.style.width = porcentaje + '%';

                if (zombi.salud <= 0) {
                    zombi.uiBar.remove();
                    scene.remove(zombi.mesh);
                    zombis.splice(index, 1);
                }
            }
        });
    }
}

function recargarArma() {
    const arma = inventarioArmas[armaActual];
    arma.municion = arma.maxMunicion;
    actualizarHUD();
}

function actualizarHUD() {
    const hud = document.getElementById('hud');
    const arma = inventarioArmas[armaActual];
    if (hud) {
        hud.innerText = `Salud: ${Math.max(0, Math.round(saludJugador))} | ${arma.nombre}: ${arma.municion} / ${arma.maxMunicion} [R: Recargar]`;
    }
}

function verificarColisionJugador(nuevaPosicion) {
    const cajaJugador = new THREE.Box3().setFromCenterAndSize(
        nuevaPosicion,
        new THREE.Vector3(1.0, 1.8, 1.0)
    );

    for (const muro of colisionadoresMapa) {
        if (cajaJugador.intersectsBox(muro)) {
            return true;
        }
    }
    return false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    if (controls.isLocked === true && !juegoTerminado) {
        const delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;

        const posAnteriorX = camera.position.clone();
        controls.moveRight(-velocity.x * delta);
        if (verificarColisionJugador(camera.position)) {
            camera.position.x = posAnteriorX.x;
            camera.position.z = posAnteriorX.z;
        }

        const posAnteriorZ = camera.position.clone();
        controls.moveForward(-velocity.z * delta);
        if (verificarColisionJugador(camera.position)) {
            camera.position.x = posAnteriorZ.x;
            camera.position.z = posAnteriorZ.z;
        }

        coleccionables.forEach((item) => {
            if (!item.recogido) {
                item.mesh.rotation.y += 1.5 * delta;

                const distanciaJugador = item.mesh.position.distanceTo(camera.position);
                if (distanciaJugador < 1.5) {
                    item.recogido = true;
                    scene.remove(item.mesh);

                    const arma = inventarioArmas[armaActual];
                    arma.municion = arma.maxMunicion;
                    actualizarHUD();
                }
            }
        });

        zombis.forEach(zombi => {
            const distanciaAlJugador = zombi.mesh.position.distanceTo(camera.position);

            if (distanciaAlJugador < rangoDeteccion) {
                zombi.activo = true; 
            }

            if (zombi.activo) {
                const direccionZombi = new THREE.Vector3().subVectors(camera.position, zombi.mesh.position);
                direccionZombi.y = 0;
                direccionZombi.normalize();
                
                zombi.mesh.position.addScaledVector(direccionZombi, zombi.velocidad * delta);
                zombi.mesh.lookAt(camera.position.x, zombi.mesh.position.y, camera.position.z);

                if (distanciaAlJugador < 2.0) {
                    saludJugador = 0;
                    actualizarHUD();
                    juegoTerminado = true;
                    controls.unlock();
                    document.getElementById('pantalla-gameover').classList.remove('oculto'); 
                }
            }

            const posZombi3D = zombi.mesh.position.clone();
            posZombi3D.y += 2.2; 
            
            const vectorPantalla = posZombi3D.project(camera);

            if (vectorPantalla.z < 1) {
                const x = (vectorPantalla.x *  0.5 + 0.5) * window.innerWidth;
                const y = (vectorPantalla.y * -0.5 + 0.5) * window.innerHeight;

                zombi.uiBar.style.display = 'block';
                zombi.uiBar.style.left = `${x}px`;
                zombi.uiBar.style.top = `${y}px`;
            } else {
                zombi.uiBar.style.display = 'none';
            }
        });

        if (zonaExtraccion && zonaExtraccion.containsPoint(camera.position)) {
            juegoTerminado = true;
            controls.unlock();
            document.getElementById('pantalla-victoria').classList.remove('oculto'); 
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
}