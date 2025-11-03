import * as THREE from 'three';


// -----------------------------------------------------------------------------
// B-spline core algorithm
// -----------------------------------------------------------------------------


/*
    List of attributes:
    - resolution: how much segments to render the curve
    - order: number of influencing points (degree = order -1)
    - ctrlPointInitList: list of control points
    - knots: knot vector
    - knot_type: "uniform" "open_uniform" "custom"


    List of methods:
    - basis(k/*order*, i/* ctrl point index *, t/*float parameter*)
    - t_min()
    - t_max()
    - t_min_index()
    - t_max_index()
    - knots_range()
    - nbPoints()
    - setNbpPoints(nb)
    - set_custom_knots(knots)
    - set_node_to_uniform()
    - set_node_to_open_uniform()
    - initKnotVector()



*/
let g_bspline = 
{
    resolution: 500, // how much segments to render the curve
    order: 3,        // number of influencing points (degree = order -1)
    ctrlPointInitList: [
        new THREE.Vector3(-3, -3, 0),
        new THREE.Vector3(-2,  3, 0),
        new THREE.Vector3( 2,  3, 0),
        new THREE.Vector3( 3, -3, 0),
        new THREE.Vector3( 7,  3, 0),
        new THREE.Vector3( 9, -3, 0), 
    ],
    knots:[0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 2.0, 2.0, 2.0, 2.0, 2.1], /* size = order + nb control points */
    knot_type: "open_uniform", // "uniform" "open_uniform" "custom"

    // Inefficient Cox-de Boor recursion to compute the basis function of 
    // our B-spline curve.
    basis(k/*order*/, i/* ctrl point index */, t/*float parameter*/)
    {           
        console.assert( k >= 1 );
        console.assert( i >= 0 );       

        if(k == 1){
            /* 
               We could use if( this.knots[i] <= t && t <= this.knots[i+1] ) (none strict inequality) 
               with open uniform knot vector 
            */    
                        
            let inRange = ( this.knots[i] <= t && t < this.knots[i+1]  );                
            if( inRange)
                return 1.0;
             else 
                return 0.0;
        }  
      
        let res = 0.0;
        { 
            let a = (t - this.knots[i]);
            let denom1 = (this.knots[i+k-1] - this.knots[i]);
            if(denom1 != 0)
              res += this.basis(k-1, i, t) * a/denom1;

            let b = (this.knots[i+k] - t);
            let denom2 = (this.knots[i+k] - this.knots[i+1]); 
            if(denom2 != 0)
              res += this.basis(k-1, i+1, t) * b/denom2;
        }
        return res;
    },
    
    t_min(){ return this.knots[this.order-1] },
    t_max(){ return this.knots[this.nbPoints()] },

    t_min_index(){ return this.order-1; },
    t_max_index(){ return this.nbPoints(); },

    knots_range(){ return Math.abs(this.knots.at(-1) - this.knots[0]); },

    nbPoints(){ return this.ctrlPointInitList.length; },
    setNbpPoints(nb){  
        if( nb == this.nbPoints() )
            return;

        // generate new missing control points
        if(nb > this.nbPoints()) 
        {            
            for(let i = this.ctrlPointInitList.length; i < nb; ++i){
                this.ctrlPointInitList.push( 
                    new THREE.Vector3(i*2, i%2==0? 3.0 : -3, 0.0) 
                ); 
            }
        }
        
        this.ctrlPointInitList.length = nb;

        if( this.order > nb )
            this.order = nb;

        this.initKnotVector();
    },

    set_custom_knots(knots){
        console.assert( knots.length == this.order + this.nbPoints() );
        this.knots = knots;
    },

    // generate a uniform knot vector
    // ex: order = 3, nbPoints = 6
    // knots = [ -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1, 1.25, 1.5 ]
    set_node_to_uniform()
    {
        const n = this.nbPoints() - 1;
        this.knots.length = this.order + n + 1;

        let step = 1.0 / (n - this.order+2);
        for (let i = 0; i < this.knots.length; ++i){
            this.knots[i] = i * step  - step * (this.order - 1);
        }        
    },

    // generate a open uniform knot vector
    // ex: order = 3, nbPoints = 6
    // knots = [ 0, 0, 0, 1, 2, 3, 4, 4, 4.01 ]
    set_node_to_open_uniform()
    {
        this.knots.length = this.order + this.nbPoints();

        let acc = 1;
        for (let i = 0; i < this.knots.length; ++i)
        {
            if(false){
                // version with knots between 0 and 1
                // [ 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1.01 ]
                if(i < this.order)
                    this.knots[i] = 0.0;
                else if( i >= (this.nbPoints() + 1) )
                    this.knots[i] = 1.0;
                else{
                    this.knots[i] = acc / (this.nbPoints() + 1 - this.order);
                    acc++;
                }
            }else{
                if(i < this.order)
                    this.knots[i] = 0.0;
                else if( i >= (this.nbPoints() + 1) )
                    this.knots[i] = acc-1;
                else{
                    this.knots[i] = acc;
                    acc++;
                }

            }
        }        
        
        // This is a hack to make a pseudo open unifrom vector.
        // when doing so we allow that when t == t_max last 
        // point is properly extrapolated 
        this.knots[this.knots.length-1] += 0.01;

        //console.log(this.knots); 
    },    

    initKnotVector(){
        // todo move out to g_spline
        if( this.knot_type == "uniform") 
            this.set_node_to_uniform(); 
        else if( this.knot_type == "open_uniform") 
            this.set_node_to_open_uniform();

        //console.log(this.knots);
    }
}; 


export { g_bspline };

