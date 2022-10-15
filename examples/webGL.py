from browser import document, window
		
def isWebGLAvailable():
	try:
		canvas = document.createElement( 'canvas' )
		return not ( window.WebGLRenderingContext and ( canvas.getContext( 'webgl' ) | canvas.getContext( 'experimental-webgl' ) ) )
	except:
		return False

def isWebGL2Available():
	try:
		canvas = document.createElement( 'canvas' )
		return not ( window.WebGL2RenderingContext and canvas.getContext( 'webgl2' ) )
	except:
		return False

def getErrorMessage( version ):
	names = {
		1: 'WebGL',
		2: 'WebGL 2'
		}
	contexts = {
		1: window.WebGLRenderingContext,
		2: window.WebGL2RenderingContext
		}
	message = 'Your $0 does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">$1</a>'
	element = document.createElement( 'div' )
	element.id = 'webglmessage'
	element.style.fontFamily = 'monospace'
	element.style.fontSize = '13px'
	element.style.fontWeight = 'normal'
	element.style.textAlign = 'center'
	element.style.background = '#fff'
	element.style.color = '#000'
	element.style.padding = '1.5em'
	element.style.width = '400px'
	element.style.margin = '5em auto 0'

	if contexts[ version ]:
		message = message.replace( '$0', 'graphics card' )
	else:
		message = message.replace( '$0', 'browser' )

	message = message.replace( '$1', names[ version ] )
	element.innerHTML = message

	return element

def getWebGLErrorMessage():
	return getErrorMessage( 1 )

def getWebGL2ErrorMessage():
	return getErrorMessage( 2 )