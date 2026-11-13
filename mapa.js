import * as THREE from 'three';

export function construirMundo(scene) {
    const colisionadores = [];

    const matSuelo = new THREE.MeshStandardMaterial({ color: 0x1f2226, roughness: 0.9 });
    const matMuroPerimetro = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.7 });
    const matParedInterna = new THREE.MeshStandardMaterial({ color: 0x4a4f59, roughness: 0.8 });
    const matObstaculo = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });
    
    const matExtraccion = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00aa44,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.5
    });

    const sueloBase = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), matSuelo);
    sueloBase.rotation.x = -Math.PI / 2;
    sueloBase.position.set(0, 0, 0);
    scene.add(sueloBase);

    function crearBloqueMapa(ancho, alto, profundo, x, y, z, material = matParedInterna) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, profundo), material);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        colisionadores.push(new THREE.Box3().setFromObject(mesh));
        return mesh;
    }

    const alturaMuro = 3; 
    crearBloqueMapa(40, alturaMuro, 2, 0, alturaMuro / 2, -20, matMuroPerimetro);
    crearBloqueMapa(40, alturaMuro, 2, 0, alturaMuro / 2, 20, matMuroPerimetro);
    crearBloqueMapa(2, alturaMuro, 40, 20, alturaMuro / 2, 0, matMuroPerimetro);
    crearBloqueMapa(2, alturaMuro, 15, -20, alturaMuro / 2, -12, matMuroPerimetro);
    crearBloqueMapa(2, alturaMuro, 10, -12, alturaMuro / 2, 15, matMuroPerimetro);
    crearBloqueMapa(8, alturaMuro, 2, -16, alturaMuro / 2, -5, matMuroPerimetro);
    crearBloqueMapa(8, alturaMuro, 2, -8, alturaMuro / 2, 10, matMuroPerimetro);

    const plataformaInicio = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.1, 6),
        new THREE.MeshStandardMaterial({ color: 0x225588 })
    );
    plataformaInicio.position.set(8, 0.05, 12);
    scene.add(plataformaInicio);

    const luzInicio = new THREE.PointLight(0x44aaff, 3, 10);
    luzInicio.position.set(8, 3, 12);
    scene.add(luzInicio);

    const alturaInterna = 2.5; 
    crearBloqueMapa(2, alturaInterna, 12, 3, alturaInterna / 2, 4);
    crearBloqueMapa(12, alturaInterna, 2, -3, alturaInterna / 2, 0);
    crearBloqueMapa(6, alturaInterna, 6, -8, alturaInterna / 2, -8);
    crearBloqueMapa(8, alturaInterna, 5, 8, alturaInterna / 2, -5);

    const alturaObstaculo = 1.0;
    crearBloqueMapa(3, alturaObstaculo, 3, 0, alturaObstaculo / 2, 8, matObstaculo);
    crearBloqueMapa(4, alturaObstaculo, 2, -4, alturaObstaculo / 2, 4, matObstaculo);
    crearBloqueMapa(2, alturaObstaculo, 3, 10, alturaObstaculo / 2, 3, matObstaculo);
    crearBloqueMapa(3, alturaObstaculo, 2, -12, alturaObstaculo / 2, -2, matObstaculo);
    crearBloqueMapa(3, alturaObstaculo, 3, 4, alturaObstaculo / 2, -11, matObstaculo);

    const zonaExtraccionMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 4, 0.2, 32),
        matExtraccion
    );
    zonaExtraccionMesh.position.set(-10, 0.1, -16);
    scene.add(zonaExtraccionMesh);

    const balizaLuz = new THREE.Mesh(
        new THREE.CylinderGeometry(3.5, 3.5, 15, 32, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    balizaLuz.position.set(-10, 7.5, -16);
    scene.add(balizaLuz);

    const luzExtraccion = new THREE.PointLight(0x00ff88, 4, 15);
    luzExtraccion.position.set(-10, 3, -16);
    scene.add(luzExtraccion);

    const cajaExtraccion = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(-10, 2, -16),
        new THREE.Vector3(6, 4, 6)
    );

    const posicionesZombis = [
        new THREE.Vector3(-10, 0, -5),
        new THREE.Vector3(12, 0, -12),
        new THREE.Vector3(-5, 0, 8)
    ];

    const posicionesColeccionables = [
        new THREE.Vector3(0, 0.4, 4),
        new THREE.Vector3(-15, 0.4, -5),
        new THREE.Vector3(14, 0.4, -2)
    ];

    return {
        colisionadores,
        cajaExtraccion,
        posicionInicial: new THREE.Vector3(8, 1.6, 12),
        posicionesZombis,
        posicionesColeccionables
    };
}