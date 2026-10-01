// MVMCMD 3D asset: command input rotating core
const core = box(18,18,18,true).fillet(2.2).color('#c8ccd4');
const ringA = torus(13,0.8,24).rotateX(72).color('#9aaa96');
const ringB = torus(13,0.65,24).rotateY(72).color('#b4a48c');
const hub = cylinder(5,2.0,16).translate(0,0,8.5).color('#18181c');
return assembly('command-core').part('core',core).part('ring-a',ringA).part('ring-b',ringB).part('hub',hub).model();
