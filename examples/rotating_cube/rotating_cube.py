from browser import document, window
from  pyweb3d import *


scene = Scene()
camera = PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 )
renderer = WebGLRenderer()

renderer.setSize( window.innerWidth, window.innerHeight )
document.body.appendChild( renderer.domElement )

geometry = BoxGeometry( 1, 2, 1 )
material = MeshBasicMaterial( { 'color': 0x0000ff } )
cube = Mesh( geometry, material )
scene.add( cube )

camera.position.z = 5

def animate(time):
    window.requestAnimationFrame( animate )

    cube.rotation.x += 0.11
    # cube.rotation.y += 0.01

    renderer.render( scene, camera )

animate(0)