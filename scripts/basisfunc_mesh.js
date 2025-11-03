import * as THREE from 'three';
import * as prim from "./primitives.js"; 
import * as utils from "./utils.js";


const useThickLines = true; 
// -----------------------------------------------------------------------------
// Basis function display
// -----------------------------------------------------------------------------

/*
The object that displays the basis function curves.

 - "Main Group" this.main_group (root of all the meshes)
    - 
        - Basic Functions group this.basisFuncGroup
            - Mesh lines
        - Knot group this.knotGroup
            - Mesh circles
    - Background (2 planes) this.backgroundGroup

*/
export let g_basis_mesh = {
    bspline: null,
    resolution: -1,     
    
    pointMeshBuilder: new prim.PointMeshBuilder(),

    main_group: null, // root of all the meshes
        basisFuncGroup: null,     
        // All knot circles are grouped together
        knotGroup: null,        
            minBarlineMesh: null, 
            maxBarlineMesh: null,
        backgroundGroup: null,

    

    scale : 8.0, // scale of the basis function curve for display
    y_offset: 6.0, // y offset of the basis function curve for display
    width: -1.0, // initial width of the basis function curve for display
    org: 0.0, // initial origin of the basis function curve for display

    init(aBspline) {
        this.bspline = aBspline;
        this.resolution = aBspline.resolution;
    },

    removeAllMesh(scene, draggableList) 
    {
        let disposeAll = (dmat) => (dgeo) => (child ) => {
            if ( child != null && child.isMesh ) {
                // check child has dispose() method:
                if( child.dispose)
                    child.dispose();
                else
                {
                    if(dmat && child.material)                
                        child.material.dispose();
                    if(dgeo && child.geometry)
                        child.geometry.dispose();
                }
            }
        }

        let scope = this;
        function remove(attribute, disposeMaterial = true, disposeGeometry = true){
            if(scope[attribute] != null){                
                let dispose = disposeAll(disposeMaterial)(disposeGeometry);
                scope[attribute].traverse( dispose );
                utils.removeArrayElement(draggableList, scope[attribute]);
                scene.remove(scope[attribute]);
                scope[attribute] = null;
            }            
        }

        remove("basisFuncGroup");
        remove("knotGroup");       
        remove("minBarlineMesh");
        remove("maxBarlineMesh");        
        remove("backgroundGroup");
        remove("main_group");

        // probably rundondant and not needed:
        this.pointMeshBuilder.dispose();
    },    


    createBasisFuncbackgroundGroup(name, margin_factor, aColor) 
    {
        const rect_height = 1;
        const rec_width = this.width;
        
        let geometry = prim.buildRectangleRoundedGeometry( rec_width*margin_factor, rect_height*margin_factor, 0.03, 20 );
        let material = new THREE.MeshBasicMaterial( { color: aColor, side: THREE.DoubleSide } ); 
        let plane = new THREE.Mesh( geometry, material );
        // plane center is at the origin (0,0,0)
        // we want the center to be at the bottom left corner
        plane.position.x = rec_width * 0.5;
        plane.position.y = rect_height * 0.5;
        plane.name = name;
        return plane;
    },


    addBasisCurve(scene, draggableList){   
        this.removeAllMesh(scene, draggableList);        

        this.main_group = new THREE.Group();
        this.main_group.name = "Root Basis function group";

        // --------------------------------------
        // Basis functions group

        // TODO: separate each group creation into their own function?
        this.basisFuncGroup = new THREE.Group();
        this.basisFuncGroup.name = "Basis function curves group";

        // Add a curve per basis function
        for(let i = 0; i < this.bspline.nbPoints(); ++i){            
            let color = utils.hueColor( i, this.bspline.nbPoints() );

            let basisMesh = null;
            if(!useThickLines){
                basisMesh = prim.createLineMesh(color, this.resolution, 3);
                basisMesh.name = "Basis function " + i;                
                this.basisFuncGroup.add(basisMesh);
            }
            else
            {
                let lambda_eval = (t) => this.eval(i, t);
                basisMesh = new prim.MyCurve(lambda_eval, this.resolution, 0.005, color);
                basisMesh.addCurve(this.basisFuncGroup);
                basisMesh.curveMesh.position.z = i *0.1;
                basisMesh.curveMesh.name = "Basis function " + i;
            }

            
            
            //this.basisFuncGroup.add(basisMesh.curveMesh);            
        }
        this.main_group.add(this.basisFuncGroup);

        // --------------------------------------
        // Knots group

        this.knotGroup = new THREE.Group();
        this.knotGroup.name = "Knot group";

        // Add a circle mesh per knot        
        for(let i = 0; i < this.bspline.knots.length; ++i){

            let cl = new THREE.Color(0xffffff);

            if( i < this.bspline.t_min_index() || i > this.bspline.t_max_index() )
                cl = new THREE.Color(0xb7e0f7); // bright blue

            let pointMaterial = new THREE.MeshBasicMaterial({ color: cl, side: THREE.DoubleSide });            
            
            const knotMesh = this.pointMeshBuilder.createPointMesh(pointMaterial);                        

            knotMesh.name = "Knot root mesh" + i;         
            let s = 0.02;// control point radius   
            knotMesh.scale.set(s, s, s);

            let group = new THREE.Group();
            group.name = "Knot group " + i;
            // Add attribute:
            group._knot_index = i;

            group.add(knotMesh);

            if(  true )
            {
                let text = utils.createLabel( "u" + i.toFixed(0), 0xffffff, 0.1, 0.002  );
                //s = 100;
                //text.scale.set(s, s, s);
                //text.position.z = 5;
                group.add( text );
            }

            
            this.knotGroup.add(group); 
            draggableList.push(group);            
            
        }   

        let offset = -0.15;
        this.knotGroup.position.y = offset;
        this.main_group.add(this.knotGroup);


        {
            // Add vertical lines at the min and max knot values 
            // to represent the knot range
            let z = -1.1;
            this.minBarlineMesh = prim.createDashLine(new THREE.Vector3(0, 0, z), 
                                                      new THREE.Vector3(0, -offset, z), 
                                                      /*radius*/0.005);
            this.minBarlineMesh.name = "Min barline";
            //this.minBarlineMesh.position.y -= offset;
                                                
            this.maxBarlineMesh = prim.createDashLine(new THREE.Vector3(0, 0, z), 
                                                      new THREE.Vector3(0, -offset, z), 
                                                    /*radius*/0.005);
            this.maxBarlineMesh.name = "Max barline";
            //this.maxBarlineMesh.position.y -= offset;
            
            this.knotGroup.children[this.bspline.t_min_index()].add(this.minBarlineMesh);
            this.knotGroup.children[this.bspline.t_max_index()].add(this.maxBarlineMesh);            
        }

        this.updateAllKnotMeshPosition(); 
        
        // --------------------------------------
        // Basis functions background:
        {
            // TODO make this a function 
            // that first detects if the background group already exists
            // and deletes it if it does. (we need to remove it from the main_group too)
            // then creates the background group and adds it to the main_group.
            // this.main_group.remove( this.backgroundGroup );
            // We can then use this function in updateAllKnotMeshPosition() to update the background size.
            let blackPlane = this.createBasisFuncbackgroundGroup("black plane", 1.1, 0x000000);
            let whitePlane = this.createBasisFuncbackgroundGroup("white plane", 1.1, 0x999999);
    
            whitePlane.scale.x *= 1.002;
            whitePlane.scale.y *= 1.01;
            whitePlane.position.z = -2;
            let group = new THREE.Group();
            group.name = "Background group";
            group.add(blackPlane);
            group.add(whitePlane);
    
            //g_scene.add( group );
            this.main_group.add( group );
            this.backgroundGroup = group;            
        }

        scene.add( this.main_group );
        this.setRootGroupTransformation(); 
    },

    updateAllKnotMeshPosition()
    { 
        this.width = this.bspline.knots_range();
        this.org = this.bspline.knots[0];

        // Possibly we could regroup those two under a the same group:
        this.basisFuncGroup.position.x = -this.org;
        this.knotGroup.position.x = -this.org;
        
        
        for(let i = 0; i < this.knotGroup.children.length; ++i){
            const knotMesh = this.knotGroup.children[i];
            knotMesh.position.x = this.getKnotPosition(i);            
            // first circle is at the deepest z position
            // this makes selection of the circle when dragging easier
            knotMesh.position.z = 1.1 + i * 0.01;      
        } 
       
    },

    constrainKnotMeshOnYAxis(){
        for(let i = 0; i < this.knotGroup.children.length; ++i){
            let knotMesh = this.knotGroup.children[i];            
            knotMesh.position.y = 0; 
        }

    },

    constrainKnotMeshOnXAxis(i, value){
        let v = -1.0; 
        if( i > 0 && i < this.bspline.knots.length-1)
            v = utils.clamp(value, this.bspline.knots[i-1], this.bspline.knots[i+1]);
        else if( i == 0 )
            v = Math.min(value, this.bspline.knots[i+1]);
        else if( i == this.bspline.knots.length-1 )
            v = Math.max(value, this.bspline.knots[i-1]);

        return v;
    }, 

    
    getKnotPosition(i){
        console.assert( i >= 0 && i < this.bspline.knots.length );
        console.assert( this.width > 0.0 );
        return this.bspline.knots[i];
    },

    
    // inverse of getKnotPosition()
    getKnotValueFromPosition(pos_x){        
        console.assert( this.width > 0.0 );
        return pos_x;
    }, 

    // - place the whole group around the top edge of the canvas.
    // - scale it up.
    // - center it.
    setRootGroupTransformation()
    { 
        this.main_group.position.x = -this.width * this.scale * 0.5;
        this.main_group.position.y = this.y_offset;
        this.main_group.scale.set(this.scale, this.scale, 1.0);          
    },

    updateBasisFunc(){

        // clone "this.basisFuncGroup.children[]" array:
        let children = [...this.basisFuncGroup.children];
        for(let i = 0; i < this.bspline.nbPoints(); ++i){
            if(!useThickLines){
                const funcPoints = []; 
                this.sampleBasisFunction(funcPoints, this.resolution, i); //      
                prim.updateLineMesh(this.basisFuncGroup.children[i], funcPoints);            
            }
            else{
                children[i]._curveBuilder.update();
            }
        }

        this.setRootGroupTransformation();     
    },

    sampleBasisFunction(curvePoints, segments, i) 
    {                     
        for (let t = 0; t < segments; t += 1) 
        {            
            let u = t / (segments-1);            
            let p = this.eval( i , u );
            curvePoints.push( p );
        }
    },

    // evaluate ith basis function at t in [0.0, 1.0]
    eval(i, t){
        let range = this.bspline.knots_range();
        let u = this.bspline.knots[0] + range * t;                        
        let p = this.bspline.basis(this.bspline.order, i , u );
        return new THREE.Vector3( u, p, 0.1);
    },

    dragEvent(draggedObject) {
        if (!draggedObject.hasOwnProperty("_knot_index"))
            return false;

        let i = draggedObject._knot_index;
        if (i === -1)
            return false;

        //update knot value:
        let value = this.getKnotValueFromPosition(draggedObject.position.x);

        const v = this.constrainKnotMeshOnXAxis(i, value);
        this.bspline.knots[i] = v;

        this.updateAllKnotMeshPosition();

        this.updateBasisFunc();
        this.constrainKnotMeshOnYAxis();

        return true;
    },
}; 
