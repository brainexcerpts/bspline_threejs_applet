import * as THREE from 'three';
import {Text} from 'https://cdn.jsdelivr.net/npm/troika-three-text@0.49.0/+esm' // troikaThreeText 

export const backgroundColor = 0x0E1A25; // TODO move this in dat gui settings

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------

export function removeArrayElement(array, p){
    const index = array.indexOf(p);
    if (index > -1) {
        array.splice(index, 1);
    }
}

// -----------------------------------------------------------------------------

export function clamp(num, min, max){ return Math.min(Math.max(num, min), max); }

// -----------------------------------------------------------------------------

export function hueColor(i, size){    
    let hue = 360 * i / size;            
    return new THREE.Color("hsl(" + hue + ", 84%, 60%)");
}

// -----------------------------------------------------------------------------

export function hueMaterial(i, size){    
    let color = hueColor(i, size);
    return new THREE.MeshBasicMaterial({ color: color });
}

// -----------------------------------------------------------------------------

export function createMaterial(color, opacity = 1.0, transparent = false){
    return new THREE.MeshBasicMaterial({ color: color, opacity: opacity, transparent: transparent });
}

// -----------------------------------------------------------------------------

export function partial(fn, firstArg) {  
    let subFunc = (...lastArgs) => { 
        return fn(firstArg, ...lastArgs); 
    };    
    return subFunc;
}

// -----------------------------------------------------------------------------

export function createLabel( text = "Hello world!", color = 0xffffff, fontSize = 5, outlineWidth = 0.2)
{
    const myText = new Text();   
    myText.name = text;
    // Set properties to configure:
    myText.text = text;
    myText.fontSize = fontSize;    
    myText.color = color;
    myText.outlineColor = 0x000000;
    myText.outlineWidth = outlineWidth;
    // bold:
    myText.fontWeight = 'bold';

    // Update the rendering:
    myText.sync();
    return myText;
}
