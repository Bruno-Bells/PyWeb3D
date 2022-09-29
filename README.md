# Welcome to PyWeb3D
## what is PyWeb3D

In summary PyWeb3D is [three.js](https://threejs.org/) with python syntax. 

 - **Tech stack and Libraries:**
    - **[brython](https://brython.info/)**
    - **[three.js](https://threejs.org/)**
    - **[python](https://python.org/)**
 - **Status:** Alpha
## Aim of PyWeb3d
 - To extend the [three.js](https://threejs.org/) library and enable python developers to build 3D web applications (without learning or with basic knowledge of JavaScript)
 - To build a powerful 3D web framework for creating full fledged 3D store

## Current Priorities
 - Writing a detailed documentation
 - Include all files in `/examples` directory of three.js

# Try PyWeb3D
To try PyWeb3D import the appropriate libraries into the `<head>` tag of your html page with:
``` 
<head>     
  <script src="https://cdn.jsdelivr.net/npm/brython@3/brython.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/brython@3/brython_stdlib.js"></script>
  <script type="text/javascript" src="https://unpkg.com/three@0.144.0/build/three.js"></script>
</head>
```
Note the three.js that's been used, not the module version

Here's  boiler plate HTML template:
```
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title>My first pyWeb3D app</title>
        
        <script src="https://cdn.jsdelivr.net/npm/brython@3/brython.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/brython@3/brython_stdlib.js"></script>
        <script type="text/javascript" src="https://unpkg.com/three@0.144.0/build/three.js"></script>
        <!-- Note the three.js that's been used not the module -->
        <style>
            body { margin: 0; }
        </style>
    </head>
<body onload="brython(1)">
    
    <script type="text/python" src="your-python-file.py"></script>
</body>
</html>
```

Download [pyweb3d.py](https://raw.githubusercontent.com/Bruno-Odinukweze/PyWeb3D/main/PyWeb3D/pyweb3d.py) and import it into `your-python-file.py`

you can import pyweb3d and browser window as follows:
```
from browser import document, window
from  pyweb3d import *
```
Check out the the [examples directory folder]](https://github.com/Bruno-Odinukweze/PyWeb3D/tree/main/PyWeb3D/examples) for more examples on how to use it, all you need to do is open them in Chrome.
