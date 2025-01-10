// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const canvas = document.getElementById('animationCanvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas });

renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setClearColor(0x1a1a1a); // Set the background color to #111
// document.body.appendChild(renderer.domElement);

// Lorenz attractor parameters
const sigma = 10, rho = 20, beta = 8 / 3;
let x = 0.1, y = 0, z = 0;

// Create geometry and material for the attractor
const geometry = new THREE.BufferGeometry();
const vertices = [];
const material = new THREE.LineBasicMaterial({ vertexColors: true });

// Generate points for the Lorenz attractor
for (let i = 0; i < 10000; i++) {
    const dt = 0.01;
    const dx = sigma * (y - x) * dt;
    const dy = (x * (rho - z) - y) * dt;
    const dz = (x * y - beta * z) * dt;
    x += dx;
    y += dy;
    z += dz;
    vertices.push(x, y, z - 21);
}
const minVertex = Math.min(...vertices);
const maxVertex = Math.max(...vertices);
const vertexRange = maxVertex - minVertex;

// Create colors array for gradient
const colors = [];
for (let i = 0; i < vertices.length; i += 3) {
    const color = new THREE.Color();
    const t = (vertices[i] - minVertex) / vertexRange;
    color.setRGB(t * 1, t * .3, .7 + .3 * t); // Gradient from blue (0, 0, 1) to purple (0.5, 0, 1)
    colors.push(color.r, color.g, color.b);
}

geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
const lorenzAttractor = new THREE.Line(geometry, material);
scene.add(lorenzAttractor);

// Set camera position
// camera.position.z = 100;
camera.position.y = -39;
// camera.position.y = 100;
camera.rotation.x = Math.PI / 2;
lorenzAttractor.rotation.z = Math.PI / 2;
// lorenzAttractor.position.z = -15;

// camera.

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    lorenzAttractor.rotation.z += 0.0075;
    document.addEventListener('mousemove', (event) => {
        const mouseX = 2 * (event.clientY / window.innerHeight) - 1;
        lorenzAttractor.rotation.x = mouseX * Math.PI / 4;
    });
    renderer.render(scene, camera);
}

animate();

// const canvas = document.getElementById('animationCanvas');
// const context = canvas.getContext('2d');
// context.fillStyle = 'blue';
// context.fillRect(0, 0, canvas.width, canvas.height);