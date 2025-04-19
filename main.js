import * as THREE from './node_modules/three';
import { PointerLockControls } from './node_modules/three/examples/jsm/controls/PointerLockControls.js';

let scene, camera, renderer, controls;
let treasureCount = 0;
const totalTreasures = 5;
const treasures = [], obstacles = [], enemies = [];
let torch, isNight = false;
const clock = new THREE.Clock();

let hearts = 7;
function updateHearts() {
  const heartText = '❤️'.repeat(hearts);
  document.getElementById('hearts').textContent = heartText;
}
updateHearts();


const canvas = document.createElement('canvas');
const context = canvas.getContext('webgl');
renderer = new THREE.WebGLRenderer({ canvas, context });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Scene setup
scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

// Lighting
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Torch light
torch = new THREE.PointLight(0xffaa33, 1, 10);
camera.add(torch);
scene.add(camera);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x228b22 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Controls
controls = new PointerLockControls(camera, document.body);
document.getElementById('startScreen').addEventListener('click', () => {
  controls.lock();
  document.getElementById('startScreen').style.display = 'none';
});
scene.add(controls.getObject());

// Movement
const move = { forward: false, backward: false, left: false, right: false };
const velocity = new THREE.Vector3();
let canJump = false;

document.addEventListener('keydown', e => {
  switch(e.code) {
    case 'KeyW': move.forward = true; break;
    case 'KeyS': move.backward = true; break;
    case 'KeyA': move.left = true; break;
    case 'KeyD': move.right = true; break;
    case 'Space':
      if (canJump) {
        velocity.y += 5;
        canJump = false;
      }
      break;
  }
});
document.addEventListener('keyup', e => {
  switch(e.code) {
    case 'KeyW': move.forward = false; break;
    case 'KeyS': move.backward = false; break;
    case 'KeyA': move.left = false; break;
    case 'KeyD': move.right = false; break;
  }
});

// Treasures
const treasureMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
for (let i = 0; i < totalTreasures; i++) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), treasureMat);
  box.position.set(Math.random()*80-40, 0.5, Math.random()*80-40);
  scene.add(box);
  treasures.push(box);
}

// Obstacles
const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
for (let i = 0; i < 20; i++) {
  const obs = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), obstacleMat);
  obs.position.set(Math.random()*80-40, 1, Math.random()*80-40);
  scene.add(obs);
  obstacles.push(obs);
}

// Enemies
const enemyMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
for (let i = 0; i < 3; i++) {
  const enemy = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), enemyMat);
  enemy.position.set(Math.random()*80-40, 1, Math.random()*80-40);
  scene.add(enemy);
  enemies.push(enemy);
}

// Raycast to collect treasures or attack
window.addEventListener('click', () => {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);

  // Check treasures
  const found = raycaster.intersectObjects(treasures);
  if (found.length > 0) {
    const obj = found[0].object;
    obj.visible = false;
    treasures.splice(treasures.indexOf(obj), 1);
    treasureCount++;
    document.getElementById('treasureCount').textContent = `Treasures: ${treasureCount} / ${totalTreasures}`;
    if (treasureCount === totalTreasures) {
      document.getElementById('winScreen').style.display = 'flex';
    }
  }

  // Attack enemies
  const hit = raycaster.intersectObjects(enemies);
  if (hit.length > 0) {
    const enemy = hit[0].object;
    enemy.visible = false;
    enemies.splice(enemies.indexOf(enemy), 1);
  }
});

function updateControls(delta) {
  const speed = 10;
  
  if (move.forward) velocity.z -= speed * delta;
  if (move.backward) velocity.z += speed * delta;
  if (move.left) velocity.x -= speed * delta;
  if (move.right) velocity.x += speed * delta;

  // Simulate gravity
  velocity.y -= 9.8 * delta;
  if (controls.getObject().position.y <= 2) {
    velocity.y = 0;
    canJump = true;
    controls.getObject().position.y = 2;
  }

  controls.moveRight(velocity.x * delta);
  controls.moveForward(velocity.z * delta);
  controls.getObject().position.y += velocity.y * delta;
}


function checkEnemyCollision() {
  for (const enemy of enemies) {
    const dist = enemy.position.distanceTo(controls.getObject().position);
    if (dist < 2) {
      hearts--;
      updateHearts();
      if (hearts <= 0) {
        document.getElementById('gameOverScreen').style.display = 'flex';
        controls.unlock();
      }
    }
  }
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    const dir = new THREE.Vector3().subVectors(controls.getObject().position, enemy.position).normalize();
    enemy.position.add(dir.multiplyScalar(delta * 2));
  }
}

function updateDayNight(elapsed) {
  isNight = Math.sin(elapsed * 0.1) < 0;
  torch.intensity = isNight ? 1 : 0;
  ambientLight.intensity = isNight ? 0.2 : 0.6;
  directionalLight.intensity = isNight ? 0.1 : 1;
  scene.background.set(isNight ? 0x000022 : 0x87ceeb);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  updateControls(delta);
  updateEnemies(delta);
  checkEnemyCollision();
  updateDayNight(clock.elapsedTime);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
