# Welcome to PyWeb3D
## what is PyWeb3D

In summary PyWeb3D is [three.js](https://threejs.org/) with python syntax. 

Read [documentation](https://www.pyweb3d.org/docs/docs.html#manual/en/introduction/Installation).

## Aim of PyWeb3d
 - To extend the [three.js](https://threejs.org/) library and enable python developers to build 3D web applications (without or with basic knowledge of JavaScript)
 - To build a powerful 3D web framework for creating full fledged 3D stores and web applications

## Current Priorities
 - Writing a detailed python documentation
 - Modify and Include all files in `/jsm` directory of three.js
 - Add more examples to the documentation

# Try PyWeb3D
You can use PyWeb3D without having to install anything.

Add the necessary libraries and packages into the `<head></head>` tag of your HTML file.
```html 
<head>     
	<script src="https://cdn.jsdelivr.net/npm/brython@3.10.7/brython.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/brython@3.10.7/brython_stdlib.js"></script>
	<script src="https://unpkg.com/three@0.145.0/build/three.js"></script>
	<script src="https://www.pyweb3d.org/pyweb3d/v1.0.0/pyweb3d.brython.js"></script>
</head>
```
Note the `three.js` that's been used, not the module version

Here's a HTML boilerplate:
```html
<!DOCTYPE html>
<html>
  <head>
	<meta charset="utf-8">
	<title>My first pyWeb3D app</title>
	<script src="https://cdn.jsdelivr.net/npm/brython@3.10.7/brython.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/brython@3.10.7/brython_stdlib.js"></script>
	<script src="https://unpkg.com/three@0.145.0/build/three.js"></script>
	<script src="https://www.pyweb3d.org/pyweb3d/v1.0.0/pyweb3d.brython.js"></script>
	<style>
	    body { margin: 0; }
	</style>
 </head>
 <body onload="brython(1)">
	<script type="text/python">
		from browser import document, window
		from  pyweb3d.pyweb3d import *
		...
	</script>
 </body>
</html>
```

Check out the the [examples directory folder](https://github.com/Bruno-Odinukweze/PyWeb3D/tree/main/examples) for more examples on how to use pyWeb3D, all you need to do is open the `HTML` file in your browser.

# How to Contribute
If you like this project, please consider helping out. All contributions are welcome as well as donations to [Patreon](https://patreon.com/brunoodinukweze) or in Crypto\
`BTC: bc1qr4e3k6gpk5h82nduttzfq6lt5pnlkxpdjs98rp`\
`DogeCoin: D7pr1DgNBEV5m5DrHNULFMcE1so5MvA945`\
`BNB(Smart Chain): 0xa12E5b6370aDc7E714Fb8D901dA2631f22eDb0a5`

 - Fork the repository - [quicklink](https://github.com/Bruno-Odinukweze/PyWeb3D/fork)
 - Clone the forked repository to your local system.
 - Add a Git remote for the original repository.
 - Create a feature branch in which to place your changes.
 - Check the issues list for something to do or add your feature
 - Make your changes to the new branch.
 - Commit the changes to the branch.
 - Push the branch to GitHub.
 - Open a pull request from the new branch to the original repo.
 - Clean up after your pull request is merged.

refer to this [article](https://blog.scottlowe.org/2015/01/27/using-fork-branch-git-workflow/) for detailed explanation on the workflow

**PyWeb3D Articles to read:**
 - [Three.js with python syntax](https://medium.com/@brunoodinukweze1/three-js-with-python-syntax-pyweb3d-2152bed1a43d)

# Credits and references
 - Inspired by **[three.js](https://threejs.org/)**
 - **[brython](https://brython.info/)**
 - **[python](https://python.org/)**
