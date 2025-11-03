"use strict";

import * as THREE from 'three'; // new import map way see html file.
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.157/examples/jsm/controls/OrbitControls.js";

//import { DragControls } from "https://cdn.jsdelivr.net/npm/three@0.157/examples/jsm/controls/DragControls.js";
// Version that has been patched to allow dragging of groups:
import { DragControls } from "./patch/DragControls.js";



// our own modules:
import * as prim from "./primitives.js";
import { g_bspline } from "./bspline.js";
import { g_bspline_mesh } from "./bspline_mesh.js";
import { g_basis_mesh } from "./basisfunc_mesh.js";
import * as utils from './utils.js';

/*
    TODO: (hard) frenet frame (tangent, normal, binormal) and osculating circle that follows the curve
    animatin + option to set manually the curve parameter t.

    TODO: (hard) show curvature comb
    http://www.bluesmith.co.uk/evaluateComb.htm

    TODO/FIX: make black background resize properly

    Lower priority:

    FIX: viewport resizing (see sample code hdpi)
    TODO: transparent film to show the domain of definition of the curve.
    TODO: toggle display of polygonal control mesh and knot points on curve.
    TODO param to change background color and curve color.


    TODO: (hard) knot value labels (use procedural 3D mesh css is shit)

    TODO: selectively display basis functions (user slider)

    TODO: (medium) switch to sphere instead of circle for control points when in perspective view

    TODO: rain drop effect when selecting handles?
    TODO: some sound?
    TODO: Animation of the curve when opening / loading?
*/

// ------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------

let g_camera = null;
let g_scene = null;
let g_draggableObjects = [];
let g_dragControls = null;
let g_renderer = null;
let g_controls = null;
let g_gridMesh = null;


let g_canvasName      = document.querySelector("script[type=module]").attributes['canvas_name'].value;
let g_canvaContainer  = document.getElementById(g_canvasName);

let g_canvasRootDiv   = document.getElementById("threeJsWrap_" + g_canvasName);

let g_datGuiInnerDiv  = document.getElementById("datGuiInner_" + g_canvasName);
let g_datGuiBottomDiv = document.getElementById("datGuiBottom_" + g_canvasName);

const g_parentDiv = g_canvaContainer.parentElement;

 //CodePen:
//function windowWidth() { return window.innerWidth;  }
//function windowHeight(){ return window.innerHeight/2; }

//function windowWidth() { return g_datGuiBottomDiv.clientWidth;  }
//function windowHeight(){ return 600; }

// Standalone:
function windowWidth() {
    //return 500;
    return g_canvasRootDiv.clientWidth;
}

function windowHeight(){
    return 450;
    return g_canvasRootDiv.clientHeight;
}


function lookAtPosition(){
    return !g_cam_params.orthographic() ? g_camera.position.clone() : undefined;
}

// ------------------------------------------------------------------------
// Dat GUI setup
// ------------------------------------------------------------------------

let g_datGuiContext =  {
    camera:  "Orthographic",
    nbPoints: 6,
    order: 3,
    knot_type: "open_uniform",
    display_grid: false,
};

setKnotVector(g_bspline, g_datGuiContext.knot_type);
g_bspline_mesh.init(g_bspline);
g_basis_mesh.init(g_bspline);

/*
function init_containers(){
    g_canvasName      = document.querySelector("script[type=module]").attributes['canvas_name'].value;
    g_canvaContainer  = document.getElementById(g_canvasName);

    g_canvasRootDiv   = document.getElementById("threeJsWrap_" + g_canvasName);

    g_datGuiInnerDiv  = document.getElementById("datGuiInner_" + g_canvasName);
    g_datGuiBottomDiv = document.getElementById("datGuiBottom_" + g_canvasName);
}
init_containers();
*/

// callback when the html page finish loading:
window.onload = function () {
    //init_containers();


    let gui = new dat.GUI({ autoPlace: false, width: () => windowWidth() });  //
    g_datGuiBottomDiv.appendChild(gui.domElement);


    let elt = null;

    gui.add(g_datGuiContext, 'camera', ["Orthographic", "Perspective"]).onChange(
        () => {
            cameraSetup(g_cam_params);
            initDragControl(g_draggableObjects);

            let cam = g_datGuiContext.camera;


            // fog if perspective camera
            if( cam == "Orthographic" ) {
                g_gridMesh.rotation.x = -Math.PI * 0.5;
            } else {
                g_gridMesh.rotation.x = 0.0;
            }

        }
    );

    elt = gui.add(g_datGuiContext, 'display_grid')
    elt.name("Display grid:");
    elt.onChange(
        () => {
            g_gridMesh.visible = g_datGuiContext.display_grid;
        }
    );


    elt = gui.add(g_datGuiContext, 'knot_type', ["open_uniform", "uniform", "custom"]);
    elt.name("Knot type:");
    elt.onChange(
        () => {
            g_dragControls.dispose();
            g_draggableObjects = [];

            setKnotVector(g_bspline, g_datGuiContext.knot_type);

            meshSetup(g_scene, g_draggableObjects);
            initDragControl(g_draggableObjects);
        }
    );

    let nbPointsSlider = gui.add(g_datGuiContext, 'nbPoints', 2, 11);
    nbPointsSlider.name("Nb points:");
    nbPointsSlider.step(1);

    nbPointsSlider.onChange(
        () => {
            setNbpPointsCallback( Math.ceil(g_datGuiContext.nbPoints) );
        }
    )
    // updates slider when g_datGuiContext.nbPoints is changed by other means
    nbPointsSlider.listen();

    let orderSlider = gui.add(g_datGuiContext, 'order', 1, 9);
    orderSlider.name("Order:");
    orderSlider.step(1);

    orderSlider.onChange(
        () => {
            setOrderCallback( Math.ceil(g_datGuiContext.order) );
        }
    );
    orderSlider.listen();


    //document.getElementById("myCanvas").style.zIndex = "-1";
    //g_canvaContainer.appendChild(gui.domElement);

};

function setKnotVector(bspline, knot_type){
    bspline.knot_type = knot_type;
    if(bspline.knot_type == "custom")
    {
        // make sure nb_points + order = knots.length
        setNbpPointsCallback(6);
        setOrderCallback(5);
        bspline.set_custom_knots([0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 2.0, 2.0, 2.0, 2.0, 2.1]);
    }else{
        bspline.initKnotVector();
    }
}


function setNbpPointsCallback(nb){
    g_dragControls.dispose();
    g_draggableObjects = [];
    if( g_bspline.order > nb ){
        g_datGuiContext.order = nb;
        setOrderCallback( nb );
    }

    g_bspline.setNbpPoints( nb );
    meshSetup(g_scene, g_draggableObjects);
    initDragControl(g_draggableObjects);
}

function setOrderCallback(order){
    g_dragControls.dispose();
    g_draggableObjects = [];

    if( order > g_bspline.nbPoints() ){
        g_datGuiContext.nbPoints = order;
        setNbpPointsCallback( order );
    }

    g_bspline.order = order;
    meshSetup(g_scene, g_draggableObjects);

    initDragControl(g_draggableObjects);
}


// ------------------------------------------------------------------------
// Camera parameters
// ------------------------------------------------------------------------

let g_cam_params = {
    orthographic(){ return g_datGuiContext.camera == "Orthographic" },
    aspect_ratio() { return windowWidth() / windowHeight(); },
    left() { return this.frustumSize * this.aspect_ratio() * (-0.5); },
    right() { return this.frustumSize * this.aspect_ratio() * 0.5; },
    top() { return this.frustumSize * 0.5; },
    bottom() { return this.frustumSize * (-0.5); }, //
    near: 1,
    far: 1000,
    frustumSize: 30,

    // Update ThreeJS camera with current window parameters
    update(camera){
        camera.left = this.left();
        camera.right = this.right();
        camera.top = this.top();
        camera.bottom = this.bottom();
        camera.aspect = this.aspect_ratio();
        camera.updateProjectionMatrix();
    },

    createThreeJsCamera(){
        if (!this.orthographic()) {  //
            return new THREE.PerspectiveCamera(60, this.aspect_ratio(), this.near, this.far);
        } else {
            return new THREE.OrthographicCamera( this.left(), this.right(), this.top(), this.bottom(), this.near, this.far);
        }
    },
};




// -----------------------------------------------------------------------------
// Scene setup utils
// -----------------------------------------------------------------------------

function meshSetup(scene, draggableObjects)
{
    // Add Bézier curve and control points:
    g_bspline_mesh.addMeshes(scene, draggableObjects);
    g_basis_mesh.addBasisCurve(scene, draggableObjects);
    g_bspline_mesh.updateSplineCurve(lookAtPosition());
    g_basis_mesh.updateBasisFunc();

}

// -----------------------------------------------------------------------------



function cameraSetup(cam_params)
{
    g_camera = g_cam_params.createThreeJsCamera();

    if( g_cam_params.orthographic() )
        g_camera.position.set(0, 0, /*frustum size: */  cam_params.frustumSize * 0.5);
    else
        g_camera.position.set(-30, 20, 30);

    g_camera.lookAt(0, 0, 0);
    g_camera.updateProjectionMatrix();

    if(g_controls != null){
        g_controls.dispose();
    }

    g_controls = new OrbitControls(g_camera, g_renderer.domElement);
    g_controls.enableRotate = !g_cam_params.orthographic();
    g_controls.zoomToCursor = g_cam_params.orthographic(); // FIXME: does not work, lib bug?
    g_controls.screenSpacePanning = true;
    g_controls.target.set(0, 0, 0);

    g_controls.update();
}

// -----------------------------------------------------------------------------

function initDragControl(draggableObjectList)
{
    if( g_dragControls != null){
        g_dragControls.dispose();
    }

    let dragControls = new DragControls(draggableObjectList, g_camera, g_renderer.domElement);
    dragControls.transformDescendants = false;

    dragControls.addEventListener('dragstart', function () {
        g_controls.enabled = false;
    });

    dragControls.addEventListener('drag', function (event) {
        // get dragged object:
        let draggedObject = event.object;

        g_basis_mesh.dragEvent(draggedObject);
        g_bspline_mesh.updateSplineCurve( lookAtPosition() );

    });

    dragControls.addEventListener('dragend', function () {
        g_controls.enabled = true;
    });

    g_dragControls = dragControls;
}

// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Setup scene
// -----------------------------------------------------------------------------


function init() {


    //init_containers();
    //let container = document.createElement('div');
    //document.body.appendChild(container);

    g_scene = new THREE.Scene();
    g_scene.background = new THREE.Color(utils.backgroundColor); //0xa0a0a0

    if (true) {
        let light1 = new THREE.HemisphereLight(0xffffff, 0x444444);
        light1.position.set(0, 200, 0);
        g_scene.add(light1);

        let light2 = new THREE.DirectionalLight(0xbbbbbb);
        light2.position.set(0, 200, 100);
        light2.castShadow = true;
        light2.shadow.camera.top = 180;
        light2.shadow.camera.bottom =  - 100;
        light2.shadow.camera.left =  - 120;
        light2.shadow.camera.right = 120;
        g_scene.add(light2);
    }
    var canvas = document.querySelector('#' + g_canvasName);

    console.log("canvas: ", canvas);
    console.assert(canvas != null, "canvas is null");

    g_renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: g_canvaContainer
    });
    g_renderer.setPixelRatio(window.devicePixelRatio);
    g_renderer.setSize(windowWidth(), windowHeight());
    g_renderer.shadowMap.enabled = true;



    //document.body.style.margin = 0;
    //document.body.style.padding = 0;
    //document.body.style.overflow = 'hidden';
    //document.body.style.position = 'fixed';
    window.addEventListener('resize', onWindowResize, false);


    g_gridMesh = prim.createGridHelper()
    g_gridMesh.visible = g_datGuiContext.display_grid;
    g_scene.add( g_gridMesh );

    cameraSetup(g_cam_params);
    meshSetup(g_scene, g_draggableObjects);


    initDragControl(g_draggableObjects);
}

// -----------------------------------------------------------------------------

function resizeRendererToDisplaySize( renderer ) {

    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = canvas.clientWidth * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if ( needResize ) {

        renderer.setSize( width, height, false );

    }

    return needResize;

}

function setCanvasDimensions(
    canvas,
    width,
    height,
    set2dTransform = false
  ) {
    const ratio = window.devicePixelRatio;
    canvas.width = width * ratio;
    canvas.height = 100 * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (set2dTransform) {
      canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  }


function onWindowResize() {

    //setCanvasDimensions(g_renderer.domElement, windowWidth(), windowHeight());


    //resizeRendererToDisplaySize( g_renderer );

    g_cam_params.update(g_camera);
    g_renderer.setSize(windowWidth(), windowHeight());


    // resize g_canvaContainer according to the size of g_canvasRootDiv:
    //let rect = g_canvasRootDiv.getBoundingClientRect();
    //g_canvaContainer.style.width = rect.width + "px";


}

// -----------------------------------------------------------------------------

function animate()
{


    // if ( resizeRendererToDisplaySize( g_renderer ) )
    {
        // onWindowResize();

        // const canvas = renderer.domElement;
        // camera.aspect = canvas.clientWidth / canvas.clientHeight;
        // camera.updateProjectionMatrix();
    }



    /*
    Doesn't work because the pivot point is not the center of the group it seems:
    if( g_basis_mesh != null)
        g_basis_mesh.main_group.lookAt(g_camera.position);
    */

    // only needed for the perspective camera:
    // to make ctrl point look at camera:
    if( !g_cam_params.orthographic() )
        g_bspline_mesh.updateSplineCurve( lookAtPosition() );



    requestAnimationFrame(animate);
    g_renderer.render(g_scene, g_camera);

}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------


init();
animate();


// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------


