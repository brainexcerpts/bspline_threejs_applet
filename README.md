# ThreeJS B-spline and basis functions visualization

<div align="center"> 

![bspline_applet_threejs](https://github.com/user-attachments/assets/659bce55-c757-48f1-b262-cdeda6ee5507)

<img width="524" height="147" alt="parameters_bspline_threejs" src="https://github.com/user-attachments/assets/fec63207-75d4-4602-a0b3-15e67f3b266d" />

<p>
<link href="https://fonts.googleapis.com/css?family=Cookie" rel="stylesheet"><a class="bmc-button" target="_blank" href="https://www.buymeacoffee.com/jBnA3c2Fw"><img src="https://www.buymeacoffee.com/assets/img/BMC-btn-logo.svg" alt="Buy me a coffee"><span style="margin-left:5px">Buy me coffee! o(^◇^)o</span></a>
</p>
</div>

This is a Javascript / ThreeJS implementation of B-spline a curve with the (inneficient) Cox-de Boor recursion.
The main appeal of this small demo is the visualization of the basis functions and the ability to play with the knots and see in real time how the curve reacts.
This was directly inspired by the amazing video of [Freya Holmér on "The Continuity of Splines"](https://www.youtube.com/watch?v=jvPPXbo87ds).
I wanted to reproduce the styling which I thought was cool, and play myself with the various parameters.
You can also change the number of control points and test various configurations of the "knot vector".
One thing that is missing though, is the visualization of the so called "curvature comb", oh well, maybe some other day.

For the app to properly work on your local machine, you need to setup some sort of server. 
What I use vscode and the liver server plugin:

<div align="center"> 

<img width="766" height="155" alt="live_server" src="https://github.com/user-attachments/assets/1d021817-8533-4404-9896-d488322e50c6" />

![launch_liver_server](https://github.com/user-attachments/assets/e4fb442a-e6c2-4eac-992a-1ea1398faee5)

</div>
