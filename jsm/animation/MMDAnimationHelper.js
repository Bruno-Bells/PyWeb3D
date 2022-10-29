
AnimationMixer = window.THREE.AnimationMixer;



//////////////////////////////////////////////////////////////////
// CCDIKSolver Start 
///////////////////////////////////////////////
BufferAttribute = window.THREE.BufferAttribute;
BufferGeometry = window.THREE.BufferGeometry;
Color = window.THREE.Color;
Line = window.THREE.Line;
LineBasicMaterial = window.THREE.LineBasicMaterial;
Matrix4 = window.THREE.Matrix4;
Mesh = window.THREE.Mesh;
MeshBasicMaterial = window.THREE.MeshBasicMaterial;
Object3D = window.THREE.Object3D;
Quaternion = window.THREE.Quaternion;
SphereGeometry = window.THREE.SphereGeometry;
Vector3 = window.THREE.Vector3;


Bone = window.THREE.Bone;
BoxGeometry = window.THREE.BoxGeometry;
CapsuleGeometry = window.THREE.CapsuleGeometry;
Euler = window.THREE.Euler;


const _q = new Quaternion();
const _targetPos = new Vector3();
const _targetVec = new Vector3();
const _effectorPos = new Vector3();
const _effectorVec = new Vector3();
const _linkPos = new Vector3();
const _invLinkQ = new Quaternion();
const _linkScale = new Vector3();
const _axis = new Vector3();
const _vector = new Vector3();
const _matrix = new Matrix4();


/**
 * CCD Algorithm
 *  - https://sites.google.com/site/auraliusproject/ccd-algorithm
 *
 * // ik parameter example
 * //
 * // target, effector, index in links are bone index in skeleton.bones.
 * // the bones relation should be
 * // <-- parent                                  child -->
 * // links[ n ], links[ n - 1 ], ..., links[ 0 ], effector
 * iks = [ {
 *	target: 1,
 *	effector: 2,
 *	links: [ { index: 5, limitation: new Vector3( 1, 0, 0 ) }, { index: 4, enabled: false }, { index : 3 } ],
 *	iteration: 10,
 *	minAngle: 0.0,
 *	maxAngle: 1.0,
 * } ];
 */

class CCDIKSolver {

	/**
	 * @param {THREE.SkinnedMesh} mesh
	 * @param {Array<Object>} iks
	 */
	constructor( mesh, iks = [] ) {

		this.mesh = mesh;
		this.iks = iks;

		this._valid();

	}

	/**
	 * Update all IK bones.
	 *
	 * @return {CCDIKSolver}
	 */
	update() {

		const iks = this.iks;

		for ( let i = 0, il = iks.length; i < il; i ++ ) {

			this.updateOne( iks[ i ] );

		}

		return this;

	}

	/**
	 * Update one IK bone
	 *
	 * @param {Object} ik parameter
	 * @return {CCDIKSolver}
	 */
	updateOne( ik ) {

		const bones = this.mesh.skeleton.bones;

		// for reference overhead reduction in loop
		const math = Math;

		const effector = bones[ ik.effector ];
		const target = bones[ ik.target ];

		// don't use getWorldPosition() here for the performance
		// because it calls updateMatrixWorld( true ) inside.
		_targetPos.setFromMatrixPosition( target.matrixWorld );

		const links = ik.links;
		const iteration = ik.iteration !== undefined ? ik.iteration : 1;

		for ( let i = 0; i < iteration; i ++ ) {

			let rotated = false;

			for ( let j = 0, jl = links.length; j < jl; j ++ ) {

				const link = bones[ links[ j ].index ];

				// skip this link and following links.
				// this skip is used for MMD performance optimization.
				if ( links[ j ].enabled === false ) break;

				const limitation = links[ j ].limitation;
				const rotationMin = links[ j ].rotationMin;
				const rotationMax = links[ j ].rotationMax;

				// don't use getWorldPosition/Quaternion() here for the performance
				// because they call updateMatrixWorld( true ) inside.
				link.matrixWorld.decompose( _linkPos, _invLinkQ, _linkScale );
				_invLinkQ.invert();
				_effectorPos.setFromMatrixPosition( effector.matrixWorld );

				// work in link world
				_effectorVec.subVectors( _effectorPos, _linkPos );
				_effectorVec.applyQuaternion( _invLinkQ );
				_effectorVec.normalize();

				_targetVec.subVectors( _targetPos, _linkPos );
				_targetVec.applyQuaternion( _invLinkQ );
				_targetVec.normalize();

				let angle = _targetVec.dot( _effectorVec );

				if ( angle > 1.0 ) {

					angle = 1.0;

				} else if ( angle < - 1.0 ) {

					angle = - 1.0;

				}

				angle = math.acos( angle );

				// skip if changing angle is too small to prevent vibration of bone
				if ( angle < 1e-5 ) continue;

				if ( ik.minAngle !== undefined && angle < ik.minAngle ) {

					angle = ik.minAngle;

				}

				if ( ik.maxAngle !== undefined && angle > ik.maxAngle ) {

					angle = ik.maxAngle;

				}

				_axis.crossVectors( _effectorVec, _targetVec );
				_axis.normalize();

				_q.setFromAxisAngle( _axis, angle );
				link.quaternion.multiply( _q );

				// TODO: re-consider the limitation specification
				if ( limitation !== undefined ) {

					let c = link.quaternion.w;

					if ( c > 1.0 ) c = 1.0;

					const c2 = math.sqrt( 1 - c * c );
					link.quaternion.set( limitation.x * c2,
					                     limitation.y * c2,
					                     limitation.z * c2,
					                     c );

				}

				if ( rotationMin !== undefined ) {

					link.rotation.setFromVector3( _vector.setFromEuler( link.rotation ).max( rotationMin ) );

				}

				if ( rotationMax !== undefined ) {

					link.rotation.setFromVector3( _vector.setFromEuler( link.rotation ).min( rotationMax ) );

				}

				link.updateMatrixWorld( true );

				rotated = true;

			}

			if ( ! rotated ) break;

		}

		return this;

	}

	/**
	 * Creates Helper
	 *
	 * @return {CCDIKHelper}
	 */
	createHelper() {

		return new CCDIKHelper( this.mesh, this.mesh.geometry.userData.MMD.iks );

	}

	// private methods

	_valid() {

		const iks = this.iks;
		const bones = this.mesh.skeleton.bones;

		for ( let i = 0, il = iks.length; i < il; i ++ ) {

			const ik = iks[ i ];
			const effector = bones[ ik.effector ];
			const links = ik.links;
			let link0, link1;

			link0 = effector;

			for ( let j = 0, jl = links.length; j < jl; j ++ ) {

				link1 = bones[ links[ j ].index ];

				if ( link0.parent !== link1 ) {

					console.warn( 'THREE.CCDIKSolver: bone ' + link0.name + ' is not the child of bone ' + link1.name );

				}

				link0 = link1;

			}

		}

	}

}

function getPosition( bone, matrixWorldInv ) {

	return _vector
		.setFromMatrixPosition( bone.matrixWorld )
		.applyMatrix4( matrixWorldInv );

}

function setPositionOfBoneToAttributeArray( array, index, bone, matrixWorldInv ) {

	const v = getPosition( bone, matrixWorldInv );

	array[ index * 3 + 0 ] = v.x;
	array[ index * 3 + 1 ] = v.y;
	array[ index * 3 + 2 ] = v.z;

}

/**
 * Visualize IK bones
 *
 * @param {SkinnedMesh} mesh
 * @param {Array<Object>} iks
 */
class CCDIKHelper extends Object3D {

	constructor( mesh, iks = [], sphereSize = 0.25 ) {

		super();

		this.root = mesh;
		this.iks = iks;

		this.matrix.copy( mesh.matrixWorld );
		this.matrixAutoUpdate = false;

		this.sphereGeometry = new SphereGeometry( sphereSize, 16, 8 );

		this.targetSphereMaterial = new MeshBasicMaterial( {
			color: new Color( 0xff8888 ),
			depthTest: false,
			depthWrite: false,
			transparent: true
		} );

		this.effectorSphereMaterial = new MeshBasicMaterial( {
			color: new Color( 0x88ff88 ),
			depthTest: false,
			depthWrite: false,
			transparent: true
		} );

		this.linkSphereMaterial = new MeshBasicMaterial( {
			color: new Color( 0x8888ff ),
			depthTest: false,
			depthWrite: false,
			transparent: true
		} );

		this.lineMaterial = new LineBasicMaterial( {
			color: new Color( 0xff0000 ),
			depthTest: false,
			depthWrite: false,
			transparent: true
		} );

		this._init();

	}

	/**
	 * Updates IK bones visualization.
	 */
	updateMatrixWorld( force ) {

		const mesh = this.root;

		if ( this.visible ) {

			let offset = 0;

			const iks = this.iks;
			const bones = mesh.skeleton.bones;

			_matrix.copy( mesh.matrixWorld ).invert();

			for ( let i = 0, il = iks.length; i < il; i ++ ) {

				const ik = iks[ i ];

				const targetBone = bones[ ik.target ];
				const effectorBone = bones[ ik.effector ];

				const targetMesh = this.children[ offset ++ ];
				const effectorMesh = this.children[ offset ++ ];

				targetMesh.position.copy( getPosition( targetBone, _matrix ) );
				effectorMesh.position.copy( getPosition( effectorBone, _matrix ) );

				for ( let j = 0, jl = ik.links.length; j < jl; j ++ ) {

					const link = ik.links[ j ];
					const linkBone = bones[ link.index ];

					const linkMesh = this.children[ offset ++ ];

					linkMesh.position.copy( getPosition( linkBone, _matrix ) );

				}

				const line = this.children[ offset ++ ];
				const array = line.geometry.attributes.position.array;

				setPositionOfBoneToAttributeArray( array, 0, targetBone, _matrix );
				setPositionOfBoneToAttributeArray( array, 1, effectorBone, _matrix );

				for ( let j = 0, jl = ik.links.length; j < jl; j ++ ) {

					const link = ik.links[ j ];
					const linkBone = bones[ link.index ];
					setPositionOfBoneToAttributeArray( array, j + 2, linkBone, _matrix );

				}

				line.geometry.attributes.position.needsUpdate = true;

			}

		}

		this.matrix.copy( mesh.matrixWorld );

		super.updateMatrixWorld( force );

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.sphereGeometry.dispose();

		this.targetSphereMaterial.dispose();
		this.effectorSphereMaterial.dispose();
		this.linkSphereMaterial.dispose();
		this.lineMaterial.dispose();

		const children = this.children;

		for ( let i = 0; i < children.length; i ++ ) {

			const child = children[ i ];

			if ( child.isLine ) child.geometry.dispose();

		}

	}

	// private method

	_init() {

		const scope = this;
		const iks = this.iks;

		function createLineGeometry( ik ) {

			const geometry = new BufferGeometry();
			const vertices = new Float32Array( ( 2 + ik.links.length ) * 3 );
			geometry.setAttribute( 'position', new BufferAttribute( vertices, 3 ) );

			return geometry;

		}

		function createTargetMesh() {

			return new Mesh( scope.sphereGeometry, scope.targetSphereMaterial );

		}

		function createEffectorMesh() {

			return new Mesh( scope.sphereGeometry, scope.effectorSphereMaterial );

		}

		function createLinkMesh() {

			return new Mesh( scope.sphereGeometry, scope.linkSphereMaterial );

		}

		function createLine( ik ) {

			return new Line( createLineGeometry( ik ), scope.lineMaterial );

		}

		for ( let i = 0, il = iks.length; i < il; i ++ ) {

			const ik = iks[ i ];

			this.add( createTargetMesh() );
			this.add( createEffectorMesh() );

			for ( let j = 0, jl = ik.links.length; j < jl; j ++ ) {

				this.add( createLinkMesh() );

			}

			this.add( createLine( ik ) );

		}

	}

}

/////////////////////////////////////////////
// End  CCDIKSolver
//////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////
//  MMDPhysics start 
//////////////////////////////////////////



/**
 * Dependencies
 *  - Ammo.js https://github.com/kripken/ammo.js
 *
 * MMDPhysics calculates physics with Ammo(Bullet based JavaScript Physics engine)
 * for MMD model loaded by MMDLoader.
 *
 * TODO
 *  - Physics in Worker
 */

/* global Ammo */

class MMDPhysics {

	/**
	 * @param {THREE.SkinnedMesh} mesh
	 * @param {Array<Object>} rigidBodyParams
	 * @param {Array<Object>} (optional) constraintParams
	 * @param {Object} params - (optional)
	 * @param {Number} params.unitStep - Default is 1 / 65.
	 * @param {Integer} params.maxStepNum - Default is 3.
	 * @param {Vector3} params.gravity - Default is ( 0, - 9.8 * 10, 0 )
	 */
	constructor( mesh, rigidBodyParams, constraintParams = [], params = {} ) {

		if ( typeof Ammo === 'undefined' ) {

			throw new Error( 'THREE.MMDPhysics: Import ammo.js https://github.com/kripken/ammo.js' );

		}

		this.manager = new ResourceManager();

		this.mesh = mesh;

		/*
		 * I don't know why but 1/60 unitStep easily breaks models
		 * so I set it 1/65 so far.
		 * Don't set too small unitStep because
		 * the smaller unitStep can make the performance worse.
		 */
		this.unitStep = ( params.unitStep !== undefined ) ? params.unitStep : 1 / 65;
		this.maxStepNum = ( params.maxStepNum !== undefined ) ? params.maxStepNum : 3;
		this.gravity = new Vector3( 0, - 9.8 * 10, 0 );

		if ( params.gravity !== undefined ) this.gravity.copy( params.gravity );

		this.world = params.world !== undefined ? params.world : null; // experimental

		this.bodies = [];
		this.constraints = [];

		this._init( mesh, rigidBodyParams, constraintParams );

	}

	/**
	 * Advances Physics calculation and updates bones.
	 *
	 * @param {Number} delta - time in second
	 * @return {MMDPhysics}
	 */
	update( delta ) {

		const manager = this.manager;
		const mesh = this.mesh;

		// rigid bodies and constrains are for
		// mesh's world scale (1, 1, 1).
		// Convert to (1, 1, 1) if it isn't.

		let isNonDefaultScale = false;

		const position = manager.allocThreeVector3();
		const quaternion = manager.allocThreeQuaternion();
		const scale = manager.allocThreeVector3();

		mesh.matrixWorld.decompose( position, quaternion, scale );

		if ( scale.x !== 1 || scale.y !== 1 || scale.z !== 1 ) {

			isNonDefaultScale = true;

		}

		let parent;

		if ( isNonDefaultScale ) {

			parent = mesh.parent;

			if ( parent !== null ) mesh.parent = null;

			scale.copy( this.mesh.scale );

			mesh.scale.set( 1, 1, 1 );
			mesh.updateMatrixWorld( true );

		}

		// calculate physics and update bones

		this._updateRigidBodies();
		this._stepSimulation( delta );
		this._updateBones();

		// restore mesh if converted above

		if ( isNonDefaultScale ) {

			if ( parent !== null ) mesh.parent = parent;

			mesh.scale.copy( scale );

		}

		manager.freeThreeVector3( scale );
		manager.freeThreeQuaternion( quaternion );
		manager.freeThreeVector3( position );

		return this;

	}

	/**
	 * Resets rigid bodies transorm to current bone's.
	 *
	 * @return {MMDPhysics}
	 */
	reset() {

		for ( let i = 0, il = this.bodies.length; i < il; i ++ ) {

			this.bodies[ i ].reset();

		}

		return this;

	}

	/**
	 * Warm ups Rigid bodies. Calculates cycles steps.
	 *
	 * @param {Integer} cycles
	 * @return {MMDPhysics}
	 */
	warmup( cycles ) {

		for ( let i = 0; i < cycles; i ++ ) {

			this.update( 1 / 60 );

		}

		return this;

	}

	/**
	 * Sets gravity.
	 *
	 * @param {Vector3} gravity
	 * @return {MMDPhysicsHelper}
	 */
	setGravity( gravity ) {

		this.world.setGravity( new Ammo.btVector3( gravity.x, gravity.y, gravity.z ) );
		this.gravity.copy( gravity );

		return this;

	}

	/**
	 * Creates MMDPhysicsHelper
	 *
	 * @return {MMDPhysicsHelper}
	 */
	createHelper() {

		return new MMDPhysicsHelper( this.mesh, this );

	}

	// private methods

	_init( mesh, rigidBodyParams, constraintParams ) {

		const manager = this.manager;

		// rigid body/constraint parameters are for
		// mesh's default world transform as position(0, 0, 0),
		// quaternion(0, 0, 0, 1) and scale(0, 0, 0)

		const parent = mesh.parent;

		if ( parent !== null ) mesh.parent = null;

		const currentPosition = manager.allocThreeVector3();
		const currentQuaternion = manager.allocThreeQuaternion();
		const currentScale = manager.allocThreeVector3();

		currentPosition.copy( mesh.position );
		currentQuaternion.copy( mesh.quaternion );
		currentScale.copy( mesh.scale );

		mesh.position.set( 0, 0, 0 );
		mesh.quaternion.set( 0, 0, 0, 1 );
		mesh.scale.set( 1, 1, 1 );

		mesh.updateMatrixWorld( true );

		if ( this.world === null ) {

			this.world = this._createWorld();
			this.setGravity( this.gravity );

		}

		this._initRigidBodies( rigidBodyParams );
		this._initConstraints( constraintParams );

		if ( parent !== null ) mesh.parent = parent;

		mesh.position.copy( currentPosition );
		mesh.quaternion.copy( currentQuaternion );
		mesh.scale.copy( currentScale );

		mesh.updateMatrixWorld( true );

		this.reset();

		manager.freeThreeVector3( currentPosition );
		manager.freeThreeQuaternion( currentQuaternion );
		manager.freeThreeVector3( currentScale );

	}

	_createWorld() {

		const config = new Ammo.btDefaultCollisionConfiguration();
		const dispatcher = new Ammo.btCollisionDispatcher( config );
		const cache = new Ammo.btDbvtBroadphase();
		const solver = new Ammo.btSequentialImpulseConstraintSolver();
		const world = new Ammo.btDiscreteDynamicsWorld( dispatcher, cache, solver, config );
		return world;

	}

	_initRigidBodies( rigidBodies ) {

		for ( let i = 0, il = rigidBodies.length; i < il; i ++ ) {

			this.bodies.push( new RigidBody(
				this.mesh, this.world, rigidBodies[ i ], this.manager ) );

		}

	}

	_initConstraints( constraints ) {

		for ( let i = 0, il = constraints.length; i < il; i ++ ) {

			const params = constraints[ i ];
			const bodyA = this.bodies[ params.rigidBodyIndex1 ];
			const bodyB = this.bodies[ params.rigidBodyIndex2 ];
			this.constraints.push( new Constraint( this.mesh, this.world, bodyA, bodyB, params, this.manager ) );

		}

	}

	_stepSimulation( delta ) {

		const unitStep = this.unitStep;
		let stepTime = delta;
		let maxStepNum = ( ( delta / unitStep ) | 0 ) + 1;

		if ( stepTime < unitStep ) {

			stepTime = unitStep;
			maxStepNum = 1;

		}

		if ( maxStepNum > this.maxStepNum ) {

			maxStepNum = this.maxStepNum;

		}

		this.world.stepSimulation( stepTime, maxStepNum, unitStep );

	}

	_updateRigidBodies() {

		for ( let i = 0, il = this.bodies.length; i < il; i ++ ) {

			this.bodies[ i ].updateFromBone();

		}

	}

	_updateBones() {

		for ( let i = 0, il = this.bodies.length; i < il; i ++ ) {

			this.bodies[ i ].updateBone();

		}

	}

}

/**
 * This manager's responsibilies are
 *
 * 1. manage Ammo.js and Three.js object resources and
 *    improve the performance and the memory consumption by
 *    reusing objects.
 *
 * 2. provide simple Ammo object operations.
 */
class ResourceManager {

	constructor() {

		// for Three.js
		this.threeVector3s = [];
		this.threeMatrix4s = [];
		this.threeQuaternions = [];
		this.threeEulers = [];

		// for Ammo.js
		this.transforms = [];
		this.quaternions = [];
		this.vector3s = [];

	}

	allocThreeVector3() {

		return ( this.threeVector3s.length > 0 )
			? this.threeVector3s.pop()
			: new Vector3();

	}

	freeThreeVector3( v ) {

		this.threeVector3s.push( v );

	}

	allocThreeMatrix4() {

		return ( this.threeMatrix4s.length > 0 )
			? this.threeMatrix4s.pop()
			: new Matrix4();

	}

	freeThreeMatrix4( m ) {

		this.threeMatrix4s.push( m );

	}

	allocThreeQuaternion() {

		return ( this.threeQuaternions.length > 0 )
			? this.threeQuaternions.pop()
			: new Quaternion();

	}

	freeThreeQuaternion( q ) {

		this.threeQuaternions.push( q );

	}

	allocThreeEuler() {

		return ( this.threeEulers.length > 0 )
			? this.threeEulers.pop()
			: new Euler();

	}

	freeThreeEuler( e ) {

		this.threeEulers.push( e );

	}

	allocTransform() {

		return ( this.transforms.length > 0 )
			? this.transforms.pop()
			: new Ammo.btTransform();

	}

	freeTransform( t ) {

		this.transforms.push( t );

	}

	allocQuaternion() {

		return ( this.quaternions.length > 0 )
			? this.quaternions.pop()
			: new Ammo.btQuaternion();

	}

	freeQuaternion( q ) {

		this.quaternions.push( q );

	}

	allocVector3() {

		return ( this.vector3s.length > 0 )
			? this.vector3s.pop()
			: new Ammo.btVector3();

	}

	freeVector3( v ) {

		this.vector3s.push( v );

	}

	setIdentity( t ) {

		t.setIdentity();

	}

	getBasis( t ) {

		var q = this.allocQuaternion();
		t.getBasis().getRotation( q );
		return q;

	}

	getBasisAsMatrix3( t ) {

		var q = this.getBasis( t );
		var m = this.quaternionToMatrix3( q );
		this.freeQuaternion( q );
		return m;

	}

	getOrigin( t ) {

		return t.getOrigin();

	}

	setOrigin( t, v ) {

		t.getOrigin().setValue( v.x(), v.y(), v.z() );

	}

	copyOrigin( t1, t2 ) {

		var o = t2.getOrigin();
		this.setOrigin( t1, o );

	}

	setBasis( t, q ) {

		t.setRotation( q );

	}

	setBasisFromMatrix3( t, m ) {

		var q = this.matrix3ToQuaternion( m );
		this.setBasis( t, q );
		this.freeQuaternion( q );

	}

	setOriginFromArray3( t, a ) {

		t.getOrigin().setValue( a[ 0 ], a[ 1 ], a[ 2 ] );

	}

	setOriginFromThreeVector3( t, v ) {

		t.getOrigin().setValue( v.x, v.y, v.z );

	}

	setBasisFromArray3( t, a ) {

		var thQ = this.allocThreeQuaternion();
		var thE = this.allocThreeEuler();
		thE.set( a[ 0 ], a[ 1 ], a[ 2 ] );
		this.setBasisFromThreeQuaternion( t, thQ.setFromEuler( thE ) );

		this.freeThreeEuler( thE );
		this.freeThreeQuaternion( thQ );

	}

	setBasisFromThreeQuaternion( t, a ) {

		var q = this.allocQuaternion();

		q.setX( a.x );
		q.setY( a.y );
		q.setZ( a.z );
		q.setW( a.w );
		this.setBasis( t, q );

		this.freeQuaternion( q );

	}

	multiplyTransforms( t1, t2 ) {

		var t = this.allocTransform();
		this.setIdentity( t );

		var m1 = this.getBasisAsMatrix3( t1 );
		var m2 = this.getBasisAsMatrix3( t2 );

		var o1 = this.getOrigin( t1 );
		var o2 = this.getOrigin( t2 );

		var v1 = this.multiplyMatrix3ByVector3( m1, o2 );
		var v2 = this.addVector3( v1, o1 );
		this.setOrigin( t, v2 );

		var m3 = this.multiplyMatrices3( m1, m2 );
		this.setBasisFromMatrix3( t, m3 );

		this.freeVector3( v1 );
		this.freeVector3( v2 );

		return t;

	}

	inverseTransform( t ) {

		var t2 = this.allocTransform();

		var m1 = this.getBasisAsMatrix3( t );
		var o = this.getOrigin( t );

		var m2 = this.transposeMatrix3( m1 );
		var v1 = this.negativeVector3( o );
		var v2 = this.multiplyMatrix3ByVector3( m2, v1 );

		this.setOrigin( t2, v2 );
		this.setBasisFromMatrix3( t2, m2 );

		this.freeVector3( v1 );
		this.freeVector3( v2 );

		return t2;

	}

	multiplyMatrices3( m1, m2 ) {

		var m3 = [];

		var v10 = this.rowOfMatrix3( m1, 0 );
		var v11 = this.rowOfMatrix3( m1, 1 );
		var v12 = this.rowOfMatrix3( m1, 2 );

		var v20 = this.columnOfMatrix3( m2, 0 );
		var v21 = this.columnOfMatrix3( m2, 1 );
		var v22 = this.columnOfMatrix3( m2, 2 );

		m3[ 0 ] = this.dotVectors3( v10, v20 );
		m3[ 1 ] = this.dotVectors3( v10, v21 );
		m3[ 2 ] = this.dotVectors3( v10, v22 );
		m3[ 3 ] = this.dotVectors3( v11, v20 );
		m3[ 4 ] = this.dotVectors3( v11, v21 );
		m3[ 5 ] = this.dotVectors3( v11, v22 );
		m3[ 6 ] = this.dotVectors3( v12, v20 );
		m3[ 7 ] = this.dotVectors3( v12, v21 );
		m3[ 8 ] = this.dotVectors3( v12, v22 );

		this.freeVector3( v10 );
		this.freeVector3( v11 );
		this.freeVector3( v12 );
		this.freeVector3( v20 );
		this.freeVector3( v21 );
		this.freeVector3( v22 );

		return m3;

	}

	addVector3( v1, v2 ) {

		var v = this.allocVector3();
		v.setValue( v1.x() + v2.x(), v1.y() + v2.y(), v1.z() + v2.z() );
		return v;

	}

	dotVectors3( v1, v2 ) {

		return v1.x() * v2.x() + v1.y() * v2.y() + v1.z() * v2.z();

	}

	rowOfMatrix3( m, i ) {

		var v = this.allocVector3();
		v.setValue( m[ i * 3 + 0 ], m[ i * 3 + 1 ], m[ i * 3 + 2 ] );
		return v;

	}

	columnOfMatrix3( m, i ) {

		var v = this.allocVector3();
		v.setValue( m[ i + 0 ], m[ i + 3 ], m[ i + 6 ] );
		return v;

	}

	negativeVector3( v ) {

		var v2 = this.allocVector3();
		v2.setValue( - v.x(), - v.y(), - v.z() );
		return v2;

	}

	multiplyMatrix3ByVector3( m, v ) {

		var v4 = this.allocVector3();

		var v0 = this.rowOfMatrix3( m, 0 );
		var v1 = this.rowOfMatrix3( m, 1 );
		var v2 = this.rowOfMatrix3( m, 2 );
		var x = this.dotVectors3( v0, v );
		var y = this.dotVectors3( v1, v );
		var z = this.dotVectors3( v2, v );

		v4.setValue( x, y, z );

		this.freeVector3( v0 );
		this.freeVector3( v1 );
		this.freeVector3( v2 );

		return v4;

	}

	transposeMatrix3( m ) {

		var m2 = [];
		m2[ 0 ] = m[ 0 ];
		m2[ 1 ] = m[ 3 ];
		m2[ 2 ] = m[ 6 ];
		m2[ 3 ] = m[ 1 ];
		m2[ 4 ] = m[ 4 ];
		m2[ 5 ] = m[ 7 ];
		m2[ 6 ] = m[ 2 ];
		m2[ 7 ] = m[ 5 ];
		m2[ 8 ] = m[ 8 ];
		return m2;

	}

	quaternionToMatrix3( q ) {

		var m = [];

		var x = q.x();
		var y = q.y();
		var z = q.z();
		var w = q.w();

		var xx = x * x;
		var yy = y * y;
		var zz = z * z;

		var xy = x * y;
		var yz = y * z;
		var zx = z * x;

		var xw = x * w;
		var yw = y * w;
		var zw = z * w;

		m[ 0 ] = 1 - 2 * ( yy + zz );
		m[ 1 ] = 2 * ( xy - zw );
		m[ 2 ] = 2 * ( zx + yw );
		m[ 3 ] = 2 * ( xy + zw );
		m[ 4 ] = 1 - 2 * ( zz + xx );
		m[ 5 ] = 2 * ( yz - xw );
		m[ 6 ] = 2 * ( zx - yw );
		m[ 7 ] = 2 * ( yz + xw );
		m[ 8 ] = 1 - 2 * ( xx + yy );

		return m;

	}

	matrix3ToQuaternion( m ) {

		var t = m[ 0 ] + m[ 4 ] + m[ 8 ];
		var s, x, y, z, w;

		if ( t > 0 ) {

			s = Math.sqrt( t + 1.0 ) * 2;
			w = 0.25 * s;
			x = ( m[ 7 ] - m[ 5 ] ) / s;
			y = ( m[ 2 ] - m[ 6 ] ) / s;
			z = ( m[ 3 ] - m[ 1 ] ) / s;

		} else if ( ( m[ 0 ] > m[ 4 ] ) && ( m[ 0 ] > m[ 8 ] ) ) {

			s = Math.sqrt( 1.0 + m[ 0 ] - m[ 4 ] - m[ 8 ] ) * 2;
			w = ( m[ 7 ] - m[ 5 ] ) / s;
			x = 0.25 * s;
			y = ( m[ 1 ] + m[ 3 ] ) / s;
			z = ( m[ 2 ] + m[ 6 ] ) / s;

		} else if ( m[ 4 ] > m[ 8 ] ) {

			s = Math.sqrt( 1.0 + m[ 4 ] - m[ 0 ] - m[ 8 ] ) * 2;
			w = ( m[ 2 ] - m[ 6 ] ) / s;
			x = ( m[ 1 ] + m[ 3 ] ) / s;
			y = 0.25 * s;
			z = ( m[ 5 ] + m[ 7 ] ) / s;

		} else {

			s = Math.sqrt( 1.0 + m[ 8 ] - m[ 0 ] - m[ 4 ] ) * 2;
			w = ( m[ 3 ] - m[ 1 ] ) / s;
			x = ( m[ 2 ] + m[ 6 ] ) / s;
			y = ( m[ 5 ] + m[ 7 ] ) / s;
			z = 0.25 * s;

		}

		var q = this.allocQuaternion();
		q.setX( x );
		q.setY( y );
		q.setZ( z );
		q.setW( w );
		return q;

	}

}

/**
 * @param {THREE.SkinnedMesh} mesh
 * @param {Ammo.btDiscreteDynamicsWorld} world
 * @param {Object} params
 * @param {ResourceManager} manager
 */
class RigidBody {

	constructor( mesh, world, params, manager ) {

		this.mesh = mesh;
		this.world = world;
		this.params = params;
		this.manager = manager;

		this.body = null;
		this.bone = null;
		this.boneOffsetForm = null;
		this.boneOffsetFormInverse = null;

		this._init();

	}

	/**
	 * Resets rigid body transform to the current bone's.
	 *
	 * @return {RigidBody}
	 */
	reset() {

		this._setTransformFromBone();
		return this;

	}

	/**
	 * Updates rigid body's transform from the current bone.
	 *
	 * @return {RidigBody}
	 */
	updateFromBone() {

		if ( this.params.boneIndex !== - 1 && this.params.type === 0 ) {

			this._setTransformFromBone();

		}

		return this;

	}

	/**
	 * Updates bone from the current ridid body's transform.
	 *
	 * @return {RidigBody}
	 */
	updateBone() {

		if ( this.params.type === 0 || this.params.boneIndex === - 1 ) {

			return this;

		}

		this._updateBoneRotation();

		if ( this.params.type === 1 ) {

			this._updateBonePosition();

		}

		this.bone.updateMatrixWorld( true );

		if ( this.params.type === 2 ) {

			this._setPositionFromBone();

		}

		return this;

	}

	// private methods

	_init() {

		function generateShape( p ) {

			switch ( p.shapeType ) {

				case 0:
					return new Ammo.btSphereShape( p.width );

				case 1:
					return new Ammo.btBoxShape( new Ammo.btVector3( p.width, p.height, p.depth ) );

				case 2:
					return new Ammo.btCapsuleShape( p.width, p.height );

				default:
					throw new Error( 'unknown shape type ' + p.shapeType );

			}

		}

		const manager = this.manager;
		const params = this.params;
		const bones = this.mesh.skeleton.bones;
		const bone = ( params.boneIndex === - 1 )
			? new Bone()
			: bones[ params.boneIndex ];

		const shape = generateShape( params );
		const weight = ( params.type === 0 ) ? 0 : params.weight;
		const localInertia = manager.allocVector3();
		localInertia.setValue( 0, 0, 0 );

		if ( weight !== 0 ) {

			shape.calculateLocalInertia( weight, localInertia );

		}

		const boneOffsetForm = manager.allocTransform();
		manager.setIdentity( boneOffsetForm );
		manager.setOriginFromArray3( boneOffsetForm, params.position );
		manager.setBasisFromArray3( boneOffsetForm, params.rotation );

		const vector = manager.allocThreeVector3();
		const boneForm = manager.allocTransform();
		manager.setIdentity( boneForm );
		manager.setOriginFromThreeVector3( boneForm, bone.getWorldPosition( vector ) );

		const form = manager.multiplyTransforms( boneForm, boneOffsetForm );
		const state = new Ammo.btDefaultMotionState( form );

		const info = new Ammo.btRigidBodyConstructionInfo( weight, state, shape, localInertia );
		info.set_m_friction( params.friction );
		info.set_m_restitution( params.restitution );

		const body = new Ammo.btRigidBody( info );

		if ( params.type === 0 ) {

			body.setCollisionFlags( body.getCollisionFlags() | 2 );

			/*
			 * It'd be better to comment out this line though in general I should call this method
			 * because I'm not sure why but physics will be more like MMD's
			 * if I comment out.
			 */
			body.setActivationState( 4 );

		}

		body.setDamping( params.positionDamping, params.rotationDamping );
		body.setSleepingThresholds( 0, 0 );

		this.world.addRigidBody( body, 1 << params.groupIndex, params.groupTarget );

		this.body = body;
		this.bone = bone;
		this.boneOffsetForm = boneOffsetForm;
		this.boneOffsetFormInverse = manager.inverseTransform( boneOffsetForm );

		manager.freeVector3( localInertia );
		manager.freeTransform( form );
		manager.freeTransform( boneForm );
		manager.freeThreeVector3( vector );

	}

	_getBoneTransform() {

		const manager = this.manager;
		const p = manager.allocThreeVector3();
		const q = manager.allocThreeQuaternion();
		const s = manager.allocThreeVector3();

		this.bone.matrixWorld.decompose( p, q, s );

		const tr = manager.allocTransform();
		manager.setOriginFromThreeVector3( tr, p );
		manager.setBasisFromThreeQuaternion( tr, q );

		const form = manager.multiplyTransforms( tr, this.boneOffsetForm );

		manager.freeTransform( tr );
		manager.freeThreeVector3( s );
		manager.freeThreeQuaternion( q );
		manager.freeThreeVector3( p );

		return form;

	}

	_getWorldTransformForBone() {

		const manager = this.manager;
		const tr = this.body.getCenterOfMassTransform();
		return manager.multiplyTransforms( tr, this.boneOffsetFormInverse );

	}

	_setTransformFromBone() {

		const manager = this.manager;
		const form = this._getBoneTransform();

		// TODO: check the most appropriate way to set
		//this.body.setWorldTransform( form );
		this.body.setCenterOfMassTransform( form );
		this.body.getMotionState().setWorldTransform( form );

		manager.freeTransform( form );

	}

	_setPositionFromBone() {

		const manager = this.manager;
		const form = this._getBoneTransform();

		const tr = manager.allocTransform();
		this.body.getMotionState().getWorldTransform( tr );
		manager.copyOrigin( tr, form );

		// TODO: check the most appropriate way to set
		//this.body.setWorldTransform( tr );
		this.body.setCenterOfMassTransform( tr );
		this.body.getMotionState().setWorldTransform( tr );

		manager.freeTransform( tr );
		manager.freeTransform( form );

	}

	_updateBoneRotation() {

		const manager = this.manager;

		const tr = this._getWorldTransformForBone();
		const q = manager.getBasis( tr );

		const thQ = manager.allocThreeQuaternion();
		const thQ2 = manager.allocThreeQuaternion();
		const thQ3 = manager.allocThreeQuaternion();

		thQ.set( q.x(), q.y(), q.z(), q.w() );
		thQ2.setFromRotationMatrix( this.bone.matrixWorld );
		thQ2.conjugate();
		thQ2.multiply( thQ );

		//this.bone.quaternion.multiply( thQ2 );

		thQ3.setFromRotationMatrix( this.bone.matrix );

		// Renormalizing quaternion here because repeatedly transforming
		// quaternion continuously accumulates floating point error and
		// can end up being overflow. See #15335
		this.bone.quaternion.copy( thQ2.multiply( thQ3 ).normalize() );

		manager.freeThreeQuaternion( thQ );
		manager.freeThreeQuaternion( thQ2 );
		manager.freeThreeQuaternion( thQ3 );

		manager.freeQuaternion( q );
		manager.freeTransform( tr );

	}

	_updateBonePosition() {

		const manager = this.manager;

		const tr = this._getWorldTransformForBone();

		const thV = manager.allocThreeVector3();

		const o = manager.getOrigin( tr );
		thV.set( o.x(), o.y(), o.z() );

		if ( this.bone.parent ) {

			this.bone.parent.worldToLocal( thV );

		}

		this.bone.position.copy( thV );

		manager.freeThreeVector3( thV );

		manager.freeTransform( tr );

	}

}

//

class Constraint {

	/**
	 * @param {THREE.SkinnedMesh} mesh
	 * @param {Ammo.btDiscreteDynamicsWorld} world
	 * @param {RigidBody} bodyA
	 * @param {RigidBody} bodyB
	 * @param {Object} params
	 * @param {ResourceManager} manager
	 */
	constructor( mesh, world, bodyA, bodyB, params, manager ) {

		this.mesh = mesh;
		this.world = world;
		this.bodyA = bodyA;
		this.bodyB = bodyB;
		this.params = params;
		this.manager = manager;

		this.constraint = null;

		this._init();

	}

	// private method

	_init() {

		const manager = this.manager;
		const params = this.params;
		const bodyA = this.bodyA;
		const bodyB = this.bodyB;

		const form = manager.allocTransform();
		manager.setIdentity( form );
		manager.setOriginFromArray3( form, params.position );
		manager.setBasisFromArray3( form, params.rotation );

		const formA = manager.allocTransform();
		const formB = manager.allocTransform();

		bodyA.body.getMotionState().getWorldTransform( formA );
		bodyB.body.getMotionState().getWorldTransform( formB );

		const formInverseA = manager.inverseTransform( formA );
		const formInverseB = manager.inverseTransform( formB );

		const formA2 = manager.multiplyTransforms( formInverseA, form );
		const formB2 = manager.multiplyTransforms( formInverseB, form );

		const constraint = new Ammo.btGeneric6DofSpringConstraint( bodyA.body, bodyB.body, formA2, formB2, true );

		const lll = manager.allocVector3();
		const lul = manager.allocVector3();
		const all = manager.allocVector3();
		const aul = manager.allocVector3();

		lll.setValue( params.translationLimitation1[ 0 ],
		              params.translationLimitation1[ 1 ],
		              params.translationLimitation1[ 2 ] );
		lul.setValue( params.translationLimitation2[ 0 ],
		              params.translationLimitation2[ 1 ],
		              params.translationLimitation2[ 2 ] );
		all.setValue( params.rotationLimitation1[ 0 ],
		              params.rotationLimitation1[ 1 ],
		              params.rotationLimitation1[ 2 ] );
		aul.setValue( params.rotationLimitation2[ 0 ],
		              params.rotationLimitation2[ 1 ],
		              params.rotationLimitation2[ 2 ] );

		constraint.setLinearLowerLimit( lll );
		constraint.setLinearUpperLimit( lul );
		constraint.setAngularLowerLimit( all );
		constraint.setAngularUpperLimit( aul );

		for ( let i = 0; i < 3; i ++ ) {

			if ( params.springPosition[ i ] !== 0 ) {

				constraint.enableSpring( i, true );
				constraint.setStiffness( i, params.springPosition[ i ] );

			}

		}

		for ( let i = 0; i < 3; i ++ ) {

			if ( params.springRotation[ i ] !== 0 ) {

				constraint.enableSpring( i + 3, true );
				constraint.setStiffness( i + 3, params.springRotation[ i ] );

			}

		}

		/*
		 * Currently(10/31/2016) official ammo.js doesn't support
		 * btGeneric6DofSpringConstraint.setParam method.
		 * You need custom ammo.js (add the method into idl) if you wanna use.
		 * By setting this parameter, physics will be more like MMD's
		 */
		if ( constraint.setParam !== undefined ) {

			for ( let i = 0; i < 6; i ++ ) {

				constraint.setParam( 2, 0.475, i );

			}

		}

		this.world.addConstraint( constraint, true );
		this.constraint = constraint;

		manager.freeTransform( form );
		manager.freeTransform( formA );
		manager.freeTransform( formB );
		manager.freeTransform( formInverseA );
		manager.freeTransform( formInverseB );
		manager.freeTransform( formA2 );
		manager.freeTransform( formB2 );
		manager.freeVector3( lll );
		manager.freeVector3( lul );
		manager.freeVector3( all );
		manager.freeVector3( aul );

	}

}

//

const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();
const _matrixWorldInv = new Matrix4();

class MMDPhysicsHelper extends Object3D {

	/**
	 * Visualize Rigid bodies
	 *
	 * @param {THREE.SkinnedMesh} mesh
	 * @param {Physics} physics
	 */
	constructor( mesh, physics ) {

		super();

		this.root = mesh;
		this.physics = physics;

		this.matrix.copy( mesh.matrixWorld );
		this.matrixAutoUpdate = false;

		this.materials = [];

		this.materials.push(
			new MeshBasicMaterial( {
				color: new Color( 0xff8888 ),
				wireframe: true,
				depthTest: false,
				depthWrite: false,
				opacity: 0.25,
				transparent: true
			} )
		);

		this.materials.push(
			new MeshBasicMaterial( {
				color: new Color( 0x88ff88 ),
				wireframe: true,
				depthTest: false,
				depthWrite: false,
				opacity: 0.25,
				transparent: true
			} )
		);

		this.materials.push(
			new MeshBasicMaterial( {
				color: new Color( 0x8888ff ),
				wireframe: true,
				depthTest: false,
				depthWrite: false,
				opacity: 0.25,
				transparent: true
			} )
		);

		this._init();

	}


	/**
	 * Frees the GPU-related resources allocated by this instance. Call this method whenever this instance is no longer used in your app.
	 */
	dispose() {

		const materials = this.materials;
		const children = this.children;

		for ( let i = 0; i < materials.length; i ++ ) {

			materials[ i ].dispose();

		}

		for ( let i = 0; i < children.length; i ++ ) {

			const child = children[ i ];

			if ( child.isMesh ) child.geometry.dispose();

		}

	}

	/**
	 * Updates Rigid Bodies visualization.
	 */
	updateMatrixWorld( force ) {

		var mesh = this.root;

		if ( this.visible ) {

			var bodies = this.physics.bodies;

			_matrixWorldInv
				.copy( mesh.matrixWorld )
				.decompose( _position, _quaternion, _scale )
				.compose( _position, _quaternion, _scale.set( 1, 1, 1 ) )
				.invert();

			for ( var i = 0, il = bodies.length; i < il; i ++ ) {

				var body = bodies[ i ].body;
				var child = this.children[ i ];

				var tr = body.getCenterOfMassTransform();
				var origin = tr.getOrigin();
				var rotation = tr.getRotation();

				child.position
					.set( origin.x(), origin.y(), origin.z() )
					.applyMatrix4( _matrixWorldInv );

				child.quaternion
					.setFromRotationMatrix( _matrixWorldInv )
					.multiply(
						_quaternion.set( rotation.x(), rotation.y(), rotation.z(), rotation.w() )
					);

			}

		}

		this.matrix
			.copy( mesh.matrixWorld )
			.decompose( _position, _quaternion, _scale )
			.compose( _position, _quaternion, _scale.set( 1, 1, 1 ) );

		super.updateMatrixWorld( force );

	}

	// private method

	_init() {

		var bodies = this.physics.bodies;

		function createGeometry( param ) {

			switch ( param.shapeType ) {

				case 0:
					return new SphereGeometry( param.width, 16, 8 );

				case 1:
					return new BoxGeometry( param.width * 2, param.height * 2, param.depth * 2, 8, 8, 8 );

				case 2:
					return new CapsuleGeometry( param.width, param.height, 8, 16 );

				default:
					return null;

			}

		}

		for ( var i = 0, il = bodies.length; i < il; i ++ ) {

			var param = bodies[ i ].params;
			this.add( new Mesh( createGeometry( param ), this.materials[ param.type ] ) );

		}

	}

}

/////////////////////////////////////////
// End MMDPhysics
////////////////////////////////////////////////////////////////

/**
 * MMDAnimationHelper handles animation of MMD assets loaded by MMDLoader
 * with MMD special features as IK, Grant, and Physics.
 *
 * Dependencies
 *  - ammo.js https://github.com/kripken/ammo.js
 *  - MMDPhysics
 *  - CCDIKSolver
 *
 * TODO
 *  - more precise grant skinning support.
 */
class MMDAnimationHelper {

	/**
	 * @param {Object} params - (optional)
	 * @param {boolean} params.sync - Whether animation durations of added objects are synched. Default is true.
	 * @param {Number} params.afterglow - Default is 0.0.
	 * @param {boolean} params.resetPhysicsOnLoop - Default is true.
	 */
	constructor( params = {} ) {

		this.meshes = [];

		this.camera = null;
		this.cameraTarget = new Object3D();
		this.cameraTarget.name = 'target';

		this.audio = null;
		this.audioManager = null;

		this.objects = new WeakMap();

		this.configuration = {
			sync: params.sync !== undefined ? params.sync : true,
			afterglow: params.afterglow !== undefined ? params.afterglow : 0.0,
			resetPhysicsOnLoop: params.resetPhysicsOnLoop !== undefined ? params.resetPhysicsOnLoop : true,
			pmxAnimation: params.pmxAnimation !== undefined ? params.pmxAnimation : false
		};

		this.enabled = {
			animation: true,
			ik: true,
			grant: true,
			physics: true,
			cameraAnimation: true
		};

		this.onBeforePhysics = function ( /* mesh */ ) {};

		// experimental
		this.sharedPhysics = false;
		this.masterPhysics = null;

	}

	/**
	 * Adds an Three.js Object to helper and setups animation.
	 * The anmation durations of added objects are synched
	 * if this.configuration.sync is true.
	 *
	 * @param {THREE.SkinnedMesh|THREE.Camera|THREE.Audio} object
	 * @param {Object} params - (optional)
	 * @param {THREE.AnimationClip|Array<THREE.AnimationClip>} params.animation - Only for THREE.SkinnedMesh and THREE.Camera. Default is undefined.
	 * @param {boolean} params.physics - Only for THREE.SkinnedMesh. Default is true.
	 * @param {Integer} params.warmup - Only for THREE.SkinnedMesh and physics is true. Default is 60.
	 * @param {Number} params.unitStep - Only for THREE.SkinnedMesh and physics is true. Default is 1 / 65.
	 * @param {Integer} params.maxStepNum - Only for THREE.SkinnedMesh and physics is true. Default is 3.
	 * @param {Vector3} params.gravity - Only for THREE.SkinnedMesh and physics is true. Default ( 0, - 9.8 * 10, 0 ).
	 * @param {Number} params.delayTime - Only for THREE.Audio. Default is 0.0.
	 * @return {MMDAnimationHelper}
	 */
	add( object, params = {} ) {

		if ( object.isSkinnedMesh ) {

			this._addMesh( object, params );

		} else if ( object.isCamera ) {

			this._setupCamera( object, params );

		} else if ( object.type === 'Audio' ) {

			this._setupAudio( object, params );

		} else {

			throw new Error( 'THREE.MMDAnimationHelper.add: '
				+ 'accepts only '
				+ 'THREE.SkinnedMesh or '
				+ 'THREE.Camera or '
				+ 'THREE.Audio instance.' );

		}

		if ( this.configuration.sync ) this._syncDuration();

		return this;

	}

	/**
	 * Removes an Three.js Object from helper.
	 *
	 * @param {THREE.SkinnedMesh|THREE.Camera|THREE.Audio} object
	 * @return {MMDAnimationHelper}
	 */
	remove( object ) {

		if ( object.isSkinnedMesh ) {

			this._removeMesh( object );

		} else if ( object.isCamera ) {

			this._clearCamera( object );

		} else if ( object.type === 'Audio' ) {

			this._clearAudio( object );

		} else {

			throw new Error( 'THREE.MMDAnimationHelper.remove: '
				+ 'accepts only '
				+ 'THREE.SkinnedMesh or '
				+ 'THREE.Camera or '
				+ 'THREE.Audio instance.' );

		}

		if ( this.configuration.sync ) this._syncDuration();

		return this;

	}

	/**
	 * Updates the animation.
	 *
	 * @param {Number} delta
	 * @return {MMDAnimationHelper}
	 */
	update( delta ) {

		if ( this.audioManager !== null ) this.audioManager.control( delta );

		for ( let i = 0; i < this.meshes.length; i ++ ) {

			this._animateMesh( this.meshes[ i ], delta );

		}

		if ( this.sharedPhysics ) this._updateSharedPhysics( delta );

		if ( this.camera !== null ) this._animateCamera( this.camera, delta );

		return this;

	}

	/**
	 * Changes the pose of SkinnedMesh as VPD specifies.
	 *
	 * @param {THREE.SkinnedMesh} mesh
	 * @param {Object} vpd - VPD content parsed MMDParser
	 * @param {Object} params - (optional)
	 * @param {boolean} params.resetPose - Default is true.
	 * @param {boolean} params.ik - Default is true.
	 * @param {boolean} params.grant - Default is true.
	 * @return {MMDAnimationHelper}
	 */
	pose( mesh, vpd, params = {} ) {

		if ( params.resetPose !== false ) mesh.pose();

		const bones = mesh.skeleton.bones;
		const boneParams = vpd.bones;

		const boneNameDictionary = {};

		for ( let i = 0, il = bones.length; i < il; i ++ ) {

			boneNameDictionary[ bones[ i ].name ] = i;

		}

		const vector = new Vector3();
		const quaternion = new Quaternion();

		for ( let i = 0, il = boneParams.length; i < il; i ++ ) {

			const boneParam = boneParams[ i ];
			const boneIndex = boneNameDictionary[ boneParam.name ];

			if ( boneIndex === undefined ) continue;

			const bone = bones[ boneIndex ];
			bone.position.add( vector.fromArray( boneParam.translation ) );
			bone.quaternion.multiply( quaternion.fromArray( boneParam.quaternion ) );

		}

		mesh.updateMatrixWorld( true );

		// PMX animation system special path
		if ( this.configuration.pmxAnimation &&
			mesh.geometry.userData.MMD && mesh.geometry.userData.MMD.format === 'pmx' ) {

			const sortedBonesData = this._sortBoneDataArray( mesh.geometry.userData.MMD.bones.slice() );
			const ikSolver = params.ik !== false ? this._createCCDIKSolver( mesh ) : null;
			const grantSolver = params.grant !== false ? this.createGrantSolver( mesh ) : null;
			this._animatePMXMesh( mesh, sortedBonesData, ikSolver, grantSolver );

		} else {

			if ( params.ik !== false ) {

				this._createCCDIKSolver( mesh ).update();

			}

			if ( params.grant !== false ) {

				this.createGrantSolver( mesh ).update();

			}

		}

		return this;

	}

	/**
	 * Enabes/Disables an animation feature.
	 *
	 * @param {string} key
	 * @param {boolean} enabled
	 * @return {MMDAnimationHelper}
	 */
	enable( key, enabled ) {

		if ( this.enabled[ key ] === undefined ) {

			throw new Error( 'THREE.MMDAnimationHelper.enable: '
				+ 'unknown key ' + key );

		}

		this.enabled[ key ] = enabled;

		if ( key === 'physics' ) {

			for ( let i = 0, il = this.meshes.length; i < il; i ++ ) {

				this._optimizeIK( this.meshes[ i ], enabled );

			}

		}

		return this;

	}

	/**
	 * Creates an GrantSolver instance.
	 *
	 * @param {THREE.SkinnedMesh} mesh
	 * @return {GrantSolver}
	 */
	createGrantSolver( mesh ) {

		return new GrantSolver( mesh, mesh.geometry.userData.MMD.grants );

	}

	// private methods

	_addMesh( mesh, params ) {

		if ( this.meshes.indexOf( mesh ) >= 0 ) {

			throw new Error( 'THREE.MMDAnimationHelper._addMesh: '
				+ 'SkinnedMesh \'' + mesh.name + '\' has already been added.' );

		}

		this.meshes.push( mesh );
		this.objects.set( mesh, { looped: false } );

		this._setupMeshAnimation( mesh, params.animation );

		if ( params.physics !== false ) {

			this._setupMeshPhysics( mesh, params );

		}

		return this;

	}

	_setupCamera( camera, params ) {

		if ( this.camera === camera ) {

			throw new Error( 'THREE.MMDAnimationHelper._setupCamera: '
				+ 'Camera \'' + camera.name + '\' has already been set.' );

		}

		if ( this.camera ) this.clearCamera( this.camera );

		this.camera = camera;

		camera.add( this.cameraTarget );

		this.objects.set( camera, {} );

		if ( params.animation !== undefined ) {

			this._setupCameraAnimation( camera, params.animation );

		}

		return this;

	}

	_setupAudio( audio, params ) {

		if ( this.audio === audio ) {

			throw new Error( 'THREE.MMDAnimationHelper._setupAudio: '
				+ 'Audio \'' + audio.name + '\' has already been set.' );

		}

		if ( this.audio ) this.clearAudio( this.audio );

		this.audio = audio;
		this.audioManager = new AudioManager( audio, params );

		this.objects.set( this.audioManager, {
			duration: this.audioManager.duration
		} );

		return this;

	}

	_removeMesh( mesh ) {

		let found = false;
		let writeIndex = 0;

		for ( let i = 0, il = this.meshes.length; i < il; i ++ ) {

			if ( this.meshes[ i ] === mesh ) {

				this.objects.delete( mesh );
				found = true;

				continue;

			}

			this.meshes[ writeIndex ++ ] = this.meshes[ i ];

		}

		if ( ! found ) {

			throw new Error( 'THREE.MMDAnimationHelper._removeMesh: '
				+ 'SkinnedMesh \'' + mesh.name + '\' has not been added yet.' );

		}

		this.meshes.length = writeIndex;

		return this;

	}

	_clearCamera( camera ) {

		if ( camera !== this.camera ) {

			throw new Error( 'THREE.MMDAnimationHelper._clearCamera: '
				+ 'Camera \'' + camera.name + '\' has not been set yet.' );

		}

		this.camera.remove( this.cameraTarget );

		this.objects.delete( this.camera );
		this.camera = null;

		return this;

	}

	_clearAudio( audio ) {

		if ( audio !== this.audio ) {

			throw new Error( 'THREE.MMDAnimationHelper._clearAudio: '
				+ 'Audio \'' + audio.name + '\' has not been set yet.' );

		}

		this.objects.delete( this.audioManager );

		this.audio = null;
		this.audioManager = null;

		return this;

	}

	_setupMeshAnimation( mesh, animation ) {

		const objects = this.objects.get( mesh );

		if ( animation !== undefined ) {

			const animations = Array.isArray( animation )
				? animation : [ animation ];

			objects.mixer = new AnimationMixer( mesh );

			for ( let i = 0, il = animations.length; i < il; i ++ ) {

				objects.mixer.clipAction( animations[ i ] ).play();

			}

			// TODO: find a workaround not to access ._clip looking like a private property
			objects.mixer.addEventListener( 'loop', function ( event ) {

				const tracks = event.action._clip.tracks;

				if ( tracks.length > 0 && tracks[ 0 ].name.slice( 0, 6 ) !== '.bones' ) return;

				objects.looped = true;

			} );

		}

		objects.ikSolver = this._createCCDIKSolver( mesh );
		objects.grantSolver = this.createGrantSolver( mesh );

		return this;

	}

	_setupCameraAnimation( camera, animation ) {

		const animations = Array.isArray( animation )
			? animation : [ animation ];

		const objects = this.objects.get( camera );

		objects.mixer = new AnimationMixer( camera );

		for ( let i = 0, il = animations.length; i < il; i ++ ) {

			objects.mixer.clipAction( animations[ i ] ).play();

		}

	}

	_setupMeshPhysics( mesh, params ) {

		const objects = this.objects.get( mesh );

		// shared physics is experimental

		if ( params.world === undefined && this.sharedPhysics ) {

			const masterPhysics = this._getMasterPhysics();

			if ( masterPhysics !== null ) world = masterPhysics.world; // eslint-disable-line no-undef

		}

		objects.physics = this._createMMDPhysics( mesh, params );

		if ( objects.mixer && params.animationWarmup !== false ) {

			this._animateMesh( mesh, 0 );
			objects.physics.reset();

		}

		objects.physics.warmup( params.warmup !== undefined ? params.warmup : 60 );

		this._optimizeIK( mesh, true );

	}

	_animateMesh( mesh, delta ) {

		const objects = this.objects.get( mesh );

		const mixer = objects.mixer;
		const ikSolver = objects.ikSolver;
		const grantSolver = objects.grantSolver;
		const physics = objects.physics;
		const looped = objects.looped;

		if ( mixer && this.enabled.animation ) {

			// alternate solution to save/restore bones but less performant?
			//mesh.pose();
			//this._updatePropertyMixersBuffer( mesh );

			this._restoreBones( mesh );

			mixer.update( delta );

			this._saveBones( mesh );

			// PMX animation system special path
			if ( this.configuration.pmxAnimation &&
				mesh.geometry.userData.MMD && mesh.geometry.userData.MMD.format === 'pmx' ) {

				if ( ! objects.sortedBonesData ) objects.sortedBonesData = this._sortBoneDataArray( mesh.geometry.userData.MMD.bones.slice() );

				this._animatePMXMesh(
					mesh,
					objects.sortedBonesData,
					ikSolver && this.enabled.ik ? ikSolver : null,
					grantSolver && this.enabled.grant ? grantSolver : null
				);

			} else {

				if ( ikSolver && this.enabled.ik ) {

					mesh.updateMatrixWorld( true );
					ikSolver.update();

				}

				if ( grantSolver && this.enabled.grant ) {

					grantSolver.update();

				}

			}

		}

		if ( looped === true && this.enabled.physics ) {

			if ( physics && this.configuration.resetPhysicsOnLoop ) physics.reset();

			objects.looped = false;

		}

		if ( physics && this.enabled.physics && ! this.sharedPhysics ) {

			this.onBeforePhysics( mesh );
			physics.update( delta );

		}

	}

	// Sort bones in order by 1. transformationClass and 2. bone index.
	// In PMX animation system, bone transformations should be processed
	// in this order.
	_sortBoneDataArray( boneDataArray ) {

		return boneDataArray.sort( function ( a, b ) {

			if ( a.transformationClass !== b.transformationClass ) {

				return a.transformationClass - b.transformationClass;

			} else {

				return a.index - b.index;

			}

		} );

	}

	// PMX Animation system is a bit too complex and doesn't great match to
	// Three.js Animation system. This method attempts to simulate it as much as
	// possible but doesn't perfectly simulate.
	// This method is more costly than the regular one so
	// you are recommended to set constructor parameter "pmxAnimation: true"
	// only if your PMX model animation doesn't work well.
	// If you need better method you would be required to write your own.
	_animatePMXMesh( mesh, sortedBonesData, ikSolver, grantSolver ) {

		_quaternionIndex = 0;
		_grantResultMap.clear();

		for ( let i = 0, il = sortedBonesData.length; i < il; i ++ ) {

			updateOne( mesh, sortedBonesData[ i ].index, ikSolver, grantSolver );

		}

		mesh.updateMatrixWorld( true );
		return this;

	}

	_animateCamera( camera, delta ) {

		const mixer = this.objects.get( camera ).mixer;

		if ( mixer && this.enabled.cameraAnimation ) {

			mixer.update( delta );

			camera.updateProjectionMatrix();

			camera.up.set( 0, 1, 0 );
			camera.up.applyQuaternion( camera.quaternion );
			camera.lookAt( this.cameraTarget.position );

		}

	}

	_optimizeIK( mesh, physicsEnabled ) {

		const iks = mesh.geometry.userData.MMD.iks;
		const bones = mesh.geometry.userData.MMD.bones;

		for ( let i = 0, il = iks.length; i < il; i ++ ) {

			const ik = iks[ i ];
			const links = ik.links;

			for ( let j = 0, jl = links.length; j < jl; j ++ ) {

				const link = links[ j ];

				if ( physicsEnabled === true ) {

					// disable IK of the bone the corresponding rigidBody type of which is 1 or 2
					// because its rotation will be overriden by physics
					link.enabled = bones[ link.index ].rigidBodyType > 0 ? false : true;

				} else {

					link.enabled = true;

				}

			}

		}

	}

	_createCCDIKSolver( mesh ) {

		if ( CCDIKSolver === undefined ) {

			throw new Error( 'THREE.MMDAnimationHelper: Import CCDIKSolver.' );

		}

		return new CCDIKSolver( mesh, mesh.geometry.userData.MMD.iks );

	}

	_createMMDPhysics( mesh, params ) {

		if ( MMDPhysics === undefined ) {

			throw new Error( 'THREE.MMDPhysics: Import MMDPhysics.' );

		}

		return new MMDPhysics(
			mesh,
			mesh.geometry.userData.MMD.rigidBodies,
			mesh.geometry.userData.MMD.constraints,
			params );

	}

	/*
	 * Detects the longest duration and then sets it to them to sync.
	 * TODO: Not to access private properties ( ._actions and ._clip )
	 */
	_syncDuration() {

		let max = 0.0;

		const objects = this.objects;
		const meshes = this.meshes;
		const camera = this.camera;
		const audioManager = this.audioManager;

		// get the longest duration

		for ( let i = 0, il = meshes.length; i < il; i ++ ) {

			const mixer = this.objects.get( meshes[ i ] ).mixer;

			if ( mixer === undefined ) continue;

			for ( let j = 0; j < mixer._actions.length; j ++ ) {

				const clip = mixer._actions[ j ]._clip;

				if ( ! objects.has( clip ) ) {

					objects.set( clip, {
						duration: clip.duration
					} );

				}

				max = Math.max( max, objects.get( clip ).duration );

			}

		}

		if ( camera !== null ) {

			const mixer = this.objects.get( camera ).mixer;

			if ( mixer !== undefined ) {

				for ( let i = 0, il = mixer._actions.length; i < il; i ++ ) {

					const clip = mixer._actions[ i ]._clip;

					if ( ! objects.has( clip ) ) {

						objects.set( clip, {
							duration: clip.duration
						} );

					}

					max = Math.max( max, objects.get( clip ).duration );

				}

			}

		}

		if ( audioManager !== null ) {

			max = Math.max( max, objects.get( audioManager ).duration );

		}

		max += this.configuration.afterglow;

		// update the duration

		for ( let i = 0, il = this.meshes.length; i < il; i ++ ) {

			const mixer = this.objects.get( this.meshes[ i ] ).mixer;

			if ( mixer === undefined ) continue;

			for ( let j = 0, jl = mixer._actions.length; j < jl; j ++ ) {

				mixer._actions[ j ]._clip.duration = max;

			}

		}

		if ( camera !== null ) {

			const mixer = this.objects.get( camera ).mixer;

			if ( mixer !== undefined ) {

				for ( let i = 0, il = mixer._actions.length; i < il; i ++ ) {

					mixer._actions[ i ]._clip.duration = max;

				}

			}

		}

		if ( audioManager !== null ) {

			audioManager.duration = max;

		}

	}

	// workaround

	_updatePropertyMixersBuffer( mesh ) {

		const mixer = this.objects.get( mesh ).mixer;

		const propertyMixers = mixer._bindings;
		const accuIndex = mixer._accuIndex;

		for ( let i = 0, il = propertyMixers.length; i < il; i ++ ) {

			const propertyMixer = propertyMixers[ i ];
			const buffer = propertyMixer.buffer;
			const stride = propertyMixer.valueSize;
			const offset = ( accuIndex + 1 ) * stride;

			propertyMixer.binding.getValue( buffer, offset );

		}

	}

	/*
	 * Avoiding these two issues by restore/save bones before/after mixer animation.
	 *
	 * 1. PropertyMixer used by AnimationMixer holds cache value in .buffer.
	 *    Calculating IK, Grant, and Physics after mixer animation can break
	 *    the cache coherency.
	 *
	 * 2. Applying Grant two or more times without reset the posing breaks model.
	 */
	_saveBones( mesh ) {

		const objects = this.objects.get( mesh );

		const bones = mesh.skeleton.bones;

		let backupBones = objects.backupBones;

		if ( backupBones === undefined ) {

			backupBones = new Float32Array( bones.length * 7 );
			objects.backupBones = backupBones;

		}

		for ( let i = 0, il = bones.length; i < il; i ++ ) {

			const bone = bones[ i ];
			bone.position.toArray( backupBones, i * 7 );
			bone.quaternion.toArray( backupBones, i * 7 + 3 );

		}

	}

	_restoreBones( mesh ) {

		const objects = this.objects.get( mesh );

		const backupBones = objects.backupBones;

		if ( backupBones === undefined ) return;

		const bones = mesh.skeleton.bones;

		for ( let i = 0, il = bones.length; i < il; i ++ ) {

			const bone = bones[ i ];
			bone.position.fromArray( backupBones, i * 7 );
			bone.quaternion.fromArray( backupBones, i * 7 + 3 );

		}

	}

	// experimental

	_getMasterPhysics() {

		if ( this.masterPhysics !== null ) return this.masterPhysics;

		for ( let i = 0, il = this.meshes.length; i < il; i ++ ) {

			const physics = this.meshes[ i ].physics;

			if ( physics !== undefined && physics !== null ) {

				this.masterPhysics = physics;
				return this.masterPhysics;

			}

		}

		return null;

	}

	_updateSharedPhysics( delta ) {

		if ( this.meshes.length === 0 || ! this.enabled.physics || ! this.sharedPhysics ) return;

		const physics = this._getMasterPhysics();

		if ( physics === null ) return;

		for ( let i = 0, il = this.meshes.length; i < il; i ++ ) {

			const p = this.meshes[ i ].physics;

			if ( p !== null && p !== undefined ) {

				p.updateRigidBodies();

			}

		}

		physics.stepSimulation( delta );

		for ( let i = 0, il = this.meshes.length; i < il; i ++ ) {

			const p = this.meshes[ i ].physics;

			if ( p !== null && p !== undefined ) {

				p.updateBones();

			}

		}

	}

}

// Keep working quaternions for less GC
const _quaternions = [];
let _quaternionIndex = 0;

function getQuaternion() {

	if ( _quaternionIndex >= _quaternions.length ) {

		_quaternions.push( new Quaternion() );

	}

	return _quaternions[ _quaternionIndex ++ ];

}

// Save rotation whose grant and IK are already applied
// used by grant children
const _grantResultMap = new Map();

function updateOne( mesh, boneIndex, ikSolver, grantSolver ) {

	const bones = mesh.skeleton.bones;
	const bonesData = mesh.geometry.userData.MMD.bones;
	const boneData = bonesData[ boneIndex ];
	const bone = bones[ boneIndex ];

	// Return if already updated by being referred as a grant parent.
	if ( _grantResultMap.has( boneIndex ) ) return;

	const quaternion = getQuaternion();

	// Initialize grant result here to prevent infinite loop.
	// If it's referred before updating with actual result later
	// result without applyting IK or grant is gotten
	// but better than composing of infinite loop.
	_grantResultMap.set( boneIndex, quaternion.copy( bone.quaternion ) );

	// @TODO: Support global grant and grant position
	if ( grantSolver && boneData.grant &&
		! boneData.grant.isLocal && boneData.grant.affectRotation ) {

		const parentIndex = boneData.grant.parentIndex;
		const ratio = boneData.grant.ratio;

		if ( ! _grantResultMap.has( parentIndex ) ) {

			updateOne( mesh, parentIndex, ikSolver, grantSolver );

		}

		grantSolver.addGrantRotation( bone, _grantResultMap.get( parentIndex ), ratio );

	}

	if ( ikSolver && boneData.ik ) {

		// @TODO: Updating world matrices every time solving an IK bone is
		// costly. Optimize if possible.
		mesh.updateMatrixWorld( true );
		ikSolver.updateOne( boneData.ik );

		// No confident, but it seems the grant results with ik links should be updated?
		const links = boneData.ik.links;

		for ( let i = 0, il = links.length; i < il; i ++ ) {

			const link = links[ i ];

			if ( link.enabled === false ) continue;

			const linkIndex = link.index;

			if ( _grantResultMap.has( linkIndex ) ) {

				_grantResultMap.set( linkIndex, _grantResultMap.get( linkIndex ).copy( bones[ linkIndex ].quaternion ) );

			}

		}

	}

	// Update with the actual result here
	quaternion.copy( bone.quaternion );

}

//

class AudioManager {

	/**
	 * @param {THREE.Audio} audio
	 * @param {Object} params - (optional)
	 * @param {Nuumber} params.delayTime
	 */
	constructor( audio, params = {} ) {

		this.audio = audio;

		this.elapsedTime = 0.0;
		this.currentTime = 0.0;
		this.delayTime = params.delayTime !== undefined
			? params.delayTime : 0.0;

		this.audioDuration = this.audio.buffer.duration;
		this.duration = this.audioDuration + this.delayTime;

	}

	/**
	 * @param {Number} delta
	 * @return {AudioManager}
	 */
	control( delta ) {

		this.elapsed += delta;
		this.currentTime += delta;

		if ( this._shouldStopAudio() ) this.audio.stop();
		if ( this._shouldStartAudio() ) this.audio.play();

		return this;

	}

	// private methods

	_shouldStartAudio() {

		if ( this.audio.isPlaying ) return false;

		while ( this.currentTime >= this.duration ) {

			this.currentTime -= this.duration;

		}

		if ( this.currentTime < this.delayTime ) return false;

		// 'duration' can be bigger than 'audioDuration + delayTime' because of sync configuration
		if ( ( this.currentTime - this.delayTime ) > this.audioDuration ) return false;

		return true;

	}

	_shouldStopAudio() {

		return this.audio.isPlaying &&
			this.currentTime >= this.duration;

	}

}

// const _q = new Quaternion();

/**
 * Solver for Grant (Fuyo in Japanese. I just google translated because
 * Fuyo may be MMD specific term and may not be common word in 3D CG terms.)
 * Grant propagates a bone's transform to other bones transforms even if
 * they are not children.
 * @param {THREE.SkinnedMesh} mesh
 * @param {Array<Object>} grants
 */
class GrantSolver {

	constructor( mesh, grants = [] ) {

		this.mesh = mesh;
		this.grants = grants;

	}

	/**
	 * Solve all the grant bones
	 * @return {GrantSolver}
	 */
	update() {

		const grants = this.grants;

		for ( let i = 0, il = grants.length; i < il; i ++ ) {

			this.updateOne( grants[ i ] );

		}

		return this;

	}

	/**
	 * Solve a grant bone
	 * @param {Object} grant - grant parameter
	 * @return {GrantSolver}
	 */
	updateOne( grant ) {

		const bones = this.mesh.skeleton.bones;
		const bone = bones[ grant.index ];
		const parentBone = bones[ grant.parentIndex ];

		if ( grant.isLocal ) {

			// TODO: implement
			if ( grant.affectPosition ) {

			}

			// TODO: implement
			if ( grant.affectRotation ) {

			}

		} else {

			// TODO: implement
			if ( grant.affectPosition ) {

			}

			if ( grant.affectRotation ) {

				this.addGrantRotation( bone, parentBone.quaternion, grant.ratio );

			}

		}

		return this;

	}

	addGrantRotation( bone, q, ratio ) {

		_q.set( 0, 0, 0, 1 );
		_q.slerp( q, ratio );
		bone.quaternion.multiply( _q );

		return this;

	}

}

window.THREE.MMDAnimationHelper = MMDAnimationHelper;
