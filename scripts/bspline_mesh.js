import * as THREE from 'three';
import * as prim from "./primitives.js"; 
import * as utils from "./utils.js";

// -----------------------------------------------------------------------------
// B-spline mesh creation and manipulation
// -----------------------------------------------------------------------------

export { g_bspline_mesh };


// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------

let g_bspline_mesh = 
{
    bspline: null,
    resolution: -1,     
    
    curveMesh: null,     
    colorCurve: 0xffffff, // yellow: 0xf2e85c

    ctrlPointGroup: null,  // control points represented as circles
    ctrlPolygonMesh:null,  // conects control points with GL_LINES        
    knotPointsGroup: null, // knot points on curve

    pointMeshBuilder: new prim.PointMeshBuilder(),
    
    //........
  
    init(aBspline) {
        this.bspline = aBspline;
        this.resolution = aBspline.resolution;
    },


    ctrlPoint(i) {
        return this.ctrlPointGroup.children[i].position.clone();
    },
    

    removeMeshes(scene, draggableList) 
    { 
        // curying of disposeAll( dmat, dgeo, child ):
        // you call the function below like so: disposeAll(dmat)(dgeo)(child)
        let disposeAll = (dmat) => (dgeo) => (child ) => {
            if ( child != null && child.isMesh ) {
                if(dmat && child.material)                
                    child.material.dispose();
                if(dgeo && child.geometry)
                    child.geometry.dispose();
            }
        }    

        // remove will traverse the object and dispose of all children
        let scope = this;
        function remove(attribute, disposeMaterial = false, disposeGeometry = false){
            if(scope[attribute] != null){                
                // partial application:
                let dispose = disposeAll(disposeMaterial)(disposeGeometry);
                scope[attribute].traverse( dispose );
                utils.removeArrayElement(draggableList, scope[attribute]);
                scene.remove(scope[attribute]);
                scope[attribute] = null;
            }            
        }

        remove("ctrlPolygonMesh", true, true);
        remove("ctrlPointGroup");   
        remove("knotPointsGroup");

        // probably rundondant and not needed:
        this.pointMeshBuilder.dispose();        
    },


    // Add control points and curve to scene
    addMeshes(scene, draggableList) 
    { 
        this.removeMeshes(scene, draggableList);
        

        this.ctrlPointGroup = new THREE.Group();
        this.ctrlPointGroup.name = "Control point group";
        const nbPoints = this.bspline.nbPoints();
        for (let i = 0; i < nbPoints; ++i)
        {    
            const p = this.bspline.ctrlPointInitList[i];

            const point = this.pointMeshBuilder.createPointMesh(utils.hueMaterial(i, nbPoints));            
            point.name = "Control point " + i;
            this.ctrlPointGroup.add(point);
          
            let s = 0.25;// control point radius
            point.scale.set(s, s, s);
            point.position.set(p.x, p.y, p.z);
            point.position.z = 1.1 + i * 0.01;
            //point.rotation.x = -Math.PI * 0.5;           
            //point.position.z = 5;            
            draggableList.push(point);
        }
        scene.add(this.ctrlPointGroup);
        
        {
            this.ctrlPolygonMesh = prim.createLineMesh(0xffffff, this.bspline.nbPoints(), 3);
            this.ctrlPolygonMesh.name = "Control polygon";
            this.ctrlPolygonMesh.position.z = -0.003;
            scene.add(this.ctrlPolygonMesh);
        }
        
        this.addCurve(scene);
        this.addKnotPoints(scene, draggableList);

        // Generate knot vector
        this.bspline.initKnotVector();       
    },
  
    addCurve(scene)
    {        
        if(this.curveMesh !== null){
            this.curveMesh.dispose();
            //utils.removeArrayElement(draggableList, this.curveMesh.mesh());
            scene.remove(this.curveMesh.mesh());
        }

        this.curveMesh = new prim.MyCurve(this.eval.bind(this), this.resolution, 0.07, this.colorCurve);
        this.curveMesh.addCurve(scene);
        this.curveMesh.mesh().name = "Spline Curve";
    },

    addKnotPoints(scene, draggableList){
        this.knotPointsGroup = new THREE.Group();
        this.knotPointsGroup.name = "Knots on curve";        

        // look up knots on curve
        const knots = this.bspline.knots;
        for( let i = this.bspline.t_min_index(); i <= this.bspline.t_max_index(); ++i)
        {
            const value = knots[i];
            const knotPoint = this.pointMeshBuilder.createPointMesh(utils.createMaterial(0xffffff), 0.45);         
            knotPoint.name = "Knot point " + i;
            let pos = this.eval_unormalized(value);
            knotPoint.position.set(pos.x, pos.y, pos.z);
            knotPoint.position.z += 1.3;
            let s = 0.15;// knot mesh radius
            knotPoint.scale.set(s, s, s);
            if(true){
                let text = utils.createLabel( "u" + i.toFixed(0) );
                draggableList.push(text);      
                scene.add(text);
                knotPoint.add(text);
            }            
            
            this.knotPointsGroup.add(knotPoint);
        }       
        scene.add(this.knotPointsGroup);
    },

  
    // sample bspline position at t in [0.0, 1.0]

    // Warning: the basis function is ill defined at t = 1.0 for open uniform knots.
    // - We could discard the last point and replace it with the last control point.
    // - We could modify the last knot value to be knot[n] + epsilon (won't affect cure shape).
    // - We could exclude t = 1.0 from the sampling range.
    eval(t) 
    {
        //console.log("eval: "+t);
        t = this.bspline.t_min() * (1 - t) + this.bspline.t_max() * t;
        return this.eval_unormalized(t);
    },

    eval_unormalized(t) 
    {
        let x = 0;
        let y = 0;
        let z = 0;

        for (let i = 0; i < (this.bspline.nbPoints()); ++i) {
            let w = this.bspline.basis(this.bspline.order, i, t);
            let p = this.ctrlPoint(i).multiplyScalar(w);

            x += p.x;
            y += p.y;
            z += p.z;
        }

        return new THREE.Vector3(x, y, z);
    },
            
  
    updateSplineCurve(lookatPosition){
        this.curveMesh.update();

        // Update control polygon
        const ctrlPoints = this.ctrlPointGroup.children.map( (p) => p.position.clone() );        
        prim.updateLineMesh(this.ctrlPolygonMesh, ctrlPoints);        

        this.updateKnotPoints(lookatPosition);

        // make control points look at camera:
        if(lookatPosition !== undefined){
            this.ctrlPointGroup.children.forEach(e => { e.lookAt(lookatPosition); });
        }
    },

    updateKnotPoints(lookatPosition)
    {        
        if(this.knotPointsGroup === null)
            return;

        // look up knots on curve
        const knots = this.bspline.knots;
        let nbKnots = this.knotPointsGroup.children.length;
        for( let i = 0; i < nbKnots; ++i)
        {
            const value = knots[this.bspline.t_min_index() + i];
            const knotPoint = this.knotPointsGroup.children[i];                         
            
            let pos = this.eval_unormalized(value);
            knotPoint.position.x = pos.x;
            knotPoint.position.y = pos.y;               
            knotPoint.position.z = pos.z + 0.1;

            if(lookatPosition !== undefined)
                knotPoint.lookAt(lookatPosition);
        }       
        
    },
    
};