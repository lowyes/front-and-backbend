if (typeof self !== 'undefined') {
  self.THREE = self.THREE || {};
} else if (typeof global !== 'undefined') {
  global.THREE = global.THREE || {};
}

function createScopedThreejs(canvas) {
  const THREE = {};

  function Vector3(x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
  }

  Vector3.prototype = {
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    },
    add(v) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    },
    sub(v) {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    },
    subVectors(a, b) {
      this.x = a.x - b.x;
      this.y = a.y - b.y;
      this.z = a.z - b.z;
      return this;
    },
    multiplyScalar(s) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    },
    normalize() {
      const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
      if (length > 0) {
        this.x /= length;
        this.y /= length;
        this.z /= length;
      }
      return this;
    },
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },
    clone() {
      return new Vector3(this.x, this.y, this.z);
    },
    dot(v) {
      return this.x * v.x + this.y * v.y + this.z * v.z;
    },
    cross(v) {
      const x = this.y * v.z - this.z * v.y;
      const y = this.z * v.x - this.x * v.z;
      const z = this.x * v.y - this.y * v.x;
      return new Vector3(x, y, z);
    },
    crossVectors(a, b) {
      this.x = a.y * b.z - a.z * b.y;
      this.y = a.z * b.x - a.x * b.z;
      this.z = a.x * b.y - a.y * b.x;
      return this;
    }
  };

  function Matrix4() {
    this.elements = new Float32Array(16);
    this.identity();
  }

  Matrix4.prototype = {
    identity() {
      this.elements.set([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ]);
      return this;
    },
    lookAt(eye, center, up) {
      const x0 = new Vector3(), x1 = new Vector3(), x2 = new Vector3();
      const y0 = new Vector3(), y1 = new Vector3(), y2 = new Vector3();
      const z0 = new Vector3(), z1 = new Vector3(), z2 = new Vector3();

      z0.subVectors(eye, center).normalize();
      x0.crossVectors(up, z0).normalize();
      y0.crossVectors(z0, x0);

      x1.set(x0.x, y0.x, z0.x, 0);
      y1.set(x0.y, y0.y, z0.y, 0);
      z1.set(x0.z, y0.z, z0.z, 0);

      x2.set(-x0.dot(eye), -y0.dot(eye), -z0.dot(eye), 1);

      this.elements.set([
        x1.x, y1.x, z1.x, 0,
        x1.y, y1.y, z1.y, 0,
        x1.z, y1.z, z1.z, 0,
        x2.x, x2.y, x2.z, 1
      ]);
      return this;
    },
    perspective(fov, aspect, near, far) {
      const f = 1.0 / Math.tan(fov / 2);
      const nf = 1 / (near - far);
      this.elements.set([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0
      ]);
      return this;
    },
    multiply(m) {
      const ae = this.elements;
      const be = m.elements;
      const te = new Float32Array(16);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          te[i * 4 + j] = ae[i * 4] * be[j] + ae[i * 4 + 1] * be[j + 4] + ae[i * 4 + 2] * be[j + 8] + ae[i * 4 + 3] * be[j + 12];
        }
      }
      this.elements.set(te);
      return this;
    }
  };

  function Object3D() {
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = new Vector3(1, 1, 1);
    this.matrix = new Matrix4();
    this.matrixWorld = new Matrix4();
    this.children = [];
    this.geometry = null;
    this.material = null;
    this.visible = true;
  }

  Object3D.prototype = {
    add(child) {
      this.children.push(child);
    },
    updateMatrix() {
      this.matrix.identity();
    },
    updateMatrixWorld(parentMatrix) {
      this.updateMatrix();
      if (parentMatrix) {
        this.matrixWorld.elements.set(parentMatrix.elements);
        this.matrixWorld.multiply(this.matrix);
      } else {
        this.matrixWorld.elements.set(this.matrix.elements);
      }
      this.children.forEach(child => child.updateMatrixWorld(this.matrixWorld));
    }
  };

  function Mesh(geometry, material) {
    Object3D.call(this);
    this.geometry = geometry;
    this.material = material;
  }

  Mesh.prototype = Object.create(Object3D.prototype);

  function Geometry() {
    this.vertices = [];
    this.faces = [];
    this.normals = [];
  }

  Geometry.prototype = {
    computeBoundingSphere() {
      this.boundingSphere = { center: new Vector3(), radius: 0 };
      if (this.vertices.length === 0) return;
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      this.vertices.forEach(v => {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        minZ = Math.min(minZ, v.z);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
        maxZ = Math.max(maxZ, v.z);
      });
      this.boundingSphere.center.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      this.boundingSphere.radius = this.boundingSphere.center.clone().sub(this.vertices[0]).length();
    }
  };

  function BoxGeometry(width, height, depth) {
    Geometry.call(this);
    const hw = width / 2;
    const hh = height / 2;
    const hd = depth / 2;
    this.vertices = [
      new Vector3(-hw, -hh, -hd), new Vector3(hw, -hh, -hd), new Vector3(hw, hh, -hd), new Vector3(-hw, hh, -hd),
      new Vector3(-hw, -hh, hd), new Vector3(hw, -hh, hd), new Vector3(hw, hh, hd), new Vector3(-hw, hh, hd)
    ];
    this.faces = [
      [0, 1, 2, 3], [4, 0, 3, 7], [5, 4, 7, 6], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]
    ];
    this.computeBoundingSphere();
  }

  BoxGeometry.prototype = Object.create(Geometry.prototype);

  function SphereGeometry(radius, segments) {
    Geometry.call(this);
    const rings = segments || 16;
    const slices = segments || 16;
    for (let i = 0; i <= rings; i++) {
      const lat = Math.PI * i / rings;
      const y = radius * Math.cos(lat);
      const r = radius * Math.sin(lat);
      for (let j = 0; j <= slices; j++) {
        const lng = 2 * Math.PI * j / slices;
        const x = r * Math.cos(lng);
        const z = r * Math.sin(lng);
        this.vertices.push(new Vector3(x, y, z));
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < slices; j++) {
        const a = i * (slices + 1) + j;
        const b = (i + 1) * (slices + 1) + j;
        this.faces.push([a, b, b + 1, a + 1]);
      }
    }
    this.computeBoundingSphere();
  }

  SphereGeometry.prototype = Object.create(Geometry.prototype);

  function Material(color) {
    this.color = color || 0x4A90D9;
    this.opacity = 1;
  }

  function Scene() {
    Object3D.call(this);
    this.background = 0x1a1a2e;
  }

  Scene.prototype = Object.create(Object3D.prototype);

  function PerspectiveCamera(fov, aspect, near, far) {
    Object3D.call(this);
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.projectionMatrix = new Matrix4();
    this.updateProjectionMatrix();
  }

  PerspectiveCamera.prototype = Object.create(Object3D.prototype);
  PerspectiveCamera.prototype.updateProjectionMatrix = function() {
    this.projectionMatrix.perspective(this.fov * Math.PI / 180, this.aspect, this.near, this.far);
  };
  PerspectiveCamera.prototype.lookAt = function(target) {
    this.matrixWorld.lookAt(this.position, target, new Vector3(0, 1, 0));
  };

  function WebGLRenderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    this.width = canvas.width;
    this.height = canvas.height;
    this.clearColor = new Float32Array([0.1, 0.1, 0.1, 1]);
    this.objects = [];
  }

  WebGLRenderer.prototype = {
    setSize(width, height) {
      this.width = width;
      this.height = height;
      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx.viewport(0, 0, width, height);
    },
    setClearColor(color) {
      this.clearColor[0] = ((color >> 16) & 255) / 255;
      this.clearColor[1] = ((color >> 8) & 255) / 255;
      this.clearColor[2] = (color & 255) / 255;
    },
    render(scene, camera) {
      const gl = this.ctx;
      gl.clearColor(...this.clearColor, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);

      const program = this.createProgram();
      gl.useProgram(program);

      const positionLocation = gl.getAttribLocation(program, 'position');
      const colorLocation = gl.getUniformLocation(program, 'color');
      const modelViewMatrixLocation = gl.getUniformLocation(program, 'modelViewMatrix');
      const projectionMatrixLocation = gl.getUniformLocation(program, 'projectionMatrix');

      gl.uniformMatrix4fv(projectionMatrixLocation, false, camera.projectionMatrix.elements);

      const renderObject = (object, parentMatrix) => {
        if (!object.visible) return;
        
        object.updateMatrix();
        let modelMatrix = object.matrix;
        if (parentMatrix) {
          modelMatrix = new Matrix4();
          modelMatrix.elements.set(parentMatrix.elements);
          modelMatrix.multiply(object.matrix);
        }

        if (object.geometry) {
          const vertices = object.geometry.vertices;
          const positions = new Float32Array(vertices.length * 3);
          vertices.forEach((v, i) => {
            positions[i * 3] = v.x + object.position.x;
            positions[i * 3 + 1] = v.y + object.position.y;
            positions[i * 3 + 2] = v.z + object.position.z;
          });

          const buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(positionLocation);
          gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

          const color = object.material ? object.material.color : 0x4A90D9;
          gl.uniform4f(colorLocation, 
            ((color >> 16) & 255) / 255,
            ((color >> 8) & 255) / 255,
            (color & 255) / 255,
            1);

          const modelViewMatrix = new Matrix4();
          modelViewMatrix.elements.set(camera.matrixWorld.elements);
          modelViewMatrix.multiply(modelMatrix);
          gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix.elements);

          object.geometry.faces.forEach(face => {
            gl.drawArrays(gl.TRIANGLE_FAN, face[0], face.length);
          });

          gl.deleteBuffer(buffer);
        }

        object.children.forEach(child => renderObject(child, modelMatrix));
      };

      renderObject(scene, null);
    },
    createProgram() {
      const gl = this.ctx;
      const vs = `
        attribute vec3 position;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;
      const fs = `
        precision mediump float;
        uniform vec4 color;
        void main() {
          gl_FragColor = color;
        }
      `;

      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, vs);
      gl.compileShader(vertexShader);

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, fs);
      gl.compileShader(fragmentShader);

      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      return program;
    },
    dispose() {
      if (this.canvas) {
        this.canvas = null;
      }
      this.ctx = null;
    }
  };

  THREE.Vector3 = Vector3;
  THREE.Matrix4 = Matrix4;
  THREE.Object3D = Object3D;
  THREE.Mesh = Mesh;
  THREE.Geometry = Geometry;
  THREE.BoxGeometry = BoxGeometry;
  THREE.SphereGeometry = SphereGeometry;
  THREE.Material = Material;
  THREE.Scene = Scene;
  THREE.PerspectiveCamera = PerspectiveCamera;
  THREE.WebGLRenderer = WebGLRenderer;

  THREE.REVISION = 'custom-miniprogram';

  return THREE;
}

module.exports = {
  createScopedThreejs
};
