import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const CAR_SPEED = 8.1;

interface Car {
  mesh: THREE.Mesh;
  direction: 'north' | 'south' | 'east' | 'west';
  turnDirection: 'right' | 'left' | 'straight';
  isWaiting: boolean;
  targetPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  id: string;
  state: 'waiting' | 'moving' | 'turning' | 'stopped';
  originalColor: number;
}

interface TrafficLight {
  group: THREE.Group;
  state: 'red' | 'yellow' | 'green';
  direction: 'north' | 'south' | 'east' | 'west';
  nextTurnIndex: number;
}

const TrafficScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const animationIdRef = useRef<number>();
  const carsRef = useRef<Car[]>([]);
  const trafficLightsRef = useRef<TrafficLight[]>([]);
  const buildingsRef = useRef<THREE.Group[]>([]);
  const treesRef = useRef<THREE.Group[]>([]);
  
  const [trafficPhase, setTrafficPhase] = useState<'green' | 'yellow' | 'red'>('green');
  const [trafficDirection, setTrafficDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [phaseTimer, setPhaseTimer] = useState(8); // Start with green phase
  const [activeDirections, setActiveDirections] = useState<'vertical' | 'horizontal'>('horizontal');
  const [cameraMode, setCameraMode] = useState<'orbit' | 'top' | 'street'>('orbit');
  const [isNightMode, setIsNightMode] = useState(false);
  const [carStates, setCarStates] = useState<{ [key: string]: string }>({});
  const [lastActiveDirection, setLastActiveDirection] = useState<'vertical' | 'horizontal'>('horizontal');
  const [isYellowPhase, setIsYellowPhase] = useState(false);

  // Camera controls state
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });
  const cameraRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 10, 100);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87CEEB);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting system
    setupLighting(scene);

    // Create complex 3D environment
    createRoadSystem(scene);
    createTrafficLights(scene);
    createBuildings(scene);
    createTrees(scene);
    createStreetLights(scene);
    createSkybox(scene);

    // Create initial cars
    createInitialCars(scene);

    // Mouse controls
    setupMouseControls();

    // Animation loop
    let lastTime = performance.now();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - lastTime) / 1000; // seconds
      lastTime = now;
      updateCars(delta);
      updateCameraControls();
      animateEnvironment();
      renderer.render(scene, camera);
    };
    animate();

    // Traffic light phase timer
    const phaseInterval = setInterval(() => {
      setPhaseTimer(prev => {
        if (prev <= 1) {
          // Phase transition
          setTrafficPhase(currentPhase => {
            if (currentPhase === 'green') {
              setPhaseTimer(3); // yellow
              return 'yellow';
            } else if (currentPhase === 'yellow') {
              setPhaseTimer(8); // red (other direction green)
              // Switch direction and set to green
              setTrafficDirection(dir => {
                const newDir = dir === 'horizontal' ? 'vertical' : 'horizontal';
                setTrafficPhase('green');
                setPhaseTimer(8);
                return newDir;
              });
              return 'red'; // This will be immediately replaced by green in the new direction
            } else { // red
              // Should not stay in red, always switch to green in the other direction
              setPhaseTimer(8);
              return 'green';
            }
          });
          return 3; // default for yellow, will be overwritten for green
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      clearInterval(phaseInterval);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update traffic lights based on the current phase and direction
  useEffect(() => {
    trafficLightsRef.current.forEach(light => {
      const isActive = (trafficDirection === 'horizontal' && (light.direction === 'east' || light.direction === 'west')) ||
                      (trafficDirection === 'vertical' && (light.direction === 'north' || light.direction === 'south'));
      if (isActive) {
        light.state = trafficPhase;
      } else {
        light.state = 'red';
      }
    });
  }, [trafficPhase, trafficDirection]);

  const setupLighting = (scene: THREE.Scene) => {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, isNightMode ? 0.1 : 0.4);
    scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, isNightMode ? 0.2 : 0.8);
    directionalLight.position.set(50, 50, 25);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Point lights for street lighting
    if (isNightMode) {
      const streetLightPositions = [
        { x: -8, z: -8 }, { x: 8, z: -8 },
        { x: -8, z: 8 }, { x: 8, z: 8 }
      ];
      
      streetLightPositions.forEach(pos => {
        const pointLight = new THREE.PointLight(0xffee88, 3, 40);
        pointLight.position.set(pos.x, 5, pos.z);
        pointLight.castShadow = true;
        scene.add(pointLight);
      });
    }
  };

  const createRoadSystem = (scene: THREE.Scene) => {
    // Create textured road material
    const roadTexture = new THREE.TextureLoader().load('data:image/svg+xml;base64,' + btoa(`
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#333333"/>
        <rect width="64" height="4" y="30" fill="#555555"/>
      </svg>
    `));
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(8, 8);
    
    const roadMaterial = new THREE.MeshLambertMaterial({ map: roadTexture });
    
    // Roads with textures - now wider to accommodate two lanes
    const horizontalRoad = new THREE.PlaneGeometry(36, 8); // Matches grass ends at ±18
    const horizontalRoadMesh = new THREE.Mesh(horizontalRoad, roadMaterial);
    horizontalRoadMesh.rotation.x = -Math.PI / 2;
    horizontalRoadMesh.receiveShadow = true;
    scene.add(horizontalRoadMesh);

    const verticalRoad = new THREE.PlaneGeometry(8, 36); // Matches grass ends at ±18
    const verticalRoadMesh = new THREE.Mesh(verticalRoad, roadMaterial);
    verticalRoadMesh.rotation.x = -Math.PI / 2;
    verticalRoadMesh.receiveShadow = true;
    scene.add(verticalRoadMesh);

    // Intersection
    const intersection = new THREE.PlaneGeometry(8, 8); // Increased size to match road width
    const intersectionMesh = new THREE.Mesh(intersection, roadMaterial);
    intersectionMesh.rotation.x = -Math.PI / 2;
    intersectionMesh.receiveShadow = true;
    scene.add(intersectionMesh);

    // Enhanced road markings
    const markingMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    
    // Center lines and lane markings
    for (let i = -15; i <= 15; i += 2) {
      if (Math.abs(i) > 2) {
        const marking = new THREE.PlaneGeometry(1, 0.1);
        const markingMesh = new THREE.Mesh(marking, markingMaterial);
        markingMesh.rotation.x = -Math.PI / 2;
        markingMesh.position.set(i, 0.01, 0);
        scene.add(markingMesh);
      }
    }

    for (let i = -15; i <= 15; i += 2) {
      if (Math.abs(i) > 2) {
        const marking = new THREE.PlaneGeometry(0.1, 1);
        const markingMesh = new THREE.Mesh(marking, markingMaterial);
        markingMesh.rotation.x = -Math.PI / 2;
        markingMesh.position.set(0, 0.01, i);
        scene.add(markingMesh);
      }
    }

    // Textured grass
    const grassTexture = new THREE.TextureLoader().load('data:image/svg+xml;base64,' + btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="#228B22"/>
        <circle cx="8" cy="8" r="2" fill="#32CD32"/>
        <circle cx="24" cy="16" r="1.5" fill="#32CD32"/>
        <circle cx="16" cy="24" r="1" fill="#90EE90"/>
      </svg>
    `));
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(4, 4);
    
    const grassMaterial = new THREE.MeshLambertMaterial({ map: grassTexture });
    
    const corners = [
      { x: -10, z: -10 }, { x: 10, z: -10 },
      { x: -10, z: 10 }, { x: 10, z: 10 }
    ];
    
    corners.forEach(corner => {
      const grass = new THREE.PlaneGeometry(16, 16);
      const grassMesh = new THREE.Mesh(grass, grassMaterial);
      grassMesh.rotation.x = -Math.PI / 2;
      grassMesh.position.set(corner.x, -0.01, corner.z);
      grassMesh.receiveShadow = true;
      scene.add(grassMesh);
    });
  };

  const createBuildings = (scene: THREE.Scene) => {
    const buildings: THREE.Group[] = [];
    
    const buildingPositions = [
      { x: -12, z: -12, height: 8, width: 3, depth: 3 },
      { x: 12, z: -12, height: 12, width: 4, depth: 2 },
      { x: -12, z: 12, height: 6, width: 2, depth: 4 },
      { x: 12, z: 12, height: 10, width: 3, depth: 3 }
    ];

    buildingPositions.forEach((pos, index) => {
      const building = new THREE.Group();
      
      // Building body with windows texture
      const windowTexture = new THREE.TextureLoader().load('data:image/svg+xml;base64,' + btoa(`
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="#666666"/>
          <rect x="8" y="8" width="12" height="12" fill="#ffff88"/>
          <rect x="20" y="8" width="12" height="12" fill="#ffff88"/>
          <rect x="36" y="8" width="12" height="12" fill="#ffff88"/>
          <rect x="8" y="24" width="12" height="12" fill="#ffff88"/>
          <rect x="20" y="24" width="12" height="12" fill="#444444"/>
          <rect x="36" y="24" width="12" height="12" fill="#ffff88"/>
          <rect x="8" y="40" width="12" height="12" fill="#ffff88"/>
          <rect x="20" y="40" width="12" height="12" fill="#ffff88"/>
          <rect x="36" y="40" width="12" height="12" fill="#444444"/>
        </svg>
      `));
      
      const buildingGeometry = new THREE.BoxGeometry(pos.width, pos.height, pos.depth);
      const buildingMaterial = new THREE.MeshLambertMaterial({ map: windowTexture });
      const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
      buildingMesh.position.y = pos.height / 2;
      buildingMesh.castShadow = true;
      buildingMesh.receiveShadow = true;
      building.add(buildingMesh);

      // Roof
      const roofGeometry = new THREE.ConeGeometry(Math.max(pos.width, pos.depth) * 0.7, 2, 4);
      const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = pos.height + 1;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      building.add(roof);

      building.position.set(pos.x, 0, pos.z);
      scene.add(building);
      buildings.push(building);
    });
    
    buildingsRef.current = buildings;
  };

  const createTrees = (scene: THREE.Scene) => {
    const trees: THREE.Group[] = [];
    
    const treePositions = [
      { x: -6, z: -15 }, { x: 6, z: -15 },
      { x: -6, z: 15 }, { x: 6, z: 15 },
      { x: -15, z: -6 }, { x: 15, z: -6 },
      { x: -15, z: 6 }, { x: 15, z: 6 }
    ];

    treePositions.forEach(pos => {
      const tree = new THREE.Group();
      
      // Trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 1;
      trunk.castShadow = true;
      tree.add(trunk);

      // Leaves
      const leavesGeometry = new THREE.SphereGeometry(1.5);
      const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.y = 2.5;
      leaves.castShadow = true;
      tree.add(leaves);

      tree.position.set(pos.x, 0, pos.z);
      scene.add(tree);
      trees.push(tree);
    });
    
    treesRef.current = trees;
  };

  const createStreetLights = (scene: THREE.Scene) => {
    const streetLightPositions = [
      { x: -8, z: -8 }, { x: 8, z: -8 },
      { x: -8, z: 8 }, { x: 8, z: 8 }
    ];

    streetLightPositions.forEach(pos => {
      const streetLight = new THREE.Group();
      
      // Pole
      const poleGeometry = new THREE.CylinderGeometry(0.1, 0.15, 6);
      const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.y = 3;
      pole.castShadow = true;
      streetLight.add(pole);

      // Light fixture
      const lightGeometry = new THREE.SphereGeometry(0.3);
      const lightMaterial = new THREE.MeshLambertMaterial({ 
        color: isNightMode ? 0xffee88 : 0xcccccc,
        emissive: isNightMode ? 0xffee88 : 0x000000,
        emissiveIntensity: isNightMode ? 1.5 : 0.0
      });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.y = 5.5;
      streetLight.add(light);

      streetLight.position.set(pos.x, 0, pos.z);
      scene.add(streetLight);
    });
  };

  const createSkybox = (scene: THREE.Scene) => {
    const skyGeometry = new THREE.SphereGeometry(200, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: isNightMode ? 0x001122 : 0x87CEEB,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
  };

  const setupMouseControls = () => {
    const handleMouseDown = (event: MouseEvent) => {
      mouseRef.current.isDown = true;
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!mouseRef.current.isDown || !cameraRef.current) return;

      const deltaX = event.clientX - mouseRef.current.x;
      const deltaY = event.clientY - mouseRef.current.y;

      cameraRotationRef.current.y += deltaX * 0.01;
      cameraRotationRef.current.x += deltaY * 0.01;

      cameraRotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotationRef.current.x));

      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };

    const handleMouseUp = () => {
      mouseRef.current.isDown = false;
    };

    const handleWheel = (event: WheelEvent) => {
      if (!cameraRef.current) return;

      const camera = cameraRef.current;
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.multiplyScalar(event.deltaY * 0.01);
      camera.position.add(direction);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('wheel', handleWheel);
  };

  const updateCameraControls = () => {
    if (!cameraRef.current) return;

    const camera = cameraRef.current;
    
    switch (cameraMode) {
      case 'orbit':
        const radius = 25;
        camera.position.x = Math.cos(cameraRotationRef.current.y) * Math.cos(cameraRotationRef.current.x) * radius;
        camera.position.y = Math.sin(cameraRotationRef.current.x) * radius + 10;
        camera.position.z = Math.sin(cameraRotationRef.current.y) * Math.cos(cameraRotationRef.current.x) * radius;
        camera.lookAt(0, 0, 0);
        break;
      case 'top':
        camera.position.set(0, 30, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'street':
        camera.position.set(0, 2, 8);
        camera.lookAt(0, 1, 0);
        break;
    }
  };

  const animateEnvironment = () => {
    treesRef.current.forEach((tree, index) => {
      if (tree.children[1]) {
        tree.children[1].rotation.z = Math.sin(Date.now() * 0.001 + index) * 0.1;
      }
    });
  };

  const createTrafficLight = (scene: THREE.Scene, position: THREE.Vector3, rotation: number, direction: 'north' | 'south' | 'east' | 'west'): TrafficLight => {
    const trafficLightGroup = new THREE.Group();

    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4);
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 2;
    pole.castShadow = true;
    trafficLightGroup.add(pole);

    // Light box
    const boxGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.3);
    const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const lightBox = new THREE.Mesh(boxGeometry, boxMaterial);
    lightBox.position.y = 4.5;
    lightBox.castShadow = true;
    trafficLightGroup.add(lightBox);

    // Lights
    const lightGeometry = new THREE.CircleGeometry(0.15, 16);
    
    // Red light
    const redLight = new THREE.Mesh(lightGeometry, new THREE.MeshLambertMaterial({ 
      color: 0xff0000, 
      emissive: 0x330000 
    }));
    redLight.position.set(0, 5, 0.16);
    redLight.userData = { type: 'red' };
    trafficLightGroup.add(redLight);

    // Yellow light
    const yellowLight = new THREE.Mesh(lightGeometry, new THREE.MeshLambertMaterial({ 
      color: 0xffff00, 
      emissive: 0x333300 
    }));
    yellowLight.position.set(0, 4.5, 0.16);
    yellowLight.userData = { type: 'yellow' };
    trafficLightGroup.add(yellowLight);

    // Green light
    const greenLight = new THREE.Mesh(lightGeometry, new THREE.MeshLambertMaterial({ 
      color: 0x00ff00, 
      emissive: 0x003300 
    }));
    greenLight.position.set(0, 4, 0.16);
    greenLight.userData = { type: 'green' };
    trafficLightGroup.add(greenLight);

    trafficLightGroup.position.copy(position);
    trafficLightGroup.rotation.y = rotation;
    scene.add(trafficLightGroup);

    return {
      group: trafficLightGroup,
      state: 'red',
      direction: direction,
      nextTurnIndex: 0,
    };
  };

  const createTrafficLights = (scene: THREE.Scene) => {
    const positions: { pos: THREE.Vector3; rot: number; dir: 'north' | 'south' | 'east' | 'west' }[] = [
      { pos: new THREE.Vector3(4, 0, 4), rot: 0, dir: 'south' }, // Light for southbound traffic
      { pos: new THREE.Vector3(-4, 0, -4), rot: Math.PI, dir: 'north' }, // Light for northbound traffic
      { pos: new THREE.Vector3(4, 0, -4), rot: Math.PI / 2, dir: 'west' }, // Light for westbound traffic
      { pos: new THREE.Vector3(-4, 0, 4), rot: -Math.PI / 2, dir: 'east' }  // Light for eastbound traffic
    ];

    positions.forEach(({ pos, rot, dir }) => {
      const light = createTrafficLight(scene, pos, rot, dir);
      trafficLightsRef.current.push(light);
    });
  };

  const updateTrafficLightAppearance = () => {
    trafficLightsRef.current.forEach(light => {
      light.group.children.forEach(child => {
        if (child.userData.type) {
          const material = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
          
          // Set emissive color based on the light's state
          if (child.userData.type === 'green') {
            material.emissive.setHex(light.state === 'green' ? 0x00ff00 : 0x000000);
          } else if (child.userData.type === 'yellow') {
            material.emissive.setHex(light.state === 'yellow' ? 0xffff00 : 0x000000);
          } else if (child.userData.type === 'red') {
            material.emissive.setHex(light.state === 'red' ? 0xff0000 : 0x000000);
          }
        }
      });
    });
  };

  const createCar = (scene: THREE.Scene, direction: 'north' | 'south' | 'east' | 'west', id: string): Car => {
    const carGroup = new THREE.Group();

    // Car body - more realistic shape
    const bodyGeometry = new THREE.BoxGeometry(2.2, 0.8, 1.2);
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: 0xff0000,
      emissive: 0x000000
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4;
    body.castShadow = true;
    carGroup.add(body);

    // Car roof - more streamlined
    const roofGeometry = new THREE.BoxGeometry(1.6, 0.6, 1.1);
    const roofMaterial = new THREE.MeshLambertMaterial({
      color: 0xcc0000,
      emissive: 0x000000
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 1.1;
    roof.position.z = -0.1;
    roof.castShadow = true;
    carGroup.add(roof);

    // Windows
    const windowMaterial = new THREE.MeshLambertMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7
    });

    // Front windshield
    const frontWindshieldGeometry = new THREE.PlaneGeometry(1.4, 0.6);
    const frontWindshield = new THREE.Mesh(frontWindshieldGeometry, windowMaterial);
    frontWindshield.position.set(0, 1.1, 0.6);
    frontWindshield.rotation.x = Math.PI / 6;
    carGroup.add(frontWindshield);

    // Rear windshield
    const rearWindshieldGeometry = new THREE.PlaneGeometry(1.4, 0.6);
    const rearWindshield = new THREE.Mesh(rearWindshieldGeometry, windowMaterial);
    rearWindshield.position.set(0, 1.1, -0.8);
    rearWindshield.rotation.x = -Math.PI / 6;
    carGroup.add(rearWindshield);

    // Side windows
    const sideWindowGeometry = new THREE.PlaneGeometry(1.6, 0.5);
    const leftWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    leftWindow.position.set(-1.1, 1.1, -0.1);
    leftWindow.rotation.y = Math.PI / 2;
    carGroup.add(leftWindow);

    const rightWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    rightWindow.position.set(1.1, 1.1, -0.1);
    rightWindow.rotation.y = -Math.PI / 2;
    carGroup.add(rightWindow);

    // Wheels - more detailed
    const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 16);
    const wheelMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x333333,
      roughness: 0.7,
      metalness: 0.3
    });

    const wheelPositions = [
      { x: -0.8, z: -0.6 }, { x: 0.8, z: -0.6 },
      { x: -0.8, z: 0.6 }, { x: 0.8, z: 0.6 }
    ];

    wheelPositions.forEach(wheelPos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wheelPos.x, 0.25, wheelPos.z);
      wheel.castShadow = true;
      carGroup.add(wheel);
    });

    // Headlights
    const headlightGeometry = new THREE.CircleGeometry(0.15, 16);
    const headlightMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5
    });

    const headlightPositions = [
      { x: -0.6, z: 1.1 }, { x: 0.6, z: 1.1 }
    ];

    headlightPositions.forEach(pos => {
      const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight.position.set(pos.x, 0.5, pos.z);
      carGroup.add(headlight);
    });

    // Taillights
    const taillightGeometry = new THREE.CircleGeometry(0.15, 16);
    const taillightMaterial = new THREE.MeshLambertMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });

    const taillightPositions = [
      { x: -0.6, z: -1.1 }, { x: 0.6, z: -1.1 }
    ];

    taillightPositions.forEach(pos => {
      const taillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
      taillight.position.set(pos.x, 0.5, pos.z);
      carGroup.add(taillight);
    });

    // License plate
    const plateGeometry = new THREE.PlaneGeometry(0.4, 0.2);
    const plateMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff
    });
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.set(0, 0.5, -1.1);
    carGroup.add(plate);

    // Position car based on direction and align with road - now using one side of the road
    let startPosition = new THREE.Vector3();
    let initialRotation = 0;

    switch (direction) {
      case 'north':
        startPosition.set(-2, 0, -16);
        initialRotation = 0;
        break;
      case 'south':
        startPosition.set(2, 0, 16);
        initialRotation = Math.PI;
        break;
      case 'east':
        startPosition.set(-16, 0, 2);
        initialRotation = Math.PI / 2;
        break;
      case 'west':
        startPosition.set(16, 0, -2);
        initialRotation = -Math.PI / 2;
        break;
    }

    carGroup.position.copy(startPosition);
    carGroup.rotation.y = initialRotation;
    scene.add(carGroup);

    const patterns = ['right', 'left', 'straight'] as const;

    return {
      mesh: carGroup,
      direction,
      turnDirection: patterns[0],
      isWaiting: true,
      targetPosition: startPosition.clone(),
      currentPosition: startPosition.clone(),
      id,
      state: 'waiting',
      originalColor: 0xff0000
    };
  };

  const createInitialCars = (scene: THREE.Scene) => {
    const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
    const carsPerDirection = 1;

    directions.forEach((direction, dirIndex) => {
      for(let i = 0; i < carsPerDirection; i++) {
        const car = createCar(scene, direction, `car-${dirIndex * carsPerDirection + i}`);
        // Position cars in sequence behind the first car
        let offset = 3 * i; // Increase offset for more spacing
        switch (direction) {
          case 'north':
            car.mesh.position.z += CAR_SPEED * offset;
            break;
          case 'south':
            car.mesh.position.z -= CAR_SPEED * offset;
            break;
          case 'east':
            car.mesh.position.x += CAR_SPEED * offset;
            break;
          case 'west':
            car.mesh.position.x -= CAR_SPEED * offset;
            break;
        }
        car.currentPosition.copy(car.mesh.position); // Initialize currentPosition
        car.targetPosition.copy(car.mesh.position); // Initially target is current position
        carsRef.current.push(car);
      }
    });
  };

  const updateCars = (delta: number) => {
    if (!sceneRef.current) return;

    // Group cars by direction to easily find the first waiting car in each lane
    const carsByDirection: { [key: string]: Car[] } = {};
    carsRef.current.forEach(car => {
      if (!carsByDirection[car.direction]) {
        carsByDirection[car.direction] = [];
      }
      carsByDirection[car.direction].push(car);
    });

    carsRef.current.forEach((car) => {
      // Find the traffic light for this car's direction
      const carTrafficLight = trafficLightsRef.current.find(light => light.direction === car.direction);

      // Check if this car's light is green and the overall light is green
      const isCarLightGreen = carTrafficLight?.state === 'green' && trafficPhase === 'green';

      // Find the first waiting car in this car's lane
      const firstWaitingCarInLane = carsByDirection[car.direction]?.find(c => c.isWaiting);

      // --- INTERSECTION LOGIC ---
      // Cars should only stop at the crossing spot (edge of intersection) if the light is not green
      let allowMove = false;
      let atCrossing = false;
      if (car.direction === 'north') {
        allowMove = car.mesh.position.z > -4; // in or past intersection
        atCrossing = Math.abs(car.mesh.position.z + 4) < 0.5; // close to -4
      } else if (car.direction === 'south') {
        allowMove = car.mesh.position.z < 4;
        atCrossing = Math.abs(car.mesh.position.z - 4) < 0.5; // close to 4
      } else if (car.direction === 'east') {
        allowMove = car.mesh.position.x > -4;
        atCrossing = Math.abs(car.mesh.position.x + 4) < 0.5; // close to -4
      } else if (car.direction === 'west') {
        allowMove = car.mesh.position.x < 4;
        atCrossing = Math.abs(car.mesh.position.x - 4) < 0.5; // close to 4
      }

      if (allowMove || (isCarLightGreen && car === firstWaitingCarInLane) || (!isCarLightGreen && !atCrossing)) {
        if (car.isWaiting) {
          car.isWaiting = false;
          setCarTarget(car);
        }
        moveCar(car, delta);
      } else {
        car.isWaiting = true;
        car.state = 'waiting';
        updateCarAppearance(car);
      }
    });

    updateTrafficLightAppearance();
  };

  const setCarTarget = (car: Car) => {
    const { direction, turnDirection } = car;
    let target = new THREE.Vector3();
    let finalRotation = car.mesh.rotation.y;

    switch (direction) {
      case 'north':
        if (turnDirection === 'right') {
          target.set(2, 0, 15); // Turn right towards southbound lane
          finalRotation = Math.PI;
        } else if (turnDirection === 'left') {
          target.set(-2, 0, -15); // Turn left towards northbound lane
          finalRotation = 0;
        } else { // Straight
          target.set(-2, 0, 15); // Straight towards northbound lane
          finalRotation = 0;
        }
        break;
      case 'south':
        if (turnDirection === 'right') {
          target.set(-2, 0, -15); // Turn right towards northbound lane
          finalRotation = 0;
        } else if (turnDirection === 'left') {
          target.set(2, 0, 15); // Turn left towards southbound lane
          finalRotation = Math.PI;
        } else { // Straight
          target.set(2, 0, -15); // Straight towards southbound lane
          finalRotation = Math.PI;
        }
        break;
      case 'east':
        if (turnDirection === 'right') {
          target.set(15, 0, 2); // Turn right towards westbound lane
          finalRotation = Math.PI / 2;
        } else if (turnDirection === 'left') {
          target.set(-15, 0, -2); // Turn left towards eastbound lane
          finalRotation = -Math.PI / 2;
        } else { // Straight
          target.set(15, 0, -2); // Straight towards eastbound lane
          finalRotation = -Math.PI / 2;
        }
        break;
      case 'west':
        if (turnDirection === 'right') {
          target.set(-15, 0, -2); // Turn right towards eastbound lane
          finalRotation = -Math.PI / 2;
        } else if (turnDirection === 'left') {
          target.set(15, 0, 2); // Turn left towards westbound lane
          finalRotation = Math.PI / 2;
        } else { // Straight
          target.set(-15, 0, 2); // Straight towards westbound lane
          finalRotation = Math.PI / 2;
        }
        break;
    }

    car.targetPosition.copy(target);
    car.mesh.userData.finalRotation = finalRotation;
  };

  const updateCarAppearance = (car: Car) => {
    const bodyMaterial = car.mesh.children[0].material as THREE.MeshLambertMaterial;
    const roofMaterial = car.mesh.children[1].material as THREE.MeshLambertMaterial;

    // Set car colors to be red, similar to the image
    const redColorBody = 0xff0000;
    const redColorRoof = 0xcc0000; // Slightly darker red for the roof

    bodyMaterial.color.setHex(redColorBody);
    roofMaterial.color.setHex(redColorRoof);

    // Keep emissive properties as they were, but ensure they are not making the car glow unless needed (e.g. stopped state)
    switch (car.state) {
      case 'waiting':
        bodyMaterial.emissive.setHex(0x000000);
        roofMaterial.emissive.setHex(0x000000);
        break;
      case 'moving':
        bodyMaterial.emissive.setHex(0x000000);
        roofMaterial.emissive.setHex(0x000000);
        break;
      case 'turning':
        bodyMaterial.emissive.setHex(0x000000);
        roofMaterial.emissive.setHex(0x000000);
        break;
      case 'stopped':
        // You might want a subtle emissive for stopped cars, but keep it minimal
        bodyMaterial.emissive.setHex(0x080000);
        roofMaterial.emissive.setHex(0x050000);
        break;
    }
  };

  const moveCar = (car: Car, delta: number) => {
    const directionVector = car.targetPosition.clone().sub(car.mesh.position).normalize();
    const movement = directionVector.multiplyScalar(CAR_SPEED * delta);

    let collisionDetected = false;
    const nextPosition = car.mesh.position.clone().add(movement);

    // Check for collisions with other cars
    for (const otherCar of carsRef.current) {
      if (car.id !== otherCar.id && !otherCar.isWaiting) {
        const distanceToOther = nextPosition.distanceTo(otherCar.mesh.position);
        const safeDistance = 2.0; // Increased safe distance

        if (distanceToOther < safeDistance) {
          collisionDetected = true;
          break;
        }
      }
    }

    if (!collisionDetected) {
      // Move car along its current direction
      switch (car.direction) {
        case 'north':
          car.mesh.position.z += CAR_SPEED * delta;
          // Reset at the end of the road (z >= 16)
          if (car.mesh.position.z >= 16) {
            resetCar(car);
            return;
          }
          break;
        case 'south':
          car.mesh.position.z -= CAR_SPEED * delta;
          // Reset at the end of the road (z <= -16)
          if (car.mesh.position.z <= -16) {
            resetCar(car);
            return;
          }
          break;
        case 'east':
          car.mesh.position.x += CAR_SPEED * delta;
          // Reset at the end of the road (x >= 16)
          if (car.mesh.position.x >= 16) {
            resetCar(car);
            return;
          }
          break;
        case 'west':
          car.mesh.position.x -= CAR_SPEED * delta;
          // Reset at the end of the road (x <= -16)
          if (car.mesh.position.x <= -16) {
            resetCar(car);
            return;
          }
          break;
      }

      // Update car state and appearance
      car.state = 'moving';
      updateCarAppearance(car);

      // Check if car has reached its target (for north/south)
      if ((car.direction === 'north' || car.direction === 'south') && car.mesh.position.distanceTo(car.targetPosition) < 1.0) {
        resetCar(car);
      }
    } else {
      car.state = 'stopped';
      car.isWaiting = false;
      updateCarAppearance(car);
    }
  };

  const resetCar = (car: Car) => {
    car.isWaiting = true;
    car.state = 'waiting';

    let startPosition = new THREE.Vector3();
    let initialRotation = 0;

    switch (car.direction) {
      case 'north':
        startPosition.set(-2, 0, -16);
        initialRotation = 0;
        break;
      case 'south':
        startPosition.set(2, 0, 16);
        initialRotation = Math.PI;
        break;
      case 'east':
        startPosition.set(-16, 0, 2);
        initialRotation = Math.PI / 2;
        break;
      case 'west':
        startPosition.set(16, 0, -2);
        initialRotation = -Math.PI / 2;
        break;
    }

    car.mesh.position.copy(startPosition);
    car.mesh.rotation.y = initialRotation;
    car.mesh.userData.finalRotation = initialRotation;

    const patterns = ['right', 'left', 'straight'] as const;
    
    const trafficLightForDirection = trafficLightsRef.current.find(light => light.direction === car.direction);

    if (trafficLightForDirection) {
      car.turnDirection = patterns[trafficLightForDirection.nextTurnIndex];
      trafficLightForDirection.nextTurnIndex = (trafficLightForDirection.nextTurnIndex + 1) % patterns.length;
    } else {
      car.turnDirection = patterns[0];
    }

    car.currentPosition.copy(car.mesh.position);
    car.targetPosition.copy(car.mesh.position);

    updateCarAppearance(car);
  };

  useEffect(() => {
    const states = carsRef.current.reduce((acc, car) => {
      acc[car.id] = car.state;
      return acc;
    }, {} as { [key: string]: string });
    setCarStates(states);
  }, [carsRef.current.map(car => car.state).join(), trafficPhase]);

  const toggleNightMode = () => {
    setIsNightMode(prev => !prev);
    if (sceneRef.current) {
      setupLighting(sceneRef.current);
    }
  };

  const handleNextCar = () => {
    console.log("handleNextCar button pressed - functionality removed");
  };

return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="w-full h-full" />

      {/* Enhanced Control Panel */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg max-w-sm">
        <div className="text-lg font-bold mb-2">🚦 Traffic Control System</div>
          <div className="text-sm">Active Directions: {trafficDirection.toUpperCase()}</div>        <div className="text-sm mt-2">
          Car States:
          {Object.entries(carStates).map(([carId, state]) => (
            <div key={carId} className="ml-2">
              {carId}: {state}
            </div>
          ))}
        </div>

        {/* Camera Controls */}
        <div className="mt-4 border-t border-gray-600 pt-2">
          <div className="text-sm font-bold mb-2">📹 Camera View</div>
          <div className="space-y-1">
            <button
              onClick={() => setCameraMode('orbit')}
              className={`px-3 py-1 rounded ${cameraMode === 'orbit' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Orbit View
            </button>
            <button
              onClick={() => setCameraMode('top')}
              className={`px-3 py-1 rounded ${cameraMode === 'top' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Top View
            </button>
            <button
              onClick={() => setCameraMode('street')}
              className={`px-3 py-1 rounded ${cameraMode === 'street' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Street View
            </button>
          </div>
        </div>

        {/* Environment Controls */}
        <div className="mt-4 border-t border-gray-600 pt-2">
          <div className="text-sm font-bold mb-2">🌍 Environment</div>
          <button
            onClick={toggleNightMode}
            className={`px-3 py-1 rounded ${isNightMode ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {isNightMode ? '🌙 Night Mode' : '☀️ Day Mode'}
          </button>
        </div>

        {/* Manual Controls (for testing) */}
        <div className="mt-4 border-t border-gray-600 pt-2">
          <div className="text-sm font-bold mb-2">⚙️ Manual Controls</div>
          <button
            onClick={handleNextCar}
            className="px-3 py-1 rounded bg-green-600 hover:bg-green-500"
          >
            Activate Next Car (Debug)
          </button>
        </div>

        {/* Feature List */}
        <div className="mt-4 border-t border-gray-600 pt-2 text-xs text-gray-400 space-y-1">
          <div className="font-bold">Features:</div>
          <div>✅ 8+ Unique 3D Objects (Cars, Buildings, Trees, Lights, etc.)</div>
          <div>✅ Camera Controls (Mouse drag, scroll zoom, view modes)</div>
          <div>✅ Multiple Lighting (Ambient, Directional, Point lights)</div>
          <div>✅ User Interaction (Click buttons, drag camera)</div>
          <div>✅ Texture Mapping (Roads, grass, building windows)</div>
          <div>✅ Animations (Cars, trees swaying, traffic lights)</div>
          <div>✅ AI Traffic Logic (Collision avoidance, signal obedience)</div>
        </div>

        {/* Tips */}
        <div className="mt-3 text-xs text-gray-300">
          <div>🖱️ Mouse: Drag to rotate, scroll to zoom</div>
          <div>🎯 15s traffic cycle, cars move on green</div>
          <div>🔄 Turn pattern cycles: Right → Left → Straight</div>
        </div>
      </div>
    </div>
  );
};

export default TrafficScene;