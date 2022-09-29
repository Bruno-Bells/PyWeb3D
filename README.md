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
To try PyWeb3D, import the appropriate libraries into the `<head>` tag of your html page with:
```html 
<head>     
  <script src="https://cdn.jsdelivr.net/npm/brython@3/brython.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/brython@3/brython_stdlib.js"></script>
  <script type="text/javascript" src="https://unpkg.com/three@0.144.0/build/three.js"></script>
</head>
```
Note the `three.js` that's been used, not the module version

Here's a boiler plate HTML template:
```html
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

you can import `pyweb3d` and `browser window` into `your-python-file.py` as follows:
```python
from browser import document, window
from  pyweb3d import *

...
```
**Note:** make sure that pyweb3d.py is in the same directory with your main html file (this is a currently limitation with `brython`)
also note where `your-python-file.py` is been imported using the `<script>` tag.

Check out the the [examples directory folder](https://github.com/Bruno-Odinukweze/PyWeb3D/tree/main/PyWeb3D/examples) for more examples on how to use pyWeb3D, all you need to do is open the `index.html` in your browser.

# How to Contribute
## Setting up your local environment
 - Fork the repository - [quicklink](https://github.com/Bruno-Odinukweze/PyWeb3D/fork)
 - clone the forked version in your account to your local machine 
 ``` 
 git clone https://github.com/<your username>/PyWeb3D
 ```
 - Add the original pyWeb3D project as your upstream (this will allow you to pull the latest changes) 
 ``` 
 git remote add upstream git@github.com:Bruno-Odinukweze/PyWeb3D.git
 ```
 - cd into the PyWeb3D
 ```
 cd PyWeb3D
 ```
 - Check the issues list for something to do
 - Create a branch for the issue that you want to work on
 ```
 git checkout -b <your branch name>
 ```
 - Fix or add your own features. Commit and push to your forked version of the repository
 - commit your changes locally and push
 - then create a PR

# Credits and references
 - Inspired by **[three.js](https://threejs.org/)**
 - **[brython](https://brython.info/)**
 - **[python](https://python.org/)**
