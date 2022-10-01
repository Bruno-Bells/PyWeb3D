from browser import document, window
from  pyweb3d import *

# Renderer
renderer = WebGL1Renderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

# Camera
field_of_view = 45
aspect_ratio = window.innerWidth / window.innerHeight
near_clipping_plane = 1
far_clipping_plane = 500

camera = PerspectiveCamera(field_of_view, aspect_ratio, near_clipping_plane, far_clipping_plane)
camera.position.set(0,0,50) # move the camera backwards on z-axis
camera.lookAt(0,0,0) # face the camera at the points origin

# Scene
scene = Scene()

# Material
material = LineBasicMaterial({'color':0x0000ff})

# points
points = []
points.append(Vector3(-10, 0, 0)) # -10 on x-axis(east)
points.append(Vector3(0, 10, 0)) # 10 on y-axis(up)
points.append(Vector3(10, 0, 0)) # 10 on x-axis(east)
points.append(Vector3(-10, 0, 0)) # -10 on x-axis(east)

# geometry
geometry = BufferGeometry().setFromPoints(points)

# Draw Line
line = Line(geometry, material)
scene.add(line)
renderer.render(scene, camera)

