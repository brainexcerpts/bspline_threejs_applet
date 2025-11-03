import * as THREE from 'three';
import { InfiniteGridHelper } from "./InfiniteGridHelper.js";
import * as utils from "./utils.js";


// -----------------------------------------------------------------------------
// Three JS utils
// -----------------------------------------------------------------------------

// @return a THREE Mesh.
export function createLineMesh(color, nb_points, dim){
    let curveGeometry = new THREE.BufferGeometry();  
    const positions = new Float32Array( nb_points * dim ); // 3 vertices per point
    curveGeometry.setAttribute( 'position', new THREE.BufferAttribute( positions, dim ) );
    // Due to limitations of the OpenGL Core Profile with the WebGL renderer
    // on most platforms linewidth will always be 1 regardless of the set value. 
    const curveMaterial = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });

    let curveMesh = new THREE.Line(curveGeometry, curveMaterial);
    curveMesh.position.set(0, 0, 0);
    curveMesh.geometry.attributes.position.needsUpdate = true;
    return curveMesh;
}

// -----------------------------------------------------------------------------

export function updateLineMesh(curve, newPoints){
    for (let v = 0; v < newPoints.length; v++) {
        let p = newPoints[v];
        curve.geometry.attributes.position.setXYZ(v, p.x, p.y, p.z);
    }
    curve.geometry.attributes.position.needsUpdate = true;//
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------

// w: width, h: height, r: radiusCorner, s: smoothness
// @return a THREE BufferGeometry.
export function buildRectangleRoundedGeometry( w, h, r, s ) { 
    
    const pi2 = Math.PI * 2;
    const n = ( s + 1 ) * 4; // number of segments    
    let indices = [];
    let positions = [];
 	let uvs = [];   
    let qu, sgx, sgy, x, y;
    
	for ( let j = 1; j < n + 1; j ++ ) 
        indices.push( 0, j, j + 1 ); // 0 is center
    indices.push( 0, n, 1 );    
    positions.push( 0, 0, 0 ); // rectangle center
    uvs.push( 0.5, 0.5 );   
    for ( let j = 0; j < n ; j ++ ) 
        contour( j );
    
    const geometry = new THREE.BufferGeometry( );
    geometry.setIndex( new THREE.BufferAttribute( new Uint32Array( indices ), 1 ) );
	geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
	geometry.setAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( uvs ), 2 ) );
    
    return geometry;
    
    function contour( j ) {
        
        qu = Math.trunc( 4 * j / n ) + 1 ;      // quadrant  qu: 1..4         
        sgx = ( qu === 1 || qu === 4 ? 1 : -1 ) // signum left/right
        sgy =  qu < 3 ? 1 : -1;                 // signum  top / bottom
        x = sgx * ( w / 2 - r ) + r * Math.cos( pi2 * ( j - qu + 1 ) / ( n - 4 ) ); // corner center + circle
        y = sgy * ( h / 2 - r ) + r * Math.sin( pi2 * ( j - qu + 1 ) / ( n - 4 ) );   
 
        positions.push( x, y, 0 );       
        uvs.push( 0.5 + x / w, 0.5 + y / h );       
        
    }
    
}

// -----------------------------------------------------------------------------

// unfinished
// @return a THREE Mesh.
export function createDashLine(startPoint, endPoint, rad)
{    

    let distance = startPoint.distanceTo(endPoint);
    let rectGeometry = new THREE.CylinderGeometry( rad, rad, distance, 32 );    

    let material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
    let rectMesh = new THREE.Mesh( rectGeometry, material );
    rectMesh.name = "Fake thick line";
    
    // origin starts at the foot of the cylinder
    rectMesh.position.set(startPoint.x, distance*0.5, startPoint.z);
    //rectMesh.rotation.x = -Math.PI * 0.5;
    //rectMesh.scale.set(0.1, 0.1, 0.1);
    return rectMesh;   
}

// -----------------------------------------------------------------------------

export function createGridHelper() {
    let grid = null;
    if(true){
        // Better infinite grid!
        grid = new InfiniteGridHelper(1, 10);
        
    }
    else
    {
        // standard threejs grid
        let w = g_cam_params.frustumSize*2.0;
        grid = new THREE.GridHelper(
                w /*size*/,
                w /*divisions*/,
                0x000000, 0x999999);
        //grid.divisions = 2;
        grid.material.opacity = 1.0;
        grid.material.transparent = true;
    }

    grid.name = "Helper Grid";
    grid.position.set(0,0,-1);
    grid.rotation.x = -Math.PI * 0.5;   
    return grid;
}


// -----------------------------------------------------------------------------

export class PointMeshBuilder{
    constructor() {        
        this.pointGeometry = null;
        this.pointMaterial = null;
        this.pointOutlineMaterial = [];        
    }

    dispose(){
        if( this.pointGeometry !== null )
            this.pointGeometry.dispose();
        if( this.pointMaterial !== null )
            this.pointMaterial.dispose();

        this.pointOutlineMaterial.forEach( (mat) => mat.dispose() );

        this.pointGeometry = null;
        this.pointMaterial = null;
        this.pointOutlineMaterial = [];
    }

    // two circles with different colors, one on top of the other
    // to create an outline effect
    createPointMesh(material, outline = 0.35) 
    {
        if( this.pointGeometry === null ){
            this.pointGeometry = new THREE.CircleGeometry(1.0 /*radius*/, 32);
            this.pointMaterial = new THREE.MeshBasicMaterial({ color: utils.backgroundColor, side: THREE.DoubleSide });
        }

        this.pointOutlineMaterial.push( material );
        this.pointOutlineMaterial.side = THREE.DoubleSide;
        let p1 = new THREE.Mesh(this.pointGeometry, this.pointMaterial);
        let p2 = new THREE.Mesh(this.pointGeometry, material);

        p1.add(p2);
        p2.position.z = -0.005;
        let s = 1 + outline; // outline thickness
        p2.scale.set(s, s, s);        
        return p1;
    }

    
}

// -----------------------------------------------------------------------------

export class MyCurve {   

    constructor(evalCurve, resolution, radius, color)
    {
        this.evalCurve = evalCurve;
        this.resolution = resolution;
        this.radius = radius;
        this.use_tube_geometry = true;
        this.curveMesh = null;        
        this.colorCurve = color;         
    }

    
    static createTube(color, resolution, radius, evalCurve)
    {        
        const geometry = MyCurve.createTubeGeometry(color, resolution, radius, evalCurve);
        const material = new THREE.MeshBasicMaterial( { color: color } );
        const mesh = new THREE.Mesh( geometry, material );
        return mesh;
    }
    

    static createTubeGeometry(color, resolution, radius, evalCurve){
        class CustomPath extends THREE.Curve {
            constructor() { super(); }        
            getPoint( t, optionalTarget = new THREE.Vector3() ) {               
                optionalTarget.copy( evalCurve(t) );    
                return optionalTarget;
            }
        }    

        const path = new CustomPath();        
        const geometry = new THREE.TubeGeometry( path, resolution, radius, 5, false );
        return geometry;
    }

    addCurve(scene)
    {        
        this.dispose();
        if( this.use_tube_geometry )        
            this.curveMesh = MyCurve.createTube(this.colorCurve, this.resolution, this.radius, this.evalCurve);
        else
            this.curveMesh = createLineMesh(this.colorCurve, this.resolution, 3);        

        this.curveMesh.name = "Curve";
        this.curveMesh.position.z = -0.002;
        scene.add( this.curveMesh );
        this.curveMesh._curveBuilder = this;
        return this.curveMesh;
    }

    update(){
        if( !this.use_tube_geometry){
            const curvePoints = [];
            sampleCurve(curvePoints, this.resolution, this.evalCurve);   
            updateLineMesh(this.curveMesh, curvePoints);

            function sampleCurve(curvePoints, segments, evalCurve) {
                for (let t = 0; t < segments; t += 1) {                        
                    let u = t / (segments-1); //this ranges from [0.0, 1.0]
                    let p = evalCurve( u );
                    curvePoints.push( p );
                }
            }
        }else{
            // Alternative to:         
            this.curveMesh.geometry.dispose();
            this.curveMesh.geometry = MyCurve.createTubeGeometry(this.colorCurve, this.resolution, this.radius, this.evalCurve);
        }
    }

    
    mesh(){ return this.curveMesh; }

    dispose(){
        if(this.curveMesh !== null)
        {
            this.curveMesh.geometry.dispose();
            this.curveMesh.material.dispose();
        }
    }
    
}