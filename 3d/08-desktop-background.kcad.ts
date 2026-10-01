// MVMCMD 3D asset: subtle desktop background geometry
const a = box(28,28,4,true).fillet(3).rotateX(56).rotateZ(14).color('#aeb7b2');
const b = torus(17,1.2,32).rotateX(62).rotateZ(-18).translate(16,-12,8).color('#9aaa96');
const c = cylinder(8,6,20).translate(-18,18,4).rotateY(32).color('#b4a48c');
return assembly('desktop-background').part('a',a).part('b',b).part('c',c).model();
